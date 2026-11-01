/**
 * Module-wise unit test runner. Boots no server and needs no database: every
 * suite targets a single library module. Run with `npm run test:unit`.
 */
process.env.NODE_ENV ??= 'test'
process.env.DATABASE_URL ??= 'file:./unit.db'

const suites = [
  './unit/http.test.ts',
  './unit/rate-limit.test.ts',
  './unit/totp.test.ts',
  './unit/storage.test.ts',
  './unit/notify.test.ts',
  './unit/clamav.test.ts',
  './unit/telemetry.test.ts',
]

for (const suite of suites) {
  await import(suite)
}
