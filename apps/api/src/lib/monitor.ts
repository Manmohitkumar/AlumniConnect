type RequestRecord = { time: number; status: number; method: string; path: string; ms: number }

export type AlertEvent = { type: 'error_rate' | 'latency' | 'test'; at: string; detail: string; delivered: boolean }

const WINDOW_MS = 5 * 60_000
const MAX_RECORDS = 5_000
const recent: RequestRecord[] = []
const alerts: AlertEvent[] = []
let total = 0
let errors5xx = 0
let lastEvaluationAt: string | null = null
let errorStreak = 0
let latencyStreak = 0
let lastErrorAlertAt = 0
let lastLatencyAlertAt = 0
let timer: NodeJS.Timeout | null = null

export function recordRequest(record: RequestRecord) {
  total += 1
  if (record.status >= 500) errors5xx += 1
  recent.push(record)
  const cutoff = Date.now() - WINDOW_MS
  while (recent.length > 0 && recent[0].time < cutoff) recent.shift()
  if (recent.length > MAX_RECORDS) recent.splice(0, recent.length - MAX_RECORDS)
}

function percentile(sorted: number[], fraction: number): number {
  if (sorted.length === 0) return 0
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(fraction * sorted.length) - 1))
  return Math.round(sorted[index])
}

export function alertWebhookConfigured(): boolean {
  return Boolean(process.env.ALERT_WEBHOOK_URL)
}

export function alertState() {
  return {
    webhookConfigured: alertWebhookConfigured(),
    lastEvaluationAt,
    cooldownMinutes: Math.round(cooldownMs() / 60_000),
    events: alerts.slice(-10).reverse(),
  }
}

export function monitorSnapshot() {
  const now = Date.now()
  const lastMinute = recent.filter((record) => record.time >= now - 60_000)
  const byStatus: Record<string, number> = {}
  let slowestMs = 0
  for (const record of lastMinute) {
    byStatus[String(record.status)] = (byStatus[String(record.status)] ?? 0) + 1
    if (record.ms > slowestMs) slowestMs = record.ms
  }

  const durations = recent.map((record) => record.ms).sort((a, b) => a - b)
  const failures = recent.filter((record) => record.status >= 500).length
  const slowest = [...recent]
    .sort((a, b) => b.ms - a.ms)
    .slice(0, 5)
    .map((record) => ({ method: record.method, path: record.path, ms: Math.round(record.ms) }))

  return {
    requestsTotal: total,
    errors5xx,
    lastMinute: { count: lastMinute.length, byStatus, slowestMs: Math.round(slowestMs) },
    latency: {
      windowSeconds: WINDOW_MS / 1000,
      samples: recent.length,
      p50Ms: percentile(durations, 0.5),
      p95Ms: percentile(durations, 0.95),
      p99Ms: percentile(durations, 0.99),
      slowest,
    },
    errorRate: recent.length === 0 ? 0 : Number((failures / recent.length).toFixed(4)),
    alerts: alertState(),
  }
}

function threshold(name: string, fallback: number): number {
  const value = Number(process.env[name])
  return Number.isFinite(value) && value >= 0 ? value : fallback
}

function cooldownMs(): number {
  return threshold('ALERT_COOLDOWN_MS', 15 * 60_000)
}

async function postAlert(type: AlertEvent['type'], detail: string): Promise<boolean> {
  const url = process.env.ALERT_WEBHOOK_URL
  if (!url) return false
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `[AlumniConnect] ${type}: ${detail}`,
        source: 'alumniconnect-api',
        type,
        detail,
        at: new Date().toISOString(),
      }),
      signal: AbortSignal.timeout(5_000),
    })
    return response.ok
  } catch (error) {
    console.warn(`[alerts] webhook delivery failed: ${error instanceof Error ? error.message : String(error)}`)
    return false
  }
}

/** Sends a labelled test alert so operators can verify the webhook path. */
export async function sendTestAlert(): Promise<AlertEvent> {
  const delivered = await postAlert('test', 'Test alert from the operations console.')
  const event: AlertEvent = { type: 'test', at: new Date().toISOString(), detail: 'Manual test alert', delivered }
  alerts.push(event)
  return event
}

export async function evaluateAlerts(): Promise<void> {
  const snapshot = monitorSnapshot()
  lastEvaluationAt = new Date().toISOString()
  const minSamples = threshold('ALERT_MIN_SAMPLES', 20)

  if (snapshot.latency.samples >= minSamples && snapshot.errorRate > threshold('ALERT_ERROR_RATE', 0.05)) {
    errorStreak += 1
    if (errorStreak >= 2 && Date.now() - lastErrorAlertAt > cooldownMs()) {
      const detail = `5xx rate ${(snapshot.errorRate * 100).toFixed(1)}% over ${snapshot.latency.samples} requests`
      const delivered = await postAlert('error_rate', detail)
      alerts.push({ type: 'error_rate', at: new Date().toISOString(), detail, delivered })
      lastErrorAlertAt = Date.now()
    }
  } else {
    errorStreak = 0
  }

  if (snapshot.latency.samples >= minSamples && snapshot.latency.p95Ms > threshold('ALERT_P95_MS', 2000)) {
    latencyStreak += 1
    if (latencyStreak >= 2 && Date.now() - lastLatencyAlertAt > cooldownMs()) {
      const detail = `p95 latency ${snapshot.latency.p95Ms} ms over ${snapshot.latency.samples} requests`
      const delivered = await postAlert('latency', detail)
      alerts.push({ type: 'latency', at: new Date().toISOString(), detail, delivered })
      lastLatencyAlertAt = Date.now()
    }
  } else {
    latencyStreak = 0
  }
}

export function startAlertMonitor() {
  if (timer) return
  if (!alertWebhookConfigured() && process.env.ALERTS_ENABLED !== 'true') {
    console.log('[alerts] monitoring disabled: set ALERT_WEBHOOK_URL (or ALERTS_ENABLED=true) to enable')
    return
  }
  timer = setInterval(() => {
    void evaluateAlerts()
  }, 60_000)
  timer.unref()
  console.log(
    `[alerts] monitoring every 60s (error rate > ${threshold('ALERT_ERROR_RATE', 0.05) * 100}%, p95 > ${threshold('ALERT_P95_MS', 2000)} ms, min ${threshold('ALERT_MIN_SAMPLES', 20)} samples)`,
  )
}

export function stopAlertMonitor() {
  if (timer) clearInterval(timer)
  timer = null
}
