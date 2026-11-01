# System Architecture

## Overview

AlumniConnect is a monorepo with a React frontend (`apps/web`) and an Express API (`apps/api`). All portals share one backend, one database, and one authentication service.

## Components

- Frontend: Vite + React + TypeScript + Tailwind.
- Backend: Express 4 + Prisma 6.
- Database: SQLite (dev), Postgres-ready schema.
- Auth: httpOnly cookie session (`ac_session`), optional Bearer, `tokenVersion` revocation.
- Metaverse: static Three.js app served at `/metaverse/index.html`.

## Portal routing

- `/student/login`, `/alumni/login`, `/university/login`, `/company/login`, `/admin/login`
- Dashboards: `/student/dashboard`, `/alumni/dashboard`, `/university/dashboard`, `/company/dashboard`, `/admin/dashboard`

## API

- Base: `/api`
- Auth: `/api/auth/*`
- Profile: `/api/profile/*`
- University: `/api/university/*`, `/api/universities`
- Admin: `/api/admin/*`
- Domain routers: challenges, submissions, mentorship, events, notifications, resources, discovery, opportunities, portfolio, certificates.

## Security

- RBAC enforced in backend.
- Rate limiting in-memory.
- CORS allow-list.
- Audit logs.

## Independent deployment

- Set `VITE_API_BASE_URL` to the API origin.
- Set `VITE_PORTAL` to lock a build to one portal.
- Set `WEB_ORIGINS` on the API for allowed frontend origins.
