#!/usr/bin/env node
/**
 * Phase 6 load and performance test.
 *
 * Fires a weighted mix of public and authenticated read requests through a
 * fixed-size worker pool and reports latency percentiles, throughput and error
 * rate. Writes are excluded on purpose: SQLite serialises writes, so mixed read
 * load is the meaningful baseline for this deployment.
 *
 * The API applies a 300 req/min per-IP guard by default. Run the load test
 * against a dedicated instance with a raised budget:
 *
 *   PORT=4200 API_RATE_LIMIT_MAX=20000 npm --workspace apps/api run dev
 *   BASE_URL=http://localhost:4200 node tools/load.mjs
 *
 * Optional env: LOAD_CONCURRENCY (25), LOAD_REQUESTS (2000), LOAD_WARMUP (40).
 */
const BASE = (process.env.BASE_URL ?? 'http://localhost:4000').replace(/\/+$/, '')
const CONCURRENCY = Number(process.env.LOAD_CONCURRENCY ?? 25)
const TOTAL = Number(process.env.LOAD_REQUESTS ?? 2000)
const WARMUP = Number(process.env.LOAD_WARMUP ?? 40)

const endpoints = [
  { path: '/api/health', weight: 1, auth: false },
  { path: '/api/challenges', weight: 4, auth: false },
  { path: '/api/challenges/startup-landing-page-prototype', weight: 3, auth: false },
  { path: '/api/discover/alumni?pageSize=12', weight: 3, auth: false },
  { path: '/api/events', weight: 2, auth: false },
  { path: '/api/resources', weight: 1, auth: false },
  { path: '/api/universities', weight: 1, auth: false },
  { path: '/api/profile/me', weight: 3, auth: true },
  { path: '/api/mentorship/requests', weight: 2, auth: true },
  { path: '/api/opportunities?pageSize=12', weight: 2, auth: true },
  { path: '/api/notifications?pageSize=10', weight: 1, auth: true },
]

let cookie = ''

async function login(email) {
  const response = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'DemoPass123!' }),
  })
  if (response.status !== 200) {
    throw new Error(`Login failed for ${email}: ${response.status} ${(await response.text()).slice(0, 200)}`)
  }
  const setCookie = response.headers.getSetCookie?.().find((value) => value.startsWith('ac_session='))
  if (!setCookie) throw new Error(`No session cookie for ${email}`)
  return setCookie.split(';')[0]
}

function buildPlan(total) {
  const pool = endpoints.flatMap((endpoint) => Array.from({ length: endpoint.weight }, () => endpoint))
  const plan = []
  for (let index = 0; index < total; index += 1) {
    // Deterministic shuffle so the mix is stable between runs.
    const offset = (index * 7919) % pool.length
    plan.push(pool[offset])
  }
  return plan
}

async function hit(endpoint) {
  const started = performance.now()
  let status = 0
  try {
    const response = await fetch(BASE + endpoint.path, {
      headers: endpoint.auth ? { Cookie: cookie } : {},
    })
    status = response.status
    await response.arrayBuffer()
  } catch {
    status = -1
  }
  return { path: endpoint.path, status, ms: performance.now() - started }
}

function percentile(sorted, fraction) {
  if (sorted.length === 0) return 0
  const position = Math.min(sorted.length - 1, Math.max(0, Math.ceil(fraction * sorted.length) - 1))
  return sorted[position]
}

async function main() {
  console.log(`Target ${BASE} · ${TOTAL} requests · concurrency ${CONCURRENCY}`)
  cookie = await login('student1@example.edu')

  const health = await fetch(`${BASE}/api/health`).then((response) => response.json()).catch(() => null)
  if (!health || health.status !== 'ok') throw new Error('Target API is not healthy.')

  const plan = buildPlan(TOTAL)
  for (let index = 0; index < Math.min(WARMUP, plan.length); index += 1) await hit(plan[index])

  const results = []
  let cursor = 0
  const started = performance.now()

  async function worker() {
    while (true) {
      const index = cursor
      cursor += 1
      if (index >= plan.length) return
      results.push(await hit(plan[index]))
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()))
  const elapsedMs = performance.now() - started

  const latencies = results.map((result) => result.ms).sort((a, b) => a - b)
  const errors = results.filter((result) => result.status < 200 || result.status >= 400)
  const count429 = results.filter((result) => result.status === 429).length
  const throughput = results.length / (elapsedMs / 1000)

  console.log('\nGlobal')
  console.log(`  requests      ${results.length}`)
  console.log(`  errors        ${errors.length} (${((errors.length / results.length) * 100).toFixed(1)}%)${count429 ? `, ${count429} rate-limited` : ''}`)
  console.log(`  duration      ${(elapsedMs / 1000).toFixed(2)}s`)
  console.log(`  throughput    ${throughput.toFixed(0)} req/s`)
  console.log(`  p50           ${percentile(latencies, 0.5).toFixed(1)} ms`)
  console.log(`  p95           ${percentile(latencies, 0.95).toFixed(1)} ms`)
  console.log(`  p99           ${percentile(latencies, 0.99).toFixed(1)} ms`)
  console.log(`  max           ${Math.max(...latencies).toFixed(1)} ms`)

  const byPath = new Map()
  for (const result of results) {
    const bucket = byPath.get(result.path) ?? []
    bucket.push(result)
    byPath.set(result.path, bucket)
  }
  console.log('\nPer endpoint (p50 / p95 / errors)')
  for (const [path, bucket] of [...byPath.entries()].sort((a, b) => b[1].length - a[1].length)) {
    const sorted = bucket.map((result) => result.ms).sort((a, b) => a - b)
    const failed = bucket.filter((result) => result.status < 200 || result.status >= 400).length
    console.log(
      `  ${path.padEnd(48)} ${sorted.length.toString().padStart(4)}×  ${percentile(sorted, 0.5).toFixed(1).padStart(6)} / ${percentile(sorted, 0.95).toFixed(1).padStart(6)} ms  ${failed ? `${failed} failed` : 'ok'}`,
    )
  }

  const statusCounts = new Map()
  for (const result of results) statusCounts.set(result.status, (statusCounts.get(result.status) ?? 0) + 1)
  console.log(`\nStatus codes: ${[...statusCounts.entries()].map(([status, count]) => `${status}×${count}`).join('  ')}`)

  if (errors.length / results.length > 0.05 || count429 > 0) {
    console.error('\nFAIL: error budget exceeded (target: <5% and zero 429s).')
    process.exitCode = 1
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
