import { Router } from 'express'
import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '../db'
import { requireAuth, requireRole } from '../middleware/auth'
import { AppError, asyncHandler, cleanQuery, pageMeta, pagination } from '../lib/http'
import { audit, sessionUser } from '../lib/audit'
import { dashboardPath, notify } from '../lib/notify'

export const adminRouter = Router()

adminRouter.use(requireAuth, requireRole('ADMIN'))

const bucketByDay = (dates: Date[], days: number) => {
  const buckets: Array<{ date: string; count: number }> = []
  const now = new Date()
  for (let i = days - 1; i >= 0; i -= 1) {
    const day = new Date(now)
    day.setDate(day.getDate() - i)
    day.setHours(0, 0, 0, 0)
    buckets.push({ date: day.toISOString().slice(0, 10), count: 0 })
  }
  const index = new Map(buckets.map((bucket) => [bucket.date, bucket]))
  for (const date of dates) {
    const key = date.toISOString().slice(0, 10)
    const bucket = index.get(key)
    if (bucket) bucket.count += 1
  }
  return buckets
}

adminRouter.get(
  '/analytics',
  asyncHandler(async (req, res) => {
    const requested = Number.parseInt(String(req.query.days ?? '30'), 10)
    const days = Number.isFinite(requested) ? Math.min(Math.max(requested, 7), 180) : 30
    const since = new Date(Date.now() - days * 86400000)

    const [
      usersByRole,
      activeStudents,
      submissions,
      evaluatedSubmissions,
      challenges,
      participations,
      mentorshipRequests,
      mentorshipSessions,
      certificates,
      events,
      eventRegistrations,
      attended,
      roomVisits,
      opportunities,
      applications,
      resources,
      universities,
      pendingStudentVerifications,
      pendingAlumniVerifications,
    ] = await Promise.all([
      prisma.user.groupBy({ by: ['role'], _count: { _all: true } }),
      prisma.user.count({ where: { role: 'STUDENT', submissions: { some: { createdAt: { gte: since } } } } }),
      prisma.submission.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
      prisma.submission.count({ where: { status: 'EVALUATED' } }),
      prisma.challenge.count({ where: { status: 'OPEN' } }),
      prisma.challengeParticipant.count({ where: { joinedAt: { gte: since } } }),
      prisma.mentorshipRequest.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true, status: true } }),
      prisma.mentorshipSession.count({ where: { status: 'COMPLETED', scheduledAt: { gte: since } } }),
      prisma.certificate.count({ where: { issuedAt: { gte: since }, revokedAt: null } }),
      prisma.event.count({ where: { startsAt: { gte: since } } }),
      prisma.eventRegistration.count({ where: { registeredAt: { gte: since } } }),
      prisma.eventRegistration.count({ where: { attendedAt: { not: null, gte: since } } }),
      prisma.roomVisit.findMany({ where: { joinedAt: { gte: since } }, select: { joinedAt: true, roomKey: true } }),
      prisma.opportunity.count({ where: { status: 'OPEN' } }),
      prisma.application.count({ where: { createdAt: { gte: since } } }),
      prisma.knowledgeResource.count({ where: { status: 'PUBLISHED' } }),
      prisma.university.count(),
      prisma.studentProfile.count({ where: { verificationStatus: 'PENDING' } }),
      prisma.alumniProfile.count({ where: { verificationStatus: 'PENDING' } }),
    ])

    const roles = Object.fromEntries(usersByRole.map((row) => [row.role, row._count._all]))
    const roomCounts = new Map<string, number>()
    for (const visit of roomVisits) {
      roomCounts.set(visit.roomKey, (roomCounts.get(visit.roomKey) ?? 0) + 1)
    }

    res.json({
      data: {
        rangeDays: days,
        since,
        users: {
          total: usersByRole.reduce((sum, row) => sum + row._count._all, 0),
          byRole: {
            students: roles.STUDENT ?? 0,
            alumni: roles.ALUMNI ?? 0,
            university: roles.UNIVERSITY ?? 0,
            companies: roles.COMPANY ?? 0,
            admins: roles.ADMIN ?? 0,
          },
          activeStudents,
        },
        challenges: { open: challenges, participations },
        submissions: { total: submissions.length, evaluated: evaluatedSubmissions },
        mentorship: {
          requests: mentorshipRequests.length,
          accepted: mentorshipRequests.filter((r) => ['ACCEPTED', 'COMPLETED'].includes(r.status)).length,
          sessionsCompleted: mentorshipSessions,
        },
        recognition: { certificates },
        events: { created: events, registrations: eventRegistrations, attended },
        metaverse: {
          visits: roomVisits.length,
          byRoom: [...roomCounts.entries()].map(([roomKey, count]) => ({ roomKey, count })),
        },
        careers: { openOpportunities: opportunities, applications },
        resources,
        institutions: {
          universities,
          pendingStudentVerifications,
          pendingAlumniVerifications,
        },
        series: {
          submissions: bucketByDay(submissions.map((s) => s.createdAt), days),
          mentorshipRequests: bucketByDay(mentorshipRequests.map((m) => m.createdAt), days),
          roomVisits: bucketByDay(roomVisits.map((v) => v.joinedAt), days),
        },
        meta: { source: 'database', seededDemo: true },
      },
    })
  }),
)

adminRouter.get(
  '/adoption',
  asyncHandler(async (_req, res) => {
    const now = Date.now()
    const d7 = new Date(now - 7 * 86400000)
    const d30 = new Date(now - 30 * 86400000)

    // Seeded demo accounts must never inflate adoption numbers. Domains are
    // configurable so a pilot deployment can list its own test domains.
    const demoDomains = (process.env.DEMO_EMAIL_DOMAINS ?? 'example.edu,demo.edu')
      .split(',')
      .map((domain) => domain.trim().toLowerCase().replace(/^@/, ''))
      .filter(Boolean)
    const demoWhere = demoDomains.length
      ? { OR: demoDomains.map((domain) => ({ email: { endsWith: `@${domain}` } })) }
      : undefined
    const notDemo = demoWhere ? { NOT: demoWhere } : {}

    const studentActivation = {
      OR: [
        { challengeParticipations: { some: {} } },
        { submissions: { some: {} } },
        { mentorshipAsStudent: { some: {} } },
        { portfolioProjects: { some: {} } },
      ],
    }
    const alumniActivation = {
      OR: [
        { mentorshipAsMentor: { some: {} } },
        { challenges: { some: {} } },
        { resources: { some: {} } },
        { evaluatedSubmissions: { some: {} } },
      ],
    }
    const studentProfileComplete = {
      headline: { not: null },
      bio: { not: null },
      studentProfile: { is: { department: { not: null }, skills: { not: null } } },
    }
    const alumniProfileComplete = {
      headline: { not: null },
      bio: { not: null },
      alumniProfile: { is: { expertise: { not: null }, industry: { not: null } } },
    }

    const [
      usersByRole,
      newUsers7,
      newUsers30,
      emailVerified,
      excludedUsers,
      studentVerification,
      alumniVerification,
      universitiesTotal,
      universitiesVerified,
      repsActive,
      repsActive30,
      studentsActivated,
      alumniActivated,
      studentsProfileCompleteCount,
      alumniProfileCompleteCount,
      active7,
      active30,
      returning7,
      newActive7,
      challengeJoins,
      submissions,
      mentorshipRequests,
      sessionsCompleted,
      eventRegistrations,
      certificatesIssued,
      resourcesPublished,
      applications,
      roomVisits,
      studentsRetainedCount,
      alumniRetainedCount,
    ] = await Promise.all([
      prisma.user.groupBy({ by: ['role'], where: { ...notDemo }, _count: { _all: true } }),
      prisma.user.count({ where: { ...notDemo, createdAt: { gte: d7 } } }),
      prisma.user.count({ where: { ...notDemo, createdAt: { gte: d30 } } }),
      prisma.user.count({ where: { ...notDemo, emailVerified: true } }),
      demoWhere ? prisma.user.count({ where: demoWhere }) : Promise.resolve(0),
      prisma.studentProfile.groupBy({
        by: ['verificationStatus'],
        where: { user: { is: notDemo } },
        _count: { _all: true },
      }),
      prisma.alumniProfile.groupBy({
        by: ['verificationStatus'],
        where: { user: { is: notDemo } },
        _count: { _all: true },
      }),
      prisma.university.count(),
      prisma.university.count({ where: { verified: true } }),
      prisma.user.count({ where: { role: 'UNIVERSITY', status: 'ACTIVE', ...notDemo } }),
      prisma.user.count({ where: { role: 'UNIVERSITY', status: 'ACTIVE', ...notDemo, lastActiveAt: { gte: d30 } } }),
      prisma.user.count({ where: { role: 'STUDENT', ...notDemo, ...studentActivation } }),
      prisma.user.count({ where: { role: 'ALUMNI', ...notDemo, ...alumniActivation } }),
      prisma.user.count({ where: { role: 'STUDENT', ...notDemo, ...studentProfileComplete } }),
      prisma.user.count({ where: { role: 'ALUMNI', ...notDemo, ...alumniProfileComplete } }),
      prisma.user.count({ where: { ...notDemo, lastActiveAt: { gte: d7 } } }),
      prisma.user.count({ where: { ...notDemo, lastActiveAt: { gte: d30 } } }),
      prisma.user.count({ where: { ...notDemo, lastActiveAt: { gte: d7 }, createdAt: { lt: d7 } } }),
      prisma.user.count({ where: { ...notDemo, lastActiveAt: { gte: d7 }, createdAt: { gte: d7 } } }),
      prisma.challengeParticipant.count({ where: { joinedAt: { gte: d30 }, user: { is: notDemo } } }),
      prisma.submission.count({ where: { createdAt: { gte: d30 }, student: { is: notDemo } } }),
      prisma.mentorshipRequest.count({ where: { createdAt: { gte: d30 }, student: { is: notDemo } } }),
      prisma.mentorshipSession.count({
        where: { status: 'COMPLETED', scheduledAt: { gte: d30 }, request: { student: { is: notDemo } } },
      }),
      prisma.eventRegistration.count({ where: { registeredAt: { gte: d30 }, user: { is: notDemo } } }),
      prisma.certificate.count({ where: { issuedAt: { gte: d30 }, revokedAt: null, user: { is: notDemo } } }),
      prisma.knowledgeResource.count({ where: { status: 'PUBLISHED', createdAt: { gte: d30 }, author: { is: notDemo } } }),
      prisma.application.count({ where: { createdAt: { gte: d30 }, student: { is: notDemo } } }),
      prisma.roomVisit.count({ where: { joinedAt: { gte: d30 }, user: { is: notDemo } } }),
      prisma.user.count({
        where: { role: 'STUDENT', ...notDemo, lastActiveAt: { gte: d7 }, ...studentActivation },
      }),
      prisma.user.count({
        where: { role: 'ALUMNI', ...notDemo, lastActiveAt: { gte: d7 }, ...alumniActivation },
      }),
    ])

    const roles = Object.fromEntries(usersByRole.map((row) => [row.role, row._count._all])) as Record<string, number>
    const students = roles.STUDENT ?? 0
    const alumni = roles.ALUMNI ?? 0
    const totalUsers = usersByRole.reduce((sum, row) => sum + row._count._all, 0)

    const tally = (groups: Array<{ verificationStatus: string; _count: { _all: number } }>) => {
      const counts = Object.fromEntries(groups.map((row) => [row.verificationStatus, row._count._all]))
      return {
        verified: counts.VERIFIED ?? 0,
        pending: counts.PENDING ?? 0,
        unverified: counts.UNVERIFIED ?? 0,
        rejected: counts.REJECTED ?? 0,
      }
    }
    const studentsByVerification = tally(studentVerification)
    const alumniByVerification = tally(alumniVerification)

    const rate = (part: number, whole: number) => (whole > 0 ? Number(((part / whole) * 100).toFixed(1)) : null)
    const funnel = (registered: number, verified: number, complete: number, activated: number, retained: number) => {
      const stages = [
        { stage: 'registered', count: registered },
        { stage: 'email_verified', count: verified },
        { stage: 'profile_complete', count: complete },
        { stage: 'first_action', count: activated },
        { stage: 'active_last_7d', count: retained },
      ]
      return stages.map((stage, index) => ({
        ...stage,
        conversionFromPrevious: index === 0 ? 100 : rate(stage.count, stages[index - 1].count),
      }))
    }

    const studentsVerifiedEmail = await prisma.user.count({ where: { role: 'STUDENT', ...notDemo, emailVerified: true } })
    const alumniVerifiedEmail = await prisma.user.count({ where: { role: 'ALUMNI', ...notDemo, emailVerified: true } })

    res.json({
      data: {
        generatedAt: new Date(),
        exclusions: { demoDomains, excludedUsers },
        definitions: {
          activeUser: 'Account with a recorded sign-in or authenticated request in the window (lastActiveAt).',
          studentActivation:
            'Joined a challenge, submitted a project, sent a mentorship request, or added a portfolio project.',
          alumniActivation:
            'Mentored a student, authored a challenge or resource, or evaluated a submission.',
          profileComplete: 'Headline, bio and the role-specific fields (department/skills or expertise/industry) are filled in.',
          returningUser: 'Active in the last 7 days on an account created more than 7 days ago.',
          excluded: 'Users on demo domains are excluded from every metric above.',
        },
        registrations: {
          total: totalUsers,
          byRole: {
            students,
            alumni,
            university: roles.UNIVERSITY ?? 0,
            companies: roles.COMPANY ?? 0,
            admins: roles.ADMIN ?? 0,
          },
          newLast7d: newUsers7,
          newLast30d: newUsers30,
          emailVerified,
          emailVerificationRate: rate(emailVerified, totalUsers),
        },
        verification: {
          students: studentsByVerification,
          alumni: alumniByVerification,
          totalVerified: studentsByVerification.verified + alumniByVerification.verified,
          totalPending: studentsByVerification.pending + alumniByVerification.pending,
        },
        institutions: {
          total: universitiesTotal,
          verified: universitiesVerified,
          representatives: repsActive,
          representativesActive30d: repsActive30,
        },
        activation: {
          students: { activated: studentsActivated, registered: students, rate: rate(studentsActivated, students) },
          alumni: { activated: alumniActivated, registered: alumni, rate: rate(alumniActivated, alumni) },
        },
        engagement: {
          activeLast7d: active7,
          activeLast30d: active30,
          wauMauRatio: active30 > 0 ? Number((active7 / active30).toFixed(2)) : null,
          returningLast7d: returning7,
          newActiveLast7d: newActive7,
          activitiesLast30d: {
            challengeJoins,
            submissions,
            mentorshipRequests,
            sessionsCompleted,
            eventRegistrations,
            certificatesIssued,
            resourcesPublished,
            applications,
            metaverseVisits: roomVisits,
          },
        },
        funnel: {
          students: funnel(students, studentsVerifiedEmail, studentsProfileCompleteCount, studentsActivated, studentsRetainedCount),
          alumni: funnel(alumni, alumniVerifiedEmail, alumniProfileCompleteCount, alumniActivated, alumniRetainedCount),
        },
        meta: { source: 'database', seededDemoExcluded: true },
      },
    })
  }),
)

adminRouter.get(
  '/users',
  asyncHandler(async (req, res) => {
    const page = pagination(req, 20)
    const q = cleanQuery(req.query.q, 80)
    const role = cleanQuery(req.query.role, 20)
    const status = cleanQuery(req.query.status, 20)

    const where = {
      ...(q ? { OR: [{ name: { contains: q } }, { email: { contains: q } }] } : {}),
      ...(role ? { role: role.toUpperCase() } : {}),
      ...(status ? { status: status.toUpperCase() } : {}),
    }
    const [rows, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: page.skip,
        take: page.take,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          emailVerified: true,
          mustChangePassword: true,
          createdAt: true,
          lastActiveAt: true,
          universityProfile: {
            select: { university: { select: { id: true, name: true } }, designation: true, permissions: true },
          },
          studentProfile: { select: { verificationStatus: true, university: { select: { name: true } } } },
          alumniProfile: { select: { verificationStatus: true, university: { select: { name: true } } } },
          _count: { select: { submissions: true, certificates: true } },
        },
      }),
      prisma.user.count({ where }),
    ])
    res.json({ data: rows, meta: pageMeta(page, total) })
  }),
)

const userUpdateSchema = z.object({
  role: z.enum(['STUDENT', 'ALUMNI', 'COMPANY', 'ADMIN']).optional(),
  status: z.enum(['ACTIVE', 'SUSPENDED']).optional(),
  emailVerified: z.boolean().optional(),
})

adminRouter.patch(
  '/users/:id',
  asyncHandler(async (req, res) => {
    const actor = sessionUser(req)!
    const input = userUpdateSchema.parse(req.body)
    if (req.params.id === actor.id && (input.role || input.status === 'SUSPENDED')) {
      throw new AppError(403, 'forbidden', 'You cannot change your own role or suspend your own account.')
    }
    const target = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: { id: true, role: true, name: true },
    })
    if (!target) throw new AppError(404, 'not_found', 'User not found.')
    if (target.role === 'ADMIN' && input.role && input.role !== 'ADMIN') {
      const admins = await prisma.user.count({ where: { role: 'ADMIN', status: 'ACTIVE' } })
      if (admins <= 1) throw new AppError(409, 'last_admin', 'At least one active administrator is required.')
    }

    if (input.role && input.role !== target.role) {
      // Role-specific profile scaffolds so the account has somewhere to store data.
      if (input.role === 'ALUMNI') {
        await prisma.alumniProfile.upsert({
          where: { userId: target.id },
          update: {},
          create: { userId: target.id },
        })
      }
      if (input.role === 'STUDENT') {
        await prisma.studentProfile.upsert({
          where: { userId: target.id },
          update: {},
          create: { userId: target.id },
        })
      }
    }

    const updated = await prisma.user.update({
      where: { id: target.id },
      data: input,
      select: { id: true, name: true, role: true, status: true, emailVerified: true },
    })
    await audit(req, 'admin.user.update', 'User', target.id, input)
    await notify(
      target.id,
      'MODERATION',
      'Your account was updated',
      `An administrator updated your account${input.role ? ` role to ${input.role.toLowerCase()}` : ''}${input.status ? ` and set it to ${input.status.toLowerCase()}` : ''}.`,
      dashboardPath(updated.role, 'overview'),
    )
    res.json({ data: updated })
  }),
)

adminRouter.get(
  '/audit',
  asyncHandler(async (req, res) => {
    const page = pagination(req, 30)
    const entity = cleanQuery(req.query.entity, 40)
    const where = entity ? { entity } : {}
    const [rows, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: page.skip,
        take: page.take,
        include: { actor: { select: { id: true, name: true, email: true } } },
      }),
      prisma.auditLog.count({ where }),
    ])
    res.json({ data: rows, meta: pageMeta(page, total) })
  }),
)

adminRouter.post(
  '/announcements',
  asyncHandler(async (req, res) => {
    const input = z
      .object({
        title: z.string().trim().min(4).max(140),
        body: z.string().trim().min(10).max(2000),
        role: z.enum(['ALL', 'STUDENT', 'ALUMNI', 'UNIVERSITY', 'COMPANY']).default('ALL'),
      })
      .parse(req.body)

    const recipients = await prisma.user.findMany({
      where: { status: 'ACTIVE', ...(input.role === 'ALL' ? {} : { role: input.role }) },
      select: { id: true },
      take: 500,
    })
    if (recipients.length > 0) {
      await prisma.notification.createMany({
        data: recipients.map((user) => ({
          userId: user.id,
          type: 'ANNOUNCEMENT',
          title: input.title,
          body: input.body,
          link: '/',
        })),
      })
    }
    await audit(req, 'admin.announcement', 'Notification', null, { role: input.role, recipients: recipients.length })
    res.status(201).json({ recipients: recipients.length })
  }),
)

/* ------------------------------------------------------------------ *
 * Institution and privileged-account administration (Phase 4)
 * ------------------------------------------------------------------ */

const universitySchema = z.object({
  name: z.string().trim().min(2).max(160),
  shortName: z.string().trim().max(40).optional().nullable(),
  domain: z.string().trim().toLowerCase().max(120).optional().nullable(),
  city: z.string().trim().max(120).optional().nullable(),
  country: z.string().trim().max(80).optional().nullable(),
  region: z.string().trim().max(120).optional().nullable(),
  website: z.string().trim().max(200).optional().nullable(),
  defaultLocale: z.string().trim().max(8).optional(),
  languages: z.string().trim().max(200).optional().nullable(),
  timeZone: z.string().trim().max(64).optional().nullable(),
})

adminRouter.get(
  '/universities',
  asyncHandler(async (_req, res) => {
    const [rows, studentGroups, alumniGroups] = await Promise.all([
      prisma.university.findMany({
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          shortName: true,
          domain: true,
          city: true,
          country: true,
          region: true,
          website: true,
          defaultLocale: true,
          languages: true,
          timeZone: true,
          verified: true,
          createdAt: true,
          _count: { select: { representatives: true, students: true, alumni: true, events: true } },
        },
      }),
      prisma.studentProfile.groupBy({ by: ['universityId', 'verificationStatus'], _count: { _all: true } }),
      prisma.alumniProfile.groupBy({ by: ['universityId', 'verificationStatus'], _count: { _all: true } }),
    ])

    const tally = (groups: typeof studentGroups) => {
      const map = new Map<string, { verified: number; pending: number }>()
      for (const group of groups) {
        if (!group.universityId) continue
        const entry = map.get(group.universityId) ?? { verified: 0, pending: 0 }
        if (group.verificationStatus === 'VERIFIED') entry.verified += group._count._all
        if (group.verificationStatus === 'PENDING') entry.pending += group._count._all
        map.set(group.universityId, entry)
      }
      return map
    }
    const studentTally = tally(studentGroups)
    const alumniTally = tally(alumniGroups)

    res.json({
      data: rows.map(({ _count, ...row }) => ({
        ...row,
        counts: {
          representatives: _count.representatives,
          students: _count.students,
          alumni: _count.alumni,
          events: _count.events,
          verifiedStudents: studentTally.get(row.id)?.verified ?? 0,
          pendingStudents: studentTally.get(row.id)?.pending ?? 0,
          verifiedAlumni: alumniTally.get(row.id)?.verified ?? 0,
          pendingAlumni: alumniTally.get(row.id)?.pending ?? 0,
        },
      })),
    })
  }),
)

adminRouter.post(
  '/universities',
  asyncHandler(async (req, res) => {
    const input = universitySchema.parse(req.body)
    const university = await prisma.university.create({
      data: {
        name: input.name,
        shortName: input.shortName ?? null,
        domain: input.domain || null,
        city: input.city ?? null,
        country: input.country ?? null,
        region: input.region ?? null,
        website: input.website || null,
        defaultLocale: input.defaultLocale ?? 'en',
        languages: input.languages ?? null,
        timeZone: input.timeZone ?? null,
      },
      select: {
        id: true, name: true, shortName: true, domain: true, city: true,
        country: true, region: true, website: true, defaultLocale: true,
        languages: true, timeZone: true, verified: true,
      },
    })
    await audit(req, 'admin.university_created', 'University', university.id)
    res.status(201).json({ data: university })
  }),
)

adminRouter.patch(
  '/universities/:id',
  asyncHandler(async (req, res) => {
    const input = z
      .object({
        name: z.string().trim().min(2).max(160).optional(),
        shortName: z.string().trim().max(40).optional().nullable(),
        domain: z.string().trim().toLowerCase().max(120).optional().nullable(),
        city: z.string().trim().max(120).optional().nullable(),
        country: z.string().trim().max(80).optional().nullable(),
        region: z.string().trim().max(120).optional().nullable(),
        website: z.string().trim().max(200).optional().nullable(),
        defaultLocale: z.string().trim().max(8).optional(),
        languages: z.string().trim().max(200).optional().nullable(),
        timeZone: z.string().trim().max(64).optional().nullable(),
        verified: z.boolean().optional(),
      })
      .parse(req.body)
    const university = await prisma.university.update({
      where: { id: req.params.id },
      data: { ...input, domain: input.domain === '' ? null : input.domain, website: input.website === '' ? null : input.website },
      select: {
        id: true, name: true, shortName: true, domain: true, city: true,
        country: true, region: true, website: true, defaultLocale: true,
        languages: true, timeZone: true, verified: true,
      },
    })
    await audit(req, 'admin.university_updated', 'University', university.id, input)
    res.json({ data: university })
  }),
)

/** One-time password for provisioned accounts; returned to the admin only once. */
function generateTemporaryPassword(): string {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
  const digits = '23456789'
  const bytes = crypto.randomBytes(16)
  let out = ''
  for (let index = 0; index < 12; index += 1) {
    out += letters[bytes[index] % letters.length]
  }
  out += digits[bytes[12] % digits.length]
  out += digits[bytes[13] % digits.length]
  return `${out}#1`
}

const provisionSchema = z.object({
  email: z.string().email().max(254),
  name: z.string().trim().min(1).max(120),
  role: z.enum(['UNIVERSITY', 'COMPANY', 'ADMIN']),
  universityId: z.string().max(40).optional().nullable(),
  designation: z.string().trim().max(120).optional().nullable(),
  department: z.string().trim().max(120).optional().nullable(),
  permissions: z.array(z.string().max(40)).max(12).optional(),
})

/**
 * Privileged accounts cannot be self-registered. An administrator creates them
 * server-side with a one-time password; the account must replace it at first
 * sign-in (mustChangePassword) and every earlier session is invalidated.
 */
adminRouter.post(
  '/users/provision',
  asyncHandler(async (req, res) => {
    const input = provisionSchema.parse(req.body)
    const email = input.email.trim().toLowerCase()

    const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } })
    if (existing) throw new AppError(409, 'conflict', 'An account with this email already exists.')

    let universityDefaults: { defaultLocale: string | null; timeZone: string | null } | null = null
    if (input.role === 'UNIVERSITY') {
      if (!input.universityId) throw new AppError(400, 'university_required', 'Choose the institution this representative belongs to.')
      const university = await prisma.university.findUnique({
        where: { id: input.universityId },
        select: { id: true, defaultLocale: true, timeZone: true },
      })
      if (!university) throw new AppError(400, 'invalid_university', 'That institution does not exist.')
      universityDefaults = { defaultLocale: university.defaultLocale, timeZone: university.timeZone }
    }

    const temporaryPassword = generateTemporaryPassword()
    const passwordHash = await bcrypt.hash(temporaryPassword, 10)

    const user = await prisma.user.create({
      data: {
        email,
        name: input.name,
        role: input.role,
        passwordHash,
        emailVerified: true,
        mustChangePassword: true,
        // Representatives start in their institution's language and time zone.
        locale: universityDefaults?.defaultLocale ?? null,
        timeZone: universityDefaults?.timeZone ?? null,
        universityProfile:
          input.role === 'UNIVERSITY'
            ? {
                create: {
                  universityId: input.universityId!,
                  designation: input.designation ?? null,
                  department: input.department ?? null,
                  permissions: input.permissions?.length ? JSON.stringify(input.permissions) : null,
                },
              }
            : undefined,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        mustChangePassword: true,
        createdAt: true,
      },
    })

    await audit(req, 'admin.user_provisioned', 'User', user.id, { role: input.role, universityId: input.universityId ?? null })
    // The plaintext password is returned once and never stored or logged.
    res.status(201).json({
      data: { ...user, temporaryPassword },
      notice: 'Share this one-time password securely. It is shown only once and must be changed at first sign-in.',
    })
  }),
)

adminRouter.post(
  '/users/:id/reset-password',
  asyncHandler(async (req, res) => {
    const actor = sessionUser(req)!
    if (req.params.id === actor.id) {
      throw new AppError(400, 'self_reset', 'Use the change-password flow to update your own password.')
    }
    const target = await prisma.user.findUnique({ where: { id: req.params.id }, select: { id: true, email: true, role: true } })
    if (!target) throw new AppError(404, 'not_found', 'User not found.')

    const temporaryPassword = generateTemporaryPassword()
    const passwordHash = await bcrypt.hash(temporaryPassword, 10)
    await prisma.user.update({
      where: { id: target.id },
      data: { passwordHash, mustChangePassword: true, tokenVersion: { increment: 1 } },
    })
    await audit(req, 'admin.password_reset_issued', 'User', target.id)
    res.json({
      data: { id: target.id, email: target.email, role: target.role, temporaryPassword },
      notice: 'Share this one-time password securely. Existing sessions for this account were revoked.',
    })
  }),
)

const feedbackStatuses = ['OPEN', 'IN_REVIEW', 'RESOLVED', 'CLOSED'] as const

adminRouter.get(
  '/feedback',
  asyncHandler(async (req, res) => {
    const page = pagination(req, 20)
    const status = cleanQuery(req.query.status, 20)
    const category = cleanQuery(req.query.category, 20)
    const q = cleanQuery(req.query.q, 80)

    const where = {
      ...(status ? { status: status.toUpperCase() } : {}),
      ...(category ? { category: category.toUpperCase() } : {}),
      ...(q ? { OR: [{ subject: { contains: q } }, { message: { contains: q } }] } : {}),
    }

    const [rows, total, groups] = await Promise.all([
      prisma.feedback.findMany({
        where,
        orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
        skip: page.skip,
        take: page.take,
        include: { user: { select: { id: true, name: true, email: true, role: true } } },
      }),
      prisma.feedback.count({ where }),
      prisma.feedback.groupBy({ by: ['status'], _count: { _all: true } }),
    ])

    const counts = Object.fromEntries(groups.map((group) => [group.status, group._count._all]))
    res.json({
      data: rows,
      meta: {
        ...pageMeta(page, total),
        counts: {
          open: counts.OPEN ?? 0,
          inReview: counts.IN_REVIEW ?? 0,
          resolved: counts.RESOLVED ?? 0,
          closed: counts.CLOSED ?? 0,
        },
      },
    })
  }),
)

const feedbackUpdateSchema = z.object({
  status: z.enum(feedbackStatuses).optional(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH']).optional(),
  adminNote: z.string().trim().max(2000).optional(),
})

adminRouter.patch(
  '/feedback/:id',
  asyncHandler(async (req, res) => {
    const input = feedbackUpdateSchema.parse(req.body)
    const existing = await prisma.feedback.findUnique({
      where: { id: req.params.id },
      include: { user: { select: { id: true, role: true } } },
    })
    if (!existing) throw new AppError(404, 'not_found', 'Ticket not found.')

    const closing = input.status === 'RESOLVED' || input.status === 'CLOSED'
    const updated = await prisma.feedback.update({
      where: { id: existing.id },
      data: {
        ...input,
        resolvedAt: closing ? existing.resolvedAt ?? new Date() : input.status ? null : undefined,
      },
    })

    if (input.status && input.status !== existing.status) {
      const home = dashboardPath(existing.user.role, 'support')
      await notify(
        existing.userId,
        'SUPPORT_UPDATE',
        `Support ticket ${input.status === 'IN_REVIEW' ? 'in review' : input.status.toLowerCase()}`,
        `"${existing.subject}" was updated by the platform team.`,
        home,
      )
    }
    await audit(req, 'feedback.update', 'Feedback', existing.id, input)
    res.json({ data: updated })
  }),
)
