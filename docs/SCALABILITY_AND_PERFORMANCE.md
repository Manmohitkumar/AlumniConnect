# Scalability and Performance

## Current approach

- Server-side pagination and filtering.
- Indexed DB columns.
- In-memory rate limiter (single instance).
- Lazy loading in frontend where used.

## Bottlenecks

- SQLite single-writer.
- In-memory rate limiter not shared.
- Large lists without virtualization.
- Metaverse asset sizes.

## Scaling options

- Move to PostgreSQL.
- Redis for rate limiting and cache.
- CDN for static assets.
- Background job queue for emails/analytics.
- Horizontal API instances behind load balancer.

## Performance notes

- No formal load test executed; do not claim specific throughput.
