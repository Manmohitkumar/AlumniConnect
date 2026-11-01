import { test } from 'node:test'
import assert from 'node:assert/strict'
import { formatDate, formatDateTime, initials, relativeTime, setFormatLocale, titleCase } from '../src/lib/format'

test('initials keeps the first letters of the first two words', () => {
  assert.equal(initials('Ayesha Khan'), 'AK')
  assert.equal(initials('  Grace   Brewster Murray Hopper '), 'GB')
  assert.equal(initials('Prince'), 'P')
  assert.equal(initials(''), '')
})

test('titleCase humanises enum-style values', () => {
  assert.equal(titleCase('MENTORSHIP_REQUEST'), 'Mentorship Request')
  assert.equal(titleCase('open'), 'Open')
})

test('formatDate handles empty and invalid values', () => {
  assert.equal(formatDate(null), '—')
  assert.equal(formatDate(undefined), '—')
  assert.equal(formatDate('not-a-date'), '—')
  assert.match(formatDate('2026-03-05T00:00:00.000Z'), /2026/)
})

test('formatDateTime includes a time component', () => {
  assert.equal(formatDateTime(''), '—')
  assert.match(formatDateTime('2026-03-05T14:30:00.000Z'), /\d{1,2}:\d{2}/)
})

test('relativeTime follows the active locale', () => {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60_000).toISOString()
  setFormatLocale('en')
  assert.match(relativeTime(fiveMinutesAgo), /5 minutes ago/)
  setFormatLocale('es')
  assert.match(relativeTime(fiveMinutesAgo), /hace 5 minutos/)
  setFormatLocale('ar')
  assert.match(relativeTime(fiveMinutesAgo), /قبل/)
  assert.equal(relativeTime(null), '')
  assert.equal(relativeTime('not-a-date'), '')
  setFormatLocale('en')
})
