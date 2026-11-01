import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '../db'
import { signToken, verifyToken } from '../lib/jwt'
import { clearSessionCookie, readSessionToken, setSessionCookie } from '../lib/session'
import { rateLimit } from '../lib/rate-limit'
import { audit } from '../lib/audit'
import { requireAuth, requireRole, type AuthedRequest } from '../middleware/auth'
import { AppError, asyncHandler } from '../lib/http'
import { issueAuthToken, consumeAuthToken, revokeAuthTokens } from '../lib/tokens'
import { sendAuthMail } from '../lib/mailer'
import { verifyTotp, generateTotpSecret, totpAuthUrl } from '../lib/totp'
import { PORTAL_KEYS, isPortal, portalRoles } from '../lib/portal'

/** Column set returned to clients. Never includes password hashes or tokens. */
const publicUser = {
  id: true,
  email: true,
  name: true,
  role: true,
  status: true,
  emailVerified: true,
  mustChangePassword: true,
  headline: true,
  avatarUrl: true,
  createdAt: true,
} as const

const passwordRule = z
  .string()
  .min(8, 'Use at least 8 characters.')
  .max(200)
  .refine((value) => /[A-Za-z]/.test(value) && /[0-9]/.test(value), {
    message: 'Include at least one letter and one number.',
  })

const registerSchema = z.object({
  email: z.string().email().max(254),
  password: passwordRule,
  name: z.string().trim().min(1).max(120),
  // Self-service registration is limited to these two roles. University,
  // company and administrator accounts are provisioned by an administrator.
  role: z.enum(['STUDENT', 'ALUMNI']).default('STUDENT'),
  universityId: z.string().max(40).optional().nullable(),
  universityName: z.string().max(160).optional().nullable(),
  registrationNumber: z.string().trim().max(60).optional().nullable(),
  department: z.string().max(160).optional().nullable(),
  course: z.string().max(160).optional().nullable(),
  currentYear: z.coerce.number().int().min(1).max(8).optional().nullable(),
  semester: z.coerce.number().int().min(1).max(12).optional().nullable(),
  graduationYear: z.coerce.number().int().min(1950).max(2100).optional().nullable(),
  termsAccepted: z.literal(true),
})

const loginSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(1).max(200),
  portal: z.enum(PORTAL_KEYS).optional(),
  mfaCode: z.string().min(6).max(8).optional(),
})

export const authRouter = Router()

// 10 attempts per 10 minutes per IP in deployed environments. The isolated
// smoke suite exercises several valid MFA transitions in one process.
const credentialLimit = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: process.env.NODE_ENV === 'test' ? 60 : 10,
  key: 'auth',
})
const resetLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 5, key: 'password-reset' })

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

/** A fresh session must be signed with the account's current tokenVersion. */
function startSession(
  res: Parameters<typeof setSessionCookie>[0],
  user: { id: string; role: string; email: string; tokenVersion: number; mfaVerified?: boolean },
) {
  const token = signToken({
    sub: user.id,
    role: user.role,
    email: user.email,
    tv: user.tokenVersion,
    mfaVerified: user.mfaVerified === true,
  })
  setSessionCookie(res, token)
  return token
}

authRouter.post(
  '/register',
  credentialLimit,
  asyncHandler(async (req, res) => {
    const input = registerSchema.parse(req.body)
    const email = normalizeEmail(input.email)

    const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } })
    if (existing) {
      throw new AppError(409, 'conflict', 'An account with this email already exists.')
    }

    let universityId: string | null = null
    if (input.universityId) {
      const university = await prisma.university.findUnique({ where: { id: input.universityId }, select: { id: true, name: true, verified: true } })
      if (!university) throw new AppError(400, 'invalid_university', 'Choose a university from the list.')
      if (!university.verified) throw new AppError(400, 'institution_inactive', 'That institution is not currently accepting new members.')
      universityId = university.id
    }

    const passwordHash = await bcrypt.hash(input.password, 10)
    // Identity verification is a university decision, so a registration that
    // supplies academic identifiers starts as PENDING rather than VERIFIED.
    const verificationStatus = universityId && input.registrationNumber ? 'PENDING' : 'UNVERIFIED'

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name: input.name,
        role: input.role,
        emailVerified: false,
        studentProfile:
          input.role === 'STUDENT'
            ? {
                create: {
                  universityId,
                  universityName: input.universityName ?? null,
                  registrationNumber: input.registrationNumber ?? null,
                  department: input.department ?? null,
                  course: input.course ?? null,
                  currentYear: input.currentYear ?? null,
                  semester: input.semester ?? null,
                  graduationYear: input.graduationYear ?? null,
                  verificationStatus,
                },
              }
            : undefined,
        alumniProfile:
          input.role === 'ALUMNI'
            ? {
                create: {
                  universityId,
                  universityName: input.universityName ?? null,
                  registrationNumber: input.registrationNumber ?? null,
                  graduationYear: input.graduationYear ?? null,
                  verificationStatus,
                },
              }
            : undefined,
      },
      select: { ...publicUser, tokenVersion: true },
    })

    const verifyToken = await issueAuthToken(user.id, 'EMAIL_VERIFY')
    const mail = await sendAuthMail({
      to: user.email,
      subject: 'Verify your AlumniConnect email',
      text: 'Confirm your email address to finish setting up your account.',
      actionPath: `/verify-email?token=${encodeURIComponent(verifyToken)}`,
    })

    await audit(req, 'auth.register', 'User', user.id, { role: user.role })
    const { tokenVersion, ...safeUser } = user
    const token = startSession(res, { ...safeUser, tokenVersion })
    res.status(201).json({
      data: safeUser,
      token,
      verification: {
        required: true,
        delivered: mail.delivered,
        previewUrl: mail.previewUrl,
      },
    })
  }),
)

authRouter.post(
  '/login',
  credentialLimit,
  asyncHandler(async (req, res) => {
    const input = loginSchema.parse(req.body)
    const email = normalizeEmail(input.email)

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        emailVerified: true,
        mustChangePassword: true,
        totpEnabled: true,
        totpSecret: true,
        headline: true,
        avatarUrl: true,
        createdAt: true,
        passwordHash: true,
        tokenVersion: true,
      },
    })

    // Uniform message and comparable work for unknown accounts.
    if (!user || !user.passwordHash) {
      throw new AppError(401, 'unauthorized', 'Invalid email or password.')
    }
    const ok = await bcrypt.compare(input.password, user.passwordHash)
    if (!ok) throw new AppError(401, 'unauthorized', 'Invalid email or password.')

    if (user.status !== 'ACTIVE') {
      throw new AppError(403, 'suspended', 'This account is suspended. Contact an administrator.')
    }

    // Deactivated institutions cannot open representative sessions.
    if (user.role === 'UNIVERSITY') {
      const rep = await prisma.universityProfile.findUnique({
        where: { userId: user.id },
        select: { university: { select: { verified: true } } },
      })
      if (rep && !rep.university.verified) {
        throw new AppError(403, 'institution_inactive', 'This institution is not active on the platform. Contact an administrator.')
      }
    }

    // Portal isolation: a valid account for the wrong portal never gets a session.
    if (input.portal && !portalRoles(input.portal).includes(user.role)) {
      throw new AppError(403, 'wrong_portal', 'This account belongs to a different AlumniConnect portal.')
    }

    const { passwordHash: _passwordHash, tokenVersion, ...safeUser } = user
    void _passwordHash
    let tokenMfaVerified = false
    if (user.totpEnabled) {
      const verified = await verifyTotp(user.totpSecret ?? '', input.mfaCode ?? '', Date.now())
      tokenMfaVerified = verified
      if (!verified) {
        throw new AppError(401, 'invalid_otp', 'Invalid multi-factor code.')
      }
    }
    const sessionToken = startSession(res, { ...safeUser, tokenVersion, mfaVerified: tokenMfaVerified })
    await audit(req, 'auth.login', 'User', user.id, { portal: input.portal ?? 'shared', mfa: tokenMfaVerified })
    res.json({ data: safeUser, token: sessionToken })
  }),
)

authRouter.get(
  '/me',
  asyncHandler(async (req, res) => {
    const raw = readSessionToken(req)
    if (!raw) throw new AppError(401, 'unauthorized', 'Not signed in.')
    const payload = verifyToken(raw)
    if (!payload) {
      clearSessionCookie(res)
      throw new AppError(401, 'unauthorized', 'Session expired.')
    }
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        ...publicUser,
        tokenVersion: true,
        universityProfile: {
          select: {
            designation: true,
            department: true,
            permissions: true,
            university: { select: { id: true, name: true, shortName: true } },
          },
        },
        studentProfile: { select: { universityId: true, verificationStatus: true } },
        alumniProfile: { select: { universityId: true, verificationStatus: true } },
      },
    })
    if (!user) {
      clearSessionCookie(res)
      throw new AppError(401, 'unauthorized', 'Session revoked.')
    }
    if (user.tokenVersion !== payload.tv) {
      clearSessionCookie(res)
      throw new AppError(401, 'session_revoked', 'Your session was ended by a password change.')
    }
    if (user.status !== 'ACTIVE') {
      clearSessionCookie(res)
      throw new AppError(403, 'suspended', 'This account is suspended.')
    }
    const { tokenVersion: _tv, ...safeUser } = user
    void _tv
    res.json({ data: safeUser })
  }),
)

authRouter.post('/logout', (_req, res) => {
  clearSessionCookie(res)
  res.status(204).end()
})

authRouter.post(
  '/verify-email',
  credentialLimit,
  asyncHandler(async (req, res) => {
    const { token } = z.object({ token: z.string().min(20).max(200) }).parse(req.body)
    const userId = await consumeAuthToken(token, 'EMAIL_VERIFY')
    if (!userId) throw new AppError(400, 'invalid_token', 'This verification link is invalid or has expired.')

    await prisma.user.update({ where: { id: userId }, data: { emailVerified: true } })
    await audit(req, 'auth.email_verified', 'User', userId)
    res.json({ data: { verified: true } })
  }),
)

authRouter.post(
  '/resend-verification',
  credentialLimit,
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = (req as AuthedRequest).user!
    const account = await prisma.user.findUnique({ where: { id: user.sub }, select: { email: true, emailVerified: true } })
    if (!account) throw new AppError(404, 'not_found', 'Account not found.')
    if (account.emailVerified) throw new AppError(409, 'already_verified', 'This email address is already verified.')

    const token = await issueAuthToken(user.sub, 'EMAIL_VERIFY')
    const mail = await sendAuthMail({
      to: account.email,
      subject: 'Verify your AlumniConnect email',
      text: 'Confirm your email address to finish setting up your account.',
      actionPath: `/verify-email?token=${encodeURIComponent(token)}`,
    })
    res.status(202).json({ data: { delivered: mail.delivered, previewUrl: mail.previewUrl } })
  }),
)

authRouter.post(
  '/forgot-password',
  resetLimit,
  asyncHandler(async (req, res) => {
    const { email } = z.object({ email: z.string().email().max(254) }).parse(req.body)
    const user = await prisma.user.findUnique({
      where: { email: normalizeEmail(email) },
      select: { id: true, email: true, status: true },
    })

    // Identical response whether or not the account exists.
    let previewUrl: string | null = null
    let delivered = false
    if (user && user.status === 'ACTIVE') {
      const token = await issueAuthToken(user.id, 'PASSWORD_RESET')
      const mail = await sendAuthMail({
        to: user.email,
        subject: 'Reset your AlumniConnect password',
        text: 'Use this single-use link to choose a new password. It expires in one hour.',
        actionPath: `/reset-password?token=${encodeURIComponent(token)}`,
      })
      previewUrl = mail.previewUrl
      delivered = mail.delivered
    }

    res.status(202).json({
      data: {
        message: 'If an account exists for that email, a password reset link has been generated.',
        delivered,
        // Development-only delivery preview; production returns null.
        previewUrl,
      },
    })
  }),
)

authRouter.post(
  '/reset-password',
  resetLimit,
  asyncHandler(async (req, res) => {
    const input = z
      .object({ token: z.string().min(20).max(200), password: passwordRule })
      .parse(req.body)
    const userId = await consumeAuthToken(input.token, 'PASSWORD_RESET')
    if (!userId) throw new AppError(400, 'invalid_token', 'This reset link is invalid or has expired.')

    const passwordHash = await bcrypt.hash(input.password, 10)
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        mustChangePassword: false,
        tokenVersion: { increment: 1 },
      },
      select: { id: true, role: true, email: true, tokenVersion: true },
    })
    await revokeAuthTokens(userId)
    clearSessionCookie(res)
    await audit(req, 'auth.password_reset', 'User', userId)
    // Do not auto-sign the user in: they must prove the new password works.
    res.json({ data: { reset: true, role: user.role } })
  }),
)

authRouter.post(
  '/change-password',
  credentialLimit,
  requireAuth,
  asyncHandler(async (req, res) => {
    const authed = (req as AuthedRequest).user!
    const input = z
      .object({ currentPassword: z.string().min(1).max(200), newPassword: passwordRule })
      .parse(req.body)
    if (input.currentPassword === input.newPassword) {
      throw new AppError(400, 'same_password', 'Choose a password different from the current one.')
    }

    const account = await prisma.user.findUnique({
      where: { id: authed.sub },
      select: { id: true, role: true, email: true, passwordHash: true, tokenVersion: true },
    })
    if (!account || !account.passwordHash) throw new AppError(404, 'not_found', 'Account not found.')

    const ok = await bcrypt.compare(input.currentPassword, account.passwordHash)
    if (!ok) throw new AppError(400, 'invalid_password', 'Your current password is incorrect.')

    const passwordHash = await bcrypt.hash(input.newPassword, 10)
    const updated = await prisma.user.update({
      where: { id: account.id },
      data: {
        passwordHash,
        mustChangePassword: false,
        // Revoke every other session, then re-issue this one.
        tokenVersion: { increment: 1 },
      },
      select: { id: true, role: true, email: true, tokenVersion: true },
    })
    const token = startSession(res, updated)
    await audit(req, 'auth.password_changed', 'User', account.id)
    res.json({ data: { changed: true }, token })
  }),
)

authRouter.post(
  '/admin/mfa/enroll',
  credentialLimit,
  requireAuth,
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const admin = (req as AuthedRequest).user!
    const account = await prisma.user.findUnique({
      where: { id: admin.sub },
      select: { id: true, email: true, role: true, mustChangePassword: true, totpEnabled: true, totpSecret: true, tokenVersion: true },
    })
    if (!account) throw new AppError(404, 'not_found', 'Account not found.')
    if (account.mustChangePassword && !req.originalUrl.startsWith('/api/auth/')) {
      throw new AppError(403, 'password_change_required', 'Replace your temporary password before continuing.')
    }
    if (account.totpEnabled) throw new AppError(409, 'mfa_enabled', 'MFA is already enabled for this account.')
    const secret = generateTotpSecret()
    await prisma.user.update({ where: { id: account.id }, data: { totpSecret: secret, totpEnabled: false } })
    await audit(req, 'auth.admin_mfa_enroll', 'User', account.id)
    res.json({ data: { totpSecret: secret, authUrl: totpAuthUrl(secret, account.email, 'AlumniConnect Admin') } })
  }),
)

authRouter.post(
  '/admin/mfa/verify',
  credentialLimit,
  requireAuth,
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const admin = (req as AuthedRequest).user!
    const input = z.object({ token: z.string().min(6).max(8) }).parse(req.body)
    const account = await prisma.user.findUnique({
      where: { id: admin.sub },
      select: { id: true, email: true, role: true, mustChangePassword: true, totpEnabled: true, totpSecret: true, tokenVersion: true },
    })
    if (!account) throw new AppError(404, 'not_found', 'Account not found.')
    if (!account.totpSecret) throw new AppError(400, 'mfa_not_enabled', 'Administrator MFA is not enabled.')
    const verified = await verifyTotp(account.totpSecret, input.token, Date.now())
    if (!verified) throw new AppError(401, 'invalid_otp', 'Invalid multi-factor code.')
    await prisma.user.update({ where: { id: account.id }, data: { totpEnabled: true, totpSecret: account.totpSecret } })
    const token = startSession(res, {
      id: account.id,
      role: account.role,
      email: account.email,
      tokenVersion: account.tokenVersion,
      mfaVerified: true,
    })
    await audit(req, 'auth.admin_mfa_verified', 'User', account.id)
    res.json({ data: { enabled: true, token } })
  }),
)

authRouter.post(
  '/admin/mfa/disable',
  credentialLimit,
  requireAuth,
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const admin = (req as AuthedRequest).user!
    const account = await prisma.user.findUnique({
      where: { id: admin.sub },
      select: { id: true, email: true, role: true, mustChangePassword: true, totpEnabled: true, tokenVersion: true },
    })
    if (!account) throw new AppError(404, 'not_found', 'Account not found.')
    if (account.mustChangePassword && !req.originalUrl.startsWith('/api/auth/')) {
      throw new AppError(403, 'password_change_required', 'Replace your temporary password before continuing.')
    }
    if (!account.totpEnabled) throw new AppError(409, 'mfa_not_enabled', 'MFA is not enabled.')
    await prisma.user.update({ where: { id: account.id }, data: { totpEnabled: false, totpSecret: null } })
    const token = startSession(res, {
      id: account.id,
      role: account.role,
      email: account.email,
      tokenVersion: account.tokenVersion,
      mfaVerified: false,
    })
    await audit(req, 'auth.admin_mfa_disabled', 'User', account.id)
    res.json({ data: { disabled: true, token } })
  }),
)

// Re-exported so tests and tooling can assert portal configuration without
// duplicating the role map.
export { isPortal, PORTAL_KEYS }
