import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../db'
import { requireAuth, requireRole, type AuthedRequest } from '../middleware/auth'
import { AppError, asyncHandler, cleanQuery, pageMeta, pagination } from '../lib/http'
import { audit } from '../lib/audit'
import { dashboardPath } from '../lib/notify'

/**
 * University Representative portal API.
 *
 * Every handler derives the institution from the authenticated representative's
 * UniversityProfile. A universityId supplied by the client is never trusted, so
 * one institution cannot read or verify another institution's records.
 */
export const universityRouter = Router()

universityRouter.use(requireAuth, requireRole('UNIVERSITY'))

const DEFAULT_PERMISSIONS = ['VERIFY_STUDENTS', 'VERIFY_ALUMNI', 'ANNOUNCE', 'EVENTS', 'ANALYTICS', 'PROFILE']

type RepContext = {
  userId: string
  universityId: string
  universityName: string
  permissions: string[]
}

function parsePermissions(raw: string | null): string[] {
  if (!raw) return [...DEFAULT_PERMISSIONS]
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((entry): entry is string => typeof entry === 'string') : [...DEFAULT_PERMISSIONS]
  } catch {
    return [...DEFAULT_PERMISSIONS]
  }
}

async function repContext(req: Parameters<typeof audit>[0]): Promise<RepContext> {
  const authed = (req as AuthedRequest).user!
  const profile = await prisma.universityProfile.findUnique({
    where: { userId: authed.sub },
    select: {
      permissions: true,
      verified: true,
      university: { select: { id: true, name: true, verified: true } },
    },
  })
  if (!profile || !profile.verified) {
    throw new AppError(403, 'forbidden', 'Your university representative access is not active.')
  }
  // An institution deactivated by a platform administrator locks out its
  // representatives without touching student or alumni accounts.
  if (!profile.university.verified) {
    throw new AppError(403, 'institution_inactive', 'This institution is not active on the platform.')
  }
  return {
    userId: authed.sub,
    universityId: profile.university.id,
    universityName: profile.university.name,
    permissions: parsePermissions(profile.permissions),
  }
}

function requirePermission(ctx: RepContext, permission: string) {
  if (!ctx.permissions.includes(permission)) {
    throw new AppError(403, 'forbidden', `Your representative account does not have the ${permission} permission.`)
  }
}

const verificationSchema = z.object({
  status: z.enum(['VERIFIED', 'REJECTED']),
  note: z.string().trim().max(500).optional().nullable(),
})

universityRouter.get(
  '/overview',
  asyncHandler(async (req, res) => {
    const ctx = await repContext(req)
    const [students, alumni, pendingStudents, pendingAlumni, events, announcements] = await Promise.all([
      prisma.studentProfile.count({ where: { universityId: ctx.universityId } }),
      prisma.alumniProfile.count({ where: { universityId: ctx.universityId } }),
      prisma.studentProfile.count({ where: { universityId: ctx.universityId, verificationStatus: 'PENDING' } }),
      prisma.alumniProfile.count({ where: { universityId: ctx.universityId, verificationStatus: 'PENDING' } }),
      prisma.event.count({ where: { universityId: ctx.universityId } }),
      prisma.notification.count({ where: { type: 'ANNOUNCEMENT', user: { universityProfile: { universityId: ctx.universityId } } } }),
    ])
    const university = await prisma.university.findUnique({
      where: { id: ctx.universityId },
      select: { id: true, name: true, shortName: true, city: true, domain: true, verified: true },
    })
    res.json({
      data: {
        university,
        permissions: ctx.permissions,
        counts: { students, alumni, pendingStudents, pendingAlumni, events, announcements },
        meta: { source: 'database', scopedTo: ctx.universityId },
      },
    })
  }),
)

universityRouter.get(
  '/students',
  asyncHandler(async (req, res) => {
    const ctx = await repContext(req)
    const page = pagination(req, 20)
    const q = cleanQuery(req.query.q, 80)
    const status = cleanQuery(req.query.status, 20).toUpperCase()
    const where = {
      universityId: ctx.universityId,
      ...(status ? { verificationStatus: status } : {}),
      ...(q
        ? {
            OR: [
              { registrationNumber: { contains: q } },
              { department: { contains: q } },
              { course: { contains: q } },
              { user: { name: { contains: q } } },
              { user: { email: { contains: q } } },
            ],
          }
        : {}),
    }
    const [rows, total] = await Promise.all([
      prisma.studentProfile.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: page.skip,
        take: page.take,
        select: {
          id: true,
          registrationNumber: true,
          department: true,
          course: true,
          currentYear: true,
          semester: true,
          graduationYear: true,
          verificationStatus: true,
          verifiedAt: true,
          user: { select: { id: true, name: true, email: true, emailVerified: true, status: true } },
        },
      }),
      prisma.studentProfile.count({ where }),
    ])
    res.json({ data: rows, meta: pageMeta(page, total) })
  }),
)

universityRouter.get(
  '/alumni',
  asyncHandler(async (req, res) => {
    const ctx = await repContext(req)
    const page = pagination(req, 20)
    const q = cleanQuery(req.query.q, 80)
    const status = cleanQuery(req.query.status, 20).toUpperCase()
    const where = {
      universityId: ctx.universityId,
      ...(status ? { verificationStatus: status } : {}),
      ...(q
        ? {
            OR: [
              { registrationNumber: { contains: q } },
              { company: { contains: q } },
              { designation: { contains: q } },
              { user: { name: { contains: q } } },
              { user: { email: { contains: q } } },
            ],
          }
        : {}),
    }
    const [rows, total] = await Promise.all([
      prisma.alumniProfile.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: page.skip,
        take: page.take,
        select: {
          id: true,
          registrationNumber: true,
          graduationYear: true,
          company: true,
          designation: true,
          industry: true,
          verificationStatus: true,
          verifiedAt: true,
          user: { select: { id: true, name: true, email: true, emailVerified: true, status: true } },
        },
      }),
      prisma.alumniProfile.count({ where }),
    ])
    res.json({ data: rows, meta: pageMeta(page, total) })
  }),
)

universityRouter.patch(
  '/students/:profileId/verification',
  asyncHandler(async (req, res) => {
    const ctx = await repContext(req)
    requirePermission(ctx, 'VERIFY_STUDENTS')
    const input = verificationSchema.parse(req.body)
    const profile = await prisma.studentProfile.findUnique({
      where: { id: req.params.profileId },
      select: { id: true, userId: true, universityId: true, user: { select: { emailVerified: true } } },
    })
    if (!profile || profile.universityId !== ctx.universityId) {
      throw new AppError(404, 'not_found', 'Student record not found for your institution.')
    }
    if (input.status === 'VERIFIED' && !profile.user.emailVerified) {
      throw new AppError(409, 'email_unverified', 'The student must verify their email before identity verification.')
    }

    await prisma.studentProfile.update({
      where: { id: profile.id },
      data: {
        verificationStatus: input.status,
        verifiedAt: input.status === 'VERIFIED' ? new Date() : null,
        verifiedById: input.status === 'VERIFIED' ? ctx.userId : null,
      },
    })
    await prisma.notification.create({
      data: {
        userId: profile.userId,
        type: 'MODERATION',
        title: input.status === 'VERIFIED' ? 'University identity verified' : 'University verification declined',
        body:
          input.status === 'VERIFIED'
            ? `Your student identity was verified by ${ctx.universityName}.`
            : `Your identity verification was declined by ${ctx.universityName}.${input.note ? ` Note: ${input.note}` : ''}`,
        link: '/student/dashboard',
      },
    })
    await audit(req, 'university.student_verification', 'StudentProfile', profile.id, {
      status: input.status,
      universityId: ctx.universityId,
    })
    res.json({ data: { id: profile.id, status: input.status } })
  }),
)

universityRouter.patch(
  '/alumni/:profileId/verification',
  asyncHandler(async (req, res) => {
    const ctx = await repContext(req)
    requirePermission(ctx, 'VERIFY_ALUMNI')
    const input = verificationSchema.parse(req.body)
    const profile = await prisma.alumniProfile.findUnique({
      where: { id: req.params.profileId },
      select: { id: true, userId: true, universityId: true, user: { select: { emailVerified: true } } },
    })
    if (!profile || profile.universityId !== ctx.universityId) {
      throw new AppError(404, 'not_found', 'Alumni record not found for your institution.')
    }
    if (input.status === 'VERIFIED' && !profile.user.emailVerified) {
      throw new AppError(409, 'email_unverified', 'The alumnus must verify their email before identity verification.')
    }

    await prisma.alumniProfile.update({
      where: { id: profile.id },
      data: {
        verificationStatus: input.status,
        verifiedAt: input.status === 'VERIFIED' ? new Date() : null,
        verifiedById: input.status === 'VERIFIED' ? ctx.userId : null,
      },
    })
    await prisma.notification.create({
      data: {
        userId: profile.userId,
        type: 'MODERATION',
        title: input.status === 'VERIFIED' ? 'University identity verified' : 'University verification declined',
        body:
          input.status === 'VERIFIED'
            ? `Your alumni identity was verified by ${ctx.universityName}.`
            : `Your identity verification was declined by ${ctx.universityName}.${input.note ? ` Note: ${input.note}` : ''}`,
        link: '/alumni/dashboard',
      },
    })
    await audit(req, 'university.alumni_verification', 'AlumniProfile', profile.id, {
      status: input.status,
      universityId: ctx.universityId,
    })
    res.json({ data: { id: profile.id, status: input.status } })
  }),
)

universityRouter.get(
  '/events',
  asyncHandler(async (req, res) => {
    const ctx = await repContext(req)
    const rows = await prisma.event.findMany({
      where: { universityId: ctx.universityId },
      orderBy: { startsAt: 'asc' },
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        mode: true,
        location: true,
        metaverseRoom: true,
        startsAt: true,
        endsAt: true,
        capacity: true,
        status: true,
        host: { select: { id: true, name: true } },
        _count: { select: { registrations: true } },
      },
    })
    res.json({
      data: rows.map(({ _count, ...row }) => ({ ...row, registrationCount: _count.registrations })),
    })
  }),
)

const eventSchema = z.object({
  title: z.string().trim().min(4).max(140),
  description: z.string().trim().min(10).max(2000),
  category: z.string().trim().min(2).max(60),
  mode: z.enum(['ONLINE', 'CAMPUS', 'METAVERSE']).default('CAMPUS'),
  location: z.string().trim().max(200).optional().nullable(),
  metaverseRoom: z.string().trim().max(60).optional().nullable(),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date().optional().nullable(),
  capacity: z.coerce.number().int().min(1).max(10000).optional().nullable(),
})

universityRouter.post(
  '/events',
  asyncHandler(async (req, res) => {
    const ctx = await repContext(req)
    requirePermission(ctx, 'EVENTS')
    const input = eventSchema.parse(req.body)
    if (input.startsAt.getTime() < Date.now()) {
      throw new AppError(400, 'invalid_date', 'The event must start in the future.')
    }
    if (input.endsAt && input.endsAt <= input.startsAt) {
      throw new AppError(400, 'invalid_date', 'The event must end after it starts.')
    }

    const event = await prisma.event.create({
      data: {
        title: input.title,
        description: input.description,
        category: input.category,
        mode: input.mode,
        location: input.location ?? null,
        metaverseRoom: input.metaverseRoom ?? null,
        startsAt: input.startsAt,
        endsAt: input.endsAt ?? null,
        capacity: input.capacity ?? null,
        hostId: ctx.userId,
        universityId: ctx.universityId,
      },
      select: { id: true, title: true, startsAt: true },
    })

    // Notify the institution's students and alumni (in-app, capped batch).
    const members = await prisma.user.findMany({
      where: {
        status: 'ACTIVE',
        OR: [
          { studentProfile: { universityId: ctx.universityId } },
          { alumniProfile: { universityId: ctx.universityId } },
        ],
      },
      select: { id: true, role: true },
      take: 500,
    })
    if (members.length > 0) {
      await prisma.notification.createMany({
        data: members.map((member) => ({
          userId: member.id,
          type: 'ANNOUNCEMENT',
          title: `New event: ${event.title}`,
          body: `${ctx.universityName} published an event starting ${event.startsAt.toISOString().slice(0, 16).replace('T', ' ')} UTC.`,
          link: dashboardPath(member.role, 'events'),
        })),
      })
    }

    await audit(req, 'university.event_created', 'Event', event.id, { universityId: ctx.universityId })
    res.status(201).json({ data: event, notified: members.length })
  }),
)

universityRouter.post(
  '/announcements',
  asyncHandler(async (req, res) => {
    const ctx = await repContext(req)
    requirePermission(ctx, 'ANNOUNCE')
    const input = z
      .object({
        title: z.string().trim().min(4).max(140),
        body: z.string().trim().min(10).max(2000),
        audience: z.enum(['STUDENTS', 'ALUMNI', 'ALL']).default('ALL'),
      })
      .parse(req.body)

    const audienceFilter =
      input.audience === 'STUDENTS'
        ? { studentProfile: { universityId: ctx.universityId } }
        : input.audience === 'ALUMNI'
          ? { alumniProfile: { universityId: ctx.universityId } }
          : {
              OR: [
                { studentProfile: { universityId: ctx.universityId } },
                { alumniProfile: { universityId: ctx.universityId } },
              ],
            }

    const recipients = await prisma.user.findMany({
      where: { status: 'ACTIVE', ...audienceFilter },
      select: { id: true, role: true },
      take: 500,
    })
    if (recipients.length > 0) {
      await prisma.notification.createMany({
        data: recipients.map((recipient) => ({
          userId: recipient.id,
          type: 'ANNOUNCEMENT',
          title: `[${ctx.universityName}] ${input.title}`,
          body: input.body,
          link: dashboardPath(recipient.role, 'overview'),
        })),
      })
    }
    await audit(req, 'university.announcement', 'Notification', null, {
      universityId: ctx.universityId,
      audience: input.audience,
      recipients: recipients.length,
    })
    res.status(201).json({ data: { recipients: recipients.length } })
  }),
)

universityRouter.get(
  '/profile',
  asyncHandler(async (req, res) => {
    const ctx = await repContext(req)
    const profile = await prisma.universityProfile.findUnique({
      where: { userId: ctx.userId },
      select: {
        designation: true,
        department: true,
        permissions: true,
        verified: true,
        createdAt: true,
        user: { select: { id: true, name: true, email: true } },
        university: {
          select: {
            id: true, name: true, shortName: true, city: true, domain: true, verified: true, createdAt: true,
            country: true, region: true, website: true, defaultLocale: true, languages: true, timeZone: true,
          },
        },
      },
    })
    res.json({ data: { ...profile, permissions: ctx.permissions } })
  }),
)

universityRouter.patch(
  '/profile',
  asyncHandler(async (req, res) => {
    const ctx = await repContext(req)
    requirePermission(ctx, 'PROFILE')
    const input = z
      .object({
        designation: z.string().trim().max(120).optional().nullable(),
        department: z.string().trim().max(120).optional().nullable(),
        name: z.string().trim().min(1).max(120).optional(),
        country: z.string().trim().max(80).optional().nullable(),
        region: z.string().trim().max(120).optional().nullable(),
        website: z.string().trim().max(200).optional().nullable(),
        defaultLocale: z.string().trim().max(8).optional(),
        languages: z.string().trim().max(200).optional().nullable(),
        timeZone: z.string().trim().max(64).optional().nullable(),
      })
      .parse(req.body)

    if (input.name) {
      await prisma.user.update({ where: { id: ctx.userId }, data: { name: input.name } })
    }
    if (
      input.country !== undefined || input.region !== undefined || input.website !== undefined ||
      input.defaultLocale !== undefined || input.languages !== undefined || input.timeZone !== undefined
    ) {
      await prisma.university.update({
        where: { id: ctx.universityId },
        data: {
          ...(input.country !== undefined ? { country: input.country } : {}),
          ...(input.region !== undefined ? { region: input.region } : {}),
          ...(input.website !== undefined ? { website: input.website || null } : {}),
          ...(input.defaultLocale !== undefined ? { defaultLocale: input.defaultLocale } : {}),
          ...(input.languages !== undefined ? { languages: input.languages } : {}),
          ...(input.timeZone !== undefined ? { timeZone: input.timeZone } : {}),
        },
      })
    }
    const profile = await prisma.universityProfile.update({
      where: { userId: ctx.userId },
      data: { designation: input.designation, department: input.department },
      select: { designation: true, department: true },
    })
    await audit(req, 'university.profile_update', 'UniversityProfile', ctx.userId, { universityId: ctx.universityId })
    res.json({ data: profile })
  }),
)

universityRouter.get(
  '/analytics',
  asyncHandler(async (req, res) => {
    const ctx = await repContext(req)
    requirePermission(ctx, 'ANALYTICS')

    const [students, alumni, verifiedStudents, verifiedAlumni, pending, events, registrations] = await Promise.all([
      prisma.studentProfile.count({ where: { universityId: ctx.universityId } }),
      prisma.alumniProfile.count({ where: { universityId: ctx.universityId } }),
      prisma.studentProfile.count({ where: { universityId: ctx.universityId, verificationStatus: 'VERIFIED' } }),
      prisma.alumniProfile.count({ where: { universityId: ctx.universityId, verificationStatus: 'VERIFIED' } }),
      prisma.studentProfile.count({ where: { universityId: ctx.universityId, verificationStatus: 'PENDING' } }),
      prisma.event.count({ where: { universityId: ctx.universityId } }),
      prisma.eventRegistration.count({ where: { event: { universityId: ctx.universityId } } }),
    ])

    const departmentRows = await prisma.studentProfile.groupBy({
      by: ['department'],
      where: { universityId: ctx.universityId },
      _count: { _all: true },
    })

    res.json({
      data: {
        students,
        alumni,
        verified: { students: verifiedStudents, alumni: verifiedAlumni },
        pendingVerifications: pending,
        events,
        eventRegistrations: registrations,
        byDepartment: departmentRows
          .map((row) => ({ department: row.department ?? 'Not specified', count: row._count._all }))
          .sort((a, b) => b.count - a.count),
        meta: { source: 'database', scopedTo: ctx.universityId, seededDemo: true },
      },
    })
  }),
)
