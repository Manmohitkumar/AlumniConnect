import { createHash, randomUUID } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'

export type UploadKind = 'avatar' | 'submission' | 'general'

export type DetectedFile = {
  extension: 'png' | 'jpg' | 'gif' | 'webp' | 'pdf' | 'zip'
  mimeType: string
  category: 'image' | 'document' | 'archive'
}

const megabytes = 1024 * 1024

/** Per-kind limits applied after the multipart parser's hard ceiling. */
export function uploadPolicy(kind: UploadKind): { maxBytes: number; categories: Array<DetectedFile['category']> } {
  switch (kind) {
    case 'avatar':
      return { maxBytes: 5 * megabytes, categories: ['image'] }
    case 'submission':
      return { maxBytes: 20 * megabytes, categories: ['image', 'document', 'archive'] }
    default:
      return { maxBytes: 10 * megabytes, categories: ['image', 'document'] }
  }
}

export function maxUploadBytes(): number {
  return 20 * megabytes
}

/**
 * Identifies files from their bytes, never from the client-supplied filename or
 * MIME type. SVG is deliberately absent: it is script-capable markup.
 */
export function detectFile(buffer: Buffer): DetectedFile | null {
  if (buffer.length < 12) return null
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return { extension: 'png', mimeType: 'image/png', category: 'image' }
  }
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { extension: 'jpg', mimeType: 'image/jpeg', category: 'image' }
  }
  const header = buffer.subarray(0, 6).toString('ascii')
  if (header === 'GIF87a' || header === 'GIF89a') {
    return { extension: 'gif', mimeType: 'image/gif', category: 'image' }
  }
  if (buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP') {
    return { extension: 'webp', mimeType: 'image/webp', category: 'image' }
  }
  if (buffer.subarray(0, 5).toString('ascii') === '%PDF-') {
    return { extension: 'pdf', mimeType: 'application/pdf', category: 'document' }
  }
  if (buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04) {
    return { extension: 'zip', mimeType: 'application/zip', category: 'archive' }
  }
  return null
}

export function storageRoot(): string {
  return path.resolve(process.env.UPLOAD_DIR ?? path.join(process.cwd(), 'uploads'))
}

export async function saveFile(input: {
  buffer: Buffer
  kind: UploadKind
  detected: DetectedFile
}): Promise<{ key: string; sha256: string }> {
  const now = new Date()
  const folder = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, '0')}`
  const key = `${input.kind}/${folder}/${randomUUID()}.${input.detected.extension}`
  const target = path.join(storageRoot(), ...key.split('/'))
  await fs.mkdir(path.dirname(target), { recursive: true })
  await fs.writeFile(target, input.buffer, { flag: 'wx' })
  return { key, sha256: createHash('sha256').update(input.buffer).digest('hex') }
}

/** Resolves a stored key inside the upload root, rejecting traversal attempts. */
export function resolveStoredFile(key: string): string | null {
  const root = storageRoot()
  const target = path.resolve(root, ...key.split('/'))
  const relative = path.relative(root, target)
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) return null
  return target
}

export async function readFile(key: string): Promise<Buffer | null> {
  const target = resolveStoredFile(key)
  if (!target) return null
  try {
    return await fs.readFile(target)
  } catch {
    return null
  }
}

export async function deleteFile(key: string): Promise<void> {
  const target = resolveStoredFile(key)
  if (!target) return
  await fs.rm(target, { force: true })
}
