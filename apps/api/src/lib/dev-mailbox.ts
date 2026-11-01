import { randomUUID } from 'node:crypto'
import { SMTPServer } from 'smtp-server'

/**
 * Development-only SMTP sink.
 *
 * Auth flows send real mail through nodemailer. Without an SMTP host those
 * messages only became preview links, so delivery itself was untested.
 * When DEV_MAILBOX is enabled (default outside production) the API listens as
 * a local SMTP server and keeps the last messages in memory. The loopback-only
 * routes in index.ts expose them for manual testing and the smoke suite.
 */
export type CapturedMail = {
  id: string
  from: string
  to: string[]
  subject: string
  text: string
  html: string
  receivedAt: string
}

const MAX_MESSAGES = 50
const messages: CapturedMail[] = []
let server: SMTPServer | null = null
let listening = false

export function devMailboxEnabled(): boolean {
  return process.env.NODE_ENV !== 'production' && process.env.DEV_MAILBOX !== 'false'
}

export function devMailboxListening(): boolean {
  return listening
}

export function capturedMail(limit = 20): CapturedMail[] {
  return messages.slice(-Math.max(1, Math.min(limit, MAX_MESSAGES))).reverse()
}

export function clearCapturedMail(): number {
  const removed = messages.length
  messages.length = 0
  return removed
}

export function startDevMailbox(port = Number(process.env.DEV_SMTP_PORT ?? 1025)) {
  if (!devMailboxEnabled() || server) return

  const smtp = new SMTPServer({
    authOptional: true,
    disableReverseLookup: true,
    // No cert is provided, so advertising STARTTLS would fail the client's
    // certificate check. Loopback plaintext is acceptable for a local sink.
    hideSTARTTLS: true,
    size: 5 * 1024 * 1024,
    onData(stream, session, callback) {
      const chunks: Buffer[] = []
      stream.on('data', (chunk: Buffer) => chunks.push(chunk))
      stream.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf8')
        messages.push(parseMessage(raw, session.envelope))
        while (messages.length > MAX_MESSAGES) messages.shift()
        callback()
      })
      stream.on('error', (error) => callback(error))
    },
  })

  smtp.on('error', (error: Error) => {
    console.warn(`[mailbox] SMTP capture unavailable: ${error.message}`)
  })

  smtp.listen(port, '127.0.0.1', () => {
    listening = true
    console.log(`[mailbox] dev SMTP capture listening on smtp://127.0.0.1:${port} (inbox: GET /api/dev/mailbox)`)
  })

  server = smtp
}

export function stopDevMailbox() {
  server?.close()
  server = null
  listening = false
}

/** Minimal MIME reader: enough for the plain-text/HTML auth messages we send. */
function parseMessage(
  raw: string,
  envelope: { mailFrom?: { address: string } | false; rcptTo?: Array<{ address: string }> },
): CapturedMail {
  const { headers, body } = splitMessage(raw)
  const parts = extractBodies(headers, body)
  const html = parts.html
  const text = parts.text || stripHtml(html)

  return {
    id: randomUUID(),
    from: envelope.mailFrom ? envelope.mailFrom.address : headers.get('from') ?? 'unknown',
    to: envelope.rcptTo?.map((recipient) => recipient.address) ?? splitAddresses(headers.get('to')),
    subject: decodeHeader(headers.get('subject') ?? '(no subject)'),
    text: text.trim(),
    html,
    receivedAt: new Date().toISOString(),
  }
}

function splitMessage(raw: string): { headers: Map<string, string>; body: string } {
  const match = /\r?\n\r?\n/.exec(raw)
  if (!match) return { headers: parseHeaders(raw), body: '' }
  return {
    headers: parseHeaders(raw.slice(0, match.index)),
    body: raw.slice(match.index + match[0].length),
  }
}

function parseHeaders(block: string): Map<string, string> {
  const headers = new Map<string, string>()
  // Folded headers continue on the next line with leading whitespace.
  const unfolded = block.replace(/\r?\n[ \t]+/g, ' ')
  for (const line of unfolded.split(/\r?\n/)) {
    const match = /^([^:]+):\s*(.*)$/.exec(line)
    if (match) headers.set(match[1].toLowerCase(), match[2])
  }
  return headers
}

/** Walks multipart/alternative bodies and returns the first text and HTML parts. */
function extractBodies(headers: Map<string, string>, body: string): { text: string; html: string } {
  const contentType = headers.get('content-type') ?? 'text/plain'
  const boundary = /boundary="?([^";]+)"?/i.exec(contentType)?.[1]

  if (/^multipart\//i.test(contentType) && boundary) {
    const separator = new RegExp(`--${escapeRegExp(boundary)}`)
    let text = ''
    let html = ''
    for (const chunk of body.split(separator)) {
      const part = chunk.replace(/^\r?\n/, '')
      if (!part.trim() || part.startsWith('--')) continue
      const nested = splitMessage(part)
      if (!nested.headers.size) continue
      const bodies = extractBodies(nested.headers, nested.body)
      if (!text && bodies.text) text = bodies.text
      if (!html && bodies.html) html = bodies.html
    }
    return { text, html }
  }

  const decoded = decodeBody(body, headers.get('content-transfer-encoding'))
  return /text\/html/i.test(contentType) ? { text: '', html: decoded } : { text: decoded, html: '' }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function decodeBody(body: string, encoding?: string): string {
  if (encoding?.toLowerCase() === 'base64') {
    try {
      return Buffer.from(body.replace(/\s+/g, ''), 'base64').toString('utf8')
    } catch {
      return body
    }
  }
  if (encoding?.toLowerCase() === 'quoted-printable') {
    const collapsed = body.replace(/=\r?\n/g, '')
    const bytes: number[] = []
    for (let index = 0; index < collapsed.length; index += 1) {
      const char = collapsed[index]
      if (char === '=' && /^[0-9A-F]{2}$/i.test(collapsed.slice(index + 1, index + 3))) {
        bytes.push(Number.parseInt(collapsed.slice(index + 1, index + 3), 16))
        index += 2
      } else {
        bytes.push(collapsed.charCodeAt(index))
      }
    }
    return Buffer.from(bytes).toString('utf8')
  }
  return body
}

function decodeHeader(value: string): string {
  return value.replace(/=\?utf-8\?([bq])\?([^?]+)\?=\s*/gi, (_match, kind: string, payload: string) => {
    try {
      if (kind.toLowerCase() === 'b') return Buffer.from(payload, 'base64').toString('utf8')
      return Buffer.from(
        payload.replace(/_/g, ' ').replace(/=([0-9A-F]{2})/gi, (_m, hex: string) => String.fromCharCode(Number.parseInt(hex, 16))),
        'binary',
      ).toString('utf8')
    } catch {
      return payload
    }
  })
}

function splitAddresses(value?: string): string[] {
  if (!value) return []
  return value.split(',').map((entry) => entry.trim()).filter(Boolean)
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]+>/g, ' ')
}
