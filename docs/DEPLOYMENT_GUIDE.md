# Deployment Guide

## Docker Compose (PostgreSQL) — scaffolding added, not yet run here

`docker-compose.yml`, `apps/api/Dockerfile`, `apps/web/Dockerfile`, and `deploy/nginx.conf` describe a single-host deployment: nginx serves the built SPA and proxies `/api` and `/uploads` to the API, PostgreSQL stores data, and a sidecar creates daily `pg_dump` backups into `./backups`.

```bash
cp deploy/.env.example .env      # set POSTGRES_PASSWORD, JWT_SECRET, APP_URL
docker compose up --build -d
docker compose logs -f api
curl http://localhost:8080/api/health
```

Notes and current limits:

- The API image generates the Prisma client from `apps/api/prisma/schema.postgres.prisma` and applies it with `prisma db push` on start. The SQLite migration history is not used for PostgreSQL; generate reviewable DDL with:
  `DATABASE_URL=postgresql://u:p@host/db npx prisma migrate diff --from-empty --to-schema-datamodel apps/api/prisma/schema.postgres.prisma --script`
- Uploaded files live on the `upload-data` volume; public avatars are served through the API at `/uploads/...`.
- The `backup` service writes verifier-compatible manifests; check one with `node tools/verify-backup.mjs backups/<manifest>.json`.
- **Not verified on this machine:** Docker and `psql` are not installed, so the images, Compose stack, and nginx config have not been executed. `prisma validate` and offline DDL generation for the PostgreSQL schema do pass. Treat the first real deployment as a staging exercise.

## Manual steps (verified locally with SQLite)

1. Configure environment variables (see ENVIRONMENT_CONFIGURATION.md).
2. Install dependencies: `npm install`.
3. Generate Prisma client: `npm --workspace apps/api run db:generate`.
4. Run migrations: `npm --workspace apps/api run db:migrate` (or `prisma migrate deploy`).
5. Seed demo data (optional): `npm --workspace apps/api run db:seed`.
6. Build web: `npm --workspace apps/web run build`.
7. Start API: `npm --workspace apps/api run start` (or process manager).
8. Serve `apps/web/dist` via static host or reverse proxy (proxy `/api` and `/uploads` to the API).
9. Configure HTTPS and domain.
10. Set CORS `WEB_ORIGINS`.

## Rollback

- Keep the previous build and a verified database backup.
- Restore the database (see BACKUP_AND_DISASTER_RECOVERY.md).
- Redeploy the previous build and check `/api/health` plus `/api/ops/status`.

## Notes

- No production deployment has been performed from this workspace; everything above is local or scaffolded.
- Real hosting credentials, DNS, and TLS are still required to complete a production launch.
