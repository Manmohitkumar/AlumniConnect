import crypto from 'node:crypto'

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

function base32Encode(bytes: Buffer): string {
  let bits = 0
  let value = 0
  let output = ''
  for (const byte of bytes) {
    value = (value << 8) | byte
    bits += 8
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }
  if (bits > 0) output += BASE32_ALPHABET[(value << (5 - bits)) & 31]
  return output.replace(/=+$/, '')
}

function base32Decode(value: string): Buffer {
  const clean = value.replace(/=+$/, '').toUpperCase()
  let bits = 0
  let buffer = 0
  const bytes: number[] = []
  for (const char of clean) {
    const index = BASE32_ALPHABET.indexOf(char)
    if (index === -1) throw new Error('Invalid base32 character')
    buffer = (buffer << 5) | index
    bits += 5
    if (bits >= 8) {
      bytes.push((buffer >>> (bits - 8)) & 0xff)
      bits -= 8
    }
  }
  return Buffer.from(bytes)
}

function totp(key: Buffer, atMs: number, stepSeconds = 30, digits = 6): string {
  const counter = Math.floor(atMs / 1000 / stepSeconds)
  const counterBuffer = Buffer.alloc(8)
  counterBuffer.writeBigUInt64BE(BigInt(counter))
  const hmac = crypto.createHmac('sha1', key).update(counterBuffer).digest()
  const offset = hmac[hmac.length - 1] & 0x0f
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff)
  const code = binary % 10 ** digits
  return code.toString().padStart(digits, '0')
}

/** Verify a TOTP code allowing a small clock-skew window. */
export function verifyTotp(secret: string, code: string, atMs = Date.now()): boolean {
  if (!secret || !/^\d{6}$/.test(code)) return false
  try {
    const key = base32Decode(secret)
    const current = totp(key, atMs)
    const step = 30_000
    return code === current || code === totp(key, atMs - step) || code === totp(key, atMs + step)
  } catch {
    // A corrupted stored secret must fail verification, not crash the request.
    return false
  }
}

/** Generate a fresh base32 TOTP secret. */
export function generateTotpSecret(): string {
  return base32Encode(crypto.randomBytes(20))
}

/** Current 6-digit TOTP code for a secret at the given time. */
export function totpCode(secret: string, atMs = Date.now()): string {
  return totp(base32Decode(secret), atMs)
}

/** otpauth:// URI for authenticator apps. */
export function totpAuthUrl(secret: string, account: string, issuer: string): string {
  const params = new URLSearchParams({
    secret,
    issuer,
    accountname: account,
    algorithm: 'SHA1',
    digits: '6',
    period: '30',
  })
  const encodedParams = [...params.entries()].map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`).join('&')
  return `otpauth://totp/${encodeURIComponent(issuer)}?${encodedParams}`
}
