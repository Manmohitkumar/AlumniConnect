import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../db'
import { requireAuth } from '../middleware/auth'
import { AppError, asyncHandler, cleanQuery, pageMeta, pagination } from '../lib/http'
import { audit, sessionUser } from '../lib/audit'
import { dashboardPath, notify } from '../lib/notify'

export const mentorsRouter = Router()
export const mentorshipRouter = Router()

mentorsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const page = pagination(req, 12)
    const q = cleanQuery(req.query.q, 80)
    const industry = cleanQuery(req.query.industry, 60)
    const skill = cleanQuery(req.query.skill, 60)
    const company = cleanQuery(req.query.company, 80)
    const country = cleanQuery(req.query.country, 80)
    const language = cleanQuery(req.query.language, 60)
    const universityId = cleanQuery(req.query.universityId, 40)
    const year = Number.parseInt(String(req.query.graduationYear ?? ''), 10)
    const openOnly = cleanQuery(req.query.mentorshipOpen, 6) !== 'false'

    const where = {
      role: 'ALUMNI',
      status: 'ACTIVE',
      ...(q ? { OR: [{ name: { contains: q } }, { headline: { contains: q } }] } : {}),
      alumniProfile: {
        is: {
          ...(industry ? { industry: { contains: industry } } : {}),
          ...(company ? { company: { contains: company } } : {}),
          ...(skill ? { expertise: { contains: skill } } : {}),
          ...(country ? { country: { contains: country } } : {}),
          ...(language ? { languages: { contains: language } } : {}),
          ...(universityId ? { universityId } : {}),
          ...(Number.isFinite(year) ? { graduationYear: year } : {}),
          ...(openOnly ? { mentorshipOpen: true } : {}),
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
          alumniProfile: {
            select: {
              company: true,
              designation: true,
              industry: true,
              graduationYear: true,
              expertise: true,
              mentorshipTopics: true,
              availability: true,
              timezone: true,
              country: true,
              languages: true,
              yearsExperience: true,
              mentorshipOpen: true,
              university: { select: { id: true, name: true, country: true } },
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ])

    res.json({ data: rows, meta: pageMeta(page, total) })
  }),
)

const requestSchema = z.object({
  mentorId: z.string().min(1),
  topic: z.string().trim().min(3).max(120),
  message: z.string().trim().min(20).max(2000),
})

mentorshipRouter.get(
  '/requests',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = sessionUser(req)!
    const side = cleanQuery(req.query.side, 10)
    const where =
      side === 'mentor'
        ? { mentorId: user.id }
        : side === 'student'
          ? { studentId: user.id }
          : { OR: [{ studentId: user.id }, { mentorId: user.id }] }

    const rows = await prisma.mentorshipRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        student: { select: { id: true, name: true, email: true, headline: true } },
        mentor: { select: { id: true, name: true, email: true, headline: true } },
        sessions: { orderBy: { scheduledAt: 'asc' } },
      },
    })
    res.json({ data: rows })
  }),
)

mentorshipRouter.post(
  '/requests',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = sessionUser(req)!
    if (user.role !== 'STUDENT') throw new AppError(403, 'forbidden', 'Only students can request mentorship.')
    const input = requestSchema.parse(req.body)
    if (input.mentorId === user.id) throw new AppError(400, 'invalid', 'You cannot request mentorship from yourself.')

    const mentor = await prisma.user.findUnique({
      where: { id: input.mentorId },
      select: { id: true, role: true, status: true, name: true, alumniProfile: { select: { mentorshipOpen: true } } },
    })
    if (!mentor || mentor.role !== 'ALUMNI' || mentor.status !== 'ACTIVE') {
      throw new AppError(404, 'not_found', 'Mentor not found.')
    }
    if (!mentor.alumniProfile?.mentorshipOpen) {
      throw new AppError(409, 'unavailable', 'This mentor is not accepting requests right now.')
    }

    const openRequest = await prisma.mentorshipRequest.findFirst({
      where: {
        studentId: user.id,
        mentorId: mentor.id,
        status: { in: ['PENDING', 'ACCEPTED'] },
      },
      select: { id: true },
    })
    if (openRequest) {
      throw new AppError(409, 'duplicate', 'You already have an open request with this mentor.')
    }

    const request = await prisma.mentorshipRequest.create({
      data: { studentId: user.id, mentorId: mentor.id, topic: input.topic, message: input.message },
    })

    await audit(req, 'mentorship.request', 'MentorshipRequest', request.id, { mentorId: mentor.id })
    await notify(
      mentor.id,
      'MENTORSHIP_REQUEST',
      'New mentorship request',
      `${user.email} asked for guidance on ${input.topic}.`,
      '/alumni/dashboard?tab=mentorship',
    )
    res.status(201).json({ data: request })
  }),
)

const respondSchema = z.object({ action: z.enum(['ACCEPT', 'DECLINE', 'CANCEL']) })

mentorshipRouter.patch(
  '/requests/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = sessionUser(req)!
    const { action } = respondSchema.parse(req.body)
    const request = await prisma.mentorshipRequest.findUnique({
      where: { id: req.params.id },
      include: { student: { select: { id: true, name: true } }, mentor: { select: { id: true, name: true } } },
    })
    if (!request) throw new AppError(404, 'not_found', 'Request not found.')

    const isMentor = request.mentorId === user.id
    const isStudent = request.studentId === user.id
    if (!isMentor && !isStudent) throw new AppError(403, 'forbidden', 'This request is not yours.')

    if (action === 'CANCEL') {
      if (!isStudent) throw new AppError(403, 'forbidden', 'Only the student can cancel this request.')
      if (!['PENDING', 'ACCEPTED'].includes(request.status)) {
        throw new AppError(409, 'invalid_state', 'This request can no longer be cancelled.')
      }
      const updated = await prisma.mentorshipRequest.update({
        where: { id: request.id },
        data: { status: 'CANCELLED', respondedAt: new Date() },
      })
      await notify(request.mentorId, 'MENTORSHIP_DECLINED', 'Mentorship request cancelled', 'The student cancelled their request.', '/alumni/dashboard?tab=mentorship')
      await audit(req, 'mentorship.cancel', 'MentorshipRequest', request.id)
      res.json({ data: updated })
      return
    }

    if (!isMentor) throw new AppError(403, 'forbidden', 'Only the mentor can accept or decline.')
    if (request.status !== 'PENDING') throw new AppError(409, 'invalid_state', 'This request has already been answered.')

    const status = action === 'ACCEPT' ? 'ACCEPTED' : 'DECLINED'
    const updated = await prisma.mentorshipRequest.update({
      where: { id: request.id },
      data: { status, respondedAt: new Date() },
    })
    await notify(
      request.studentId,
      action === 'ACCEPT' ? 'MENTORSHIP_ACCEPTED' : 'MENTORSHIP_DECLINED',
      action === 'ACCEPT' ? 'Mentorship request accepted' : 'Mentorship request declined',
      action === 'ACCEPT'
        ? `${request.mentor.name} accepted your request. You can now schedule a session.`
        : `${request.mentor.name} could not take this request right now.`,
      '/student/dashboard?tab=mentorship',
    )
    await audit(req, `mentorship.${action.toLowerCase()}`, 'MentorshipRequest', request.id)
    res.json({ data: updated })
  }),
)

const sessionSchema = z.object({
  scheduledAt: z.coerce.date(),
  durationMins: z.coerce.number().int().min(15).max(120).default(30),
  notes: z.string().max(1000).optional(),
})

mentorshipRouter.post(
  '/requests/:id/sessions',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = sessionUser(req)!
    const input = sessionSchema.parse(req.body)
    const request = await prisma.mentorshipRequest.findUnique({
      where: { id: req.params.id },
      include: { student: { select: { id: true, name: true } }, mentor: { select: { id: true, name: true } } },
    })
    if (!request) throw new AppError(404, 'not_found', 'Request not found.')
    if (request.studentId !== user.id && request.mentorId !== user.id) {
      throw new AppError(403, 'forbidden', 'This request is not yours.')
    }
    if (request.status !== 'ACCEPTED') {
      throw new AppError(409, 'invalid_state', 'The mentor must accept the request before scheduling.')
    }
    if (input.scheduledAt.getTime() < Date.now()) {
      throw new AppError(400, 'invalid_time', 'Choose a time in the future.')
    }

    const start = input.scheduledAt
    const end = new Date(start.getTime() + input.durationMins * 60000)
    const windowStart = new Date(start.getTime() - 120 * 60000)

    const nearby = await prisma.mentorshipSession.findMany({
      where: {
        status: 'SCHEDULED',
        scheduledAt: { gte: windowStart, lte: end },
        request: { OR: [{ studentId: request.studentId }, { mentorId: request.mentorId }] },
      },
      select: { scheduledAt: true, durationMins: true },
    })
    const clash = nearby.some((session) => {
      const otherStart = session.scheduledAt.getTime()
      const otherEnd = otherStart + session.durationMins * 60000
      return start.getTime() < otherEnd && end.getTime() > otherStart
    })
    if (clash) throw new AppError(409, 'double_booked', 'That time overlaps another mentorship session.')

    const session = await prisma.mentorshipSession.create({
      data: {
        requestId: request.id,
        scheduledAt: start,
        durationMins: input.durationMins,
        notes: input.notes,
        roomKey: 'mentor-room',
      },
    })

    const other = request.studentId === user.id ? request.mentorId : request.studentId
    await notify(
      other,
      'SESSION_SCHEDULED',
      'Mentorship session scheduled',
      `${user.email} scheduled a ${input.durationMins}-minute session for ${start.toLocaleString()}.`,
      `${other === request.studentId ? '/student' : '/alumni'}/dashboard?tab=mentorship`,
    )
    await audit(req, 'mentorship.schedule', 'MentorshipSession', session.id)
    res.status(201).json({ data: session })
  }),
)

const sessionUpdateSchema = z.object({
  action: z.enum(['COMPLETE', 'CANCEL']),
  rating: z.coerce.number().int().min(1).max(5).optional(),
  feedback: z.string().trim().max(2000).optional(),
})

mentorshipRouter.patch(
  '/sessions/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = sessionUser(req)!
    const input = sessionUpdateSchema.parse(req.body)
    const session = await prisma.mentorshipSession.findUnique({
      where: { id: req.params.id },
      include: { request: { select: { id: true, studentId: true, mentorId: true } } },
    })
    if (!session) throw new AppError(404, 'not_found', 'Session not found.')
    const { studentId, mentorId } = session.request
    if (studentId !== user.id && mentorId !== user.id) {
      throw new AppError(403, 'forbidden', 'This session is not yours.')
    }
    if (session.status !== 'SCHEDULED') throw new AppError(409, 'invalid_state', 'This session is already closed.')

    if (input.action === 'CANCEL') {
      const updated = await prisma.mentorshipSession.update({
        where: { id: session.id },
        data: { status: 'CANCELLED' },
      })
      const other = user.id === studentId ? mentorId : studentId
      await notify(
        other,
        'SESSION_REMINDER',
        'Mentorship session cancelled',
        `A ${session.scheduledAt.toLocaleString()} session was cancelled.`,
        dashboardPath(other === studentId ? 'STUDENT' : 'ALUMNI', 'mentorship'),
      )
      await audit(req, 'mentorship.session.cancel', 'MentorshipSession', session.id)
      res.json({ data: updated })
      return
    }

    if (session.scheduledAt.getTime() > Date.now()) {
      throw new AppError(409, 'not_started', 'A session can only be completed after its scheduled time.')
    }
    if (input.rating !== undefined && user.id !== studentId) {
      throw new AppError(403, 'forbidden', 'Only the student can rate the session.')
    }
    if (input.rating !== undefined && input.rating < 4 && !input.feedback?.trim()) {
      throw new AppError(400, 'feedback_required', 'Add a short note explaining the lower rating.')
    }

    const updated = await prisma.mentorshipSession.update({
      where: { id: session.id },
      data: {
        status: 'COMPLETED',
        rating: input.rating,
        feedback: input.feedback,
      },
    })

    const remaining = await prisma.mentorshipSession.count({
      where: { requestId: session.request.id, status: 'SCHEDULED' },
    })
    if (remaining === 0) {
      await prisma.mentorshipRequest.update({ where: { id: session.request.id }, data: { status: 'COMPLETED' } })
    }

    const other = user.id === studentId ? mentorId : studentId
    await notify(
      other,
      'SESSION_REMINDER',
      'Mentorship session completed',
      `The ${session.scheduledAt.toLocaleString()} session has been marked complete.`,
      dashboardPath(other === studentId ? 'STUDENT' : 'ALUMNI', 'mentorship'),
    )
    await audit(req, 'mentorship.session.complete', 'MentorshipSession', session.id, { rating: input.rating })
    res.json({ data: updated })
  }),
)

mentorshipRouter.get(
  '/analytics',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = sessionUser(req)!
    const isMentorSide = user.role === 'ALUMNI'

    const requests = await prisma.mentorshipRequest.findMany({
      where: isMentorSide ? { mentorId: user.id } : { studentId: user.id },
      select: { id: true, status: true, createdAt: true },
    })
    const requestIds = requests.map((r) => r.id)

    const [upcoming, completed, ratings] = await Promise.all([
      prisma.mentorshipSession.count({
        where: { requestId: { in: requestIds }, status: 'SCHEDULED', scheduledAt: { gte: new Date() } },
      }),
      prisma.mentorshipSession.count({ where: { requestId: { in: requestIds }, status: 'COMPLETED' } }),
      prisma.mentorshipSession.findMany({
        where: { requestId: { in: requestIds }, rating: { not: null } },
        select: { rating: true },
      }),
    ])

    const avgRating =
      ratings.length > 0 ? ratings.reduce((sum, r) => sum + (r.rating ?? 0), 0) / ratings.length : null

    res.json({
      data: {
        requestsReceived: isMentorSide ? requests.length : undefined,
        requestsSent: isMentorSide ? undefined : requests.length,
        pending: requests.filter((r) => r.status === 'PENDING').length,
        accepted: requests.filter((r) => r.status === 'ACCEPTED').length,
        completedRequests: requests.filter((r) => r.status === 'COMPLETED').length,
        sessionsCompleted: completed,
        sessionsUpcoming: upcoming,
        averageRating: avgRating ? Number(avgRating.toFixed(2)) : null,
        ratingCount: ratings.length,
      },
    })
  }),
)
