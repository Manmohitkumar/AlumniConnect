import { createHash } from 'node:crypto'
import webpush from 'web-push'
import { prisma } from '../db'

const publicKey = process.env.VAPID_PUBLIC_KEY?.trim() ?? ''
const privateKey = process.env.VAPID_PRIVATE_KEY?.trim() ?? ''
const subject = process.env.VAPID_SUBJECT?.trim() || 'mailto:ops@alumniconnect.local'

let configured = false
if (publicKey && privateKey) {
  try {
    webpush.setVapidDetails(subject, publicKey, privateKey)
    configured = true
  } catch (error) {
    console.error('[api] Invalid VAPID keys; browser push disabled.', error instanceof Error ? error.message : error)
  }
}

export function pushStatus() {
  return {
    enabled: configured,
    publicKey: configured ? publicKey : null,
    // Short fingerprint so operators can confirm which key pair is live.
    keyId: configured ? createHash('sha256').update(publicKey).digest('hex').slice(0, 12) : null,
  }
}

export type PushPayload = { title: string; body: string; link?: string | null }

/** Sends one notification to every browser the user has registered. Never throws. */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<{ attempted: number; delivered: number }> {
  if (!configured) return { attempted: 0, delivered: 0 }
  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId },
    select: { id: true, endpoint: true, p256dh: true, auth: true },
  })
  if (subscriptions.length === 0) return { attempted: 0, delivered: 0 }

  const body = JSON.stringify({
    title: payload.title.slice(0, 120),
    body: payload.body.slice(0, 240),
    url: payload.link ?? '/',
    tag: 'alumniconnect',
  })
  const stale: string[] = []
  const delivered: string[] = []
  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          { endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } },
          body,
          { TTL: 60 * 60 },
        )
        delivered.push(subscription.id)
      } catch (error) {
        const statusCode = (error as { statusCode?: number }).statusCode
        if (statusCode === 404 || statusCode === 410) {
          // The browser revoked the subscription; remove it instead of retrying forever.
          stale.push(subscription.id)
        } else {
          console.warn(`[api] push delivery failed (${statusCode ?? 'unknown'})`)
        }
      }
    }),
  )

  if (stale.length > 0) {
    await prisma.pushSubscription.deleteMany({ where: { id: { in: stale } } }).catch(() => null)
  }
  if (delivered.length > 0) {
    await prisma.pushSubscription
      .updateMany({ where: { id: { in: delivered } }, data: { lastUsedAt: new Date() } })
      .catch(() => null)
  }
  return { attempted: subscriptions.length, delivered: delivered.length }
}
