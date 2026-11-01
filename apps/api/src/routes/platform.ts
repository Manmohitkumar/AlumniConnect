import { createHash, randomBytes } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { Router, type Response as ExpressResponse } from 'express'
import { z } from 'zod'
import { prisma } from '../db'
import { requireAuth, requireRole } from '../middleware/auth'
import { AppError, asyncHandler, pagination, pageMeta } from '../lib/http'
import { audit, sessionUser } from '../lib/audit'
import { rateLimit } from '../lib/rate-limit'
import { dashboardPath } from '../lib/notify'
import { aiStatus } from '../lib/ai'
import { alertState, sendTestAlert } from '../lib/monitor'
import { telemetryStatus } from '../lib/telemetry'
import { antivirusConfigured, antivirusRequired } from '../lib/clamav'
import { pushStatus } from '../lib/push'

const admin = [requireAuth, requireRole('ADMIN')] as const

/* ------------------------------------------------------------------ Phase 11
 * Persistent metaverse rooms with lightweight presence. The 3D campus is
 * still the static hub; rooms provide the shared, server-owned state that
 * multiplayer scenes read from.
 */

export const metaverseRoomsRouter = Router()

const roomSchema = z.object({
  name: z.string().trim().min(3).max(80),
  topic: z.string().trim().min(3).max(240),
  language: z.string().trim().max(8).optional(),
  scheduledAt: z.string().datetime().optional(),
  universityId: z.string().max(40).optional(),
})

async function openRooms() {
  const staleCutoff = new Date(Date.now() - 2 * 60_000)
  const rooms = await prisma.metaverseRoom.findMany({
    where: { status: { in: ['OPEN', 'LIVE'] } },
    orderBy: { createdAt: 'desc' },
    take: 40,
    include: {
      host: { select: { id: true, name: true } },
      presence: { where: { lastSeenAt: { gte: staleCutoff } }, select: { userId: true, user: { select: { name: true } } } },
    },
  })
  return rooms.map((room) => ({
    id: room.id,
    name: room.name,
    topic: room.topic,
    language: room.language,
    status: room.status,
    scheduledAt: room.scheduledAt,
    host: room.host,
    presence: { count: room.presence.length, people: room.presence.slice(0, 8).map((row) => row.user.name) },
  }))
}

// Live room list for the static campus. Each open response receives a `rooms`
// event whenever presence changes; the heartbeat comment keeps proxies awake.
const roomStreams = new Set<ExpressResponse>()
let roomBroadcastTimer: NodeJS.Timeout | null = null

function broadcastRooms() {
  if (roomStreams.size === 0 || roomBroadcastTimer) return
  roomBroadcastTimer = setTimeout(() => {
    roomBroadcastTimer = null
    void openRooms()
      .then((data) => {
        const frame = `event: rooms\ndata: ${JSON.stringify({ data })}\n\n`
        for (const stream of roomStreams) {
          try {
            stream.write(frame)
          } catch {
            roomStreams.delete(stream)
          }
        }
      })
      .catch(() => null)
  }, 250)
  roomBroadcastTimer.unref()
}

metaverseRoomsRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    res.json({ data: await openRooms() })
  }),
)

metaverseRoomsRouter.get(
  '/stream',
  asyncHandler(async (req, res) => {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    })
    res.write('retry: 5000\n\n')
    roomStreams.add(res)

    const send = async () => {
      try {
        const data = await openRooms()
        res.write(`event: rooms\ndata: ${JSON.stringify({ data })}\n\n`)
      } catch {
        // A transient database error should not tear down the stream.
      }
    }
    await send()

    const heartbeat = setInterval(() => res.write(': ping\n\n'), 20_000)
    heartbeat.unref()
    req.on('close', () => {
      clearInterval(heartbeat)
      roomStreams.delete(res)
    })
  }),
)

metaverseRoomsRouter.post(
  '/',
  requireAuth,
  requireRole('ALUMNI', 'UNIVERSITY', 'ADMIN'),
  asyncHandler(async (req, res) => {
    const user = sessionUser(req)!
    const input = roomSchema.parse(req.body)
    const room = await prisma.metaverseRoom.create({
      data: {
        name: input.name,
        topic: input.topic,
        language: input.language ?? 'en',
        scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null,
        universityId: input.universityId ?? null,
        hostId: user.id,
        status: 'OPEN',
      },
    })
    await audit(req, 'metaverse.room_created', 'MetaverseRoom', room.id)
    broadcastRooms()
    res.status(201).json({ data: room })
  }),
)

metaverseRoomsRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const staleCutoff = new Date(Date.now() - 2 * 60_000)
    const room = await prisma.metaverseRoom.findUnique({
      where: { id: req.params.id },
      include: {
        host: { select: { id: true, name: true } },
        presence: { where: { lastSeenAt: { gte: staleCutoff } }, include: { user: { select: { id: true, name: true, role: true } } } },
      },
    })
    if (!room) throw new AppError(404, 'not_found', 'Room not found.')
    res.json({ data: room })
  }),
)

metaverseRoomsRouter.post(
  '/:id/join',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = sessionUser(req)!
    const room = await prisma.metaverseRoom.findUnique({ where: { id: req.params.id }, select: { id: true, status: true, hostId: true } })
    if (!room) throw new AppError(404, 'not_found', 'Room not found.')
    if (room.status === 'CLOSED') throw new AppError(409, 'room_closed', 'This room has closed.')
    await prisma.roomPresence.upsert({
      where: { roomId_userId: { roomId: room.id, userId: user.id } },
      update: { lastSeenAt: new Date() },
      create: { roomId: room.id, userId: user.id },
    })
    if (room.hostId === user.id && room.status === 'OPEN') {
      await prisma.metaverseRoom.update({ where: { id: room.id }, data: { status: 'LIVE' } })
    }
    broadcastRooms()
    res.json({ data: { joined: true, roomId: room.id } })
  }),
)

metaverseRoomsRouter.post(
  '/:id/heartbeat',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = sessionUser(req)!
    const room = await prisma.metaverseRoom.findUnique({ where: { id: req.params.id }, select: { id: true, status: true } })
    if (!room) throw new AppError(404, 'not_found', 'Room not found.')
    if (room.status === 'CLOSED') throw new AppError(409, 'room_closed', 'This room has closed.')
    await prisma.roomPresence.upsert({
      where: { roomId_userId: { roomId: room.id, userId: user.id } },
      update: { lastSeenAt: new Date() },
      create: { roomId: room.id, userId: user.id },
    })
    res.json({ data: { refreshed: true } })
  }),
)

metaverseRoomsRouter.post(
  '/:id/leave',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = sessionUser(req)!
    await prisma.roomPresence.deleteMany({ where: { roomId: req.params.id, userId: user.id } })
    broadcastRooms()
    res.json({ data: { left: true } })
  }),
)

metaverseRoomsRouter.patch(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = sessionUser(req)!
    const input = z.object({ status: z.enum(['OPEN', 'LIVE', 'CLOSED']) }).parse(req.body)
    const room = await prisma.metaverseRoom.findUnique({ where: { id: req.params.id }, select: { hostId: true } })
    if (!room) throw new AppError(404, 'not_found', 'Room not found.')
    if (room.hostId !== user.id && user.role !== 'ADMIN') throw new AppError(403, 'forbidden', 'Only the host can change room status.')
    const updated = await prisma.metaverseRoom.update({ where: { id: req.params.id }, data: { status: input.status } })
    await audit(req, 'metaverse.room_status', 'MetaverseRoom', updated.id, { status: input.status })
    broadcastRooms()
    res.json({ data: updated })
  }),
)

/* ------------------------------------------------------------------ Phase 12
 * Reliability console. Read-only operational status built from live checks.
 */

export const opsRouter = Router()
opsRouter.use(...admin)

function latestBackupAgeHours(): number | null {
  const candidates = [path.resolve(process.cwd(), 'backups'), path.resolve(process.cwd(), '..', '..', 'backups')]
  for (const dir of candidates) {
    try {
      const manifests = fs
        .readdirSync(dir)
        .filter((name) => name.endsWith('.json'))
        .map((name) => fs.statSync(path.join(dir, name)).mtimeMs)
      if (manifests.length > 0) return Math.round(((Date.now() - Math.max(...manifests)) / 3_600_000) * 10) / 10
    } catch {
      // Directory absent; try the next location.
    }
  }
  return null
}

opsRouter.get(
  '/status',
  asyncHandler(async (_req, res) => {
    const started = Date.now()
    let databaseOk = true
    try {
      await prisma.$queryRaw`SELECT 1`
    } catch {
      databaseOk = false
    }
    const dbLatencyMs = Date.now() - started
    const weekAgo = new Date(Date.now() - 7 * 86_400_000)
    const [openFeedback, pendingRequests, recentAudit, activeUsers, notifications7, sessionsPlanned] = await Promise.all([
      prisma.feedback.count({ where: { status: { in: ['OPEN', 'IN_REVIEW'] } } }),
      prisma.dataRequest.count({ where: { status: { in: ['OPEN', 'IN_REVIEW'] } } }),
      prisma.auditLog.count({ where: { createdAt: { gte: weekAgo } } }),
      prisma.user.count({ where: { lastActiveAt: { gte: weekAgo } } }),
      prisma.notification.count({ where: { createdAt: { gte: weekAgo } } }),
      prisma.mentorshipSession.count({ where: { scheduledAt: { gte: new Date() }, status: 'SCHEDULED' } }),
    ])
    const memory = process.memoryUsage()
    const backupAgeHours = latestBackupAgeHours()
    const warnings: string[] = []
    if (!databaseOk) warnings.push('Database check failed.')
    if (dbLatencyMs > 400) warnings.push(`Database latency is elevated (${dbLatencyMs} ms).`)
    if (backupAgeHours === null) warnings.push('No backup manifest found on this machine.')
    else if (backupAgeHours > 26) warnings.push(`Last backup is ${backupAgeHours}h old.`)
    if (openFeedback > 25) warnings.push(`${openFeedback} support reports are open.`)
    const telemetry = telemetryStatus()
    const antivirus = { configured: antivirusConfigured(), required: antivirusRequired() }
    const push = pushStatus()
    if (telemetry.lastError) warnings.push(`Trace export is failing: ${telemetry.lastError}`)
    if (antivirus.required && !antivirus.configured) warnings.push('UPLOAD_SCAN_REQUIRED is on but CLAMAV_HOST is not configured; uploads are being rejected.')
    if (push.enabled) {
      const subs = await prisma.pushSubscription.count()
      if (subs === 0) warnings.push('Browser push is configured but no devices are subscribed.')
    }

    res.json({
      data: {
        service: { status: warnings.length === 0 ? 'healthy' : 'attention', uptimeSeconds: Math.round(process.uptime()), nodeEnv: process.env.NODE_ENV ?? 'development' },
        database: { ok: databaseOk, latencyMs: dbLatencyMs },
        runtime: { memoryUsedMb: Math.round(memory.rss / 1_048_576), heapUsedMb: Math.round(memory.heapUsed / 1_048_576) },
        ai: aiStatus(),
        backup: { latestManifestAgeHours: backupAgeHours },
        queues: { openFeedback, pendingDataRequests: pendingRequests, upcomingSessions: sessionsPlanned },
        activity: { activeUsers7d: activeUsers, notifications7d: notifications7, auditEvents7d: recentAudit },
        integrations: {
          telemetry: { configured: telemetry.configured, serviceName: telemetry.serviceName, exported: telemetry.exported, queued: telemetry.queued, lastError: telemetry.lastError },
          antivirus,
          push: { enabled: push.enabled, keyId: push.keyId },
        },
        warnings,
        generatedAt: new Date().toISOString(),
      },
      meta: { note: 'Live checks from this API process. Backup freshness reads the local manifest directory only.' },
    })
  }),
)

opsRouter.get('/alerts', asyncHandler(async (_req, res) => {
  res.json({ data: alertState() })
}))

opsRouter.post(
  '/alerts/test',
  asyncHandler(async (req, res) => {
    const event = await sendTestAlert()
    await audit(req, 'ops.alert_test', 'Monitor', null, { delivered: event.delivered })
    res.status(event.delivered ? 200 : 502).json({
      data: event,
      message: event.delivered
        ? 'Test alert delivered to the configured webhook.'
        : 'No webhook is configured or delivery failed. Set ALERT_WEBHOOK_URL to receive alerts.',
    })
  }),
)

/* ------------------------------------------------------------------ Phase 14
 * Developer API keys. Raw keys are returned exactly once; only a SHA-256 hash
 * is stored. Public read endpoints accept x-api-key or Authorization: Bearer.
 */

function hashKey(raw: string) {
  return createHash('sha256').update(raw).digest('hex')
}

export const developerRouter = Router()
developerRouter.use(...admin)

developerRouter.get(
  '/keys',
  asyncHandler(async (_req, res) => {
    const keys = await prisma.apiKey.findMany({
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, keyPrefix: true, scopes: true, lastUsedAt: true, revokedAt: true, createdAt: true, createdBy: { select: { name: true } } },
    })
    res.json({ data: keys })
  }),
)

developerRouter.post(
  '/keys',
  asyncHandler(async (req, res) => {
    const user = sessionUser(req)!
    const input = z.object({ name: z.string().trim().min(3).max(80), scopes: z.array(z.enum(['read'])).optional() }).parse(req.body)
    const raw = `ac_live_${randomBytes(24).toString('base64url')}`
    const key = await prisma.apiKey.create({
      data: {
        name: input.name,
        keyPrefix: raw.slice(0, 14),
        keyHash: hashKey(raw),
        scopes: (input.scopes ?? ['read']).join(','),
        createdById: user.id,
      },
      select: { id: true, name: true, keyPrefix: true, scopes: true, createdAt: true },
    })
    await audit(req, 'developer.api_key_created', 'ApiKey', key.id, { name: key.name })
    res.status(201).json({ data: { ...key, key: raw }, meta: { note: 'Copy this key now. It is not stored in recoverable form.' } })
  }),
)

developerRouter.delete(
  '/keys/:id',
  asyncHandler(async (req, res) => {
    const key = await prisma.apiKey.findUnique({ where: { id: req.params.id }, select: { id: true, revokedAt: true } })
    if (!key) throw new AppError(404, 'not_found', 'API key not found.')
    if (!key.revokedAt) await prisma.apiKey.update({ where: { id: key.id }, data: { revokedAt: new Date() } })
    await audit(req, 'developer.api_key_revoked', 'ApiKey', key.id)
    res.json({ data: { revoked: true } })
  }),
)

export const publicApiRouter = Router()
const publicLimit = rateLimit({ windowMs: 60_000, max: 120, key: 'public-api' })

const apiKeyAuth = asyncHandler(async (req, _res, next) => {
  const bearer = req.header('authorization')?.startsWith('Bearer ') ? req.header('authorization')!.slice(7) : null
  const raw = req.header('x-api-key') ?? bearer
  if (!raw) throw new AppError(401, 'api_key_required', 'Send an API key in x-api-key or as a Bearer token.')
  const key = await prisma.apiKey.findUnique({ where: { keyHash: hashKey(raw) } })
  if (!key || key.revokedAt) throw new AppError(401, 'invalid_api_key', 'This API key is not valid or has been revoked.')
  if (!key.scopes.split(',').includes('read')) throw new AppError(403, 'insufficient_scope', 'This key cannot read public resources.')
  await prisma.apiKey.update({ where: { id: key.id }, data: { lastUsedAt: new Date() } })
  next()
})

publicApiRouter.use(publicLimit, apiKeyAuth)

publicApiRouter.get(
  '/challenges',
  asyncHandler(async (_req, res) => {
    const rows = await prisma.challenge.findMany({
      where: { status: 'OPEN' },
      orderBy: { publishedAt: 'desc' },
      take: 50,
      select: { id: true, slug: true, title: true, summary: true, category: true, deadline: true, durationDays: true, skills: { select: { skill: { select: { name: true } } } } },
    })
    res.json({
      data: rows.map((row) => ({ ...row, skills: row.skills.map((item) => item.skill.name) })),
      meta: { total: rows.length, scope: 'open challenges only' },
    })
  }),
)

publicApiRouter.get(
  '/universities',
  asyncHandler(async (_req, res) => {
    const rows = await prisma.university.findMany({
      where: { verified: true },
      orderBy: { name: 'asc' },
      take: 200,
      select: { id: true, name: true, shortName: true, country: true, region: true, website: true, defaultLocale: true, timeZone: true },
    })
    res.json({ data: rows, meta: { total: rows.length, scope: 'verified institutions only' } })
  }),
)

publicApiRouter.get(
  '/events',
  asyncHandler(async (_req, res) => {
    const rows = await prisma.event.findMany({
      where: { status: 'PUBLISHED', startsAt: { gte: new Date() } },
      orderBy: { startsAt: 'asc' },
      take: 50,
      select: { id: true, title: true, description: true, category: true, startsAt: true, endsAt: true, timeZone: true, language: true, location: true, mode: true },
    })
    res.json({ data: rows, meta: { total: rows.length, scope: 'published future events' } })
  }),
)

/* ------------------------------------------------------------------ Phase 15
 * Governance queue for data rights plus a read-only policy/audit summary.
 */

export const governanceRouter = Router()

governanceRouter.post(
  '/privacy/requests',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = sessionUser(req)!
    const input = z
      .object({ type: z.enum(['EXPORT', 'CORRECTION', 'DELETION']), note: z.string().trim().max(500).optional() })
      .parse(req.body)
    const open = await prisma.dataRequest.count({ where: { userId: user.id, status: { in: ['OPEN', 'IN_REVIEW'] } } })
    if (open >= 3) throw new AppError(429, 'too_many_requests', 'You already have open data requests. Wait for them to be reviewed.')
    const request = await prisma.dataRequest.create({ data: { userId: user.id, type: input.type, note: input.note ?? null } })
    await audit(req, 'privacy.request_created', 'DataRequest', request.id, { type: input.type })
    res.status(201).json({ data: request })
  }),
)

governanceRouter.get(
  '/privacy/requests/mine',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = sessionUser(req)!
    const rows = await prisma.dataRequest.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' }, take: 20 })
    res.json({ data: rows })
  }),
)

governanceRouter.get(
  '/admin/data-requests',
  ...admin,
  asyncHandler(async (req, res) => {
    const page = pagination(req, 25)
    const status = typeof req.query.status === 'string' ? req.query.status : undefined
    const where = status ? { status } : {}
    const [rows, total] = await Promise.all([
      prisma.dataRequest.findMany({
        where,
        orderBy: { createdAt: 'asc' },
        skip: page.skip,
        take: page.take,
        include: { user: { select: { id: true, name: true, email: true, role: true } } },
      }),
      prisma.dataRequest.count({ where }),
    ])
    res.json({ data: rows, meta: pageMeta(page, total) })
  }),
)

governanceRouter.patch(
  '/admin/data-requests/:id',
  ...admin,
  asyncHandler(async (req, res) => {
    const input = z
      .object({ status: z.enum(['OPEN', 'IN_REVIEW', 'COMPLETED', 'REJECTED']), response: z.string().trim().max(1000).optional() })
      .parse(req.body)
    const existing = await prisma.dataRequest.findUnique({
      where: { id: req.params.id },
      include: { user: { select: { role: true } } },
    })
    if (!existing) throw new AppError(404, 'not_found', 'Data request not found.')
    const updated = await prisma.dataRequest.update({ where: { id: existing.id }, data: { status: input.status, response: input.response ?? null } })
    await audit(req, 'privacy.request_reviewed', 'DataRequest', updated.id, { status: input.status })
    await prisma.notification.create({
      data: {
        userId: existing.userId,
        type: 'SUPPORT_UPDATE',
        title: `Your ${existing.type.toLowerCase()} request is ${input.status.toLowerCase().replace('_', ' ')}`,
        body: input.response ?? 'A platform administrator reviewed your request.',
        link: dashboardPath(existing.user.role, 'profile'),
      },
    })
    res.json({ data: updated })
  }),
)

governanceRouter.get(
  '/admin/summary',
  ...admin,
  asyncHandler(async (_req, res) => {
    const [byStatus, byType, openFeedback, suspendedUsers, lastAudit] = await Promise.all([
      prisma.dataRequest.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.dataRequest.groupBy({ by: ['type'], _count: { _all: true } }),
      prisma.feedback.count({ where: { status: { in: ['OPEN', 'IN_REVIEW'] } } }),
      prisma.user.count({ where: { status: 'SUSPENDED' } }),
      prisma.auditLog.findFirst({ orderBy: { createdAt: 'desc' }, select: { action: true, createdAt: true } }),
    ])
    res.json({
      data: {
        dataRequests: {
          byStatus: Object.fromEntries(byStatus.map((row) => [row.status, row._count._all])),
          byType: Object.fromEntries(byType.map((row) => [row.type, row._count._all])),
        },
        safeguards: {
          openSupportReports: openFeedback,
          suspendedAccounts: suspendedUsers,
          lastAuditEvent: lastAudit,
        },
        policies: [
          { key: 'data_rights', title: 'Data rights requests', detail: 'Export and deletion run immediately for the account owner. Correction and deletion review requests are queued for an administrator.' },
          { key: 'ai_oversight', title: 'AI human oversight', detail: 'AI evaluation drafts are invisible to students until a human approver records the evaluation.' },
          { key: 'tenant_isolation', title: 'Institution isolation', detail: 'Institution data is scoped server-side by universityId; public API keys only expose open challenges, verified institutions and published events.' },
          { key: 'audit', title: 'Audit trail', detail: 'Security-relevant actions are written to the audit log with actor, IP and metadata.' },
        ],
        generatedAt: new Date().toISOString(),
      },
      meta: { note: 'Policy text summarises implemented behaviour. It is not a legal compliance certification.' },
    })
  }),
)
