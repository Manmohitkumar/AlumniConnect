import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../db'
import { requireAuth } from '../middleware/auth'
import { AppError, asyncHandler, httpUrl } from '../lib/http'
import { audit, sessionUser } from '../lib/audit'
import { notify, parsePrefs } from '../lib/notify'
import { isSupportedLocale, SUPPORTED_LOCALES } from '../lib/ai'

export const profileRouter = Router()

const profileSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  headline: z.string().max(160).optional().nullable(),
  bio: z.string().max(2000).optional().nullable(),
  location: z.string().max(120).optional().nullable(),
  avatarUrl: httpUrl().optional().nullable(),
  // student / alumni academic identity
  universityId: z.string().max(40).optional().nullable(),
  universityName: z.string().max(160).optional().nullable(),
  /** Legacy field name kept so older clients keep working. */
  university: z.string().max(160).optional().nullable(),
  registrationNumber: z.string().trim().max(60).optional().nullable(),
  department: z.string().max(160).optional().nullable(),
  course: z.string().max(160).optional().nullable(),
  currentYear: z.coerce.number().int().min(1).max(8).optional().nullable(),
  semester: z.coerce.number().int().min(1).max(12).optional().nullable(),
  graduationYear: z.coerce.number().int().min(1950).max(2100).optional().nullable(),
  skills: z.string().max(600).optional().nullable(),
  careerInterests: z.string().max(600).optional().nullable(),
  portfolioVisible: z.boolean().optional(),
  visibleToCompanies: z.boolean().optional(),
  // alumni
  company: z.string().max(160).optional().nullable(),
  designation: z.string().max(160).optional().nullable(),
  industry: z.string().max(120).optional().nullable(),
  expertise: z.string().max(600).optional().nullable(),
  mentorshipTopics: z.string().max(600).optional().nullable(),
  availability: z.string().max(300).optional().nullable(),
  timezone: z.string().max(80).optional().nullable(),
  yearsExperience: z.coerce.number().int().min(0).max(70).optional().nullable(),
  mentorshipOpen: z.boolean().optional(),
  // Phase 10 international identity (voluntary fields).
  country: z.string().max(80).optional().nullable(),
  languages: z.string().max(200).optional().nullable(),
})

profileRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = sessionUser(req)!
    const [row, unread, counts] = await Promise.all([
      prisma.user.findUnique({
        where: { id: user.id },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          status: true,
          emailVerified: true,
          headline: true,
          bio: true,
          location: true,
          avatarUrl: true,
          locale: true,
          timeZone: true,
          notificationPrefs: true,
          createdAt: true,
          mustChangePassword: true,
          studentProfile: { include: { university: { select: { id: true, name: true, shortName: true } } } },
          alumniProfile: { include: { university: { select: { id: true, name: true, shortName: true } } } },
          universityProfile: {
            include: { university: { select: { id: true, name: true, shortName: true, city: true } } },
          },
        },
      }),
      prisma.notification.count({ where: { userId: user.id, readAt: null } }),
      Promise.all([
        prisma.submission.count({ where: { studentId: user.id } }),
        prisma.mentorshipRequest.count({ where: { OR: [{ studentId: user.id }, { mentorId: user.id }] } }),
        prisma.certificate.count({ where: { userId: user.id, revokedAt: null } }),
        prisma.challengeParticipant.count({ where: { userId: user.id } }),
      ]),
    ])
    if (!row) throw new AppError(404, 'not_found', 'Account not found.')
    const [submissions, mentorship, certificates, challengesJoined] = counts
    res.json({
      data: {
        ...row,
        notificationPrefs: parsePrefs(row.notificationPrefs),
        counts: { unread, submissions, mentorship, certificates, challengesJoined },
      },
    })
  }),
)

const preferenceSchema = z.object({
  locale: z.string().max(8).optional(),
  timeZone: z.string().max(64).optional().nullable(),
})

/** Language + time zone preference (Phase 10). Separate from profile data so
 *  changing language never touches academic identity or verification state. */
profileRouter.patch(
  '/me/preferences',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = sessionUser(req)!
    const input = preferenceSchema.parse(req.body)
    if (input.locale !== undefined && !isSupportedLocale(input.locale)) {
      throw new AppError(400, 'unsupported_locale', `Choose one of: ${SUPPORTED_LOCALES.map((locale) => locale.code).join(', ')}`)
    }
    if (input.timeZone) {
      try {
        new Intl.DateTimeFormat('en', { timeZone: input.timeZone }).format(new Date())
      } catch {
        throw new AppError(400, 'invalid_timezone', 'Use a valid IANA time zone, for example Asia/Kolkata.')
      }
    }
    await prisma.user.update({
      where: { id: user.id },
      data: {
        ...(input.locale !== undefined ? { locale: input.locale } : {}),
        ...(input.timeZone !== undefined ? { timeZone: input.timeZone } : {}),
      },
    })
    await audit(req, 'profile.preferences', 'User', user.id, { locale: input.locale ?? null, timeZone: input.timeZone ?? null })
    res.json({ ok: true, data: { locale: input.locale ?? null, timeZone: input.timeZone ?? null } })
  }),
)

profileRouter.put(
  '/me/profile',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = sessionUser(req)!
    const input = profileSchema.parse(req.body)
    const account = await prisma.user.findUnique({ where: { id: user.id }, select: { role: true } })
    if (!account) throw new AppError(404, 'not_found', 'Account not found.')

    const shared = {
      name: input.name,
      headline: input.headline,
      bio: input.bio,
      location: input.location,
      avatarUrl: input.avatarUrl,
    }

    await prisma.user.update({ where: { id: user.id }, data: shared })

    // Validate the optional university link once, before writing either profile.
    let universityId = input.universityId ?? undefined
    if (universityId) {
      const university = await prisma.university.findUnique({ where: { id: universityId }, select: { id: true, name: true, verified: true } })
      if (!university) throw new AppError(400, 'invalid_university', 'Choose a university from the list.')
      if (!university.verified) throw new AppError(400, 'institution_inactive', 'That institution is not currently accepting members.')
      universityId = university.id
      if (input.universityName === undefined && input.university === undefined) {
        input.universityName = university.name
      }
    }
    const universityName = input.universityName ?? input.university ?? undefined

    if (account.role === 'STUDENT') {
      const current = await prisma.studentProfile.findUnique({
        where: { userId: user.id },
        select: { registrationNumber: true, universityId: true, verificationStatus: true },
      })
      const identityChanged =
        (input.registrationNumber !== undefined && input.registrationNumber !== current?.registrationNumber) ||
        (universityId !== undefined && universityId !== current?.universityId)
      // A verified student who changes their registration number or institution
      // must be re-verified; unrelated profile edits keep the verified badge.
      const resetVerification = Boolean(current && current.verificationStatus === 'VERIFIED' && identityChanged)

      await prisma.studentProfile.upsert({
        where: { userId: user.id },
        update: {
          universityId,
          universityName,
          registrationNumber: input.registrationNumber,
          department: input.department,
          course: input.course,
          currentYear: input.currentYear,
          semester: input.semester,
          graduationYear: input.graduationYear,
          skills: input.skills,
          careerInterests: input.careerInterests,
          country: input.country,
          portfolioVisible: input.portfolioVisible,
          visibleToCompanies: input.visibleToCompanies,
          consentAt:
            input.portfolioVisible === true || input.visibleToCompanies === true ? new Date() : undefined,
          ...(resetVerification
            ? { verificationStatus: 'PENDING', verifiedAt: null, verifiedById: null }
            : {}),
        },
        create: {
          userId: user.id,
          universityId,
          universityName,
          registrationNumber: input.registrationNumber,
          department: input.department,
          course: input.course,
          currentYear: input.currentYear,
          semester: input.semester,
          graduationYear: input.graduationYear,
          skills: input.skills,
          careerInterests: input.careerInterests,
          country: input.country,
          portfolioVisible: input.portfolioVisible ?? false,
          visibleToCompanies: input.visibleToCompanies ?? false,
          consentAt:
            input.portfolioVisible === true || input.visibleToCompanies === true ? new Date() : null,
        },
      })
    }

    if (account.role === 'ALUMNI') {
      const current = await prisma.alumniProfile.findUnique({
        where: { userId: user.id },
        select: { registrationNumber: true, universityId: true, verificationStatus: true },
      })
      const identityChanged =
        (input.registrationNumber !== undefined && input.registrationNumber !== current?.registrationNumber) ||
        (universityId !== undefined && universityId !== current?.universityId)
      const resetVerification = Boolean(current && current.verificationStatus === 'VERIFIED' && identityChanged)

      await prisma.alumniProfile.upsert({
        where: { userId: user.id },
        update: {
          universityId,
          universityName,
          registrationNumber: input.registrationNumber,
          graduationYear: input.graduationYear,
          company: input.company,
          designation: input.designation,
          industry: input.industry,
          expertise: input.expertise,
          mentorshipTopics: input.mentorshipTopics,
          availability: input.availability,
          timezone: input.timezone,
          country: input.country,
          languages: input.languages,
          yearsExperience: input.yearsExperience,
          mentorshipOpen: input.mentorshipOpen,
          ...(resetVerification
            ? { verificationStatus: 'PENDING', verifiedAt: null, verifiedById: null }
            : {}),
        },
        create: {
          userId: user.id,
          universityId,
          universityName,
          registrationNumber: input.registrationNumber,
          graduationYear: input.graduationYear,
          company: input.company,
          designation: input.designation,
          industry: input.industry,
          expertise: input.expertise,
          mentorshipTopics: input.mentorshipTopics,
          availability: input.availability,
          timezone: input.timezone,
          country: input.country,
          languages: input.languages,
          yearsExperience: input.yearsExperience,
          mentorshipOpen: input.mentorshipOpen ?? false,
        },
      })
    }

    await audit(req, 'profile.update', 'User', user.id)
    res.json({ ok: true })
  }),
)

/**
 * A student or alumnus asks their institution to verify their academic identity.
 * Requires a verified email plus a university and registration number. The
 * university representative is the only role that can approve it.
 */
profileRouter.post(
  '/me/verification-request',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = sessionUser(req)!
    const account = await prisma.user.findUnique({
      where: { id: user.id },
      select: { name: true, role: true, emailVerified: true, studentProfile: true, alumniProfile: true },
    })
    if (!account) throw new AppError(404, 'not_found', 'Account not found.')
    if (!account.emailVerified) {
      throw new AppError(403, 'email_not_verified', 'Verify your email address before requesting identity verification.')
    }

    const profile = account.role === 'STUDENT' ? account.studentProfile : account.role === 'ALUMNI' ? account.alumniProfile : null
    if (!profile) throw new AppError(403, 'forbidden', 'Only student and alumni accounts can request university verification.')
    if (!profile.universityId || !profile.registrationNumber) {
      throw new AppError(400, 'missing_identity', 'Add your university and registration or alumni ID first.')
    }
    if (profile.verificationStatus === 'VERIFIED') {
      throw new AppError(409, 'already_verified', 'Your identity is already verified.')
    }

    if (account.role === 'STUDENT') {
      await prisma.studentProfile.update({
        where: { userId: user.id },
        data: { verificationStatus: 'PENDING', verifiedAt: null, verifiedById: null },
      })
    } else {
      await prisma.alumniProfile.update({
        where: { userId: user.id },
        data: { verificationStatus: 'PENDING', verifiedAt: null, verifiedById: null },
      })
    }
    // The institution reviews this in the university portal, so tell its
    // representatives directly instead of waiting for them to poll the queue.
    const representatives = await prisma.user.findMany({
      where: {
        role: 'UNIVERSITY',
        status: 'ACTIVE',
        universityProfile: { is: { universityId: profile.universityId } },
      },
      select: { id: true },
      take: 20,
    })
    await Promise.all(
      representatives.map((representative) =>
        notify(
          representative.id,
          'MODERATION',
          'New identity verification request',
          `${account.name} requested ${account.role === 'STUDENT' ? 'student' : 'alumni'} identity verification.`,
          `/university/dashboard?tab=${account.role === 'STUDENT' ? 'students' : 'alumni'}`,
        ),
      ),
    )
    await audit(req, 'profile.verification_requested', 'User', user.id)
    res.status(202).json({ data: { status: 'PENDING' } })
  }),
)

/** Public-safe profile view. Private fields are only returned to the owner or an administrator. */
profileRouter.get(
  '/:userId',
  asyncHandler(async (req, res) => {
    const viewer = sessionUser(req)
    const target = await prisma.user.findUnique({
      where: { id: req.params.userId },
      select: {
        id: true,
        name: true,
        role: true,
        headline: true,
        bio: true,
        location: true,
        avatarUrl: true,
        createdAt: true,
        alumniProfile: true,
        studentProfile: true,
      },
    })
    if (!target) throw new AppError(404, 'not_found', 'Profile not found.')
    if (target.role === 'ADMIN' && viewer?.role !== 'ADMIN') {
      throw new AppError(404, 'not_found', 'Profile not found.')
    }

    const isSelf = viewer?.id === target.id
    const isAdmin = viewer?.role === 'ADMIN'

    const studentVisible =
      isSelf ||
      isAdmin ||
      (target.studentProfile?.portfolioVisible === true && Boolean(viewer)) ||
      (target.studentProfile?.visibleToCompanies === true && viewer?.role === 'COMPANY')

    res.json({
      data: {
        id: target.id,
        name: target.name,
        role: target.role,
        headline: target.headline,
        bio: target.bio,
        location: target.location,
        avatarUrl: target.avatarUrl,
        joinedAt: target.createdAt,
        alumniProfile: target.alumniProfile,
        studentProfile: studentVisible ? target.studentProfile : null,
        studentProfileRestricted: Boolean(target.studentProfile) && !studentVisible,
      },
    })
  }),
)
