# syntax=docker/dockerfile:1
# Web image. Build from the repository root:
#   docker build -f apps/web/Dockerfile -t alumniconnect-web .
FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/package.json
COPY apps/api/package.json apps/api/package.json
RUN npm ci --workspace apps/web --include-workspace-root
COPY apps/web ./apps/web
RUN npm --workspace apps/web run build

FROM nginx:1.27-alpine
# The official image renders templates at startup; only API_UPSTREAM is
# substituted so nginx variables like $host and $uri survive intact.
ENV API_UPSTREAM=api:4000 \
    NGINX_ENVSUBST_FILTER=API_UPSTREAM
COPY deploy/nginx.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1
