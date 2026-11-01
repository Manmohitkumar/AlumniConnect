import { prisma } from '../db'
import { sendPushToUser } from './push'

export type NotificationType =
  | 'MENTORSHIP_REQUEST'
  | 'MENTORSHIP_ACCEPTED'
  | 'MENTORSHIP_DECLINED'
  | 'SESSION_SCHEDULED'
  | 'SESSION_REMINDER'
  | 'CHALLENGE_ANNOUNCEMENT'
  | 'SUBMISSION_DEADLINE'
  | 'EVALUATION_RESULT'
  | 'CERTIFICATE_ISSUED'
  | 'EVENT_REGISTRATION'
  | 'EVENT_REMINDER'
  | 'OPPORTUNITY'
  | 'APPLICATION_UPDATE'
  | 'MODERATION'
  | 'ANNOUNCEMENT'
  | 'SUPPORT_TICKET'
  | 'SUPPORT_UPDATE'
  | 'REMINDER'

type Prefs = { mentorship: boolean; challenges: boolean; events: boolean; marketing: boolean; support: boolean }

const defaults: Prefs = { mentorship: true, challenges: true, events: true, marketing: false, support: true }

const prefGroup: Record<NotificationType, keyof Prefs> = {
  MENTORSHIP_REQUEST: 'mentorship',
  MENTORSHIP_ACCEPTED: 'mentorship',
  MENTORSHIP_DECLINED: 'mentorship',
  SESSION_SCHEDULED: 'mentorship',
  SESSION_REMINDER: 'mentorship',
  CHALLENGE_ANNOUNCEMENT: 'challenges',
  SUBMISSION_DEADLINE: 'challenges',
  EVALUATION_RESULT: 'challenges',
  CERTIFICATE_ISSUED: 'challenges',
  EVENT_REGISTRATION: 'events',
  EVENT_REMINDER: 'events',
  OPPORTUNITY: 'marketing',
  APPLICATION_UPDATE: 'challenges',
  MODERATION: 'challenges',
  ANNOUNCEMENT: 'events',
  SUPPORT_TICKET: 'support',
  SUPPORT_UPDATE: 'support',
  REMINDER: 'events',
}

/** Dashboard URL for a recipient role, so notifications land in the right portal. */
export function dashboardPath(role: string, tab?: string): string {
  const base =
    role === 'ALUMNI'
      ? '/alumni'
      : role === 'UNIVERSITY'
        ? '/university'
        : role === 'ADMIN'
          ? '/admin'
          : role === 'COMPANY'
            ? '/company'
            : '/student'
  return `${base}/dashboard${tab ? `?tab=${tab}` : ''}`
}

export function parsePrefs(raw: string | null | undefined): Prefs {
  if (!raw) return { ...defaults }
  try {
    const parsed = JSON.parse(raw) as Partial<Prefs>
    return {
      mentorship: parsed.mentorship ?? defaults.mentorship,
      challenges: parsed.challenges ?? defaults.challenges,
      events: parsed.events ?? defaults.events,
      marketing: parsed.marketing ?? defaults.marketing,
      support: parsed.support ?? defaults.support,
    }
  } catch {
    return { ...defaults }
  }
}

/**
 * Creates an in-app notification when the recipient has that category enabled.
 * Duplicate suppression: an identical (type, title, body, link) within five
 * minutes is dropped so retries or double-submits cannot spam a user, while
 * distinct events that share a title and link still deliver.
 */
export async function notify(
  userId: string,
  type: NotificationType,
  title: string,
  body: string,
  link?: string,
): Promise<void> {
  try {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { notificationPrefs: true } })
    if (!user) return
    const prefs = parsePrefs(user.notificationPrefs)
    if (!prefs[prefGroup[type]]) return

    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
    const duplicate = await prisma.notification.findFirst({
      where: {
        userId,
        type,
        title,
        body,
        link: link ?? null,
        createdAt: { gte: fiveMinutesAgo },
      },
      select: { id: true },
    })
    if (duplicate) return

    await prisma.notification.create({ data: { userId, type, title, body, link } })
    // Device push is best-effort and must not delay the triggering workflow.
    void sendPushToUser(userId, { title, body, link }).catch(() => null)
  } catch (error) {
    // Notifications must never break the workflow that triggered them.
    console.error('[api] notification failed', error)
  }
}
