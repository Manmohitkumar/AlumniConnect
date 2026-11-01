import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../db'
import { requireAuth } from '../middleware/auth'
import { AppError, asyncHandler, cleanQuery, pageMeta, pagination } from '../lib/http'
import { audit, sessionUser } from '../lib/audit'
import { dashboardPath, notify } from '../lib/notify'

export const challengesRouter = Router()

const skillList = z.array(z.string().trim().min(1).max(60)).max(12).default([])

const createSchema = z.object({
  title: z.string().trim().min(6).max(140),
  summary: z.string().trim().min(20).max(600),
  category: z.string().trim().min(2).max(60),
  objectives: z.string().trim().max(2000).optional(),
  deliverables: z.string().trim().min(5).max(600),
  requirements: z.string().trim().max(1000).optional(),
  durationDays: z.coerce.number().int().min(1).max(180),
  isPaid: z.boolean().default(false),
  deadline: z.coerce.date().optional(),
  maxParticipants: z.coerce.number().int().min(1).max(10000).optional(),
  skills: skillList,
})

const updateSchema = createSchema.partial().extend({
  status: z.enum(['OPEN', 'CLOSED', 'ARCHIVED']).optional(),
})

function slugify(input: string) {
  const base = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 70)
  return base || 'challenge'
}

const listSelect = {
  id: true,
  slug: true,
  title: true,
  summary: true,
  category: true,
  deliverables: true,
  durationDays: true,
  isPaid: true,
  status: true,
  deadline: true,
  publishedAt: true,
  maxParticipants: true,
  authorId: true,
  author: {
    select: {
      id: true,
      name: true,
      alumniProfile: { select: { company: true, designation: true, industry: true } },
    },
  },
  skills: { select: { skill: { select: { name: true } } } },
  _count: { select: { submissions: true, participants: true } },
} as const

type ChallengeRow = {
  skills: Array<{ skill: { name: string } }>
  _count: { submissions: number; participants: number }
  author: { id: string; name: string; alumniProfile: { company: string | null; designation: string | null; industry: string | null } | null }
  [key: string]: unknown
}

function serialize(row: ChallengeRow) {
  return {
    ...row,
    skills: row.skills.map((entry) => entry.skill.name),
    submissions: row._count.submissions,
    participants: row._count.participants,
    author: {
      id: row.author.id,
      name: row.author.name,
      company: row.author.alumniProfile?.company ?? null,
      designation: row.author.alumniProfile?.designation ?? null,
      industry: row.author.alumniProfile?.industry ?? null,
    },
  }
}

challengesRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const page = pagination(req, 12)
    const q = cleanQuery(req.query.q, 80)
    const category = cleanQuery(req.query.category, 60)
    const skill = cleanQuery(req.query.skill, 60)
    const status = cleanQuery(req.query.status, 12) || 'OPEN'
    const paid = cleanQuery(req.query.paid, 6)
    const mine = cleanQuery(req.query.mine, 6) === 'true'
    const joined = cleanQuery(req.query.joined, 6) === 'true'
    const viewer = sessionUser(req)

    const where = {
      ...(status === 'ALL' ? {} : { status: status.toUpperCase() }),
      ...(category ? { category } : {}),
      ...(paid === 'true' ? { isPaid: true } : paid === 'false' ? { isPaid: false } : {}),
      ...(mine && viewer ? { authorId: viewer.id } : {}),
      ...(joined && viewer ? { participants: { some: { userId: viewer.id } } } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q } },
              { summary: { contains: q } },
              { category: { contains: q } },
            ],
          }
        : {}),
      ...(skill ? { skills: { some: { skill: { name: skill } } } } : {}),
    }

    const [rows, total] = await Promise.all([
      prisma.challenge.findMany({
        where,
        select: listSelect,
        orderBy: { publishedAt: 'desc' },
        skip: page.skip,
        take: page.take,
      }),
      prisma.challenge.count({ where }),
    ])

    // The list is also used by challenge cards, so include the viewer's own
    // participation and submission state (detail pages compute this separately).
    const ids = rows.map((row) => row.id)
    const [participations, submissions] = viewer
      ? await Promise.all([
          prisma.challengeParticipant.findMany({
            where: { userId: viewer.id, challengeId: { in: ids } },
            select: { challengeId: true },
          }),
          prisma.submission.findMany({
            where: { studentId: viewer.id, challengeId: { in: ids } },
            select: { id: true, challengeId: true, status: true, score: true, title: true },
          }),
        ])
      : [[], []]
    const joinedIds = new Set(participations.map((row) => String(row.challengeId)))
    const submissionByChallenge = new Map(submissions.map((row) => [String(row.challengeId), row]))

    res.json({
      data: (rows as unknown as ChallengeRow[]).map((row) => {
        const submission = submissionByChallenge.get(String(row.id))
        return {
          ...serialize(row),
          isJoined: joinedIds.has(String(row.id)),
          mySubmission: submission
            ? { id: submission.id, status: submission.status, score: submission.score, title: submission.title }
            : null,
        }
      }),
      meta: { ...pageMeta(page, total), source: 'database', seededDemo: true },
    })
  }),
)

challengesRouter.get(
  '/:slug',
  asyncHandler(async (req, res) => {
    const viewer = sessionUser(req)
    const row = await prisma.challenge.findFirst({
      where: { OR: [{ slug: req.params.slug }, { id: req.params.slug }] },
      select: {
        ...listSelect,
        objectives: true,
        requirements: true,
        createdAt: true,
        updatedAt: true,
      },
    })
    if (!row) throw new AppError(404, 'not_found', 'Challenge not found.')

    const [isJoined, mySubmission] = viewer
      ? await Promise.all([
          prisma.challengeParticipant.findUnique({
            where: { challengeId_userId: { challengeId: row.id, userId: viewer.id } },
            select: { joinedAt: true },
          }),
          prisma.submission.findUnique({
            where: { challengeId_studentId: { challengeId: row.id, studentId: viewer.id } },
            select: { id: true, status: true, score: true, title: true },
          }),
        ])
      : [null, null]

    res.json({
      data: {
        ...serialize(row as unknown as ChallengeRow),
        objectives: row.objectives,
        requirements: row.requirements,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        isJoined: Boolean(isJoined),
        mySubmission,
      },
    })
  }),
)

challengesRouter.post(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = sessionUser(req)!
    if (user.role !== 'ALUMNI' && user.role !== 'ADMIN') {
      throw new AppError(403, 'forbidden', 'Only alumni and administrators can publish challenges.')
    }
    const input = createSchema.parse(req.body)

    let slug = slugify(input.title)
    const exists = await prisma.challenge.findUnique({ where: { slug }, select: { id: true } })
    if (exists) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`

    const skillRows = await Promise.all(
      input.skills.map((name) => prisma.skill.upsert({ where: { name }, update: {}, create: { name } })),
    )

    const created = await prisma.challenge.create({
      data: {
        slug,
        title: input.title,
        summary: input.summary,
        category: input.category,
        objectives: input.objectives,
        deliverables: input.deliverables,
        requirements: input.requirements,
        durationDays: input.durationDays,
        isPaid: input.isPaid,
        maxParticipants: input.maxParticipants,
        deadline: input.deadline ?? new Date(Date.now() + input.durationDays * 86400000),
        authorId: user.id,
        skills: { create: skillRows.map((row) => ({ skillId: row.id })) },
      },
      select: { id: true, slug: true, title: true },
    })

    await audit(req, 'challenge.create', 'Challenge', created.id, { title: created.title })
    res.status(201).json({ data: created })
  }),
)

challengesRouter.patch(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = sessionUser(req)!
    const challenge = await prisma.challenge.findUnique({
      where: { id: req.params.id },
      select: { id: true, authorId: true, status: true },
    })
    if (!challenge) throw new AppError(404, 'not_found', 'Challenge not found.')
    const isOwner = challenge.authorId === user.id
    if (!isOwner && user.role !== 'ADMIN') {
      throw new AppError(403, 'forbidden', 'You can only edit challenges you published.')
    }

    const input = updateSchema.parse(req.body)
    if (input.status === 'ARCHIVED' && user.role !== 'ADMIN') {
      throw new AppError(403, 'forbidden', 'Only administrators can archive a challenge.')
    }

    const updated = await prisma.challenge.update({
      where: { id: challenge.id },
      data: {
        title: input.title,
        summary: input.summary,
        category: input.category,
        objectives: input.objectives,
        deliverables: input.deliverables,
        requirements: input.requirements,
        durationDays: input.durationDays,
        isPaid: input.isPaid,
        maxParticipants: input.maxParticipants,
        deadline: input.deadline,
        status: input.status,
        ...(input.skills
          ? {
              skills: {
                deleteMany: {},
                create: await Promise.all(
                  input.skills.map(async (name) => {
                    const skill = await prisma.skill.upsert({ where: { name }, update: {}, create: { name } })
                    return { skillId: skill.id }
                  }),
                ),
              },
            }
          : {}),
      },
      select: { id: true, slug: true, status: true, title: true },
    })

    await audit(req, 'challenge.update', 'Challenge', updated.id, { status: updated.status })
    res.json({ data: updated })
  }),
)

challengesRouter.post(
  '/:id/join',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = sessionUser(req)!
    if (user.role !== 'STUDENT') {
      throw new AppError(403, 'forbidden', 'Only students can join a challenge.')
    }
    const challenge = await prisma.challenge.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        title: true,
        status: true,
        deadline: true,
        maxParticipants: true,
        authorId: true,
        author: { select: { role: true } },
        _count: { select: { participants: true } },
      },
    })
    if (!challenge) throw new AppError(404, 'not_found', 'Challenge not found.')
    if (challenge.status !== 'OPEN') throw new AppError(409, 'closed', 'This challenge is not open for participation.')
    if (challenge.deadline && challenge.deadline.getTime() < Date.now()) {
      throw new AppError(409, 'deadline_passed', 'The deadline for this challenge has passed.')
    }
    if (challenge.maxParticipants && challenge._count.participants >= challenge.maxParticipants) {
      throw new AppError(409, 'full', 'This challenge has reached its participant limit.')
    }

    await prisma.challengeParticipant.upsert({
      where: { challengeId_userId: { challengeId: challenge.id, userId: user.id } },
      update: {},
      create: { challengeId: challenge.id, userId: user.id },
    })
    if (challenge.authorId !== user.id) {
      await notify(
        challenge.authorId,
        'CHALLENGE_ANNOUNCEMENT',
        'New challenge participant',
        `${user.email} joined "${challenge.title}".`,
        challenge.author.role === 'ADMIN' ? '/admin/dashboard?tab=content' : dashboardPath(challenge.author.role, 'submissions'),
      )
    }
    await audit(req, 'challenge.join', 'Challenge', challenge.id)
    res.status(201).json({ ok: true })
  }),
)

challengesRouter.get(
  '/:id/participants',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = sessionUser(req)!
    const challenge = await prisma.challenge.findUnique({
      where: { id: req.params.id },
      select: { id: true, authorId: true },
    })
    if (!challenge) throw new AppError(404, 'not_found', 'Challenge not found.')
    if (challenge.authorId !== user.id && user.role !== 'ADMIN') {
      throw new AppError(403, 'forbidden', 'Only the challenge author can view participants.')
    }
    const rows = await prisma.challengeParticipant.findMany({
      where: { challengeId: challenge.id },
      select: { joinedAt: true, user: { select: { id: true, name: true, headline: true } } },
      orderBy: { joinedAt: 'desc' },
      take: 200,
    })
    res.json({ data: rows })
  }),
)
