import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../db'
import { requireAuth } from '../middleware/auth'
import { AppError, asyncHandler, cleanQuery, pageMeta, pagination } from '../lib/http'
import { audit, sessionUser } from '../lib/audit'
import { notify } from '../lib/notify'

export const opportunitiesRouter = Router()
export const applicationsRouter = Router()

const opportunitySchema = z.object({
  title: z.string().trim().min(4).max(160),
  description: z.string().trim().min(30).max(5000),
  type: z.enum(['INTERNSHIP', 'JOB', 'MENTORSHIP_PROGRAM']).default('INTERNSHIP'),
  location: z.string().trim().max(160).optional(),
  remote: z.boolean().default(false),
  country: z.string().trim().max(80).optional(),
  region: z.string().trim().max(120).optional(),
  language: z.string().trim().max(40).optional(),
  skills: z.string().trim().max(400).optional(),
  salaryCurrency: z.string().trim().length(3).optional(),
  salaryMin: z.coerce.number().int().min(0).max(100_000_000).optional(),
  salaryMax: z.coerce.number().int().min(0).max(100_000_000).optional(),
  workAuthorization: z.string().trim().max(200).optional(),
  deadline: z.coerce.date().optional(),
})

opportunitiesRouter.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = sessionUser(req)!
    const page = pagination(req, 12)
    const q = cleanQuery(req.query.q, 80)
    const country = cleanQuery(req.query.country, 80)
    const language = cleanQuery(req.query.language, 40)
    const remoteOnly = cleanQuery(req.query.remote, 6) === 'true'
    const mine = cleanQuery(req.query.mine, 6) === 'true'

    const where = {
      ...(mine ? { companyId: user.id } : { status: 'OPEN' }),
      ...(country ? { country: { contains: country } } : {}),
      ...(language ? { language: { contains: language } } : {}),
      ...(remoteOnly ? { remote: true } : {}),
      ...(q ? { OR: [{ title: { contains: q } }, { description: { contains: q } }, { skills: { contains: q } }] } : {}),
    }
    const [rows, total] = await Promise.all([
      prisma.opportunity.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: page.skip,
        take: page.take,
        include: {
          company: { select: { id: true, name: true, headline: true } },
          _count: { select: { applications: true } },
          applications: user.role === 'STUDENT' ? { where: { studentId: user.id }, select: { id: true, status: true } } : false,
        },
      }),
      prisma.opportunity.count({ where }),
    ])
    res.json({
      data: rows.map((row) => ({
        ...row,
        applicationCount: row._count.applications,
        myApplication: Array.isArray(row.applications) ? row.applications[0] ?? null : null,
      })),
      meta: pageMeta(page, total),
    })
  }),
)

opportunitiesRouter.post(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = sessionUser(req)!
    if (user.role !== 'COMPANY' && user.role !== 'ADMIN') {
      throw new AppError(403, 'forbidden', 'Only verified company accounts can publish opportunities.')
    }
    const input = opportunitySchema.parse(req.body)
    const created = await prisma.opportunity.create({
      data: { ...input, companyId: user.id },
    })
    await audit(req, 'opportunity.create', 'Opportunity', created.id, { title: created.title })
    res.status(201).json({ data: created })
  }),
)

opportunitiesRouter.patch(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = sessionUser(req)!
    const row = await prisma.opportunity.findUnique({ where: { id: req.params.id }, select: { companyId: true } })
    if (!row) throw new AppError(404, 'not_found', 'Opportunity not found.')
    if (row.companyId !== user.id && user.role !== 'ADMIN') {
      throw new AppError(403, 'forbidden', 'Only the publishing company can edit this opportunity.')
    }
    const input = opportunitySchema
      .partial()
      .extend({ status: z.enum(['DRAFT', 'OPEN', 'CLOSED']).optional() })
      .parse(req.body)
    const updated = await prisma.opportunity.update({ where: { id: req.params.id }, data: input })
    await audit(req, 'opportunity.update', 'Opportunity', updated.id, { status: updated.status })
    res.json({ data: updated })
  }),
)

opportunitiesRouter.post(
  '/:id/apply',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = sessionUser(req)!
    if (user.role !== 'STUDENT') throw new AppError(403, 'forbidden', 'Only students can apply.')

    const input = z.object({ coverNote: z.string().trim().max(2000).optional() }).parse(req.body)
    const opportunity = await prisma.opportunity.findUnique({
      where: { id: req.params.id },
      include: { company: { select: { id: true, name: true } } },
    })
    if (!opportunity) throw new AppError(404, 'not_found', 'Opportunity not found.')
    if (opportunity.status !== 'OPEN') throw new AppError(409, 'closed', 'This opportunity is closed.')
    if (opportunity.deadline && opportunity.deadline.getTime() < Date.now()) {
      throw new AppError(409, 'deadline_passed', 'The application deadline has passed.')
    }

    const profile = await prisma.studentProfile.findUnique({
      where: { userId: user.id },
      select: { visibleToCompanies: true },
    })
    if (!profile?.visibleToCompanies) {
      throw new AppError(
        403,
        'consent_required',
        'Enable company visibility in your student profile before applying to opportunities.',
      )
    }

    const existing = await prisma.application.findUnique({
      where: { opportunityId_studentId: { opportunityId: opportunity.id, studentId: user.id } },
      select: { id: true },
    })
    if (existing) throw new AppError(409, 'duplicate', 'You already applied to this opportunity.')

    const application = await prisma.application.create({
      data: { opportunityId: opportunity.id, studentId: user.id, coverNote: input.coverNote },
    })

    await notify(
      opportunity.companyId,
      'APPLICATION_UPDATE',
      'New opportunity application',
      `A student applied to "${opportunity.title}".`,
      '/company/dashboard?tab=applications',
    )
    await audit(req, 'opportunity.apply', 'Opportunity', opportunity.id)
    res.status(201).json({ data: application })
  }),
)

opportunitiesRouter.get(
  '/:id/applications',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = sessionUser(req)!
    const opportunity = await prisma.opportunity.findUnique({
      where: { id: req.params.id },
      select: { companyId: true },
    })
    if (!opportunity) throw new AppError(404, 'not_found', 'Opportunity not found.')
    if (opportunity.companyId !== user.id && user.role !== 'ADMIN') {
      throw new AppError(403, 'forbidden', 'Only the publishing company can view applications.')
    }
    const rows = await prisma.application.findMany({
      where: { opportunityId: req.params.id },
      orderBy: { createdAt: 'desc' },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            headline: true,
            studentProfile: { select: { department: true, course: true, graduationYear: true, skills: true } },
          },
        },
      },
    })
    res.json({ data: rows })
  }),
)

applicationsRouter.get(
  '/received',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = sessionUser(req)!
    if (user.role !== 'COMPANY' && user.role !== 'ADMIN') {
      throw new AppError(403, 'forbidden', 'Only companies can view received applications.')
    }
    const rows = await prisma.application.findMany({
      where: user.role === 'ADMIN' ? {} : { opportunity: { companyId: user.id } },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        opportunity: { select: { id: true, title: true, type: true, status: true } },
        student: {
          select: {
            id: true,
            name: true,
            headline: true,
            studentProfile: { select: { department: true, course: true, graduationYear: true, skills: true } },
          },
        },
      },
    })
    res.json({ data: rows })
  }),
)

applicationsRouter.get(
  '/mine',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = sessionUser(req)!
    const rows = await prisma.application.findMany({
      where: { studentId: user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        opportunity: {
          select: { id: true, title: true, type: true, status: true, company: { select: { name: true } } },
        },
      },
    })
    res.json({ data: rows })
  }),
)

applicationsRouter.patch(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = sessionUser(req)!
    const input = z.object({ status: z.enum(['APPLIED', 'SHORTLISTED', 'REJECTED', 'WITHDRAWN']) }).parse(req.body)
    const application = await prisma.application.findUnique({
      where: { id: req.params.id },
      include: { opportunity: { select: { companyId: true, title: true } } },
    })
    if (!application) throw new AppError(404, 'not_found', 'Application not found.')

    const isStudent = application.studentId === user.id
    const isCompany = application.opportunity.companyId === user.id
    if (!isStudent && !isCompany && user.role !== 'ADMIN') {
      throw new AppError(403, 'forbidden', 'You cannot change this application.')
    }
    if (isStudent && input.status !== 'WITHDRAWN') {
      throw new AppError(403, 'forbidden', 'Students can only withdraw their own application.')
    }
    if (isCompany && input.status === 'WITHDRAWN') {
      throw new AppError(403, 'forbidden', 'Only the student can withdraw an application.')
    }

    const updated = await prisma.application.update({
      where: { id: application.id },
      data: { status: input.status },
    })
    if (isCompany) {
      await notify(
        application.studentId,
        'APPLICATION_UPDATE',
        'Application status updated',
        `Your application for "${application.opportunity.title}" is now ${input.status.toLowerCase()}.`,
        '/student/dashboard?tab=opportunities',
      )
    }
    await audit(req, 'application.update', 'Application', application.id, { status: input.status })
    res.json({ data: updated })
  }),
)
