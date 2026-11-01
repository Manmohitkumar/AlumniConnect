import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../db'
import { requireAuth } from '../middleware/auth'
import { AppError, asyncHandler } from '../lib/http'
import { audit } from '../lib/audit'

export const privacyRouter = Router()

privacyRouter.use(requireAuth)

const deleteSchema = z.object({
  confirm: z.literal(true),
  reason: z.string().trim().max(300).optional(),
})

privacyRouter.get(
  '/me/export',
  asyncHandler(async (req, res) => {
    const userId = (req as any).user!.sub
    const [user, studentProfile, alumniProfile, universityProfile] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          status: true,
          emailVerified: true,
          mustChangePassword: true,
          headline: true,
          bio: true,
          location: true,
          avatarUrl: true,
          notificationPrefs: true,
          createdAt: true,
          totpEnabled: true,
          totpSecret: false,
        },
      }),
      prisma.studentProfile.findUnique({ where: { userId } }),
      prisma.alumniProfile.findUnique({ where: { userId } }),
      prisma.universityProfile.findUnique({ where: { userId } }),
    ])

    const submissions = await prisma.submission.findMany({ where: { studentId: userId } })
    const evaluations = await prisma.evaluation.findMany({ where: { evaluatorId: userId } })
    const certificates = await prisma.certificate.findMany({ where: { userId } })
    const mentorshipRequests = await prisma.mentorshipRequest.findMany({
      where: { OR: [{ studentId: userId }, { mentorId: userId }] },
    })
    const eventRegistrations = await prisma.eventRegistration.findMany({ where: { userId } })
    const auditLogs = await prisma.auditLog.findMany({ where: { actorId: userId } })

    if (!user) throw new AppError(404, 'not_found', 'Account not found.')

    await audit(req, 'privacy.data_export', 'User', userId)
    res.json({
      data: {
        exportedAt: new Date().toISOString(),
        user,
        studentProfile,
        alumniProfile,
        universityProfile,
        submissions,
        evaluations,
        certificates,
        mentorshipRequests,
        eventRegistrations,
        auditLogs,
      },
    })
  }),
)

privacyRouter.post(
  '/me/delete',
  asyncHandler(async (req, res) => {
    const userId = (req as any).user!.sub
    const { confirm, reason } = deleteSchema.parse(req.body)
    if (confirm !== true) throw new AppError(400, 'confirmation_required', 'Set confirm to true to delete your account.')

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) throw new AppError(404, 'not_found', 'Account not found.')

    // Cascade-deletes owned profile data, submissions, certificates, requests,
    // registrations, audit logs, and tokens through Prisma relation rules.
    await prisma.user.delete({ where: { id: userId } })

    await audit(req, 'privacy.account_deleted', 'User', userId, {
      role: user.role,
      reason: reason ?? null,
    })

    res.clearCookie('ac_session')
    res.json({ data: { deleted: true } })
  }),
)
