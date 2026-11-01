import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../db'
import { requireAuth } from '../middleware/auth'
import { AppError, asyncHandler, cleanQuery, pageMeta, pagination } from '../lib/http'
import { audit, sessionUser } from '../lib/audit'
import { dashboardPath, notify } from '../lib/notify'

export const eventsRouter = Router()

const eventSchema = z.object({
  title: z.string().trim().min(4).max(160),
  description: z.string().trim().min(20).max(3000),
  category: z.string().trim().min(2).max(60),
  mode: z.enum(['ONLINE', 'CAMPUS', 'METAVERSE']),
  location: z.string().trim().max(200).optional(),
  metaverseRoom: z.enum(['mentor-room', 'career-hall', 'innovation-lab']).optional(),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date().optional(),
  capacity: z.coerce.number().int().min(1).max(10000).optional(),
  timeZone: z.string().trim().max(64).optional(),
  language: z.string().trim().max(40).optional(),
  meetingUrl: z.string().trim().max(300).optional(),
  recordingUrl: z.string().trim().max(300).optional(),
})

const listInclude = {
  host: { select: { id: true, name: true, headline: true } },
  _count: { select: { registrations: true } },
} as const

eventsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const page = pagination(req, 12)
    const q = cleanQuery(req.query.q, 80)
    const mode = cleanQuery(req.query.mode, 20)
    const language = cleanQuery(req.query.language, 40)
    const past = cleanQuery(req.query.past, 6) === 'true'
    const viewer = sessionUser(req)

    const where = {
      status: 'PUBLISHED',
      ...(mode ? { mode: mode.toUpperCase() } : {}),
      ...(language ? { language: { contains: language } } : {}),
      ...(past ? { startsAt: { lt: new Date() } } : { startsAt: { gte: new Date() } }),
      ...(q ? { OR: [{ title: { contains: q } }, { description: { contains: q } }, { category: { contains: q } }] } : {}),
    }

    const [rows, total] = await Promise.all([
      prisma.event.findMany({
        where,
        orderBy: { startsAt: past ? 'desc' : 'asc' },
        skip: page.skip,
        take: page.take,
        include: {
          ...listInclude,
          registrations: viewer ? { where: { userId: viewer.id }, select: { registeredAt: true, attendedAt: true } } : false,
        },
      }),
      prisma.event.count({ where }),
    ])

    res.json({
      data: rows.map((row) => ({
        ...row,
        registrationCount: row._count.registrations,
        myRegistration: Array.isArray(row.registrations) ? row.registrations[0] ?? null : null,
      })),
      meta: pageMeta(page, total),
    })
  }),
)

eventsRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const viewer = sessionUser(req)
    const row = await prisma.event.findUnique({
      where: { id: req.params.id },
      include: {
        ...listInclude,
        registrations: {
          orderBy: { registeredAt: 'asc' },
          select: {
            registeredAt: true,
            attendedAt: true,
            feedbackRating: true,
            user: { select: { id: true, name: true, headline: true } },
          },
        },
      },
    })
    if (!row) throw new AppError(404, 'not_found', 'Event not found.')

    const isHost = viewer?.id === row.hostId || viewer?.role === 'ADMIN'
    res.json({
      data: {
        ...row,
        registrationCount: row._count.registrations,
        registrations: isHost ? row.registrations : undefined,
        myRegistration: viewer ? row.registrations.find((r) => r.user.id === viewer.id) ?? null : null,
        canManage: isHost,
      },
    })
  }),
)

eventsRouter.post(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = sessionUser(req)!
    if (user.role !== 'ALUMNI' && user.role !== 'ADMIN') {
      throw new AppError(403, 'forbidden', 'Only alumni and administrators can create events.')
    }
    const input = eventSchema.parse(req.body)
    if (input.endsAt && input.endsAt <= input.startsAt) {
      throw new AppError(400, 'invalid_time', 'The end time must be after the start time.')
    }

    const created = await prisma.event.create({
      data: { ...input, hostId: user.id, status: 'PUBLISHED' },
    })
    await audit(req, 'event.create', 'Event', created.id, { title: created.title })
    res.status(201).json({ data: created })
  }),
)

eventsRouter.patch(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = sessionUser(req)!
    const event = await prisma.event.findUnique({ where: { id: req.params.id }, select: { id: true, hostId: true } })
    if (!event) throw new AppError(404, 'not_found', 'Event not found.')
    if (event.hostId !== user.id && user.role !== 'ADMIN') {
      throw new AppError(403, 'forbidden', 'Only the host can edit this event.')
    }
    const input = eventSchema.partial().extend({ status: z.enum(['PUBLISHED', 'CANCELLED', 'COMPLETED']).optional() }).parse(req.body)
    const updated = await prisma.event.update({ where: { id: event.id }, data: input })
    await audit(req, 'event.update', 'Event', event.id, { status: updated.status })
    res.json({ data: updated })
  }),
)

eventsRouter.post(
  '/:id/register',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = sessionUser(req)!
    const event = await prisma.event.findUnique({
      where: { id: req.params.id },
      include: { _count: { select: { registrations: true } }, host: { select: { id: true, role: true } } },
    })
    if (!event) throw new AppError(404, 'not_found', 'Event not found.')
    if (event.status !== 'PUBLISHED') throw new AppError(409, 'closed', 'This event is not open for registration.')
    if (event.startsAt.getTime() < Date.now()) throw new AppError(409, 'started', 'This event has already started.')
    if (event.capacity && event._count.registrations >= event.capacity) {
      throw new AppError(409, 'full', 'This event has reached its registration limit.')
    }

    const existing = await prisma.eventRegistration.findUnique({
      where: { eventId_userId: { eventId: event.id, userId: user.id } },
      select: { registeredAt: true },
    })
    if (existing) throw new AppError(409, 'duplicate', 'You are already registered for this event.')

    const registration = await prisma.eventRegistration.create({
      data: { eventId: event.id, userId: user.id },
    })
    await notify(
      user.id,
      'EVENT_REGISTRATION',
      'Event registration confirmed',
      `You are registered for "${event.title}".`,
      dashboardPath(user.role, 'events'),
    )
    if (event.hostId !== user.id) {
      await notify(
        event.hostId,
        'EVENT_REGISTRATION',
        'New event registration',
        `${user.email} registered for "${event.title}".`,
        dashboardPath(event.host.role, 'events'),
      )
    }
    await audit(req, 'event.register', 'Event', event.id)
    res.status(201).json({ data: registration })
  }),
)

eventsRouter.delete(
  '/:id/register',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = sessionUser(req)!
    const deleted = await prisma.eventRegistration.deleteMany({
      where: { eventId: req.params.id, userId: user.id, attendedAt: null },
    })
    if (deleted.count === 0) throw new AppError(404, 'not_found', 'No active registration to cancel.')
    const event = await prisma.event.findUnique({
      where: { id: req.params.id },
      select: { title: true, hostId: true, host: { select: { role: true } } },
    })
    if (event && event.hostId !== user.id) {
      await notify(
        event.hostId,
        'EVENT_REGISTRATION',
        'Event registration cancelled',
        `${user.email} cancelled their registration for "${event.title}".`,
        dashboardPath(event.host.role, 'events'),
      )
    }
    await audit(req, 'event.unregister', 'Event', req.params.id)
    res.status(204).end()
  }),
)

/** Attendance is explicit: only the host or an administrator can mark it. */
eventsRouter.patch(
  '/:id/attendance',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = sessionUser(req)!
    const schema = z.object({ userId: z.string().min(1), attended: z.boolean() })
    const input = schema.parse(req.body)
    const event = await prisma.event.findUnique({ where: { id: req.params.id }, select: { id: true, hostId: true } })
    if (!event) throw new AppError(404, 'not_found', 'Event not found.')
    if (event.hostId !== user.id && user.role !== 'ADMIN') {
      throw new AppError(403, 'forbidden', 'Only the host can record attendance.')
    }
    const registration = await prisma.eventRegistration.findUnique({
      where: { eventId_userId: { eventId: event.id, userId: input.userId } },
      select: { userId: true },
    })
    if (!registration) throw new AppError(404, 'not_found', 'That user is not registered for this event.')

    const updated = await prisma.eventRegistration.update({
      where: { eventId_userId: { eventId: event.id, userId: input.userId } },
      data: { attendedAt: input.attended ? new Date() : null },
    })
    await audit(req, 'event.attendance', 'Event', event.id, { userId: input.userId, attended: input.attended })
    res.json({ data: updated })
  }),
)

eventsRouter.post(
  '/:id/feedback',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = sessionUser(req)!
    const schema = z.object({
      rating: z.coerce.number().int().min(1).max(5),
      text: z.string().trim().max(1500).optional(),
    })
    const input = schema.parse(req.body)
    const event = await prisma.event.findUnique({
      where: { id: req.params.id },
      select: { id: true, title: true, startsAt: true, hostId: true, host: { select: { role: true } } },
    })
    if (!event) throw new AppError(404, 'not_found', 'Event not found.')
    if (event.startsAt.getTime() > Date.now()) {
      throw new AppError(409, 'not_started', 'Feedback opens once the event has started.')
    }
    const registration = await prisma.eventRegistration.findUnique({
      where: { eventId_userId: { eventId: event.id, userId: user.id } },
      select: { attendedAt: true },
    })
    if (!registration) throw new AppError(403, 'forbidden', 'Only registered attendees can leave feedback.')

    const updated = await prisma.eventRegistration.update({
      where: { eventId_userId: { eventId: event.id, userId: user.id } },
      data: { feedbackRating: input.rating, feedbackText: input.text },
    })
    if (event.hostId !== user.id) {
      await notify(
        event.hostId,
        'EVENT_REGISTRATION',
        'New event feedback',
        `${user.email} rated "${event.title}" ${input.rating}/5.`,
        dashboardPath(event.host.role, 'events'),
      )
    }
    await audit(req, 'event.feedback', 'Event', event.id, { rating: input.rating })
    res.json({ data: updated })
  }),
)
