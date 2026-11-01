import { after, before, test } from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import type { AddressInfo } from 'node:net'
import { flushTelemetry, startSpan, stopTelemetry, telemetryConfigured, telemetryStatus } from '../../src/lib/telemetry'

const previous = {
  endpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
  traces: process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT,
}
const received: any[] = []
let server: http.Server
let port = 0

before(async () => {
  server = http.createServer((req, res) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk) => chunks.push(chunk))
    req.on('end', () => {
      try {
        received.push(JSON.parse(Buffer.concat(chunks).toString('utf8')))
      } catch {
        received.push(null)
      }
      res.writeHead(200, { 'Content-Type': 'application/json' }).end('{}')
    })
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  port = (server.address() as AddressInfo).port
  process.env.OTEL_EXPORTER_OTLP_ENDPOINT = `http://127.0.0.1:${port}/`
  delete process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT
})

after(() => {
  stopTelemetry()
  server.close()
  if (previous.endpoint === undefined) delete process.env.OTEL_EXPORTER_OTLP_ENDPOINT
  else process.env.OTEL_EXPORTER_OTLP_ENDPOINT = previous.endpoint
  if (previous.traces === undefined) delete process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT
  else process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT = previous.traces
})

test('tracing stays off without an endpoint', () => {
  delete process.env.OTEL_EXPORTER_OTLP_ENDPOINT
  delete process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT
  assert.equal(telemetryConfigured(), false)
  assert.equal(telemetryStatus().configured, false)
  startSpan('should be ignored').end()
  process.env.OTEL_EXPORTER_OTLP_ENDPOINT = `http://127.0.0.1:${port}`
})

test('spans are serialized to OTLP/JSON with status and attributes', async () => {
  const before = telemetryStatus().exported
  startSpan('unit span', { 'http.status_code': 200, 'http.method': 'GET', retries: 2 }).end({ cached: false })
  startSpan('unit failure', { 'http.status_code': 503 }).end()
  await flushTelemetry()
  await new Promise((resolve) => setImmediate(resolve))

  assert.equal(received.length >= 1, true)
  const payload = received[received.length - 1]
  assert.equal(payload.resourceSpans[0].resource.attributes[0].key, 'service.name')
  const spans = payload.resourceSpans[0].scopeSpans[0].spans
  const ok = spans.find((span: any) => span.name === 'unit span')
  const failed = spans.find((span: any) => span.name === 'unit failure')
  assert.ok(ok)
  assert.ok(failed)
  assert.equal(ok.status.code, 1)
  assert.equal(failed.status.code, 2)
  assert.equal(typeof ok.startTimeUnixNano, 'string')
  assert.ok(BigInt(ok.endTimeUnixNano) >= BigInt(ok.startTimeUnixNano))
  const attributes = Object.fromEntries(ok.attributes.map((row: any) => [row.key, row.value]))
  assert.equal(attributes['http.status_code'].intValue, '200')
  assert.equal(attributes['http.method'].stringValue, 'GET')
  assert.equal(attributes.retries.intValue, '2')
  assert.equal(attributes.cached.boolValue, false)
  assert.equal(telemetryStatus().exported - before >= 2, true)
})

test('a failing collector is recorded and never throws', async () => {
  process.env.OTEL_EXPORTER_OTLP_ENDPOINT = 'http://127.0.0.1:1'
  startSpan('collector-down').end()
  await flushTelemetry()
  const status = telemetryStatus()
  assert.equal(typeof status.lastError, 'string')
  process.env.OTEL_EXPORTER_OTLP_ENDPOINT = `http://127.0.0.1:${port}`
  startSpan('collector-recovered').end()
  await flushTelemetry()
  assert.equal(telemetryStatus().lastError, null)
})
