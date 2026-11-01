# Backup and Disaster Recovery

## Backup strategy

- **SQLite (local development):** copy `dev.db` plus any `-wal`/`-shm` companions.
- **PostgreSQL (deployed):** `pg_dump --format=custom`, which preserves the schema and data in one restorable file.
- Store backups outside the application directory and retain at least 7 daily copies (configurable).
- Every backup writes a manifest with byte size and SHA-256 so corruption is detectable.

## Backup script

`npm run backup` (`tools/backup.mjs`) chooses the driver from `DATABASE_URL`:

- `postgresql://…` → `pg_dump --format=custom` into `backups/alumniconnect-<timestamp>.dump` (manifest format 2).
- otherwise → copies the SQLite file and companions (manifest format 1).

Verify any manifest with:

```bash
npm run backup:verify -- backups/<manifest>.json
```

The verifier checks that every listed file exists, matches its recorded size, and matches its SHA-256. SQLite manifests are additionally checked for the `SQLite format 3` header. Environment knobs: `BACKUP_DIR`, `BACKUP_RETENTION_DAYS`, `BACKUP_VERIFY=true`.

The Compose stack runs `deploy/backup-loop.sh` in a Postgres sidecar, repeating `pg_dump` every `BACKUP_INTERVAL_SECONDS` (default 86400) into `./backups` and pruning files older than `BACKUP_RETENTION_DAYS`. Its manifests are format 2 and pass the same verifier (tested locally with a stub `pg_dump`).

## Restore

### SQLite

1. Stop the API.
2. Restore the `.db` file and its `-wal`/`-shm` companions together.
3. Run `prisma migrate deploy` if the schema moved forward.
4. Start the API and verify `/api/health`.

### PostgreSQL

1. Stop the API (keep the database running).
2. `pg_restore --clean --if-exists --no-owner --no-privileges -d "$DATABASE_URL" <backup>.dump`
3. Start the API; the entrypoint applies the schema with `prisma db push`.
4. Verify `/api/health`, `/api/ops/status`, and record counts.

## RPO/RTO

- RPO: up to 24 hours with daily backups (lower `BACKUP_INTERVAL_SECONDS` for tighter goals).
- RTO: under 1 hour for a single-instance restore.

## Restore test

- SQLite: performed by copying a snapshot and verifying the health endpoint and counts.
- PostgreSQL: the dump/restore path is documented but **not yet executed** — no PostgreSQL server or `pg_dump` is available in this workspace. Run a restore drill on the first staging database before relying on it.
