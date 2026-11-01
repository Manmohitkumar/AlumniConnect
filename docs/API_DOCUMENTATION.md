# API Documentation (Summary)

## Auth

- POST /api/auth/register
- POST /api/auth/login (portal optional)
- GET /api/auth/me
- POST /api/auth/logout
- POST /api/auth/verify-email
- POST /api/auth/resend-verification
- POST /api/auth/forgot-password
- POST /api/auth/reset-password
- POST /api/auth/change-password

## Profile

- GET /api/profile/me
- PUT /api/profile/me/profile
- POST /api/profile/me/verification-request
- GET /api/profile/:userId

## University

- GET /api/universities
- GET/POST/PATCH /api/university/* (scoped)
- GET/POST/PATCH /api/admin/universities

## Admin

- GET /api/admin/analytics
- GET/PATCH /api/admin/users
- POST /api/admin/users/provision
- POST /api/admin/users/:id/reset-password
- GET /api/admin/audit
- POST /api/admin/announcements

## Domains

- /api/challenges, /api/submissions, /api/mentors, /api/mentorship, /api/certificates, /api/events, /api/notifications, /api/resources, /api/discover, /api/opportunities, /api/applications, /api/portfolio

All protected routes require auth; roles enforced server-side.
