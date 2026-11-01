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

## Railway (complete project in one Railway project)

Railway can host the complete application in one project using three services:

- **PostgreSQL**: Railway's managed PostgreSQL service;
- **API**: the Docker image at `apps/api/Dockerfile`; and
- **Web**: the Docker image at `apps/web/Dockerfile`, which serves the SPA and
  reverse-proxies API and upload requests to the API service.

This keeps the frontend and API on one public origin, so the browser does not
need a separately configured `VITE_API_BASE_URL`. It also preserves direct SPA
route refreshes, SSE presence streams, and `/uploads` requests through nginx.

### Create the Railway services

1. Create an empty Railway project and add a PostgreSQL service.
2. Add an empty service named `alumniconnect-api`, connect this repository, and
   use the repository root as its root directory.
3. Configure the API service to build with:
   - Builder: **Dockerfile**
   - Dockerfile path: `/apps/api/Dockerfile`
   - Docker build context: `/`
   - Health check path: `/api/health`
4. Add a Railway volume to the API service at `/data/uploads`. Start with at
   least 10 GB. Uploaded files are not durable without this volume.
5. Add an empty service named `alumniconnect-web`, connect the same repository,
   and use the repository root as its root directory.
6. Configure the web service to build with:
   - Builder: **Dockerfile**
   - Dockerfile path: `/apps/web/Dockerfile`
   - Docker build context: `/`
   - Health check path: `/`
7. Generate a public domain for the web service. The web service is the only
   service that should be exposed publicly.

### Required Railway variables

Set these on `alumniconnect-api`:

```text
NODE_ENV=production
DATABASE_URL=${{Postgres.DATABASE_URL}}
JWT_SECRET=<a long random secret>
UPLOAD_DIR=/data/uploads
APP_URL=https://<railway-web-domain>
PUBLIC_BASE_URL=https://<railway-web-domain>
WEB_ORIGIN=https://<railway-web-domain>
WEB_ORIGINS=https://<railway-web-domain>
SEED_DEMO=false
```

Replace `Postgres` in the reference above with the exact Railway PostgreSQL
service name if it differs. Railway supplies `PORT`; do not hard-code it for
the API service. If email verification or password reset must work in
production, also set `SMTP_URL` and `SMTP_FROM` to a real SMTP provider.

Set this on `alumniconnect-web`:

```text
API_UPSTREAM=${{alumniconnect-api.RAILWAY_PRIVATE_DOMAIN}}:4000
```

The web Dockerfile passes `API_UPSTREAM` to nginx at container startup. If the
Railway private-domain reference is unavailable in the UI, use the API
service's private DNS hostname shown in Railway's networking settings, followed
by `:4000`. Do not use the public API domain for this internal proxy.

### Seed and verify

To create the documented demo accounts, temporarily set `SEED_DEMO=true` on
the API service and deploy once. After the seed completes, set it back to
`false` and deploy again. The credentials are synthetic demo credentials and
must not be used in production.

Verify the public web domain and API through the web proxy:

```text
GET https://<railway-web-domain>/api/health
GET https://<railway-web-domain>/student/login
GET https://<railway-web-domain>/alumni/login
GET https://<railway-web-domain>/university/login
GET https://<railway-web-domain>/admin/login
```

Then test each seeded login, dashboard refresh, logout, an upload, and the
metaverse presence stream. Test an upload again after an API redeploy to verify
the volume is mounted correctly.

Railway volumes are attached to a single service instance. Do not scale the API
to multiple replicas while uploads are stored locally; use shared object
storage first if horizontal scaling is required. SMTP, Web Push, and any
external tracing or alerting integrations also require their production
credentials to be configured explicitly.

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
