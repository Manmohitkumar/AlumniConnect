#!/usr/bin/env node
/**
 * Phase 6 backup restore drill.
 *
 * Verifies the newest backup manifest (sizes + SHA-256), copies the backup set
 * to a scratch directory, opens it with Prisma, runs SQLite's integrity check
 * and counts core records. Proves the backup is restorable, not just present.
 *
 * Usage: node tools/restore-drill.mjs [backup-manifest.json]
 */
import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { PrismaClient } from '@prisma/client'

function newestManifest() {
  const dir = path.resolve(process.env.BACKUP_DIR || 'backups')
  if (!fs.existsSync(dir)) throw new Error(`Backup directory not found: ${dir}`)
  const manifests = fs
    .readdirSync(dir)
    .filter((entry) => /^alumniconnect-\d{4}-\d{2}-\d{2}T.*\.json$/.test(entry))
    .map((entry) => ({ file: path.join(dir, entry), mtime: fs.statSync(path.join(dir, entry)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime)
  if (manifests.length === 0) throw new Error('No backup manifest found. Run npm run backup first.')
  return manifests[0].file
}

function hashFile(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')
}

async function main() {
  const manifestPath = path.resolve(process.argv[2] ?? newestManifest())
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
  if (manifest.format !== 1 || !Array.isArray(manifest.files) || manifest.files.length === 0) {
    throw new Error('Backup manifest is invalid.')
  }

  console.log(`Manifest: ${manifestPath}`)
  console.log(`Created:  ${manifest.createdAt}`)

  for (const file of manifest.files) {
    const source = path.join(path.dirname(manifestPath), file.file)
    if (!fs.existsSync(source)) throw new Error(`Missing backup file: ${file.file}`)
    if (fs.statSync(source).size !== file.bytes) throw new Error(`Size mismatch: ${file.file}`)
    if (hashFile(source) !== file.sha256) throw new Error(`Checksum mismatch: ${file.file}`)
    console.log(`  verified  ${file.file} (${file.bytes} bytes, sha256 ok)`)
  }

  const databaseEntry = manifest.files.find((file) => file.file.endsWith('.db'))
  if (!databaseEntry) throw new Error('Backup set contains no database file.')

  const scratchDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ac-restore-drill-'))
  const scratchDb = path.join(scratchDir, 'restored.db')
  for (const file of manifest.files) {
    const source = path.join(path.dirname(manifestPath), file.file)
    const destination = file.file.endsWith('.db')
      ? scratchDb
      : file.file.endsWith('.db-wal')
        ? `${scratchDb}-wal`
        : `${scratchDb}-shm`
    fs.copyFileSync(source, destination)
  }
  console.log(`\nRestored to ${scratchDb}`)

  const prisma = new PrismaClient({ datasourceUrl: `file:${scratchDb.replace(/\\/g, '/')}` })
  try {
    const integrity = await prisma.$queryRawUnsafe('PRAGMA integrity_check')
    const verdict = Object.values(integrity[0] ?? {})[0]
    console.log(`SQLite integrity_check: ${verdict}`)
    if (verdict !== 'ok') throw new Error(`Integrity check failed: ${verdict}`)

    const [users, universities, challenges, submissions, certificates, mentorship] = await Promise.all([
      prisma.user.count(),
      prisma.university.count(),
      prisma.challenge.count(),
      prisma.submission.count(),
      prisma.certificate.count(),
      prisma.mentorshipRequest.count(),
    ])
    console.log(`Record counts: users=${users} universities=${universities} challenges=${challenges} submissions=${submissions} certificates=${certificates} mentorshipRequests=${mentorship}`)
    if (users === 0 || universities === 0) throw new Error('Restored database is unexpectedly empty.')

    const admins = await prisma.user.count({ where: { role: 'ADMIN' } })
    console.log(`Administrator accounts: ${admins}`)
    if (admins === 0) throw new Error('Restored database has no administrator account.')

    console.log('\nRESTORE DRILL PASSED — backup opens, passes integrity check, and retains core records.')
  } finally {
    await prisma.$disconnect()
    fs.rmSync(scratchDir, { recursive: true, force: true })
  }
}

main().catch((error) => {
  console.error(`RESTORE DRILL FAILED — ${error instanceof Error ? error.message : error}`)
  process.exit(1)
})
