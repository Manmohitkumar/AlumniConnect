import type { Request } from 'express'
import { prisma } from '../db'
import { verifyToken } from './jwt'
import { readSessionToken } from './session'

export type SessionUser = { id: string; role: string; email: string }

/**
 * Returns the signed-in user for the request. When requireAuth has already run,
 * its database-backed identity is reused (fresh role/status); otherwise the
 * token payload is decoded for optional-auth endpoints.
 */
export function sessionUser(req: Request): SessionUser | null {
  const fromMiddleware = (req as Request & { user?: { sub: string; role: string; email: string } }).user
  if (fromMiddleware) {
    return { id: fromMiddleware.sub, role: fromMiddleware.role, email: fromMiddleware.email }
  }
  const token = readSessionToken(req)
  if (!token) return null
  const payload = verifyToken(token)
  if (!payload) return null
  return { id: payload.sub, role: payload.role, email: payload.email }
}

/** Append-only audit trail for sensitive or state-changing actions. */
export async function audit(
  req: Request,
  action: string,
  entity: string,
  entityId: string | null,
  meta?: Record<string, unknown>,
) {
  const actor = sessionUser(req)
  await prisma.auditLog.create({
    data: {
      actorId: actor?.id ?? null,
      action,
      entity,
      entityId,
      meta: meta ? JSON.stringify(meta) : null,
      ip: req.ip ?? null,
    },
  })
}
