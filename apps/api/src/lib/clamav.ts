import net from 'node:net'

export type ScanResult = { status: 'clean' | 'infected' | 'unavailable' | 'disabled'; signature?: string }

/** True when a clamd daemon address is configured. */
export function antivirusConfigured(): boolean {
  return Boolean(process.env.CLAMAV_HOST)
}

/** When true, uploads are rejected if the daemon cannot be reached. */
export function antivirusRequired(): boolean {
  return process.env.UPLOAD_SCAN_REQUIRED === 'true'
}

/**
 * Scans a buffer with clamd using the INSTREAM protocol. Scanning failures are
 * reported as `unavailable` so callers can decide whether to fail open or
 * closed; they never throw.
 */
export function scanBuffer(buffer: Buffer): Promise<ScanResult> {
  const host = process.env.CLAMAV_HOST
  if (!host) return Promise.resolve({ status: 'disabled' })

  const port = Number(process.env.CLAMAV_PORT ?? 3310)
  const timeoutMs = Number(process.env.CLAMAV_TIMEOUT_MS ?? 15_000)

  return new Promise((resolve) => {
    const chunks: Buffer[] = []
    let settled = false
    const socket = net.createConnection({ host, port })
    const timer = setTimeout(() => finish({ status: 'unavailable' }), timeoutMs)
    timer.unref()

    function finish(result: ScanResult) {
      if (settled) return
      settled = true
      clearTimeout(timer)
      socket.destroy()
      resolve(result)
    }

    socket.on('connect', () => {
      socket.write('zINSTREAM\0')
      for (let offset = 0; offset < buffer.length; offset += 64 * 1024) {
        const part = buffer.subarray(offset, offset + 64 * 1024)
        const size = Buffer.alloc(4)
        size.writeUInt32BE(part.length, 0)
        socket.write(size)
        socket.write(part)
      }
      socket.write(Buffer.from([0, 0, 0, 0]))
    })

    socket.on('data', (data) => chunks.push(data))
    socket.on('end', () => {
      const text = Buffer.concat(chunks).toString('utf8')
      if (/\bOK\b/.test(text)) {
        finish({ status: 'clean' })
      } else if (/\bFOUND\b/.test(text)) {
        const match = /:\s*(.+?)\s+FOUND/.exec(text)
        finish({ status: 'infected', signature: match?.[1] ?? 'unknown' })
      } else {
        finish({ status: 'unavailable' })
      }
    })
    socket.on('error', () => finish({ status: 'unavailable' }))
    socket.on('close', () => finish({ status: 'unavailable' }))
  })
}
