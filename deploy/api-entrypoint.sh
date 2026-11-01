#!/bin/sh
set -eu

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL is required (postgresql://...)." >&2
  exit 1
fi

echo "Applying PostgreSQL schema…"
npx prisma db push --schema apps/api/prisma/schema.postgres.prisma --skip-generate

if [ "${SEED_DEMO:-false}" = "true" ]; then
  echo "Seeding demo data…"
  npm --workspace apps/api run db:seed
fi

exec npm --workspace apps/api run start
