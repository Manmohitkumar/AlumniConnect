import { Router } from 'express'
import { prisma } from '../db'
import { requireAuth } from '../middleware/auth'
import { asyncHandler, cleanQuery, pageMeta, pagination } from '../lib/http'
import { sessionUser } from '../lib/audit'

export const discoveryRouter = Router()

function tokens(value: string | null | undefined): string[] {
  if (!value) return []
  return value
    .toLowerCase()
    .split(/[,;/|]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 1)
}

discoveryRouter.get(
  '/alumni',
  asyncHandler(async (req, res) => {
    const page = pagination(req, 12)
    const q = cleanQuery(req.query.q, 80)
    const industry = cleanQuery(req.query.industry, 60)
    const company = cleanQuery(req.query.company, 80)
    const skill = cleanQuery(req.query.skill, 60)
    const year = Number.parseInt(String(req.query.graduationYear ?? ''), 10)
    const mentorshipOpen = cleanQuery(req.query.mentorshipOpen, 6) === 'true'

    const where = {
      role: 'ALUMNI',
      status: 'ACTIVE',
      ...(q ? { OR: [{ name: { contains: q } }, { headline: { contains: q } }, { bio: { contains: q } }] } : {}),
      alumniProfile: {
        is: {
          ...(industry ? { industry: { contains: industry } } : {}),
          ...(company ? { company: { contains: company } } : {}),
          ...(skill ? { OR: [{ expertise: { contains: skill } }, { mentorshipTopics: { contains: skill } }] } : {}),
          ...(Number.isFinite(year) ? { graduationYear: year } : {}),
          ...(mentorshipOpen ? { mentorshipOpen: true } : {}),
        },
      },
    }

    const [rows, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: page.skip,
        take: page.take,
        select: {
          id: true,
          name: true,
          headline: true,
          location: true,
          avatarUrl: true,
          alumniProfile: true,
        },
      }),
      prisma.user.count({ where }),
    ])
    res.json({ data: rows, meta: pageMeta(page, total) })
  }),
)

/**
 * Student talent discovery. Companies only see students who opted in via
 * visibleToCompanies. Alumni see students who made their portfolio visible on
 * the platform. Admins see all. Contact details are never included.
 */
discoveryRouter.get(
  '/students',
  requireAuth,
  asyncHandler(async (req, res) => {
    const viewer = sessionUser(req)!
    if (!['COMPANY', 'ALUMNI', 'ADMIN'].includes(viewer.role)) {
      res.status(403).json({ error: 'forbidden', message: 'Student discovery is limited to companies, alumni and administrators.' })
      return
    }
    const page = pagination(req, 12)
    const q = cleanQuery(req.query.q, 80)
    const skill = cleanQuery(req.query.skill, 60)
    const department = cleanQuery(req.query.department, 80)

    const consentFilter =
      viewer.role === 'ADMIN'
        ? {}
        : viewer.role === 'COMPANY'
          ? { visibleToCompanies: true }
          : { portfolioVisible: true }

    const where = {
      role: 'STUDENT',
      status: 'ACTIVE',
      ...(q ? { name: { contains: q } } : {}),
      studentProfile: {
        is: {
          ...consentFilter,
          ...(skill ? { OR: [{ skills: { contains: skill } }, { careerInterests: { contains: skill } }] } : {}),
          ...(department ? { department: { contains: department } } : {}),
        },
      },
    }

    const [rows, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: page.skip,
        take: page.take,
        select: {
          id: true,
          name: true,
          headline: true,
          avatarUrl: true,
          studentProfile: {
            select: {
              universityName: true,
              department: true,
              course: true,
              graduationYear: true,
              skills: true,
              careerInterests: true,
              verificationStatus: true,
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ])
    res.json({ data: rows, meta: pageMeta(page, total) })
  }),
)

/**
 * Transparent, rule-based recommendations. No machine-learning model is used.
 * Each item carries a human-readable reason so the UI never implies otherwise.
 */
discoveryRouter.get(
  '/recommendations',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = sessionUser(req)!
    const empty = { mentors: [], challenges: [], events: [], resources: [], students: [], opportunities: [] }

    if (user.role === 'STUDENT') {
      const account = await prisma.user.findUnique({
        where: { id: user.id },
        select: {
          studentProfile: { select: { skills: true, careerInterests: true } },
          challengeParticipations: { select: { challengeId: true } },
          submissions: { select: { challengeId: true } },
        },
      })
      const mySkills = tokens(account?.studentProfile?.skills)
      const myInterests = tokens(account?.studentProfile?.careerInterests)
      const handled = new Set([
        ...(account?.challengeParticipations.map((c) => c.challengeId) ?? []),
        ...(account?.submissions.map((s) => s.challengeId) ?? []),
      ])

      const [mentors, challenges, events, resources] = await Promise.all([
        prisma.user.findMany({
          where: { role: 'ALUMNI', status: 'ACTIVE', alumniProfile: { is: { mentorshipOpen: true } } },
          take: 24,
          select: {
            id: true,
            name: true,
            headline: true,
            alumniProfile: { select: { industry: true, expertise: true, mentorshipTopics: true, company: true } },
          },
        }),
        prisma.challenge.findMany({
          where: { status: 'OPEN', id: { notIn: [...handled] } },
          take: 24,
          include: {
            skills: { include: { skill: true } },
            author: { select: { name: true } },
            _count: { select: { submissions: true, participants: true } },
          },
        }),
        prisma.event.findMany({
          where: { status: 'PUBLISHED', startsAt: { gte: new Date() } },
          take: 12,
          orderBy: { startsAt: 'asc' },
        }),
        prisma.knowledgeResource.findMany({
          where: { status: 'PUBLISHED' },
          take: 12,
          orderBy: { createdAt: 'desc' },
          include: { author: { select: { name: true } } },
        }),
      ])

      const mentorMatches = mentors
        .map((mentor) => {
          const haystack = `${mentor.alumniProfile?.expertise ?? ''} ${mentor.alumniProfile?.mentorshipTopics ?? ''}`.toLowerCase()
          const hits = [...mySkills, ...myInterests].filter((token) => haystack.includes(token))
          return {
            id: mentor.id,
            name: mentor.name,
            headline: mentor.headline,
            company: mentor.alumniProfile?.company ?? null,
            industry: mentor.alumniProfile?.industry ?? null,
            reason:
              hits.length > 0
                ? `Mentions ${[...new Set(hits)].slice(0, 3).join(', ')} — matching your skills or interests.`
                : 'Open to mentorship requests across the alumni network.',
            score: hits.length,
          }
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, 6)

      const challengeMatches = challenges
        .map((challenge) => {
          const names = challenge.skills.map((entry) => entry.skill.name)
          const hits = names.filter((name) => [...mySkills, ...myInterests].includes(name.toLowerCase()))
          return {
            id: challenge.id,
            slug: challenge.slug,
            title: challenge.title,
            category: challenge.category,
            deadline: challenge.deadline,
            isPaid: challenge.isPaid,
            author: challenge.author.name,
            submissions: challenge._count.submissions,
            reason:
              hits.length > 0
                ? `Uses ${hits.join(', ')} — skills already on your profile.`
                : `Open ${challenge.category} challenge with ${challenge._count.participants} participants.`,
            score: hits.length,
          }
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, 6)

      res.json({
        data: {
          ...empty,
          mentors: mentorMatches,
          challenges: challengeMatches,
          events: events.map((event) => ({
            id: event.id,
            title: event.title,
            category: event.category,
            mode: event.mode,
            startsAt: event.startsAt,
            reason: 'Upcoming event open to students.',
          })),
          resources: resources.map((resource) => ({
            id: resource.id,
            title: resource.title,
            category: resource.category,
            type: resource.type,
            author: resource.author.name,
            reason: 'Recently published alumni resource.',
          })),
          method: 'rule-based',
        },
      })
      return
    }

    if (user.role === 'COMPANY') {
      const opportunities = await prisma.opportunity.findMany({
        where: { companyId: user.id, status: 'OPEN' },
        include: { applications: { select: { id: true } } },
      })
      const wanted = opportunities.flatMap((opportunity) => tokens(opportunity.skills))
      const students = await prisma.user.findMany({
        where: { role: 'STUDENT', status: 'ACTIVE', studentProfile: { is: { visibleToCompanies: true } } },
        take: 24,
        select: {
          id: true,
          name: true,
          headline: true,
          studentProfile: { select: { skills: true, careerInterests: true, department: true, graduationYear: true } },
        },
      })
      res.json({
        data: {
          ...empty,
          students: students
            .map((student) => {
              const hits = tokens(student.studentProfile?.skills).filter((skill) => wanted.includes(skill))
              return {
                id: student.id,
                name: student.name,
                headline: student.headline,
                department: student.studentProfile?.department ?? null,
                graduationYear: student.studentProfile?.graduationYear ?? null,
                reason:
                  hits.length > 0
                    ? `Skills match your open opportunities: ${[...new Set(hits)].slice(0, 3).join(', ')}.`
                    : 'Student has opted in to company discovery.',
                score: hits.length,
              }
            })
            .sort((a, b) => b.score - a.score)
            .slice(0, 8),
          method: 'rule-based',
        },
      })
      return
    }

    if (user.role === 'ALUMNI') {
      const challenges = await prisma.challenge.findMany({
        where: { authorId: user.id, status: 'OPEN' },
        include: { skills: { include: { skill: true } } },
      })
      const wanted = challenges.flatMap((challenge) => challenge.skills.map((entry) => entry.skill.name.toLowerCase()))
      const students = await prisma.user.findMany({
        where: { role: 'STUDENT', status: 'ACTIVE', studentProfile: { is: { portfolioVisible: true } } },
        take: 24,
        select: {
          id: true,
          name: true,
          headline: true,
          studentProfile: { select: { skills: true, department: true } },
        },
      })
      res.json({
        data: {
          ...empty,
          students: students
            .map((student) => {
              const hits = tokens(student.studentProfile?.skills).filter((skill) => wanted.includes(skill))
              return {
                id: student.id,
                name: student.name,
                headline: student.headline,
                department: student.studentProfile?.department ?? null,
                reason:
                  hits.length > 0
                    ? `Skills match your open challenges: ${[...new Set(hits)].slice(0, 3).join(', ')}.`
                    : 'Student has published a portfolio on the platform.',
                score: hits.length,
              }
            })
            .sort((a, b) => b.score - a.score)
            .slice(0, 8),
          method: 'rule-based',
        },
      })
      return
    }

    res.json({ data: empty })
  }),
)
