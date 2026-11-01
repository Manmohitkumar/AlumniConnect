import { test } from 'node:test'
import assert from 'node:assert/strict'
import { dashboardPath, parsePrefs } from '../../src/lib/notify'

test('parsePrefs falls back to safe defaults for missing or invalid data', () => {
  assert.deepEqual(parsePrefs(null), { mentorship: true, challenges: true, events: true, marketing: false, support: true })
  assert.deepEqual(parsePrefs(undefined), { mentorship: true, challenges: true, events: true, marketing: false, support: true })
  assert.deepEqual(parsePrefs(''), { mentorship: true, challenges: true, events: true, marketing: false, support: true })
  assert.deepEqual(parsePrefs('{not json'), { mentorship: true, challenges: true, events: true, marketing: false, support: true })
  assert.deepEqual(parsePrefs('null'), { mentorship: true, challenges: true, events: true, marketing: false, support: true })
})

test('parsePrefs keeps stored choices and fills missing categories', () => {
  assert.deepEqual(parsePrefs(JSON.stringify({ mentorship: false, marketing: true })), {
    mentorship: false,
    challenges: true,
    events: true,
    marketing: true,
    support: true,
  })
  assert.deepEqual(parsePrefs(JSON.stringify({ support: false })).support, false)
})

test('dashboardPath routes each role to its portal', () => {
  assert.equal(dashboardPath('STUDENT'), '/student/dashboard')
  assert.equal(dashboardPath('ALUMNI'), '/alumni/dashboard')
  assert.equal(dashboardPath('UNIVERSITY'), '/university/dashboard')
  assert.equal(dashboardPath('ADMIN'), '/admin/dashboard')
  assert.equal(dashboardPath('COMPANY'), '/company/dashboard')
  assert.equal(dashboardPath('UNKNOWN'), '/student/dashboard')
  assert.equal(dashboardPath('ALUMNI', 'mentorship'), '/alumni/dashboard?tab=mentorship')
})
