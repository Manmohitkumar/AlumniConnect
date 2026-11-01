import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { NextFunction, Request, Response } from 'express'
import { rateLimit, resetRateLimits } from '../../src/lib/rate-limit'

function run(limiter: ReturnType<typeof rateLimit>, ip = '203.0.113.7') {
  const state: { status: number; body: unknown; headers: Record<string, string> } = { status: 200, body: null, headers: {} }
  let passed = false
  const res = {
    setHeader(name: string, value: string) {
      state.headers[name] = value
    },
    status(code: number) {
      state.status = code
      return res
    },
    json(body: unknown) {
      state.body = body
      return res
    },
  } as unknown as Response
  limiter({ ip } as unknown as Request, res, (() => {
    passed = true
  }) as NextFunction)
  return { passed, ...state }
}

test('requests within the window pass and expose limit headers', () => {
  resetRateLimits()
  const limiter = rateLimit({ windowMs: 60_000, max: 2, key: 'unit' })
  const first = run(limiter)
  assert.equal(first.passed, true)
  assert.equal(first.headers['X-RateLimit-Limit'], '2')
  assert.equal(first.headers['X-RateLimit-Remaining'], '1')
  const second = run(limiter)
  assert.equal(second.passed, true)
  assert.equal(second.headers['X-RateLimit-Remaining'], '0')
})

test('requests over the limit receive 429 with retry guidance', () => {
  resetRateLimits()
  const limiter = rateLimit({ windowMs: 60_000, max: 1, key: 'unit' })
  run(limiter)
  const blocked = run(limiter)
  assert.equal(blocked.passed, false)
  assert.equal(blocked.status, 429)
  assert.equal((blocked.body as { error: string }).error, 'rate_limited')
  assert.ok(Number(blocked.headers['Retry-After']) >= 1)
})

test('limits are isolated per client address', () => {
  resetRateLimits()
  const limiter = rateLimit({ windowMs: 60_000, max: 1, key: 'unit' })
  run(limiter, '198.51.100.1')
  assert.equal(run(limiter, '198.51.100.2').passed, true)
  assert.equal(run(limiter, '198.51.100.1').passed, false)
})

test('a new window resets the counter', async () => {
  resetRateLimits()
  const limiter = rateLimit({ windowMs: 20, max: 1, key: 'unit' })
  run(limiter)
  assert.equal(run(limiter).passed, false)
  await new Promise((resolve) => setTimeout(resolve, 40))
  assert.equal(run(limiter).passed, true)
})
