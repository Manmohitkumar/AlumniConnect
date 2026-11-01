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

## Vercel frontend + Render API

The Vercel project serves the React SPA. The API must run as a separate persistent
service because it owns PostgreSQL access, uploads, email flows, and long-lived
runtime features. The repository includes [`render.yaml`](../render.yaml), which
creates:

- a Docker-based `alumniconnect-api` web service;
- a managed PostgreSQL database;
- a persistent disk mounted at `/data/uploads`; and
- an API health check at `/api/health`.

### Provision the API

1. In Render, choose **New → Blueprint** and select this repository and the
   `main` branch.
2. Review the services in `render.yaml`. The API needs a paid web plan because
   persistent disks are required for uploaded avatars, certificates, and
   attachments. The database plan can be changed to match the required
   production capacity.
3. Before the first deploy, set the synchronized values:
   - `APP_URL`: the public Vercel frontend URL;
   - `PUBLIC_BASE_URL`: the public Vercel frontend URL;
   - `WEB_ORIGIN` and `WEB_ORIGINS`: the exact Vercel frontend origin;
   - `SMTP_URL`: a production SMTP relay if verification and password-reset
     emails are required.
4. Deploy the API and verify:

   ```text
   https://<render-api-host>/api/health
   ```

5. To make the documented demo accounts available, set `SEED_DEMO=true` for
   one deploy, verify the seed completed, then set it back to `false` and
   redeploy. The demo credentials are synthetic and must not be used as
   production credentials.

### Connect Vercel to the API

Set the Vercel project environment variable `VITE_API_BASE_URL` to the API
origin, without a trailing slash:

```text
https://<render-api-host>
```

Redeploy the Vercel project after setting the variable. The frontend then calls
the Render API at `/api/...`; it no longer expects Vercel to host the API.

### Production verification

Run these checks before announcing the deployment:

1. `GET /api/health` returns a healthy response.
2. Direct navigation and refresh work for all four login routes.
3. Each seeded demo account logs in and reaches its role dashboard.
4. Authenticated API requests return JSON rather than the Vercel SPA HTML.
5. An upload remains available after an API restart.
6. Email verification and password reset are tested if `SMTP_URL` is configured.

Render Blueprint provisioning and Vercel environment configuration still require
provider access; this workspace does not contain those credentials.

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
