import type { NextFunction, Request, RequestHandler, Response } from 'express'
import { z, ZodError } from 'zod'

export class AppError extends Error {
  status: number
  code: string
  constructor(status: number, code: string, message: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

/** External URLs must be http(s) — javascript:, data: and file: schemes are rejected. */
export function httpUrl(max = 500) {
  return z
    .string()
    .trim()
    .max(max)
    .url()
    .refine((value) => /^https?:\/\//i.test(value), { message: 'Only http(s) URLs are allowed.' })
}

/** Express 4 does not forward rejected promises; every async handler goes through this. */
export function asyncHandler(handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler {
  return (req, res, next) => {
    handler(req, res, next).catch(next)
  }
}

export type Page = { page: number; pageSize: number; skip: number; take: number }

export function pagination(req: Request, defaultSize = 20): Page {
  const rawPage = Number.parseInt(String(req.query.page ?? '1'), 10)
  const rawSize = Number.parseInt(String(req.query.pageSize ?? defaultSize), 10)
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1
  const pageSize = Number.isFinite(rawSize) ? Math.min(Math.max(rawSize, 1), 50) : defaultSize
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize }
}

export function pageMeta(page: Page, total: number) {
  return {
    page: page.page,
    pageSize: page.pageSize,
    total,
    totalPages: Math.max(Math.ceil(total / page.pageSize), 1),
  }
}

/** Trims, collapses whitespace and caps length for free-text query params. */
export function cleanQuery(value: unknown, max = 120): string {
  if (typeof value !== 'string') return ''
  return value.trim().replace(/\s+/g, ' ').slice(0, max)
}

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (error instanceof AppError) {
    res.status(error.status).json({ error: error.code, message: error.message })
    return
  }
  if (error instanceof ZodError) {
    res.status(400).json({
      error: 'validation_error',
      message: 'Please check the submitted values.',
      issues: error.flatten().fieldErrors,
    })
    return
  }
  const code = (error as { code?: string }).code
  if (code === 'P2002') {
    res.status(409).json({ error: 'conflict', message: 'That record already exists.' })
    return
  }
  if (code === 'P2025') {
    res.status(404).json({ error: 'not_found', message: 'Record not found.' })
    return
  }
  console.error('[api] unhandled error', error)
  res.status(500).json({ error: 'internal_error', message: 'Something went wrong.' })
}
