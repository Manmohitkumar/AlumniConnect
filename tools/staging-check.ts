/**
 * Staging deployment verification.
 *
 * Reproduces a production-shaped deployment on this machine:
 *   - production web build served by `vite preview` on :4300
 *   - API running with NODE_ENV=production on :4301
 *   - a separate staging database built from migrations + seed
 *   - /api traffic proxied through the web server, like a reverse proxy
 *
 * Then verifies health, SPA delivery, security headers, session cookies and a
 * real browser login (Puppeteer) against the staging origin. Every check must
 * pass for the exit code to be 0.
 *
 * Run from the repository root: npm run test:staging
 */
import { spawn, type ChildProcess } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import puppeteer from 'puppeteer-core'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..')
const apiDir = path.join(root, 'apps', 'api')
const webDir = path.join(root, 'apps', 'web')
const prismaDir = path.join(apiDir, 'prisma')
const stagingDb = path.join(prismaDir, 'staging.db')
const apiPort = Number(process.env.STAGING_API_PORT ?? 4301)
const webPort = Number(process.env.STAGING_WEB_PORT ?? 4300)
const webBase = `http://localhost:${webPort}`
const results: Array<{ name: string; ok: boolean; detail?: string }> = []

function check(name: string, ok: boolean, detail?: string) {
  results.push({ name, ok, detail })
  console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`)
}

function run(command: string, args: string[], cwd: string, env: NodeJS.ProcessEnv = {}): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env: { ...process.env, ...env },
      stdio: 'ignore',
    })
    child.on('error', reject)
    child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`${command} ${args.join(' ')} exited ${code}`))))
  })
}

async function waitFor(url: string, timeoutMs = 30_000) {
  const started = Date.now()
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url)
      if (response.ok) return
    } catch {
      // not ready yet
    }
    await new Promise((resolve) => setTimeout(resolve, 400))
  }
  throw new Error(`Timed out waiting for ${url}`)
}

async function main() {
  fs.rmSync(stagingDb, { force: true })
  console.log('Building production web bundle…')
  await run(process.execPath, [path.join(root, 'node_modules', 'vite', 'bin', 'vite.js'), 'build'], webDir)

  console.log('Preparing staging database…')
  const dbEnv = { DATABASE_URL: 'file:./staging.db' }
  await run(process.execPath, [path.join(root, 'node_modules', 'prisma', 'build', 'index.js'), 'migrate', 'deploy'], apiDir, dbEnv)
  await run(process.execPath, ['--import', 'tsx', 'prisma/seed.ts'], apiDir, dbEnv)

  console.log(`Starting production API on :${apiPort}…`)
  const api: ChildProcess = spawn(process.execPath, ['--import', 'tsx', 'src/index.ts'], {
    cwd: apiDir,
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORT: String(apiPort),
      DATABASE_URL: 'file:./staging.db',
      WEB_ORIGIN: webBase,
      API_RATE_LIMIT_MAX: '10000',
    },
    stdio: 'ignore',
  })

  console.log(`Starting production preview on :${webPort}…`)
  const web: ChildProcess = spawn(
    process.execPath,
    [path.join(root, 'node_modules', 'vite', 'bin', 'vite.js'), 'preview', '--port', String(webPort), '--strictPort'],
    {
      cwd: webDir,
      env: { ...process.env, STAGING_API_URL: `http://localhost:${apiPort}` },
      stdio: 'ignore',
    },
  )

  const stop = () => {
    if (!api.killed) api.kill()
    if (!web.killed) web.kill()
  }
  process.on('exit', stop)

  try {
    await waitFor(`${webBase}/api/health`)
    const health = await fetch(`${webBase}/api/health`)
    const healthBody = (await health.json()) as { status?: string; database?: string }
    check('API health is reachable through the web origin', health.status === 200 && healthBody.database === 'connected')

    const shell = await fetch(webBase)
    const html = await shell.text()
    check('SPA shell is served by the production build', shell.status === 200 && html.includes('<div id="root"'))
    check('hashed production assets are referenced', /assets\/[^"]+\.js/.test(html))

    check('API security headers survive the proxy', Boolean(health.headers.get('x-content-type-options')) && Boolean(health.headers.get('x-frame-options')))
    check('CSP header is present', Boolean(health.headers.get('content-security-policy')))

    const login = await fetch(`${webBase}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'student1@example.edu', password: 'DemoPass123!', portal: 'student' }),
    })
    const setCookie = login.headers.getSetCookie?.().find((value) => value.startsWith('ac_session=')) ?? ''
    check('login succeeds through staging origin', login.status === 200)
    check('session cookie is HttpOnly and Secure in production', /HttpOnly/i.test(setCookie) && /Secure/i.test(setCookie))

    const browser = await puppeteer.launch({ headless: true, executablePath: process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--no-sandbox'] })
    try {
      const page = await browser.newPage()
      await page.goto(`${webBase}/student/login`, { waitUntil: 'networkidle0', timeout: 30_000 })
      const email = await page.$('input[type="email"], input[name="email"]')
      const password = await page.$('input[type="password"]')
      if (!email || !password) throw new Error('Login form not found in production bundle')
      await email.type('student1@example.edu')
      await password.type('DemoPass123!')
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30_000 }).catch(() => null),
        page.evaluate(() => {
          const form = document.querySelector('form')
          const button = form?.querySelector('button[type="submit"]') as HTMLButtonElement | null
          if (button) button.click()
          else form?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
        }),
      ])
      const landed = page.url()
      const body = await page.evaluate(() => document.body.innerText.slice(0, 200))
      check('browser login works on the staging build', landed.includes('/student/dashboard') && /student workspace/i.test(body), landed)
    } finally {
      await browser.close()
    }
  } finally {
    stop()
    await new Promise((resolve) => setTimeout(resolve, 600))
    fs.rmSync(stagingDb, { force: true })
    fs.rmSync(`${stagingDb}-journal`, { force: true })
  }

  const failed = results.filter((row) => !row.ok)
  console.log(`\n${results.length - failed.length}/${results.length} staging checks passed`)
  if (failed.length > 0) process.exitCode = 1
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
