import { test } from 'node:test'
import assert from 'node:assert/strict'
import { z } from 'zod'
import type { NextFunction, Request, Response } from 'express'
import { AppError, asyncHandler, cleanQuery, errorHandler, httpUrl, pageMeta, pagination } from '../../src/lib/http'

const fakeRequest = (query: Record<string, unknown> = {}) => ({ query }) as unknown as Request

function fakeResponse() {
  const state: { status: number; body: unknown; headers: Record<string, string> } = { status: 200, body: null, headers: {} }
  const res = {
    status(code: number) {
      state.status = code
      return res
    },
    json(body: unknown) {
      state.body = body
      return res
    },
    setHeader(name: string, value: string) {
      state.headers[name] = value
    },
  } as unknown as Response
  return { res, state }
}

test('pagination clamps page and page size to safe bounds', () => {
  assert.deepEqual(pagination(fakeRequest({})), { page: 1, pageSize: 20, skip: 0, take: 20 })
  assert.deepEqual(pagination(fakeRequest({ page: '3', pageSize: '10' }), 5), { page: 3, pageSize: 10, skip: 20, take: 10 })
  assert.deepEqual(pagination(fakeRequest({ page: '0', pageSize: '0' })), { page: 1, pageSize: 1, skip: 0, take: 1 })
  assert.deepEqual(pagination(fakeRequest({ page: '-4', pageSize: '999' })), { page: 1, pageSize: 50, skip: 0, take: 50 })
  assert.deepEqual(pagination(fakeRequest({ page: 'abc', pageSize: 'abc' })), { page: 1, pageSize: 20, skip: 0, take: 20 })
})

test('pageMeta reports at least one page and rounds up', () => {
  const page = { page: 2, pageSize: 10, skip: 10, take: 10 }
  assert.deepEqual(pageMeta(page, 0), { page: 2, pageSize: 10, total: 0, totalPages: 1 })
  assert.deepEqual(pageMeta(page, 21), { page: 2, pageSize: 10, total: 21, totalPages: 3 })
})

test('cleanQuery trims, collapses whitespace, caps length and rejects non-strings', () => {
  assert.equal(cleanQuery('  hello   world  '), 'hello world')
  assert.equal(cleanQuery('x'.repeat(20), 5), 'xxxxx')
  assert.equal(cleanQuery(42), '')
  assert.equal(cleanQuery(undefined), '')
})

test('httpUrl only accepts http(s) URLs', () => {
  assert.equal(httpUrl().parse('https://example.edu/a'), 'https://example.edu/a')
  assert.equal(httpUrl().parse('http://localhost:4000'), 'http://localhost:4000')
  for (const value of ['javascript:alert(1)', 'data:text/html;base64,PHNjcmlwdD4=', 'file:///etc/passwd', 'ftp://example.edu']) {
    assert.throws(() => httpUrl().parse(value), undefined, value)
  }
})

test('asyncHandler forwards rejected promises to next', async () => {
  const failure = new Error('boom')
  const handler = asyncHandler(async () => {
    throw failure
  })
  const forwarded: unknown[] = []
  handler(fakeRequest(), fakeResponse().res, ((error: unknown) => forwarded.push(error)) as NextFunction)
  await new Promise((resolve) => setImmediate(resolve))
  assert.equal(forwarded[0], failure)
})

test('errorHandler maps known errors without leaking internals', () => {
  const originalError = console.error
  console.error = () => undefined
  try {
    const cases: Array<[unknown, number, string]> = [
      [new AppError(403, 'forbidden', 'Nope.'), 403, 'forbidden'],
      [new z.ZodError([]), 400, 'validation_error'],
      [{ code: 'P2002' }, 409, 'conflict'],
      [{ code: 'P2025' }, 404, 'not_found'],
      [new Error('secret stack'), 500, 'internal_error'],
    ]
    for (const [error, status, code] of cases) {
      const { res, state } = fakeResponse()
      errorHandler(error, fakeRequest(), res, (() => undefined) as NextFunction)
      assert.equal(state.status, status)
      assert.equal((state.body as { error: string }).error, code)
      assert.equal(JSON.stringify(state.body).includes('secret stack'), false)
    }
  } finally {
    console.error = originalError
  }
})

test('AppError exposes status, code and message', () => {
  const error = new AppError(418, 'teapot', 'Short and stout.')
  assert.equal(error.status, 418)
  assert.equal(error.code, 'teapot')
  assert.equal(error.message, 'Short and stout.')
})
