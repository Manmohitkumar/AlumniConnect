import { after, before, test } from 'node:test'
import assert from 'node:assert/strict'
import net from 'node:net'
import { antivirusConfigured, antivirusRequired, scanBuffer } from '../../src/lib/clamav'

let server: net.Server
let port = 0
const previous = { host: process.env.CLAMAV_HOST, port: process.env.CLAMAV_PORT, required: process.env.UPLOAD_SCAN_REQUIRED }

before(async () => {
  server = net.createServer((socket) => {
    let buf = Buffer.alloc(0)
    let started = false
    let scanned = Buffer.alloc(0)
    socket.on('data', (chunk) => {
      buf = Buffer.concat([buf, chunk])
      if (!started && buf.length >= 10 && buf.subarray(0, 10).toString() === 'zINSTREAM\0') {
        buf = buf.subarray(10)
        started = true
      }
      while (started) {
        if (buf.length < 4) return
        const size = buf.readUInt32BE(0)
        if (size === 0) {
          socket.end(scanned.includes(Buffer.from('EICAR')) ? 'stream: Eicar-Test-Signature FOUND\0' : 'stream: OK\0')
          return
        }
        if (buf.length < 4 + size) return
        scanned = Buffer.concat([scanned, buf.subarray(4, 4 + size)])
        buf = buf.subarray(4 + size)
      }
    })
    socket.on('error', () => undefined)
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  port = (server.address() as net.AddressInfo).port
})

after(() => {
  server.close()
  if (previous.host === undefined) delete process.env.CLAMAV_HOST
  else process.env.CLAMAV_HOST = previous.host
  if (previous.port === undefined) delete process.env.CLAMAV_PORT
  else process.env.CLAMAV_PORT = previous.port
  if (previous.required === undefined) delete process.env.UPLOAD_SCAN_REQUIRED
  else process.env.UPLOAD_SCAN_REQUIRED = previous.required
})

test('scanning is disabled when no host is configured', async () => {
  delete process.env.CLAMAV_HOST
  assert.equal(antivirusConfigured(), false)
  assert.deepEqual(await scanBuffer(Buffer.from('anything')), { status: 'disabled' })
})

test('clamd OK verdicts are reported as clean', async () => {
  process.env.CLAMAV_HOST = '127.0.0.1'
  process.env.CLAMAV_PORT = String(port)
  assert.equal(antivirusConfigured(), true)
  assert.deepEqual(await scanBuffer(Buffer.from('%PDF-1.4 harmless')), { status: 'clean' })
})

test('clamd FOUND verdicts carry the signature name', async () => {
  process.env.CLAMAV_HOST = '127.0.0.1'
  process.env.CLAMAV_PORT = String(port)
  const result = await scanBuffer(Buffer.from('EICAR test payload'))
  assert.equal(result.status, 'infected')
  assert.equal(result.signature, 'Eicar-Test-Signature')
})

test('unreachable daemons report unavailable instead of throwing', async () => {
  process.env.CLAMAV_HOST = '127.0.0.1'
  process.env.CLAMAV_PORT = '1'
  process.env.CLAMAV_TIMEOUT_MS = '500'
  const result = await scanBuffer(Buffer.from('payload'))
  assert.deepEqual(result, { status: 'unavailable' })
})

test('UPLOAD_SCAN_REQUIRED is read from the environment', () => {
  process.env.UPLOAD_SCAN_REQUIRED = 'true'
  assert.equal(antivirusRequired(), true)
  process.env.UPLOAD_SCAN_REQUIRED = 'false'
  assert.equal(antivirusRequired(), false)
})
