import crypto from 'node:crypto'
import { prisma } from '../db'

/**
 * Single-use verification / password-reset tokens.
 *
 * Only the SHA-256 hash is stored, so a database leak does not expose usable
 * links. Tokens expire quickly, are invalidated when reissued, and are marked
 * used on first consumption.
 */
export const TOKEN_TTL_MS = {
  EMAIL_VERIFY: 24 * 60 * 60 * 1000,
  PASSWORD_RESET: 60 * 60 * 1000,
  ADMIN_MFA_ENROLL: 15 * 60 * 1000,
} as const

export type TokenType = keyof typeof TOKEN_TTL_MS

export function hashToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex')
}

export async function issueAuthToken(userId: string, type: TokenType): Promise<string> {
  const raw = crypto.randomBytes(32).toString('base64url')
  const tokenHash = hashToken(raw)
  // Reissuing invalidates earlier unused links of the same type.
  await prisma.authToken.deleteMany({ where: { userId, type, usedAt: null } })
  await prisma.authToken.create({
    data: {
      userId,
      type,
      tokenHash,
      expiresAt: new Date(Date.now() + TOKEN_TTL_MS[type]),
    },
  })
  return raw
}

export async function consumeAuthToken(raw: string, type: TokenType): Promise<string | null> {
  if (!raw || raw.length < 20 || raw.length > 200) return null
  const tokenHash = hashToken(raw)
  const row = await prisma.authToken.findUnique({ where: { tokenHash } })
  if (!row) return null
  if (row.type !== type) return null
  if (row.usedAt) return null
  if (row.expiresAt.getTime() <= Date.now()) return null

  // Conditional update so two concurrent requests cannot both consume it.
  const claimed = await prisma.authToken.updateMany({
    where: { id: row.id, usedAt: null },
    data: { usedAt: new Date() },
  })
  if (claimed.count !== 1) return null
  return row.userId
}

export async function revokeAuthTokens(userId: string, type?: TokenType): Promise<void> {
  await prisma.authToken.deleteMany({
    where: { userId, usedAt: null, ...(type ? { type } : {}) },
  })
}
