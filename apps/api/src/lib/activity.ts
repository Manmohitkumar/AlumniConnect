import { prisma } from '../db'

const WINDOW_MS = 5 * 60_000
const lastTouch = new Map<string, number>()

/**
 * Presence stamp for adoption metrics. Fire-and-forget and throttled to one
 * write per user per 5 minutes so normal traffic does not add a write per call.
 */
export function touchActivity(userId: string) {
  const now = Date.now()
  const last = lastTouch.get(userId)
  if (last && now - last < WINDOW_MS) return
  lastTouch.set(userId, now)
  prisma.user
    .update({ where: { id: userId }, data: { lastActiveAt: new Date(now) } })
    .catch(() => lastTouch.delete(userId))
}
