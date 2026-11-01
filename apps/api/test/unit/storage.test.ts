import { test } from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import { detectFile, maxUploadBytes, resolveStoredFile, storageRoot, uploadPolicy } from '../../src/lib/storage'

const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0])
const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0])
const gif = Buffer.from('GIF89a000000', 'ascii')
const webp = Buffer.concat([Buffer.from('RIFF', 'ascii'), Buffer.from([0, 0, 0, 0]), Buffer.from('WEBP', 'ascii')])
const pdf = Buffer.from('%PDF-1.7 test document', 'ascii')
const zip = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0, 0, 0, 0, 0, 0, 0, 0])
const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>', 'ascii')

test('detectFile identifies supported types from bytes', () => {
  const cases: Array<[Buffer, string, string, string]> = [
    [png, 'png', 'image/png', 'image'],
    [jpeg, 'jpg', 'image/jpeg', 'image'],
    [gif, 'gif', 'image/gif', 'image'],
    [webp, 'webp', 'image/webp', 'image'],
    [pdf, 'pdf', 'application/pdf', 'document'],
    [zip, 'zip', 'application/zip', 'archive'],
  ]
  for (const [buffer, extension, mimeType, category] of cases) {
    assert.deepEqual(detectFile(buffer), { extension, mimeType, category })
  }
})

test('detectFile rejects SVG, HTML, short and unknown payloads', () => {
  assert.equal(detectFile(svg), null)
  assert.equal(detectFile(Buffer.from('<html><script>alert(1)</script></html>')), null)
  assert.equal(detectFile(Buffer.from('short')), null)
  assert.equal(detectFile(Buffer.alloc(0)), null)
})

test('upload policies keep archives out of avatars and general uploads', () => {
  const avatar = uploadPolicy('avatar')
  assert.deepEqual(avatar.categories, ['image'])
  assert.equal(avatar.maxBytes, 5 * 1024 * 1024)

  const submission = uploadPolicy('submission')
  assert.deepEqual(submission.categories, ['image', 'document', 'archive'])
  assert.equal(submission.maxBytes, 20 * 1024 * 1024)

  const general = uploadPolicy('general')
  assert.deepEqual(general.categories, ['image', 'document'])
  assert.equal(maxUploadBytes(), 20 * 1024 * 1024)
})

test('resolveStoredFile stays inside the upload root', () => {
  const previous = process.env.UPLOAD_DIR
  process.env.UPLOAD_DIR = path.resolve(process.cwd(), 'unit-uploads')
  try {
    assert.ok(storageRoot().endsWith('unit-uploads'))
    assert.equal(resolveStoredFile('avatar/2026/01/file.png'), path.join(storageRoot(), 'avatar', '2026', '01', 'file.png'))
    assert.equal(resolveStoredFile('../secrets.txt'), null)
    assert.equal(resolveStoredFile('avatar/../../secrets.txt'), null)
    assert.equal(resolveStoredFile(''), null)
  } finally {
    if (previous === undefined) delete process.env.UPLOAD_DIR
    else process.env.UPLOAD_DIR = previous
  }
})
