import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

const manifestPath = process.argv[2]
if (!manifestPath) {
  console.error('Usage: node tools/verify-backup.mjs <backup-manifest.json>')
  process.exit(1)
}

const absoluteManifest = path.resolve(manifestPath)
const manifest = JSON.parse(fs.readFileSync(absoluteManifest, 'utf8'))
const supportedFormats = [1, 2]
if (!supportedFormats.includes(manifest.format) || !Array.isArray(manifest.files) || manifest.files.length === 0) {
  throw new Error('Backup manifest is invalid.')
}

function hashFile(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')
}

for (const file of manifest.files) {
  const candidate = path.join(path.dirname(absoluteManifest), file.file)
  if (!fs.existsSync(candidate)) throw new Error(`Missing backup file: ${file.file}`)
  if (fs.statSync(candidate).size !== file.bytes) throw new Error(`Backup size mismatch: ${file.file}`)
  if (hashFile(candidate) !== file.sha256) throw new Error(`Backup checksum mismatch: ${file.file}`)
}

const isPostgres = manifest.driver === 'postgres' || manifest.format === 2
if (isPostgres) {
  const dump = manifest.files.find((file) => file.file.endsWith('.dump'))
  if (!dump) throw new Error('Postgres backup manifest does not list a .dump file.')
  // Restore with: pg_restore --clean --if-exists --dbname <url> <dump>
} else {
  const database = manifest.files.find((file) => file.file.endsWith('.db'))
  if (!database) throw new Error('SQLite backup manifest does not list a .db file.')
  const databasePath = path.join(path.dirname(absoluteManifest), database.file)
  const header = fs.readFileSync(databasePath).subarray(0, 16).toString('ascii')
  if (header !== 'SQLite format 3\u0000') throw new Error('Backup database does not have a SQLite header.')
}

console.log(`Backup verified (${isPostgres ? 'postgres' : 'sqlite'}): ${absoluteManifest}`)
