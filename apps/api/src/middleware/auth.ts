import type { NextFunction, Request, Response } from 'express'
import { prisma } from '../db'
import { verifyToken, type JwtPayload } from '../lib/jwt'
import { readSessionToken } from '../lib/session'
import { touchActivity } from '../lib/activity'

export type AuthedRequest = Request & { user?: JwtPayload }

/**
 * Verifies the session and re-reads the account so role changes, suspensions
 * and password resets take effect immediately instead of waiting for the token
 * to expire. Both the role and tokenVersion come from the database, never from
 * anything the client sent.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const token = readSessionToken(req)
    if (!token) {
      res.status(401).json({ error: 'unauthorized', message: 'Sign in to continue.' })
      return
    }
    const payload = verifyToken(token)
    if (!payload) {
      res.status(401).json({ error: 'unauthorized', message: 'Session expired. Sign in again.' })
      return
    }
    const account = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        role: true,
        status: true,
        email: true,
        tokenVersion: true,
        emailVerified: true,
        mustChangePassword: true,
        totpEnabled: true,
      },
    })
    if (!account) {
      res.status(401).json({ error: 'unauthorized', message: 'Session revoked.' })
      return
    }
    if (account.tokenVersion !== payload.tv) {
      res.status(401).json({ error: 'session_revoked', message: 'Your session was ended by a password change. Sign in again.' })
      return
    }
    if (account.status !== 'ACTIVE') {
      res.status(403).json({ error: 'suspended', message: 'This account is suspended. Contact an administrator.' })
      return
    }
    // Provisioned accounts hold a one-time password. Until it is replaced they
    // may only use the auth endpoints needed to change it.
    if (account.mustChangePassword && !req.originalUrl.startsWith('/api/auth/')) {
      res.status(403).json({
        error: 'password_change_required',
        message: 'Replace your temporary password before continuing.',
      })
      return
    }
    // Administrators with TOTP enabled require a verified MFA code this session.
    if (account.totpEnabled && payload.mfaVerified !== true) {
      res.status(403).json({
        error: 'mfa_required',
        message: 'Administrator multi-factor authentication is required for this session.',
      })
      return
    }
    ;(req as AuthedRequest).user = {
      sub: account.id,
      role: account.role,
      email: account.email,
      tv: account.tokenVersion,
    }
    touchActivity(account.id)
    next()
  } catch (error) {
    next(error)
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as AuthedRequest).user
    if (!user) {
      res.status(401).json({ error: 'unauthorized', message: 'Not authenticated.' })
      return
    }
    if (!roles.includes(user.role)) {
      res.status(403).json({ error: 'forbidden', message: 'You do not have access to this resource.' })
      return
    }
    next()
  }
}
