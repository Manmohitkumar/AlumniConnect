import puppeteer from 'puppeteer-core'

const browser = await puppeteer.launch({
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  headless: 'new',
  args: ['--no-sandbox'],
  defaultViewport: { width: 1440, height: 1000 },
})
const page = await browser.newPage()
page.on('console', async (msg) => {
  if (msg.type() === 'warning' || msg.type() === 'error') {
    console.log(`[${msg.type()}] ${msg.text()}`)
  }
})
await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle2' })
await page.type('input[name="email"]', 'student1@example.edu')
await page.type('input[name="password"]', 'DemoPass123!')
await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle2' }), page.click('button[type="submit"]')])
await page.goto('http://localhost:5173/student/dashboard?tab=submissions', { waitUntil: 'networkidle2' })
await new Promise((r) => setTimeout(r, 1500))
await browser.close()
