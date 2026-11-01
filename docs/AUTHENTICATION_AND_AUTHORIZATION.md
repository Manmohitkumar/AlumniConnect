# Authentication and Authorization

## Mechanism

- httpOnly cookie `ac_session` (7 days, SameSite=Lax, Secure in prod) plus optional Bearer token.
- JWT payload: `sub`, `role`, `email`, `tv` (tokenVersion).
- `requireAuth` re-reads the user from DB each request; enforces status, tokenVersion, and `mustChangePassword` gate.

## Roles

STUDENT, ALUMNI, UNIVERSITY, ADMIN, COMPANY.

## Registration

- Public registration only STUDENT and ALUMNI.
- Terms acceptance required.
- University/company/admin accounts provisioned by admins.

## Portal isolation

- Login accepts optional `portal`; mismatch returns 403 `wrong_portal` without session.

## Email verification

- `AuthToken` type EMAIL_VERIFY, 24h, single-use, hashed.
- Non-production returns preview URL; production returns none.

## Password reset

- `AuthToken` type PASSWORD_RESET, 1h, single-use.
- Reset increments `tokenVersion`, revoking all sessions.

## Admin provisioning

- One-time password returned once; `mustChangePassword=true`.
- Endpoints: `/admin/users/provision`, `/admin/users/:id/reset-password`.

## University scoping

- Every `/api/university/*` handler derives institution from authenticated rep profile.
