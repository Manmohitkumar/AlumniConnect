import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../db'
import { requireAuth } from '../middleware/auth'
import { asyncHandler, pageMeta, pagination } from '../lib/http'
import { audit, sessionUser } from '../lib/audit'
import { notify } from '../lib/notify'

export const feedbackRouter = Router()

feedbackRouter.use(requireAuth)

export const FEEDBACK_CATEGORIES = [
  'BUG',
  'ACCOUNT',
  'VERIFICATION',
  'MENTORSHIP',
  'CHALLENGE',
  'PRIVACY',
  'ACCESSIBILITY',
  'OTHER',
] as const

const createSchema = z.object({
  category: z.enum(FEEDBACK_CATEGORIES),
  subject: z.string().trim().min(4).max(120),
  message: z.string().trim().min(10).max(4000),
  pagePath: z.string().trim().max(300).optional(),
})

/** The reporter always sees their own tickets; scope is derived from the session. */
feedbackRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const user = sessionUser(req)!
    const page = pagination(req, 10)
    const where = { userId: user.id }
    const [rows, total] = await Promise.all([
      prisma.feedback.findMany({ where, orderBy: { createdAt: 'desc' }, skip: page.skip, take: page.take }),
      prisma.feedback.count({ where }),
    ])
    res.json({ data: rows, meta: pageMeta(page, total) })
  }),
)

feedbackRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const user = sessionUser(req)!
    const input = createSchema.parse(req.body)
    const row = await prisma.feedback.create({
      data: { userId: user.id, ...input, pagePath: input.pagePath || null },
    })

    await audit(req, 'feedback.create', 'Feedback', row.id, { category: row.category })
    const admins = await prisma.user.findMany({ where: { role: 'ADMIN', status: 'ACTIVE' }, select: { id: true } })
    await Promise.all(
      admins.map((admin) =>
        notify(
          admin.id,
          'SUPPORT_TICKET',
          'New support ticket',
          `${user.email} filed a ${row.category.toLowerCase()} report: ${row.subject}`,
          '/admin/dashboard?tab=support',
        ),
      ),
    )
    res.status(201).json({ data: row })
  }),
)
