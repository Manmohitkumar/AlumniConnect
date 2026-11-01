import { Router } from 'express'
import multer from 'multer'
import type { NextFunction, Request, Response } from 'express'
import { z } from 'zod'
import { prisma } from '../db'
import { requireAuth } from '../middleware/auth'
import { AppError, asyncHandler, pageMeta, pagination } from '../lib/http'
import { audit, sessionUser } from '../lib/audit'
import { deleteFile, detectFile, maxUploadBytes, readFile, saveFile, uploadPolicy, type UploadKind } from '../lib/storage'
import { antivirusRequired, scanBuffer } from '../lib/clamav'

export const uploadsRouter = Router()

const parser = multer({ storage: multer.memoryStorage(), limits: { fileSize: maxUploadBytes(), files: 1, fields: 4 } })
const kindSchema = z.enum(['avatar', 'submission', 'general']).default('general')

function receiveFile(req: Request, res: Response, next: NextFunction) {
  parser.single('file')(req, res, (error: unknown) => {
    if (!error) {
      next()
      return
    }
    if (error instanceof multer.MulterError) {
      const status = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400
      next(new AppError(status, 'invalid_upload', error.code === 'LIMIT_FILE_SIZE' ? 'That file is too large.' : 'The upload could not be read.'))
      return
    }
    next(error)
  })
}

function origin(req: Request): string {
  return `${req.protocol}://${req.get('host')}`
}

function fileUrl(req: Request, row: { id: string; key: string; visibility: string }): string {
  return row.visibility === 'PUBLIC' ? `${origin(req)}/uploads/${row.key}` : `${origin(req)}/api/uploads/${row.id}/content`
}

uploadsRouter.post(
  '/',
  requireAuth,
  receiveFile,
  asyncHandler(async (req, res) => {
    const user = sessionUser(req)!
    const kind = kindSchema.parse(req.query.kind ?? 'general')
    if (!req.file) throw new AppError(400, 'file_required', 'Choose a file to upload.')

    const detected = detectFile(req.file.buffer)
    if (!detected) {
      throw new AppError(415, 'unsupported_file', 'Only PNG, JPEG, GIF, WebP, PDF and ZIP files are accepted.')
    }
    const policy = uploadPolicy(kind)
    if (!policy.categories.includes(detected.category)) {
      throw new AppError(415, 'unsupported_file', `A ${detected.category} file is not accepted for ${kind} uploads.`)
    }
    if (req.file.size > policy.maxBytes) {
      throw new AppError(413, 'file_too_large', `Files for ${kind} uploads must be ${Math.round(policy.maxBytes / (1024 * 1024))} MB or smaller.`)
    }

    const scan = await scanBuffer(req.file.buffer)
    if (scan.status === 'infected') {
      throw new AppError(422, 'file_infected', 'The file failed the malware scan and was rejected.')
    }
    if (scan.status === 'unavailable' && antivirusRequired()) {
      throw new AppError(503, 'scan_unavailable', 'Upload scanning is temporarily unavailable. Try again shortly.')
    }

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const recent = await prisma.upload.count({ where: { ownerId: user.id, createdAt: { gte: since } } })
    if (recent >= 50) throw new AppError(429, 'upload_quota', 'Daily upload limit reached. Try again tomorrow or delete older files.')

    const { key, sha256 } = await saveFile({ buffer: req.file.buffer, kind: kind as UploadKind, detected })
    const row = await prisma.upload.create({
      data: {
        ownerId: user.id,
        key,
        kind,
        visibility: kind === 'avatar' ? 'PUBLIC' : 'PRIVATE',
        mimeType: detected.mimeType,
        bytes: req.file.size,
        sha256,
        originalName: req.file.originalname?.slice(0, 200) ?? null,
      },
    })

    await audit(req, 'upload.created', 'Upload', row.id, { kind, bytes: row.bytes, mimeType: row.mimeType, scan: scan.status })
    res.status(201).json({
      data: {
        id: row.id,
        url: fileUrl(req, row),
        mimeType: row.mimeType,
        bytes: row.bytes,
        sha256: row.sha256,
        kind: row.kind,
      },
    })
  }),
)

uploadsRouter.get(
  '/mine',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = sessionUser(req)!
    const page = pagination(req, 20)
    const where = { ownerId: user.id }
    const [rows, total] = await Promise.all([
      prisma.upload.findMany({ where, orderBy: { createdAt: 'desc' }, skip: page.skip, take: page.take }),
      prisma.upload.count({ where }),
    ])
    res.json({
      data: rows.map((row) => ({ ...row, url: fileUrl(req, row) })),
      meta: pageMeta(page, total),
    })
  }),
)

uploadsRouter.get('/:id/content', (req: Request, res: Response, next: NextFunction) => {
  prisma.upload
    .findUnique({ where: { id: req.params.id } })
    .then((row) => {
      if (!row) throw new AppError(404, 'not_found', 'File not found.')
      // Public files (avatars) stay readable; everything else goes through the
      // same session checks as the rest of the API.
      if (row.visibility === 'PUBLIC') return serveUpload(req, res, row)
      requireAuth(req, res, () => {
        void servePrivateUpload(req, res, row).catch(next)
      })
      return undefined
    })
    .catch(next)
})

async function servePrivateUpload(
  req: Request,
  res: Response,
  row: { id: string; ownerId: string; kind: string; key: string; mimeType: string; sha256: string; originalName: string | null },
) {
  const user = sessionUser(req)!
  if (user.role !== 'ADMIN' && row.ownerId !== user.id) {
    const linked = await prisma.submission.findFirst({
      where: { fileUrl: { contains: row.id }, challenge: { authorId: user.id } },
      select: { id: true },
    })
    if (!linked) throw new AppError(403, 'forbidden', 'You do not have access to this file.')
  }
  return serveUpload(req, res, row)
}

async function serveUpload(
  _req: Request,
  res: Response,
  row: { kind: string; key: string; mimeType: string; sha256: string; originalName: string | null },
) {
  const buffer = await readFile(row.key)
  if (!buffer) throw new AppError(404, 'not_found', 'File contents are no longer available.')

  res.setHeader('Content-Type', row.mimeType)
  res.setHeader('Content-Length', String(buffer.length))
  res.setHeader('ETag', `"${row.sha256}"`)
  res.setHeader('Cache-Control', row.kind === 'avatar' ? 'public, max-age=2592000, immutable' : 'private, no-store')
  if (row.kind === 'submission') {
    const name = (row.originalName ?? 'attachment').replace(/[^a-zA-Z0-9._-]/g, '_')
    res.setHeader('Content-Disposition', `attachment; filename="${name}"`)
  } else {
    res.setHeader('Content-Disposition', 'inline')
  }
  res.send(buffer)
}

uploadsRouter.delete(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = sessionUser(req)!
    const row = await prisma.upload.findUnique({ where: { id: req.params.id } })
    if (!row) throw new AppError(404, 'not_found', 'File not found.')
    if (row.ownerId !== user.id && user.role !== 'ADMIN') {
      throw new AppError(403, 'forbidden', 'You can only delete your own files.')
    }

    if (row.kind === 'submission') {
      const linked = await prisma.submission.findFirst({ where: { fileUrl: { contains: row.id } }, select: { id: true } })
      if (linked) throw new AppError(409, 'file_in_use', 'This file is attached to a submission and cannot be deleted.')
    }

    await prisma.upload.delete({ where: { id: row.id } })
    await deleteFile(row.key)
    await audit(req, 'upload.deleted', 'Upload', row.id, { kind: row.kind })
    res.json({ data: { deleted: true } })
  }),
)
