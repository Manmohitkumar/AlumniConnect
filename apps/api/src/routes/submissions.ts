import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../db'
import { requireAuth } from '../middleware/auth'
import { AppError, asyncHandler, httpUrl, pagination, pageMeta } from '../lib/http'
import { audit, sessionUser } from '../lib/audit'
import { notify } from '../lib/notify'

export const submissionsRouter = Router()
export const submissionCreateRouter = Router({ mergeParams: true })

const submitSchema = z.object({
  title: z.string().trim().min(4).max(160),
  summary: z.string().trim().max(1500).optional(),
  repoUrl: httpUrl().optional().or(z.literal('')),
  demoUrl: httpUrl().optional().or(z.literal('')),
  fileUrl: httpUrl().optional().nullable(),
})

const updateSchema = submitSchema.partial().extend({
  withdraw: z.boolean().optional(),
})

submissionsRouter.get(
  '/received',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = sessionUser(req)!
    if (user.role !== 'ALUMNI' && user.role !== 'ADMIN') {
      throw new AppError(403, 'forbidden', 'Only challenge authors can review submissions.')
    }
    const page = pagination(req, 20)
    const where = user.role === 'ADMIN' ? {} : { challenge: { authorId: user.id } }
    const [rows, total] = await Promise.all([
      prisma.submission.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: page.skip,
        take: page.take,
        include: {
          challenge: { select: { id: true, slug: true, title: true, category: true, deadline: true, status: true } },
          student: {
            select: {
              id: true,
              name: true,
              headline: true,
              studentProfile: { select: { department: true, course: true, graduationYear: true, skills: true } },
            },
          },
          evaluations: { orderBy: { createdAt: 'desc' }, select: { id: true, score: true, feedback: true, createdAt: true } },
        },
      }),
      prisma.submission.count({ where }),
    ])
    res.json({ data: rows, meta: pageMeta(page, total) })
  }),
)

submissionsRouter.get(
  '/mine',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = sessionUser(req)!
    const page = pagination(req, 20)
    const where = { studentId: user.id }
    const [rows, total] = await Promise.all([
      prisma.submission.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: page.skip,
        take: page.take,
        include: {
          challenge: { select: { id: true, slug: true, title: true, category: true, deadline: true, status: true } },
          evaluations: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { id: true, score: true, feedback: true, createdAt: true },
          },
        },
      }),
      prisma.submission.count({ where }),
    ])
    res.json({ data: rows, meta: pageMeta(page, total) })
  }),
)

submissionsRouter.get(
  '/challenge/:challengeId',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = sessionUser(req)!
    const challenge = await prisma.challenge.findUnique({
      where: { id: req.params.challengeId },
      select: { id: true, authorId: true },
    })
    if (!challenge) throw new AppError(404, 'not_found', 'Challenge not found.')
    if (challenge.authorId !== user.id && user.role !== 'ADMIN') {
      throw new AppError(403, 'forbidden', 'Only the challenge author can review submissions.')
    }
    const page = pagination(req, 20)
    const where = { challengeId: challenge.id }
    const [rows, total] = await Promise.all([
      prisma.submission.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: page.skip,
        take: page.take,
        include: {
          student: {
            select: {
              id: true,
              name: true,
              headline: true,
              studentProfile: { select: { department: true, course: true, graduationYear: true, skills: true } },
            },
          },
          evaluations: { orderBy: { createdAt: 'desc' }, select: { id: true, score: true, feedback: true, createdAt: true } },
        },
      }),
      prisma.submission.count({ where }),
    ])
    res.json({ data: rows, meta: pageMeta(page, total) })
  }),
)

submissionCreateRouter.post(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = sessionUser(req)!
    if (user.role !== 'STUDENT') throw new AppError(403, 'forbidden', 'Only students can submit to challenges.')
    const input = submitSchema.parse(req.body)

    const challenge = await prisma.challenge.findUnique({
      where: { id: req.params.challengeId },
      select: { id: true, title: true, authorId: true, author: { select: { role: true } }, status: true, deadline: true },
    })
    if (!challenge) throw new AppError(404, 'not_found', 'Challenge not found.')
    if (challenge.status !== 'OPEN') throw new AppError(409, 'closed', 'This challenge is closed for submissions.')
    if (challenge.deadline && challenge.deadline.getTime() < Date.now()) {
      throw new AppError(409, 'deadline_passed', 'The submission deadline has passed.')
    }

    const participant = await prisma.challengeParticipant.findUnique({
      where: { challengeId_userId: { challengeId: challenge.id, userId: user.id } },
      select: { joinedAt: true },
    })
    if (!participant) throw new AppError(409, 'not_joined', 'Join the challenge before submitting.')

    const existing = await prisma.submission.findUnique({
      where: { challengeId_studentId: { challengeId: challenge.id, studentId: user.id } },
      select: { id: true, status: true },
    })
    if (existing && existing.status !== 'WITHDRAWN') {
      throw new AppError(409, 'duplicate', 'You already have a submission for this challenge.')
    }

    const data = {
      title: input.title,
      summary: input.summary,
      repoUrl: input.repoUrl || null,
      demoUrl: input.demoUrl || null,
      fileUrl: input.fileUrl || null,
      status: 'SUBMITTED',
      score: null,
      feedback: null,
      evaluatedAt: null,
      evaluatedById: null,
    }

    const submission = existing
      ? await prisma.submission.update({ where: { id: existing.id }, data })
      : await prisma.submission.create({
          data: { ...data, challengeId: challenge.id, studentId: user.id },
        })

    await audit(req, 'submission.create', 'Submission', submission.id, { challengeId: challenge.id })
    await notify(
      challenge.authorId,
      'CHALLENGE_ANNOUNCEMENT',
      'New challenge submission',
      `${user.email} submitted to "${challenge.title}".`,
      challenge.author.role === 'ADMIN'
        ? '/admin/dashboard?tab=content'
        : `/alumni/dashboard?tab=submissions&challenge=${challenge.id}`,
    )
    res.status(201).json({ data: submission })
  }),
)

submissionsRouter.get(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = sessionUser(req)!
    const row = await prisma.submission.findUnique({
      where: { id: req.params.id },
      include: {
        challenge: { select: { id: true, title: true, slug: true, authorId: true, deadline: true, status: true } },
        student: { select: { id: true, name: true, email: true, headline: true } },
        evaluations: { orderBy: { createdAt: 'desc' } },
      },
    })
    if (!row) throw new AppError(404, 'not_found', 'Submission not found.')
    const allowed =
      row.studentId === user.id || row.challenge.authorId === user.id || user.role === 'ADMIN'
    if (!allowed) throw new AppError(403, 'forbidden', 'You cannot view this submission.')
    // Students see their own score but not internal criterion notes from other evaluators.
    const evaluations =
      row.studentId === user.id
        ? row.evaluations.map((e) => ({ id: e.id, score: e.score, feedback: e.feedback, createdAt: e.createdAt }))
        : row.evaluations
    res.json({
      data: {
        ...row,
        evaluations,
        canEvaluate: row.challenge.authorId === user.id || user.role === 'ADMIN',
      },
    })
  }),
)

submissionsRouter.patch(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = sessionUser(req)!
    const input = updateSchema.parse(req.body)
    const row = await prisma.submission.findUnique({
      where: { id: req.params.id },
      include: { challenge: { select: { deadline: true, status: true, title: true } } },
    })
    if (!row) throw new AppError(404, 'not_found', 'Submission not found.')
    if (row.studentId !== user.id && user.role !== 'ADMIN') {
      throw new AppError(403, 'forbidden', 'You can only edit your own submission.')
    }
    if (row.status === 'EVALUATED' && user.role !== 'ADMIN') {
      throw new AppError(409, 'locked', 'An evaluated submission can no longer be edited.')
    }
    if (row.challenge.deadline && row.challenge.deadline.getTime() < Date.now() && user.role !== 'ADMIN') {
      throw new AppError(409, 'deadline_passed', 'The deadline has passed; this submission is locked.')
    }

    const updated = await prisma.submission.update({
      where: { id: row.id },
      data: {
        title: input.title,
        summary: input.summary,
        repoUrl: input.repoUrl === '' ? null : input.repoUrl,
        demoUrl: input.demoUrl === '' ? null : input.demoUrl,
        fileUrl: input.fileUrl,
        status: input.withdraw
          ? 'WITHDRAWN'
          : row.status === 'WITHDRAWN'
            ? 'SUBMITTED'
            : row.status,
      },
    })

    await audit(req, input.withdraw ? 'submission.withdraw' : 'submission.update', 'Submission', row.id)
    res.json({ data: updated })
  }),
)
