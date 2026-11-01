# Environment Configuration

## API (`apps/api/.env`)

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | yes | `file:./dev.db` locally; `postgresql://user:pass@host:5432/db` in deployed environments. |
| `PORT` | no | API port (default `4000`). |
| `WEB_ORIGIN` / `WEB_ORIGINS` | no | Allowed browser origins; `WEB_ORIGINS` is the comma-separated list used by CORS. |
| `JWT_SECRET` | production | Session signing secret. Generate with `openssl rand -hex 32`. |
| `APP_URL` | no | Public web URL used in emails and links. |
| `NODE_ENV` | no | `development` (default), `test`, or `production`. |
| `SMTP_URL` | no | Real SMTP relay URL, e.g. `smtps://user:pass@smtp.example.com:465`. Empty keeps rich-preview mode. |
| `SMTP_FROM` | no | From header; defaults to an AlumniConnect address. |
| `DEV_MAILBOX` | no | `true` (default) starts a loopback SMTP sink outside production. Set `false` to disable. |
| `DEV_SMTP_PORT` | no | Dev sink port, default `1025`. The smoke suite uses `1035`. |
| `UPLOAD_DIR` | no | Storage root for uploads; defaults to `<cwd>/uploads`. Docker sets `/data/uploads`. |
| `ALERT_WEBHOOK_URL` | no | Slack-compatible webhook for error-rate and p95 latency alerts. |
| `ALERTS_ENABLED` | no | `true` evaluates alerts every minute even without a webhook (events are logged in-process). |
| `ALERT_ERROR_RATE` | no | 5xx ratio threshold, default `0.05`. |
| `ALERT_P95_MS` | no | p95 latency threshold, default `2000`. |
| `ALERT_MIN_SAMPLES` | no | Minimum requests in the 5-minute window, default `20`. |
| `ALERT_COOLDOWN_MS` | no | Minimum gap between repeat alerts, default `900000` (15 min). |
| `BACKUP_*` | no | Used by `npm run backup`: `BACKUP_DIR`, `BACKUP_RETENTION_DAYS`, `BACKUP_VERIFY=true`. |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | push | Web Push key pair for device notifications. Generate once with `npx web-push generate-vapid-keys`; when absent the API disables push and the settings UI reports it. |
| `VAPID_SUBJECT` | no | Contact for the push service, e.g. `mailto:ops@your-domain`. |
| `CLAMAV_HOST` / `CLAMAV_PORT` | no | clamd address for upload malware scanning. Absent disables scanning; the Compose stack sets `clamav:3310`. |
| `CLAMAV_TIMEOUT_MS` | no | Scan timeout, default `15000`. On timeout the result is `unavailable`. |
| `UPLOAD_SCAN_REQUIRED` | no | `true` rejects uploads when clamd is unreachable instead of failing open. |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | no | OTLP/HTTP collector base URL (spans POST to `/v1/traces`). Absent disables trace export. |
| `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT` | no | Full OTLP trace URL; takes precedence over the base endpoint. |
| `OTEL_SERVICE_NAME` | no | `service.name` resource attribute, default `alumniconnect-api`. |

## Web (`apps/web/.env`)

- `VITE_API_BASE_URL` — optional; defaults to same origin.
- `VITE_PORTAL` — optional portal hint (`student|alumni|university|admin|company`).

## PostgreSQL switch

The dev schema is SQLite. For PostgreSQL:

1. `node tools/postgres-schema.mjs` regenerates `apps/api/prisma/schema.postgres.prisma`.
2. `npm --workspace apps/api run db:postgres:generate` regenerates the Prisma client against it.
3. Point `DATABASE_URL` at PostgreSQL and run `npm --workspace apps/api run db:postgres:push`.

Running the Postgres generate locally replaces the SQLite client; restore it afterwards with `npm --workspace apps/api run db:generate`. The Docker image performs these steps in isolation.

## Rotating Web Push keys

VAPID keys identify this server to browser push services. Rotating them invalidates every existing subscription.

1. Generate a new pair: `npx web-push generate-vapid-keys`.
2. Update `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` in the deployment environment and restart the API.
3. Confirm the live key with `GET /api/ops/status` → `integrations.push.keyId` (first 12 hex characters of the public key).
4. Users do not need to re-enable notifications: the settings page compares the browser subscription with the current key and re-subscribes automatically. Stale endpoints are pruned when a push service answers `404`/`410`.
5. Until each browser reopens the app, pushes to its old subscription fail silently; in-app notifications are unaffected.

Keep the private key out of source control, logs and support tickets. The public key is safe to expose to browsers.

## Example

See `apps/api/.env.example` for local development and `deploy/.env.example` for the Compose stack.
