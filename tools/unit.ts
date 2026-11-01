/**
 * Runs both API module suites and the web library suites in one process so
 * `npm run test:unit` covers every module that can be tested without a server.
 */
process.env.NODE_ENV ??= 'test'
process.env.DATABASE_URL ??= 'file:./unit.db'

void (async () => {
  await import('../apps/api/test/unit/http.test')
  await import('../apps/api/test/unit/rate-limit.test')
  await import('../apps/api/test/unit/totp.test')
  await import('../apps/api/test/unit/storage.test')
  await import('../apps/api/test/unit/notify.test')
  await import('../apps/api/test/unit/clamav.test')
  await import('../apps/api/test/unit/telemetry.test')
  await import('../apps/web/test/format.test')
})()
