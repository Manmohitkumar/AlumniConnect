import puppeteer from 'puppeteer-core'
import fs from 'node:fs'
import path from 'node:path'

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const BASE = process.env.AUDIT_BASE ?? 'http://localhost:5173'
const OUT = path.join(process.env.TEMP || '.', 'ac-audit')
fs.mkdirSync(OUT, { recursive: true })

const ROLES = {
  STUDENT: { email: 'student1@example.edu', login: '/student/login', home: '/student/dashboard', tabs: ['overview', 'ai', 'mentor-ai', 'challenges', 'submissions', 'mentorship', 'portfolio', 'certificates', 'events', 'opportunities', 'resources', 'support', 'notifications', 'profile'] },
  ALUMNI: { email: 'meera.nair@example.edu', login: '/alumni/login', home: '/alumni/dashboard', tabs: ['overview', 'ai', 'ai-rep', 'challenges', 'submissions', 'mentorship', 'resources', 'events', 'certificates', 'discovery', 'support', 'notifications', 'profile'] },
  UNIVERSITY: { email: 'registrar@demo.edu', login: '/university/login', home: '/university/dashboard', tabs: ['overview', 'users', 'universities', 'ai', 'reliability', 'governance', 'adoption', 'provision', 'content', 'events', 'audit', 'announce', 'support', 'notifications', 'profile'] },
  ADMIN: { email: 'admin@example.edu', login: '/admin/login', home: '/admin/dashboard', tabs: ['overview', 'users', 'universities', 'ai', 'reliability', 'governance', 'provision', 'content', 'events', 'adoption', 'support', 'audit', 'announce', 'notifications', 'profile'] },
}

const PUBLIC = [
  '/',
  '/verify?code=DEMO-0001',
  '/verify?code=NOPE-0000',
  '/challenges/customer-complaint-analyzer',
  '/metaverse/index.html',
]

const problems = []
const results = []

function record(label, kind, detail) {
  problems.push({ label, kind, detail: String(detail).slice(0, 500) })
}

/**
 * Structural WCAG checks plus a conservative text-contrast scan. Contrast is
 * skipped when a background is an image/gradient or partially transparent,
 * because those cannot be judged from computed styles alone.
 */
async function auditAccessibility(page, label) {
  const issues = await page.evaluate(() => {
    const out = []
    const shown = (el) => {
      const rect = el.getBoundingClientRect()
      const style = getComputedStyle(el)
      return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none' && Number(style.opacity) > 0.05
    }
    const name = (el) =>
      (el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') || el.getAttribute('title') || el.textContent || '').trim()

    if (!document.documentElement.getAttribute('lang')) out.push(['lang', 'html element has no lang attribute'])

    for (const img of document.querySelectorAll('img')) {
      if (shown(img) && !img.hasAttribute('alt')) out.push(['img-alt', `img without alt: ${(img.getAttribute('src') || '').slice(0, 90)}`])
    }

    for (const el of document.querySelectorAll('button, [role="button"]')) {
      if (!shown(el)) continue
      if (!name(el) && !el.querySelector('svg title, img[alt]')) out.push(['control-name', `button without accessible name: ${el.className?.toString().slice(0, 70)}`])
    }

    for (const el of document.querySelectorAll('a[href]')) {
      if (!shown(el)) continue
      if (!name(el) && !el.querySelector('svg title, img[alt]')) out.push(['link-name', `link without accessible name: ${(el.getAttribute('href') || '').slice(0, 90)}`])
    }

    for (const el of document.querySelectorAll('input:not([type="hidden"]), select, textarea')) {
      if (!shown(el)) continue
      const id = el.id
      const labelled =
        (id && document.querySelector(`label[for="${CSS.escape(id)}"]`)) ||
        el.closest('label') ||
        el.getAttribute('aria-label') ||
        el.getAttribute('aria-labelledby') ||
        el.getAttribute('title')
      if (!labelled) out.push(['control-label', `form control without label: ${el.tagName.toLowerCase()}${el.getAttribute('name') ? `[name=${el.getAttribute('name')}]` : ''}`])
    }

    const seen = new Set()
    for (const el of document.querySelectorAll('[id]')) {
      if (!el.id) continue
      if (seen.has(el.id)) out.push(['duplicate-id', `duplicate id: ${el.id}`])
      seen.add(el.id)
    }

    const parse = (value) => {
      const match = /rgba?\(([^)]+)\)/.exec(value)
      if (!match) return null
      const parts = match[1].split(/[,/\s]+/).filter(Boolean).map(Number)
      if (parts.length < 3 || parts.some((n) => !Number.isFinite(n))) return null
      return { r: parts[0], g: parts[1], b: parts[2], a: parts.length > 3 ? parts[3] : 1 }
    }
    const luminance = ({ r, g, b }) => {
      const channel = (v) => {
        const s = v / 255
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
      }
      return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
    }
    const blend = (top, bottom) => ({
      r: top.r * top.a + bottom.r * (1 - top.a),
      g: top.g * top.a + bottom.g * (1 - top.a),
      b: top.b * top.a + bottom.b * (1 - top.a),
      a: 1,
    })
    let checked = 0
    for (const el of document.querySelectorAll('body *')) {
      if (!shown(el) || !el.textContent?.trim()) continue
      if (el.closest('[aria-hidden="true"], [disabled], option, script, style')) continue
      // Only elements that directly own text: avoids re-checking containers.
      const ownsText = Array.from(el.childNodes).some((node) => node.nodeType === 3 && node.textContent.trim().length > 1)
      if (!ownsText) continue
      const style = getComputedStyle(el)
      // Text drawn over a gradient/image cannot be judged from computed styles.
      if (style.backgroundImage !== 'none') continue
      const fg = parse(style.color)
      if (!fg || fg.a < 0.9) continue

      // Collect every translucent background from the element up to the first
      // opaque one, then composite bottom-up (ancestors are painted behind).
      const layers = []
      let base = parse(getComputedStyle(document.body).backgroundColor) || { r: 32, g: 44, b: 57, a: 1 }
      let verifiable = true
      for (let node = el; node; node = node.parentElement) {
        const s = getComputedStyle(node)
        if (node !== document.body && s.backgroundImage !== 'none') {
          verifiable = false
          break
        }
        const bg = parse(s.backgroundColor)
        if (bg && bg.a > 0) {
          layers.push(bg)
          if (bg.a >= 0.99) {
            base = { r: 0, g: 0, b: 0, a: 1 }
            break
          }
        }
        if (node === document.body) {
          base = parse(s.backgroundColor) || base
          break
        }
      }
      if (!verifiable) continue
      let backdrop = base
      for (const layer of layers.reverse()) backdrop = blend(layer, backdrop)
      const [light, dark] = [luminance(fg), luminance(backdrop)].sort((a, b) => b - a)
      const ratio = (light + 0.05) / (dark + 0.05)
      const size = parseFloat(style.fontSize)
      const bold = Number(style.fontWeight) >= 600
      const required = size >= 24 || (size >= 18.66 && bold) ? 3 : 4.5
      checked += 1
      if (ratio < required) {
        const tag = el.nodeName.toLowerCase()
        const classes = String(el.className || '').replace(/\s+/g, ' ').slice(0, 80)
        out.push(['contrast', `${ratio.toFixed(2)}:1 (needs ${required}) <${tag} class="${classes}"> "${el.textContent.trim().replace(/\s+/g, ' ').slice(0, 60)}"`])
      }
    }
    out.push(['contrast-scan', `${checked} text elements checked`])
    return out.slice(0, 100)
  })

  let contrastChecked = 0
  for (const [kind, detail] of issues) {
    if (kind === 'contrast-scan') {
      contrastChecked = Number((detail.match(/^\d+/) || [0])[0])
      continue
    }
    record(label, `a11y-${kind}`, detail)
  }
  return contrastChecked
}

async function attach(page, label) {
  page.on('console', (msg) => {
    if (msg.type() !== 'error') return
    const text = msg.text()
    if (text.includes('401 (Unauthorized)')) return
    if (text.includes('404 (Not Found)')) return
    record(label, 'console', text)
  })
  page.on('pageerror', (err) => record(label, 'pageerror', err.message))
  page.on('requestfailed', (req) => {
    const url = req.url()
    if (url.includes('favicon')) return
    // SPA navigations via window.location abort in-flight requests; benign.
    if (req.failure()?.errorText === 'net::ERR_ABORTED') return
    record(label, 'requestfailed', `${req.failure()?.errorText} ${url}`)
  })
  page.on('response', (res) => {
    if (res.status() < 400) return
    const url = res.url()
    if (url.includes('/api/auth/me') && res.status() === 401) return
    if (url.includes('/api/auth/logout')) return
    if (url.includes('favicon')) return
    // Expected negative test: unknown certificate codes return 404 by design.
    if (url.includes('/api/certificates/verify/NOPE-')) return
    record(label, `http${res.status()}`, `${res.request().method()} ${url}`)
  })
}

async function visit(page, label, url, shot) {
  const before = problems.length
  try {
    await page.goto(BASE + url, { waitUntil: 'networkidle2', timeout: 45000 })
  } catch (error) {
    if (!String(error.message).includes('ERR_ABORTED')) record(label, 'navigation', error.message)
  }
  // Pacing keeps a full-portal sweep below the API's per-minute request limit.
  await new Promise((r) => setTimeout(r, 1700))
  const body = await page.evaluate(() => document.body.innerText || '')
  if (/Something went wrong|Cannot read propert|is not a function|Minified React error/i.test(body)) {
    record(label, 'body-error', body.replace(/\s+/g, ' ').slice(0, 300))
  }
  if (body.trim().length < 40) record(label, 'blank-page', `body text length ${body.trim().length}`)
  const contrastChecked = await auditAccessibility(page, label)
  if (shot) await page.screenshot({ path: path.join(OUT, `${label}.png`), fullPage: true })
  const newProblems = problems.slice(before)
  results.push({ label, url, problems: newProblems.length, text: body.replace(/\s+/g, ' ').slice(0, 110), a11yContrastSamples: contrastChecked })
}

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--window-size=1440,1000'],
  defaultViewport: { width: 1440, height: 1000 },
})

for (const [role, config] of Object.entries(ROLES)) {
  const context = await browser.createBrowserContext()
  const page = await context.newPage()
  await attach(page, `${role} login`)
  await page.goto(`${BASE}${config.login}`, { waitUntil: 'networkidle2' })
  await page.type('input[name="email"]', config.email)
  await page.type('input[name="password"]', 'DemoPass123!')
  await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }), page.click('button[type="submit"]')])
  const landed = page.url()
  if (!landed.includes(config.home)) record(`${role} login`, 'wrong-redirect', landed)

  const palette = await page.evaluate(() => {
    const bg = getComputedStyle(document.body).backgroundColor
    const beige = Array.from(document.querySelectorAll('*')).filter((el) => {
      const c = getComputedStyle(el).backgroundColor
      return c === 'rgb(242, 149, 89)' || c === 'rgb(184, 176, 141)' || c === 'rgb(189, 182, 143)' || c === 'rgb(242, 212, 146)'
    }).length
    return { bg, beige }
  })
  if (palette.bg !== 'rgb(32, 44, 57)') record(`${role} palette`, 'palette-base', palette.bg)
  if (palette.beige === 0) record(`${role} palette`, 'palette-accent', 'no palette accent surfaces found')
  results.push({ label: `${role}-palette`, url: config.home, problems: problems.filter((x) => x.label === `${role} palette`).length, text: `body ${palette.bg}, accent surfaces ${palette.beige}` })

  for (const tab of config.tabs) {
    await visit(page, `${role}-${tab}`, `${config.home}?tab=${tab}`, tab === 'overview' || tab === 'profile')
  }
  await context.close()
}

const publicPage = await browser.newPage()
await attach(publicPage, 'public')
for (const route of PUBLIC) {
  const slug = route.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'home'
  await visit(publicPage, `public-${slug}`, route, true)
}

await browser.close()

console.log('\n=== ROUTE SUMMARY ===')
for (const row of results) console.log(`${row.problems === 0 ? 'OK  ' : 'FAIL'} ${row.label.padEnd(48)} ${row.text}`)

console.log('\n=== PROBLEMS ===')
if (problems.length === 0) console.log('none')
for (const p of problems) console.log(`[${p.kind}] ${p.label}: ${p.detail}`)

fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify({ results, problems }, null, 2))
console.log(`\nScreenshots + report: ${OUT}`)
