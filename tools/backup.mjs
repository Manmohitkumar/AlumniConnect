import crypto from 'node:crypto'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

/**
 * Creates a restorable snapshot of whichever database DATABASE_URL points at:
 * a PostgreSQL dump when it is a postgres:// URL, otherwise the SQLite file
 * plus its -wal/-shm companions. Retention applies to both.
 */
const databaseUrl = process.env.DATABASE_URL || ''
const backupDir = process.env.BACKUP_DIR || 'backups'
const retentionDays = Number(process.env.BACKUP_RETENTION_DAYS || 7)
const resolvedDir = path.resolve(backupDir)
const stamp = new Date().toISOString().replace(/[:.]/g, '-')
const prefix = `alumniconnect-${stamp}`

function hashFile(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')
}

function describe(file) {
  return { file: path.basename(file), bytes: fs.statSync(file).size, sha256: hashFile(file) }
}

function copyIfPresent(source, destination) {
  if (!fs.existsSync(source)) return null
  fs.copyFileSync(source, destination)
  return describe(destination)
}

function prune() {
  if (!Number.isFinite(retentionDays) || retentionDays < 0) return
  const threshold = Date.now() - retentionDays * 24 * 60 * 60 * 1000
  for (const entry of fs.readdirSync(resolvedDir)) {
    if (!/^alumniconnect-\d{4}-\d{2}-\d{2}T/.test(entry)) continue
    const candidate = path.join(resolvedDir, entry)
    if (fs.statSync(candidate).mtimeMs < threshold) fs.rmSync(candidate, { force: true })
  }
}

fs.mkdirSync(resolvedDir, { recursive: true })

let manifest
let files = []

if (/^postgres(ql)?:\/\//i.test(databaseUrl)) {
  const target = path.join(resolvedDir, `${prefix}.dump`)
  try {
    execFileSync('pg_dump', ['--format=custom', '--no-owner', '--no-privileges', `--file=${target}`, databaseUrl], {
      stdio: ['ignore', 'ignore', 'pipe'],
    })
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    console.error(`pg_dump failed. Install the PostgreSQL client or set DATABASE_PATH for SQLite. ${detail}`)
    process.exit(1)
  }
  files = [describe(target)]
  manifest = {
    format: 2,
    driver: 'postgres',
    createdAt: new Date().toISOString(),
    source: databaseUrl.replace(/:\/\/[^@]*@/, '://***@'),
    files,
    restore: 'pg_restore --clean --no-owner --no-privileges -d "$DATABASE_URL" <file>.dump, then run prisma migrate deploy and verify /api/health.',
  }
} else {
  const dbPath = process.env.DATABASE_PATH || 'apps/api/prisma/dev.db'
  const resolvedDb = path.resolve(dbPath)
  if (!fs.existsSync(resolvedDb)) {
    console.error(`Database not found: ${resolvedDb}`)
    process.exit(1)
  }
  const dbTarget = path.join(resolvedDir, `${prefix}.db`)
  for (const [source, destination] of [
    [resolvedDb, dbTarget],
    [`${resolvedDb}-wal`, `${dbTarget}-wal`],
    [`${resolvedDb}-shm`, `${dbTarget}-shm`],
  ]) {
    const copied = copyIfPresent(source, destination)
    if (copied) files.push(copied)
  }
  manifest = {
    format: 1,
    driver: 'sqlite',
    createdAt: new Date().toISOString(),
    source: path.basename(resolvedDb),
    files,
    restore:
      'Stop the API, copy the .db plus any -wal/-shm companions back together, then run prisma migrate deploy and verify /api/health.',
  }
}

const manifestPath = path.join(resolvedDir, `${prefix}.json`)
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
if (process.env.BACKUP_VERIFY === 'true') {
  const missing = files.filter((entry) => !fs.existsSync(path.join(resolvedDir, entry.file)))
  if (missing.length > 0) {
    fs.rmSync(manifestPath, { force: true })
    console.error(`Backup verification failed; missing ${missing.map((entry) => entry.file).join(', ')}`)
    process.exit(1)
  }
}

prune()

console.log(`Backup created: ${manifestPath}`)
console.log(`Driver: ${manifest.driver}`)
console.log(`Files: ${files.map((file) => file.file).join(', ')}`)
