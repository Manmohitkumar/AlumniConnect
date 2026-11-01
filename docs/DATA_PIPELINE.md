# Data Pipeline

## Flow

Data Collection -> Validation -> Processing -> Storage -> Analysis -> Output

## Collection

Registration, profile updates, challenges, submissions, mentorship, events, notifications, Metaverse visits, file uploads.

## Validation

Zod schemas at API edge; server-side role and ownership checks; file size/type limits.

## Processing

Normalization of emails, deduplication via unique constraints, relationship validation, background notifications.

## Storage

- Relational records in SQLite/Postgres via Prisma.
- File metadata and references in DB; large binaries in file/object storage (not enabled in dev).

## Analysis

Admin/university analytics endpoints aggregate counts and trends from DB.

## Output

JSON APIs consumed by portals; in-app notifications; certificates.

## Data quality

- Unique constraints on email, challenge slug, certificate code, submission uniqueness.
- Verification statuses for academic identity.
- Consent flags for portfolio visibility.
