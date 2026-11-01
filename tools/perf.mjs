import { performance } from 'node:perf_hooks'

const base = process.env.API_BASE || 'http://localhost:4000'

async function timed(label, fn) {
  const start = performance.now()
  let status = 0
  try {
    status = (await fn()).status
  } catch {
    status = -1
  }
  const ms = performance.now() - start
  console.log(`${label.padEnd(46)} ${String(status).padEnd(4)} ${ms.toFixed(1).padStart(8)} ms`)
  return ms
}

async function request(path, init = {}) {
  return fetch(base + path, { ...init, headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) } })
}

// Warm-up to avoid first-touch noise.
await timed('warmup /api/health', () => request('/api/health'))
await timed('warmup /api/challenges', () => request('/api/challenges'))

const rows = {}
for (let i = 0; i < 5; i++) {
  rows.health = (rows.health ?? 0) + (await timed(`GET /api/health`, () => request('/api/health'))) / 5
}
for (let i = 0; i < 5; i++) {
  rows.challenges = (rows.challenges ?? 0) + (await timed(`GET /api/challenges`, () => request('/api/challenges'))) / 5
}
for (let i = 0; i < 3; i++) {
  rows.challengeDetail = (rows.challengeDetail ?? 0) + (await timed(`GET /api/challenges/startup-landing-page-prototype`, () => request('/api/challenges/startup-landing-page-prototype'))) / 3
}

const login = await request('/api/auth/login', { method: 'POST', body: JSON.stringify({ email: 'student1@example.edu', password: 'DemoPass123!' }) })
const cookie = login.headers.getSetCookie?.().find((c) => c.startsWith('ac_session='))?.split(';')[0] ?? ''
if (!cookie) console.log('LOGIN FAILED — perf run continues unauthenticated')

for (let i = 0; i < 5; i++) {
  rows.me = (rows.me ?? 0) + (await timed(`GET /api/profile/me (auth)`, () => request('/api/profile/me', { headers: { Cookie: cookie } }))) / 5
}
for (let i = 0; i < 3; i++) {
  rows.mentorship = (rows.mentorship ?? 0) + (await timed(`GET /api/mentorship/requests (auth)`, () => request('/api/mentorship/requests', { headers: { Cookie: cookie } }))) / 3
}
for (let i = 0; i < 3; i++) {
  rows.opportunities = (rows.opportunities ?? 0) + (await timed(`GET /api/opportunities (auth)`, () => request('/api/opportunities', { headers: { Cookie: cookie } }))) / 3
}
for (let i = 0; i < 2; i++) {
  rows.pdf = (rows.pdf ?? 0) + (await timed(`GET /api/certificates/DEMO-0006/pdf (auth)`, () => request('/api/certificates/DEMO-0006/pdf', { headers: { Cookie: cookie } }))) / 2
}

console.log('\nAverages (ms) — local dev, SQLite, single instance:')
for (const [name, ms] of Object.entries(rows)) console.log(`  ${name}: ${ms.toFixed(1)}`)
