import type { Request, Response } from 'express'

export const SESSION_COOKIE = 'ac_session'
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

function isProduction() {
  return process.env.NODE_ENV === 'production'
}

/**
 * Session cookie. httpOnly so client JavaScript cannot read it, which keeps the
 * token out of reach of XSS. Lax + same-site deployment because the web app and
 * API share an origin through the dev proxy / reverse proxy in production.
 */
export function setSessionCookie(res: Response, token: string) {
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction(),
    path: '/',
    maxAge: SEVEN_DAYS_MS,
  })
}

export function clearSessionCookie(res: Response) {
  res.clearCookie(SESSION_COOKIE, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction(),
    path: '/',
  })
}

/** Minimal cookie header parser — avoids an extra dependency for one cookie. */
function readCookie(req: Request, name: string): string | null {
  const header = req.headers.cookie
  if (!header) return null
  for (const part of header.split(';')) {
    const index = part.indexOf('=')
    if (index === -1) continue
    if (part.slice(0, index).trim() !== name) continue
    const raw = part.slice(index + 1).trim()
    try {
      return decodeURIComponent(raw)
    } catch {
      return raw
    }
  }
  return null
}

/**
 * Accepts the httpOnly cookie first, then a Bearer header for API clients and
 * tooling. Returns null when neither carries a token.
 */
export function readSessionToken(req: Request): string | null {
  const cookieToken = readCookie(req, SESSION_COOKIE)
  if (cookieToken) return cookieToken
  const header = req.headers.authorization
  if (header && header.startsWith('Bearer ')) {
    const bearer = header.slice('Bearer '.length).trim()
    return bearer.length > 0 ? bearer : null
  }
  return null
}
