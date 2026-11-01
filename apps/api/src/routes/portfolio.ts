import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../db'
import { requireAuth } from '../middleware/auth'
import { AppError, asyncHandler, httpUrl } from '../lib/http'
import { audit, sessionUser } from '../lib/audit'

export const portfolioRouter = Router()

const projectSchema = z.object({
  title: z.string().trim().min(3).max(160),
  summary: z.string().trim().min(10).max(1500),
  url: httpUrl().optional().or(z.literal('')),
  skills: z.string().trim().max(400).optional(),
  visibility: z.enum(['PRIVATE', 'PLATFORM', 'PUBLIC']).default('PLATFORM'),
})

portfolioRouter.get(
  '/mine',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = sessionUser(req)!
    const rows = await prisma.portfolioProject.findMany({
      where: { studentId: user.id },
      orderBy: { createdAt: 'desc' },
    })
    res.json({ data: rows })
  }),
)

portfolioRouter.post(
  '/projects',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = sessionUser(req)!
    if (user.role !== 'STUDENT') throw new AppError(403, 'forbidden', 'Only students have a portfolio.')
    const input = projectSchema.parse(req.body)
    const created = await prisma.portfolioProject.create({
      data: { ...input, url: input.url || null, studentId: user.id },
    })
    await audit(req, 'portfolio.create', 'PortfolioProject', created.id)
    res.status(201).json({ data: created })
  }),
)

portfolioRouter.patch(
  '/projects/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = sessionUser(req)!
    const row = await prisma.portfolioProject.findUnique({ where: { id: req.params.id }, select: { studentId: true } })
    if (!row) throw new AppError(404, 'not_found', 'Project not found.')
    if (row.studentId !== user.id) throw new AppError(403, 'forbidden', 'You can only edit your own projects.')
    const input = projectSchema.partial().parse(req.body)
    const updated = await prisma.portfolioProject.update({
      where: { id: req.params.id },
      data: { ...input, url: input.url === '' ? null : input.url },
    })
    await audit(req, 'portfolio.update', 'PortfolioProject', updated.id, { visibility: updated.visibility })
    res.json({ data: updated })
  }),
)

portfolioRouter.delete(
  '/projects/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = sessionUser(req)!
    const row = await prisma.portfolioProject.findUnique({ where: { id: req.params.id }, select: { studentId: true } })
    if (!row) throw new AppError(404, 'not_found', 'Project not found.')
    if (row.studentId !== user.id && user.role !== 'ADMIN') {
      throw new AppError(403, 'forbidden', 'You can only delete your own projects.')
    }
    await prisma.portfolioProject.delete({ where: { id: req.params.id } })
    await audit(req, 'portfolio.delete', 'PortfolioProject', req.params.id)
    res.status(204).end()
  }),
)

/**
 * Portfolio visibility: PRIVATE is owner-only, PLATFORM needs a signed-in
 * account, PUBLIC is open. A company additionally needs the student's
 * company-visibility consent to see platform-only projects.
 */
portfolioRouter.get(
  '/:userId',
  asyncHandler(async (req, res) => {
    const viewer = sessionUser(req)
    const student = await prisma.user.findUnique({
      where: { id: req.params.userId },
      select: {
        id: true,
        name: true,
        headline: true,
        bio: true,
        avatarUrl: true,
        role: true,
        studentProfile: true,
      },
    })
    if (!student || student.role !== 'STUDENT') throw new AppError(404, 'not_found', 'Portfolio not found.')

    const isOwner = viewer?.id === student.id
    const isAdmin = viewer?.role === 'ADMIN'
    const companyConsented = student.studentProfile?.visibleToCompanies === true
    const canSeePlatform = Boolean(viewer) && (viewer?.role !== 'COMPANY' || companyConsented)

    const visibility = isOwner || isAdmin
      ? ['PRIVATE', 'PLATFORM', 'PUBLIC']
      : canSeePlatform
        ? ['PLATFORM', 'PUBLIC']
        : ['PUBLIC']

    const [projects, certificates, challenges] = await Promise.all([
      prisma.portfolioProject.findMany({
        where: { studentId: student.id, visibility: { in: visibility } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.certificate.findMany({
        where: {
          userId: student.id,
          revokedAt: null,
          ...(isOwner || isAdmin ? {} : { kind: { in: ['CHALLENGE_WINNER', 'CHALLENGE_COMPLETION', 'PROJECT_RECOGNITION'] } }),
        },
        orderBy: { issuedAt: 'desc' },
        include: { challenge: { select: { title: true } } },
      }),
      prisma.submission.findMany({
        where: { studentId: student.id, status: 'EVALUATED' },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          score: true,
          createdAt: true,
          challenge: { select: { title: true, category: true } },
        },
      }),
    ])

    if (!isOwner && !isAdmin && !student.studentProfile?.portfolioVisible && projects.length === 0) {
      throw new AppError(404, 'not_found', 'This portfolio is not public.')
    }

    res.json({
      data: {
        student: {
          id: student.id,
          name: student.name,
          headline: student.headline,
          bio: student.bio,
          avatarUrl: student.avatarUrl,
          profile: student.studentProfile,
        },
        projects,
        certificates,
        evaluatedSubmissions: challenges,
        visibilityApplied: visibility,
      },
    })
  }),
)
