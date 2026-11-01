import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../db'
import { requireAuth } from '../middleware/auth'
import { AppError, asyncHandler, cleanQuery, pageMeta, pagination } from '../lib/http'
import { sessionUser } from '../lib/audit'
import { dashboardPath, parsePrefs } from '../lib/notify'
import { pushStatus, sendPushToUser } from '../lib/push'

export const notificationsRouter = Router()

const MAX_SUBSCRIPTIONS_PER_USER = 10

const pushSubscriptionSchema = z.object({
  endpoint: z
    .string()
    .trim()
    .max(500)
    .url()
    .refine((value) => value.startsWith('https://'), 'Push endpoints must use HTTPS.'),
  keys: z.object({
    p256dh: z.string().trim().min(20).max(200),
    auth: z.string().trim().min(8).max(100),
  }),
})

notificationsRouter.get(
  '/push/status',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = sessionUser(req)!
    const subscriptions = await prisma.pushSubscription.count({ where: { userId: user.id } })
    res.json({ data: { ...pushStatus(), subscriptions } })
  }),
)

notificationsRouter.post(
  '/push/subscribe',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = sessionUser(req)!
    if (!pushStatus().enabled) {
      throw new AppError(503, 'push_disabled', 'Browser push is not configured on this server.')
    }
    const input = pushSubscriptionSchema.parse(req.body)
    const existing = await prisma.pushSubscription.findUnique({ where: { endpoint: input.endpoint }, select: { id: true, userId: true } })
    if (!existing) {
      const count = await prisma.pushSubscription.count({ where: { userId: user.id } })
      if (count >= MAX_SUBSCRIPTIONS_PER_USER) {
        throw new AppError(409, 'too_many_subscriptions', 'Too many devices are subscribed. Turn off notifications on another device first.')
      }
    }
    const userAgent = req.get('user-agent')?.slice(0, 200) ?? null
    await prisma.pushSubscription.upsert({
      where: { endpoint: input.endpoint },
      create: { userId: user.id, endpoint: input.endpoint, p256dh: input.keys.p256dh, auth: input.keys.auth, userAgent },
      // A shared browser signing in as another user moves the subscription to them.
      update: { userId: user.id, p256dh: input.keys.p256dh, auth: input.keys.auth, userAgent, lastUsedAt: new Date() },
    })
    res.status(201).json({ data: { subscribed: true } })
  }),
)

notificationsRouter.delete(
  '/push/subscribe',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = sessionUser(req)!
    const endpoint = z.string().trim().max(500).parse(req.body?.endpoint)
    const result = await prisma.pushSubscription.deleteMany({ where: { userId: user.id, endpoint } })
    res.json({ removed: result.count })
  }),
)

notificationsRouter.post(
  '/push/test',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = sessionUser(req)!
    if (!pushStatus().enabled) {
      throw new AppError(503, 'push_disabled', 'Browser push is not configured on this server.')
    }
    const result = await sendPushToUser(user.id, {
      title: 'AlumniConnect test notification',
      body: 'Device notifications are working on this browser.',
      link: dashboardPath(user.role),
    })
    res.json({
      data: result,
      message:
        result.attempted === 0
          ? 'No subscribed browsers were found for this account.'
          : `${result.delivered} of ${result.attempted} subscribed browser(s) accepted the test.`,
    })
  }),
)

notificationsRouter.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = sessionUser(req)!
    const page = pagination(req, 20)
    const unreadOnly = cleanQuery(req.query.unread, 6) === 'true'
    const where = { userId: user.id, ...(unreadOnly ? { readAt: null } : {}) }
    const [rows, total, unread] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: page.skip,
        take: page.take,
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { userId: user.id, readAt: null } }),
    ])
    res.json({ data: rows, meta: { ...pageMeta(page, total), unread } })
  }),
)

notificationsRouter.post(
  '/:id/read',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = sessionUser(req)!
    const result = await prisma.notification.updateMany({
      where: { id: req.params.id, userId: user.id, readAt: null },
      data: { readAt: new Date() },
    })
    res.json({ updated: result.count })
  }),
)

notificationsRouter.post(
  '/read-all',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = sessionUser(req)!
    const result = await prisma.notification.updateMany({
      where: { userId: user.id, readAt: null },
      data: { readAt: new Date() },
    })
    res.json({ updated: result.count })
  }),
)

notificationsRouter.get(
  '/preferences',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = sessionUser(req)!
    const row = await prisma.user.findUnique({ where: { id: user.id }, select: { notificationPrefs: true } })
    res.json({ data: parsePrefs(row?.notificationPrefs) })
  }),
)

const prefsSchema = z.object({
  mentorship: z.boolean(),
  challenges: z.boolean(),
  events: z.boolean(),
  marketing: z.boolean(),
  support: z.boolean().optional(),
})

notificationsRouter.put(
  '/preferences',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = sessionUser(req)!
    const prefs = prefsSchema.parse(req.body)
    await prisma.user.update({
      where: { id: user.id },
      data: { notificationPrefs: JSON.stringify(prefs) },
    })
    res.json({ data: prefs })
  }),
)
