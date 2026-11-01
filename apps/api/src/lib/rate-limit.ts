import type { NextFunction, Request, Response } from 'express'

type Bucket = { count: number; resetAt: number }

const buckets = new Map<string, Bucket>()

/**
 * Small in-memory fixed-window limiter. One API instance only; swap for a
 * Redis-backed store before running multiple API instances behind a proxy.
 */
export function rateLimit(options: {
  windowMs: number
  max: number
  key: string
  message?: string
}) {
  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now()
    const id = `${options.key}:${req.ip ?? 'unknown'}`
    const current = buckets.get(id)

    if (!current || current.resetAt <= now) {
      buckets.set(id, { count: 1, resetAt: now + options.windowMs })
      res.setHeader('X-RateLimit-Limit', String(options.max))
      res.setHeader('X-RateLimit-Remaining', String(options.max - 1))
      next()
      return
    }

    current.count += 1
    const remaining = Math.max(options.max - current.count, 0)
    res.setHeader('X-RateLimit-Limit', String(options.max))
    res.setHeader('X-RateLimit-Remaining', String(remaining))
    res.setHeader('X-RateLimit-Reset', String(Math.ceil(current.resetAt / 1000)))

    if (current.count > options.max) {
      const retryAfter = Math.ceil((current.resetAt - now) / 1000)
      res.setHeader('Retry-After', String(retryAfter))
      res.status(429).json({
        error: 'rate_limited',
        message: options.message ?? 'Too many requests. Please try again shortly.',
        retryAfterSeconds: retryAfter,
      })
      return
    }

    next()
  }
}

/** Test hook: drop all counters (used by automated tests). */
export function resetRateLimits() {
  buckets.clear()
}
