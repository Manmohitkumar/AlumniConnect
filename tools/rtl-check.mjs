import puppeteer from 'puppeteer-core'

const CHROME = process.env.CHROME_PATH ?? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const BASE = process.env.AUDIT_BASE ?? 'http://localhost:5173'
const results = []

function record(label, ok, detail) {
  results.push({ label, ok, detail })
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${label}${ok ? '' : ` — ${detail}`}`)
}

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] })
const page = await browser.newPage()
await page.evaluateOnNewDocument(() => {
  try {
    localStorage.setItem('ac.locale', 'ar')
  } catch {
    // Private mode: the provider falls back to the browser language.
  }
})

async function inspect(label, url, expectText) {
  await page.goto(BASE + url, { waitUntil: 'networkidle2', timeout: 45000 })
  await page
    .waitForFunction((text) => document.body.innerText.includes(text), { timeout: 10000 }, expectText)
    .catch(() => null)
  const state = await page.evaluate((needle) => {
    const overflow = document.documentElement.scrollWidth - document.documentElement.clientWidth
    const offenders = [...document.querySelectorAll('header, main, aside, nav, section, button, a, p, h1, h2')]
      .filter((el) => {
        const rect = el.getBoundingClientRect()
        const style = getComputedStyle(el)
        if (rect.width === 0 || rect.height === 0 || style.visibility === 'hidden' || style.position === 'fixed') return false
        return rect.left < -2 || rect.right > window.innerWidth + 2
      })
      .slice(0, 3)
      .map((el) => `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 40)}`)
    return {
      lang: document.documentElement.lang,
      dir: document.documentElement.dir,
      overflow,
      textFound: document.body.innerText.includes(needle),
      offenders,
    }
  }, expectText)
  const details = []
  if (state.lang !== 'ar') details.push(`lang=${state.lang}`)
  if (state.dir !== 'rtl') details.push(`dir=${state.dir}`)
  if (state.overflow > 1) details.push(`horizontal overflow ${state.overflow}px`)
  if (!state.textFound) details.push(`missing "${expectText}"`)
  if (state.offenders.length) details.push(`outside viewport: ${state.offenders.join(', ')}`)
  record(label, details.length === 0, details.join('; '))
}

await page.setViewport({ width: 1280, height: 900 })
await inspect('desktop /', '/', 'الرئيسية')
await inspect('desktop /student/login', '/student/login', 'تسجيل الدخول')
await inspect('desktop /alumni/login', '/alumni/login', 'بوابة')

let loginStatus = 0
try {
  await page.goto(BASE + '/student/login', { waitUntil: 'domcontentloaded' })
  loginStatus = await page.evaluate(async () => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'student1@example.edu', password: 'DemoPass123!' }),
    })
    return response.status
  })
} catch (error) {
  loginStatus = -1
}

if (loginStatus === 200) {
  await inspect('desktop student overview', '/student/dashboard?tab=overview', 'نظرة عامة')
  await inspect('desktop student notifications', '/student/dashboard?tab=notifications', 'سجل الإشعارات')
  await inspect('desktop student profile', '/student/dashboard?tab=profile', 'اللغة والمنطقة')
} else {
  record('student login', false, `status ${loginStatus} (rate limited or API down)`)
}

await page.setViewport({ width: 390, height: 844 })
await inspect('mobile /', '/', 'الرئيسية')
if (loginStatus === 200) {
  await inspect('mobile student overview', '/student/dashboard?tab=overview', 'نظرة عامة')
}

await browser.close()

const failures = results.filter((item) => !item.ok)
console.log(`\n${results.length - failures.length}/${results.length} RTL checks passed`)
if (failures.length) process.exitCode = 1
