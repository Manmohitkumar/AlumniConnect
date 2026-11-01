import 'dotenv/config'
import cors from 'cors'
import express, { type NextFunction, type Request, type Response, type Router } from 'express'
import { prisma } from './db'
import { authRouter } from './routes/auth'
import { profileRouter } from './routes/profile'
import { challengesRouter } from './routes/challenges'
import { submissionCreateRouter, submissionsRouter } from './routes/submissions'
import { evaluationsRouter } from './routes/evaluations'
import { mentorshipRouter, mentorsRouter } from './routes/mentorship'
import { certificatesRouter } from './routes/certificates'
import { eventsRouter } from './routes/events'
import { notificationsRouter } from './routes/notifications'
import { knowledgeRouter } from './routes/knowledge'
import { discoveryRouter } from './routes/discovery'
import { applicationsRouter, opportunitiesRouter } from './routes/opportunities'
import { portfolioRouter } from './routes/portfolio'
import { adminRouter } from './routes/admin'
import { feedbackRouter } from './routes/feedback'
import { universityRouter } from './routes/university'
import { universitiesRouter } from './routes/universities'
import { metaverseRouter } from './routes/metaverse'
import { privacyRouter } from './routes/privacy'
import { aiRouter } from './routes/ai'
import { careerRouter, consentRouter, webhookRouter } from './routes/ecosystem'
import { alumniAiRouter } from './routes/alumni-ai'
import { uploadsRouter } from './routes/uploads'
import { storageRoot } from './lib/storage'
import { developerRouter, governanceRouter, metaverseRoomsRouter, opsRouter, publicApiRouter } from './routes/platform'
import { errorHandler } from './lib/http'
import { rateLimit } from './lib/rate-limit'
import { monitorSnapshot, recordRequest, startAlertMonitor, stopAlertMonitor } from './lib/monitor'
import { flushTelemetry, startSpan, stopTelemetry, telemetryConfigured } from './lib/telemetry'
import { capturedMail, clearCapturedMail, devMailboxEnabled, devMailboxListening, startDevMailbox } from './lib/dev-mailbox'

const app = express()
const port = Number(process.env.PORT ?? 4000)
// Each portal may be deployed on its own origin; all of them call this API.
const allowedOrigins = [
  ...new Set(
    [process.env.WEB_ORIGIN ?? 'http://localhost:5173', process.env.WEB_ORIGINS ?? '']
      .join(',')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
  ),
]
const startedAt = Date.now()

// Development SMTP sink so verification/reset mail is actually delivered to a
// real SMTP endpoint instead of only being printed as a preview link.
// Explicit SMTP settings always take precedence.
if (devMailboxEnabled()) {
  startDevMailbox()
  if (!process.env.SMTP_URL && !process.env.SMTP_HOST) {
    process.env.SMTP_URL = `smtp://127.0.0.1:${process.env.DEV_SMTP_PORT ?? 1025}`
    process.env.SMTP_FROM ??= 'AlumniConnect <no-reply@alumniconnect.local>'
  }
}

if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1)
app.disable('x-powered-by')

app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(self), geolocation=()')
  // The API serves only JSON plus the certificate record page (inline styles, no scripts).
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'none'; style-src 'unsafe-inline'; img-src data:; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
  )
  next()
})

app.use((req: Request, res: Response, next: NextFunction) => {
  const start = process.hrtime.bigint()
  const span = startSpan(`HTTP ${req.method} ${req.path}`, {
    'http.method': req.method,
    'http.route': req.path,
    'http.target': req.originalUrl.split('?')[0],
  })
  res.on('finish', () => {
    const ms = Number(process.hrtime.bigint() - start) / 1e6
    recordRequest({ time: Date.now(), status: res.statusCode, method: req.method, path: req.path, ms })
    span.end({ 'http.status_code': res.statusCode, 'http.duration_ms': Math.round(ms) })
    if (res.statusCode >= 400 && req.path !== '/api/health') {
      console.warn(`[api] ${req.method} ${req.path} -> ${res.statusCode} (${ms.toFixed(1)}ms)`)
    }
  })
  next()
})

app.use(
  cors({
    origin(origin, callback) {
      // Same-origin/server-to-server requests have no Origin header.
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true)
        return
      }
      callback(new Error('Origin not allowed by CORS'))
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
)
app.use(express.json({ limit: '256kb' }))

// Coarse global guard; credential endpoints have their own stricter limit.
// The budget is env-configurable so isolated load-test instances can raise it.
app.use('/api', rateLimit({ windowMs: 60_000, max: Number(process.env.API_RATE_LIMIT_MAX ?? 300), key: 'api' }))

/** Liveness + database readiness, used by the web app's status chip. */
const healthHandler = async (_req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`
    const [challenges, users, submissions, universities] = await Promise.all([
      prisma.challenge.count(),
      prisma.user.count(),
      prisma.submission.count(),
      prisma.university.count(),
    ])

    res.json({
      status: 'ok',
      database: 'connected',
      counts: { challenges, users, submissions, universities },
      uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
      monitor: monitorSnapshot(),
    })
  } catch {
    res.status(503).json({ status: 'degraded', database: 'unavailable' })
  }
}
app.get('/api/health', healthHandler)
app.get('/api/v1/health', healthHandler)

app.use('/api/auth', authRouter)
app.use('/api/profile', profileRouter)
app.use('/api/challenges', challengesRouter)
app.use('/api/challenges/:challengeId/submissions', submissionCreateRouter)
app.use('/api/submissions', submissionsRouter)
app.use('/api', evaluationsRouter)
app.use('/api/mentors', mentorsRouter)
app.use('/api/mentorship', mentorshipRouter)
app.use('/api/certificates', certificatesRouter)
app.use('/api/events', eventsRouter)
app.use('/api/notifications', notificationsRouter)
app.use('/api/resources', knowledgeRouter)
app.use('/api/discover', discoveryRouter)
app.use('/api/opportunities', opportunitiesRouter)
app.use('/api/applications', applicationsRouter)
app.use('/api/portfolio', portfolioRouter)
app.use('/api/universities', universitiesRouter)
app.use('/api/university', universityRouter)
app.use('/api/admin', adminRouter)
app.use('/api/feedback', feedbackRouter)
app.use('/api/metaverse', metaverseRouter)
app.use('/api/privacy', privacyRouter)
app.use('/api/ai', aiRouter)
app.use('/api/metaverse/rooms', metaverseRoomsRouter)
app.use('/api/ops', opsRouter)
app.use('/api/developer', developerRouter)
app.use('/api/v1/public', publicApiRouter)
app.use('/api/governance', governanceRouter)
app.use('/api/career', careerRouter)
app.use('/api/consents', consentRouter)
app.use('/api/developer/webhooks', webhookRouter)
app.use('/api/alumni-ai', alumniAiRouter)
app.use('/api/uploads', uploadsRouter)

// Public avatar files. Uploads are sniffed on write and the stored name is
// server-generated, so there is no executable content under this root.
app.use(
  '/uploads',
  express.static(storageRoot(), {
    index: false,
    dotfiles: 'deny',
    fallthrough: true,
    setHeaders: (res) => {
      res.setHeader('Cache-Control', 'public, max-age=2592000, immutable')
      res.setHeader('Content-Disposition', 'inline')
    },
  }),
)

// Versioned alias for native/mobile clients. The same routers back both
// /api and /api/v1 so there is one implementation, never a fork.
const versionedRoutes: Array<[string, Router]> = [
  ['/auth', authRouter],
  ['/profile', profileRouter],
  ['/challenges', challengesRouter],
  ['/challenges/:challengeId/submissions', submissionCreateRouter],
  ['/submissions', submissionsRouter],
  ['', evaluationsRouter],
  ['/mentors', mentorsRouter],
  ['/mentorship', mentorshipRouter],
  ['/certificates', certificatesRouter],
  ['/events', eventsRouter],
  ['/notifications', notificationsRouter],
  ['/resources', knowledgeRouter],
  ['/discover', discoveryRouter],
  ['/opportunities', opportunitiesRouter],
  ['/applications', applicationsRouter],
  ['/portfolio', portfolioRouter],
  ['/universities', universitiesRouter],
  ['/university', universityRouter],
  ['/admin', adminRouter],
  ['/feedback', feedbackRouter],
  ['/metaverse', metaverseRouter],
  ['/privacy', privacyRouter],
  ['/ai', aiRouter],
  ['/metaverse/rooms', metaverseRoomsRouter],
  ['/ops', opsRouter],
  ['/developer', developerRouter],
  ['/governance', governanceRouter],
  ['/career', careerRouter],
  ['/consents', consentRouter],
  ['/developer/webhooks', webhookRouter],
  ['/alumni-ai', alumniAiRouter],
  ['/uploads', uploadsRouter],
]
for (const [path, router] of versionedRoutes) app.use(`/api/v1${path}`, router)

if (devMailboxEnabled()) {
  // The inbox contains real tokens, so it is reachable only from loopback.
  const loopbackOnly = (req: Request, res: Response, next: NextFunction) => {
    const address = req.socket.remoteAddress ?? ''
    if (address === '127.0.0.1' || address === '::1' || address === '::ffff:127.0.0.1') {
      next()
      return
    }
    res.status(404).json({ error: 'not_found', message: 'No such endpoint.' })
  }
  app.get('/api/dev/mailbox', loopbackOnly, (req: Request, res: Response) => {
    const limit = Number(Array.isArray(req.query.limit) ? req.query.limit[0] : req.query.limit ?? 20)
    const messages = capturedMail(Number.isFinite(limit) ? limit : 20)
    res.json({ data: { listening: devMailboxListening(), count: messages.length, messages } })
  })
  app.delete('/api/dev/mailbox', loopbackOnly, (_req: Request, res: Response) => {
    res.json({ data: { cleared: clearCapturedMail(), listening: devMailboxListening() } })
  })
}

app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'not_found', message: 'No such endpoint.' })
})

app.use(errorHandler)

const server = app.listen(port, '127.0.0.1', () => {
  console.log(`[api] ready on http://localhost:${port}`)
  console.log(`[api] allowed web origins: ${allowedOrigins.join(', ')}`)
  console.log(`[api] tracing ${telemetryConfigured() ? 'enabled (OTLP/HTTP)' : 'disabled: set OTEL_EXPORTER_OTLP_ENDPOINT to export spans'}`)
  startAlertMonitor()
})

async function shutdown(signal: string) {
  console.log(`[api] ${signal} received, closing`)
  stopAlertMonitor()
  server.close(async () => {
    stopTelemetry()
    await flushTelemetry()
    await prisma.$disconnect()
    process.exit(0)
  })
}

process.on('SIGINT', () => void shutdown('SIGINT'))
process.on('SIGTERM', () => void shutdown('SIGTERM'))
