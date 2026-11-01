import { test } from 'node:test'
import assert from 'node:assert/strict'
import { generateTotpSecret, totpAuthUrl, totpCode, verifyTotp } from '../../src/lib/totp'

// RFC 6238 SHA-1 test secret: ASCII "12345678901234567890".
const SECRET = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ'

test('TOTP matches RFC 6238 SHA-1 vectors (6 digits)', () => {
  assert.equal(totpCode(SECRET, 59_000), '287082')
  assert.equal(totpCode(SECRET, 1_111_111_109_000), '081804')
  assert.equal(totpCode(SECRET, 1_234_567_890_000), '005924')
})

test('verifyTotp accepts the current code and one 30s step of clock skew', () => {
  const at = 1_700_000_000_000
  assert.equal(verifyTotp(SECRET, totpCode(SECRET, at), at), true)
  assert.equal(verifyTotp(SECRET, totpCode(SECRET, at - 30_000), at), true)
  assert.equal(verifyTotp(SECRET, totpCode(SECRET, at + 30_000), at), true)
  assert.equal(verifyTotp(SECRET, totpCode(SECRET, at - 120_000), at), false)
})

test('verifyTotp rejects malformed input instead of throwing', () => {
  assert.equal(verifyTotp('', '123456'), false)
  assert.equal(verifyTotp(SECRET, '12345'), false)
  assert.equal(verifyTotp(SECRET, 'abcdef'), false)
  assert.equal(verifyTotp('not-base32!', '123456'), false)
})

test('generated secrets are 32 base32 characters and produce valid codes', () => {
  for (let index = 0; index < 5; index += 1) {
    const secret = generateTotpSecret()
    assert.match(secret, /^[A-Z2-7]{32}$/)
    assert.equal(verifyTotp(secret, totpCode(secret, 1_700_000_000_000), 1_700_000_000_000), true)
  }
  const second = generateTotpSecret()
  assert.notEqual(generateTotpSecret(), second)
})

test('authenticator URL carries the issuer, secret and standard parameters', () => {
  const url = new URL(totpAuthUrl(SECRET, 'admin@example.edu', 'AlumniConnect'))
  assert.equal(url.protocol, 'otpauth:')
  assert.equal(url.searchParams.get('secret'), SECRET)
  assert.equal(url.searchParams.get('issuer'), 'AlumniConnect')
  assert.equal(url.searchParams.get('algorithm'), 'SHA1')
  assert.equal(url.searchParams.get('digits'), '6')
  assert.equal(url.searchParams.get('period'), '30')
})
