# syntax=docker/dockerfile:1
# API image. Build from the repository root:
#   docker build -f apps/api/Dockerfile -t alumniconnect-api .
# The Prisma client is generated against the PostgreSQL schema because this
# image is only used for deployed environments; local development keeps SQLite.
FROM node:24-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN npm ci --workspace apps/api --include-workspace-root

FROM deps AS build
COPY tools ./tools
COPY apps/api ./apps/api
RUN node tools/postgres-schema.mjs \
  && npx prisma generate --schema apps/api/prisma/schema.postgres.prisma

FROM build AS runtime
ENV NODE_ENV=production
ENV UPLOAD_DIR=/data/uploads
WORKDIR /app
COPY deploy/api-entrypoint.sh /usr/local/bin/api-entrypoint.sh
RUN chmod +x /usr/local/bin/api-entrypoint.sh \
  && mkdir -p /data/uploads \
  && chown -R node:node /data
USER node
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:4000/api/health').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
ENTRYPOINT ["api-entrypoint.sh"]
