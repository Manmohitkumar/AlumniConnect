# Security Audit

## Controls implemented

- Password hashing: bcrypt (cost 10).
- Session: httpOnly, SameSite=Lax, Secure in prod.
- Token revocation via tokenVersion.
- RBAC on every router.
- Rate limiting on auth/reset and global API.
- CORS allow-list.
- Security headers (nosniff, frame deny, referrer policy, permissions policy).
- Input validation with zod.
- Audit logs for sensitive actions.
- Consent-gated portfolio visibility.
- Administrator TOTP multi-factor authentication (enroll/verify/disable, `mfa_required` enforcement).

## Known gaps

- No SMTP transport; emails previewed only.
- No automated malware scanning for uploads.
- In-memory rate limiter (single instance).
- No WAF or DDoS protection.
- Metaverse multiplayer simulated.

## Secret management

- Secrets in `.env` (not committed); `.env.example` placeholders only.
- JWT_SECRET required in production.
- External keys (RPM etc.) must be server-side.

## Recommendations

- TOTP for admins implemented (2026-10-31); consider FIDO/hardware keys later.
- Add Redis-backed rate limiter for multi-instance.
- Add file content sniffing.
- Add CSP headers in production.
