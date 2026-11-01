import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import puppeteer from 'puppeteer-core'

const CHROME = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const BASE = process.env.AUDIT_BASE ?? 'http://localhost:5173'
const EMAIL = process.env.PUSH_MATRIX_EMAIL ?? 'student1@example.edu'
const PASSWORD = process.env.PUSH_MATRIX_PASSWORD ?? 'DemoPass123!'
const OUT = process.env.PUSH_MATRIX_OUT ?? path.join(process.env.TEMP || '.', 'ac-push-matrix')
fs.mkdirSync(OUT, { recursive: true })

const VIEWPORTS = [
  { id: 'phone-360', label: 'Phone 360x740', width: 360, height: 740, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  { id: 'phone-412', label: 'Phone 412x915', width: 412, height: 915, deviceScaleFactor: 2.6, isMobile: true, hasTouch: true },
  { id: 'tablet-820', label: 'Tablet 820x1180', width: 820, height: 1180, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  { id: 'desktop-1440', label: 'Desktop 1440x900', width: 1440, height: 900, deviceScaleFactor: 1 },
]

const findings = []
function record(scope, kind, detail, severity = 'fail') {
  findings.push({ scope, kind, detail: String(detail), severity })
}

const KEY_FINGERPRINT_LENGTH = 12

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
  defaultViewport: { width: 1440, height: 900 },
})

const context = await browser.createBrowserContext()
const page = await context.newPage()
const pageErrors = []
page.on('pageerror', (error) => pageErrors.push(String(error)))

async function login() {
  await page.goto(`${BASE}/student/login`, { waitUntil: 'networkidle2' })
  await page.type('input[name="email"]', EMAIL)
  await page.type('input[name="password"]', PASSWORD)
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }),
    page.click('button[type="submit"]'),
  ])
  if (!page.url().includes('/student/dashboard')) throw new Error(`Login did not reach the dashboard (${page.url()})`)
}

try {
  await login()

  const capability = await page.evaluate(async () => {
    const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
    const out = {
      supported,
      secureContext: isSecureContext,
      permission: typeof Notification === 'undefined' ? 'unsupported' : Notification.permission,
      registration: null,
      error: null,
    }
    if (!supported) return out
    try {
      await navigator.serviceWorker.register('/sw.js')
      const registration = await navigator.serviceWorker.ready
      out.registration = {
        scope: registration.scope,
        state: registration.active?.state ?? 'none',
        pushManager: typeof registration.pushManager?.subscribe === 'function',
      }
    } catch (error) {
      out.error = String(error?.message ?? error)
    }
    return out
  })

  if (!capability.supported) record('browser', 'push-unsupported', 'Chromium reports no Push API support', 'fail')
  if (!capability.secureContext) record('browser', 'insecure-context', 'Window is not a secure context', 'fail')
  if (capability.error) record('browser', 'sw-registration-error', capability.error)
  if (capability.registration) {
    if (!capability.registration.scope.startsWith(BASE)) record('browser', 'sw-scope', capability.registration.scope)
    if (capability.registration.state !== 'activated') record('browser', 'sw-state', capability.registration.state)
    if (!capability.registration.pushManager) record('browser', 'sw-push-manager', 'registration.pushManager.subscribe missing')
  }

  const manifest = await page.evaluate(async () => {
    const response = await fetch('/manifest.webmanifest')
    const text = await response.text()
    let json = null
    try {
      json = JSON.parse(text)
    } catch {
      json = null
    }
    return { status: response.status, json }
  })
  if (manifest.status !== 200 || !manifest.json) {
    record('pwa', 'manifest', `status ${manifest.status}, parseable ${Boolean(manifest.json)}`)
  } else {
    const m = manifest.json
    if (!m.name) record('pwa', 'manifest-name', 'missing name')
    if (m.display !== 'standalone') record('pwa', 'manifest-display', String(m.display))
    if (!m.start_url) record('pwa', 'manifest-start-url', 'missing start_url')
    const sizes = new Set((m.icons ?? []).map((icon) => icon.sizes))
    for (const size of ['192x192', '512x512']) {
      if (!sizes.has(size)) record('pwa', 'manifest-icon', `missing ${size} icon`)
    }
  }

  const worker = await page.evaluate(async () => {
    const response = await fetch('/sw.js')
    const text = await response.text()
    return {
      status: response.status,
      push: /self\.addEventListener\(\s*['"]push['"]/.test(text),
      click: /self\.addEventListener\(\s*['"]notificationclick['"]/.test(text),
    }
  })
  if (worker.status !== 200) record('service-worker', 'fetch', worker.status)
  if (!worker.push) record('service-worker', 'push-listener', 'missing push handler')
  if (!worker.click) record('service-worker', 'click-listener', 'missing notificationclick handler')

  const status = await page.evaluate(async () => {
    const response = await fetch('/api/notifications/push/status', { credentials: 'include' })
    const body = await response.json().catch(() => null)
    return { status: response.status, body }
  })
  if (status.status !== 200 || !status.body?.data) {
    record('server', 'push-status', `status ${status.status}`)
  } else {
    const data = status.body.data
    if (typeof data.enabled !== 'boolean') record('server', 'push-status-shape', 'enabled is not boolean')
    if (typeof data.subscriptions !== 'number') record('server', 'push-status-shape', 'subscriptions is not a number')
    if (data.enabled) {
      if (typeof data.publicKey !== 'string' || data.publicKey.length < 80) record('server', 'vapid-public-key', 'public key missing or too short')
      if (data.keyId !== createHash('sha256').update(String(data.publicKey)).digest('hex').slice(0, KEY_FINGERPRINT_LENGTH)) {
        record('server', 'vapid-fingerprint', 'keyId does not match SHA-256 of publicKey')
      }
      const raw = Buffer.from(String(data.publicKey).replace(/-/g, '+').replace(/_/g, '/'), 'base64')
      if (raw.length !== 65 || raw[0] !== 0x04) record('server', 'vapid-key-format', `decoded ${raw.length} bytes, prefix ${raw[0]}`)
    } else {
      record('server', 'push-disabled', 'VAPID keys are not configured on this API instance', 'warn')
    }
  }

  const rows = []
  for (const viewport of VIEWPORTS) {
    await page.setViewport({
      width: viewport.width,
      height: viewport.height,
      deviceScaleFactor: viewport.deviceScaleFactor ?? 1,
      isMobile: Boolean(viewport.isMobile),
      hasTouch: Boolean(viewport.hasTouch),
    })
    await page.goto(`${BASE}/student/dashboard?tab=notifications`, { waitUntil: 'networkidle2' })
    await page.waitForFunction(() => document.body.innerText.includes('Device notifications'), { timeout: 20000 })

    const layout = await page.evaluate(() => {
      const label = Array.from(document.querySelectorAll('p')).find((node) => node.textContent?.trim() === 'Device notifications')
      const card = label?.closest('div.flex')?.parentElement ?? label?.parentElement ?? null
      const button = Array.from(document.querySelectorAll('button')).find((node) =>
        /Enable on this device|Turn off on this device|Updating/.test(node.textContent ?? ''),
      )
      const statusLine = label?.parentElement?.querySelector('p:nth-of-type(2)') ?? null
      const rect = button?.getBoundingClientRect() ?? null
      return {
        overflowX: document.documentElement.scrollWidth - window.innerWidth,
        cardFound: Boolean(card),
        buttonFound: Boolean(button),
        buttonWidth: rect ? Math.round(rect.width) : 0,
        buttonHeight: rect ? Math.round(rect.height) : 0,
        buttonInViewport: rect ? rect.left >= 0 && rect.right <= window.innerWidth + 0.5 : false,
        statusText: statusLine?.textContent?.trim() ?? '',
        statusClipped: statusLine ? statusLine.scrollWidth > statusLine.clientWidth + 1 : false,
      }
    })

    if (layout.overflowX > 1) record(viewport.id, 'horizontal-overflow', `${layout.overflowX}px`)
    if (!layout.cardFound) record(viewport.id, 'settings-card-missing', 'notification settings card not found')
    if (!layout.buttonFound) record(viewport.id, 'toggle-missing', 'device notification toggle not found')
    if (layout.buttonFound && !layout.buttonInViewport) record(viewport.id, 'toggle-offscreen', 'toggle leaves the viewport horizontally')
    if (layout.buttonFound && layout.buttonHeight < 32) record(viewport.id, 'tap-target', `toggle is ${layout.buttonHeight}px tall`, 'warn')
    if (layout.statusClipped) record(viewport.id, 'text-clipped', layout.statusText)
    if (!layout.statusText) record(viewport.id, 'status-missing', 'no device notification status text', 'warn')

    await page.screenshot({ path: path.join(OUT, `${viewport.id}.png`), fullPage: true })
    rows.push({
      viewport: viewport.label,
      overflowX: layout.overflowX,
      toggle: layout.buttonFound ? `${layout.buttonWidth}x${layout.buttonHeight}` : 'missing',
      status: layout.statusText || '(none)',
    })
  }

  if (pageErrors.length) record('runtime', 'page-error', pageErrors.join(' | '))

  const failures = findings.filter((item) => item.severity === 'fail')
  const warnings = findings.filter((item) => item.severity === 'warn')
  const report = {
    generatedAt: new Date().toISOString(),
    target: BASE,
    environment: 'local Chromium emulation (not physical devices)',
    capability,
    manifest: manifest.json
      ? { name: manifest.json.name, display: manifest.json.display, icons: manifest.json.icons?.length ?? 0 }
      : null,
    serviceWorkerHandlers: { push: worker.push, notificationclick: worker.click },
    serverPush: status.body?.data ? { enabled: status.body.data.enabled, subscriptions: status.body.data.subscriptions, keyId: status.body.data.keyId ?? null } : null,
    viewports: rows,
    findings,
  }
  const reportPath = path.join(OUT, 'push-matrix-report.json')
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))

  console.log('\nViewport layout checks')
  for (const row of rows) console.log(`  ${row.viewport.padEnd(20)} overflow ${String(row.overflowX).padStart(3)}px  toggle ${row.toggle.padEnd(9)} ${row.status}`)
  console.log(`\nService worker: push ${worker.push ? 'ok' : 'missing'}, notificationclick ${worker.click ? 'ok' : 'missing'}`)
  console.log(`Server push: ${report.serverPush ? (report.serverPush.enabled ? `enabled, keyId ${report.serverPush.keyId}, ${report.serverPush.subscriptions} subscription(s)` : 'disabled (VAPID not configured)') : 'status unavailable'}`)
  console.log(`Screenshots + JSON: ${OUT}`)
  for (const item of warnings) console.log(`  warn  [${item.scope}] ${item.kind}: ${item.detail}`)
  for (const item of failures) console.log(`  FAIL  [${item.scope}] ${item.kind}: ${item.detail}`)
  console.log(`\nPush device matrix: ${failures.length === 0 ? `passed with ${warnings.length} warning(s)` : `${failures.length} failure(s), ${warnings.length} warning(s)`}`)
  process.exitCode = failures.length === 0 ? 0 : 1
} finally {
  await browser.close()
}
