import { randomBytes } from 'node:crypto'

type Attributes = Record<string, string | number | boolean>
type SpanRecord = {
  name: string
  traceId: string
  spanId: string
  startMs: number
  endMs: number
  attributes: Attributes
  error: boolean
}

const FLUSH_INTERVAL_MS = 2_000
const MAX_QUEUE = 1_000
const BATCH_SIZE = 100
const serviceName = process.env.OTEL_SERVICE_NAME ?? 'alumniconnect-api'

const queue: SpanRecord[] = []
let exported = 0
let dropped = 0
let lastExportAt: string | null = null
let lastError: string | null = null
let timer: NodeJS.Timeout | null = null

/** OTLP/HTTP trace endpoint. Any collector that accepts JSON works. */
function endpoint(): string | null {
  const raw = process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT ?? process.env.OTEL_EXPORTER_OTLP_ENDPOINT
  if (!raw) return null
  const trimmed = raw.replace(/\/+$/, '')
  return trimmed.endsWith('/v1/traces') ? trimmed : `${trimmed}/v1/traces`
}

export function telemetryConfigured(): boolean {
  return endpoint() !== null
}

export function telemetryStatus() {
  return {
    configured: telemetryConfigured(),
    serviceName,
    endpoint: endpoint(),
    queued: queue.length,
    exported,
    dropped,
    lastExportAt,
    lastError,
  }
}

export type SpanHandle = { end: (extra?: Attributes) => void }

const noopSpan: SpanHandle = { end: () => undefined }

export function startSpan(name: string, attributes: Attributes = {}): SpanHandle {
  if (!telemetryConfigured()) return noopSpan
  const traceId = randomBytes(16).toString('hex')
  const spanId = randomBytes(8).toString('hex')
  const startMs = Date.now()
  return {
    end(extra = {}) {
      const all = { ...attributes, ...extra }
      if (queue.length >= MAX_QUEUE) {
        dropped += 1
        return
      }
      queue.push({
        name,
        traceId,
        spanId,
        startMs,
        endMs: Date.now(),
        attributes: all,
        error: Number(all['http.status_code'] ?? 0) >= 500,
      })
      scheduleFlush()
    },
  }
}

function scheduleFlush() {
  if (timer) return
  timer = setInterval(() => void flushTelemetry(), FLUSH_INTERVAL_MS)
  timer.unref()
}

function attribute(key: string, value: string | number | boolean) {
  if (typeof value === 'number') return { key, value: { intValue: String(Math.round(value)) } }
  if (typeof value === 'boolean') return { key, value: { boolValue: value } }
  return { key, value: { stringValue: value.slice(0, 500) } }
}

function serialize(span: SpanRecord) {
  return {
    traceId: span.traceId,
    spanId: span.spanId,
    name: span.name,
    kind: 2,
    startTimeUnixNano: String(span.startMs * 1_000_000),
    endTimeUnixNano: String(span.endMs * 1_000_000),
    attributes: Object.entries(span.attributes).map(([key, value]) => attribute(key, value)),
    status: { code: span.error ? 2 : 1 },
  }
}

/** Sends queued spans to the configured OTLP collector. Never throws. */
export async function flushTelemetry(): Promise<void> {
  const url = endpoint()
  if (!url || queue.length === 0) return
  const batch = queue.splice(0, Math.min(queue.length, BATCH_SIZE))
  const body = JSON.stringify({
    resourceSpans: [
      {
        resource: { attributes: [attribute('service.name', serviceName)] },
        scopeSpans: [{ scope: { name: 'alumniconnect-api' }, spans: batch.map(serialize) }],
      },
    ],
  })
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      signal: AbortSignal.timeout(3_000),
    })
    if (!response.ok) throw new Error(`collector responded ${response.status}`)
    exported += batch.length
    lastExportAt = new Date().toISOString()
    lastError = null
  } catch (error) {
    dropped += batch.length
    lastError = error instanceof Error ? error.message : String(error)
  }
}

export function stopTelemetry() {
  if (timer) clearInterval(timer)
  timer = null
}
