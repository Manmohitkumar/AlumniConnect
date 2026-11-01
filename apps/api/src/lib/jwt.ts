import jwt from 'jsonwebtoken'

const DEV_SECRET = 'dev-secret-change-me-in-production'
const JWT_SECRET = process.env.JWT_SECRET ?? (process.env.NODE_ENV === 'production' ? '' : DEV_SECRET)
const JWT_EXPIRES_IN = '7d'

if (!JWT_SECRET) {
  // Fail closed: never sign production sessions with a guessable default.
  throw new Error('JWT_SECRET must be set in production.')
}

export type JwtPayload = {
  sub: string
  role: string
  email: string
  /** tokenVersion captured at sign-in; a mismatch revokes the session. */
  tv: number
  /** Whether an enabled administrator verified their TOTP this session. */
  mfaVerified?: boolean
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as Partial<JwtPayload>
    if (!decoded.sub || !decoded.role || !decoded.email) return null
    return {
      sub: decoded.sub,
      role: decoded.role,
      email: decoded.email,
      tv: typeof decoded.tv === 'number' ? decoded.tv : 0,
      mfaVerified: decoded.mfaVerified === true,
    }
  } catch {
    return null
  }
}
