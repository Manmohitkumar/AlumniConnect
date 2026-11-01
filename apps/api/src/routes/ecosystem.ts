import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes } from 'node:crypto'
import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../db'
import { requireAuth, requireRole } from '../middleware/auth'
import { AppError, asyncHandler } from '../lib/http'
import { audit, sessionUser } from '../lib/audit'

const CONSENT_KINDS = ['AI_RECOMMENDATIONS', 'EXTERNAL_AI', 'ALUMNI_AI_CONTEXT', 'PUBLIC_PORTFOLIO', 'RESEARCH_COLLAB', 'PARTNER_SHARING'] as const
type ConsentKind = (typeof CONSENT_KINDS)[number]

const DEFAULT_CONSENT: Record<ConsentKind, boolean> = {
  AI_RECOMMENDATIONS: true,
  EXTERNAL_AI: false,
  ALUMNI_AI_CONTEXT: false,
  PUBLIC_PORTFOLIO: false,
  RESEARCH_COLLAB: false,
  PARTNER_SHARING: false,
}

const secretKey = createHash('sha256')
  .update(process.env.CREDENTIAL_SIGNING_KEY ?? process.env.JWT_SECRET ?? 'alumniconnect-dev-signing-key')
  .digest()

function encryptSecret(value: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', secretKey, iv)
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
  return `${iv.toString('hex')}:${cipher.getAuthTag().toString('hex')}:${encrypted.toString('hex')}`
}

function decryptSecret(value: string): string {
  const [ivHex, tagHex, dataHex] = value.split(':')
  const decipher = createDecipheriv('aes-256-gcm', secretKey, Buffer.from(ivHex, 'hex'))
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'))
  return Buffer.concat([decipher.update(Buffer.from(dataHex, 'hex')), decipher.final()]).toString('utf8')
}

/* ------------------------------------------------------------------ Phase 13
 * Career pathways. Suggestions are derived only from the member's own profile,
 * evaluated challenges and active certificates. No market statistics or
 * external claims are invented.
 */

export const careerRouter = Router()
careerRouter.use(requireAuth)

careerRouter.get(
  '/pathways',
  asyncHandler(async (req, res) => {
    const user = sessionUser(req)!
    const [student, alumni, submissions, certificates] = await Promise.all([
      prisma.studentProfile.findUnique({ where: { userId: user.id } }),
      prisma.alumniProfile.findUnique({ where: { userId: user.id } }),
      prisma.submission.findMany({
        where: { studentId: user.id, status: 'EVALUATED' },
        orderBy: { evaluatedAt: 'desc' },
        take: 25,
        include: { challenge: { select: { title: true, category: true } } },
      }),
      prisma.certificate.findMany({
        where: { userId: user.id, revokedAt: null },
        orderBy: { issuedAt: 'desc' },
        take: 25,
        select: { title: true, kind: true, issuedAt: true },
      }),
    ])

    const skills = String(student?.skills ?? alumni?.expertise ?? '')
      .split(/[,;]/)
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 8)
    const interests = String(student?.careerInterests ?? alumni?.industry ?? alumni?.mentorshipTopics ?? '')
      .split(/[,;]/)
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 5)

    const categories = new Map<string, number>()
    for (const submission of submissions) {
      const category = submission.challenge.category
      categories.set(category, (categories.get(category) ?? 0) + 1)
    }
    const topCategory = [...categories.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]
    const evidence = {
      evaluatedChallenges: submissions.length,
      certificates: certificates.length,
      skills: skills.length,
    }

    const pathways: Array<{ id: string; title: string; rationale: string; steps: string[]; evidence: typeof evidence }> = []

    if (topCategory) {
      pathways.push({
        id: 'depth',
        title: `Deepen your ${topCategory} track`,
        rationale: `You have ${categories.get(topCategory)} evaluated ${topCategory} challenge${categories.get(topCategory) === 1 ? '' : 's'} on record.`,
        steps: [
          `Take an advanced ${topCategory} challenge to widen your evaluated portfolio.`,
          'Publish one case study in your portfolio describing the problem, approach and outcome.',
          'Ask a mentor to review the case study and record an endorsement.',
        ],
        evidence,
      })
    }

    if (skills.length > 0) {
      pathways.push({
        id: 'skills',
        title: `Build evidence for ${skills[0]}`,
        rationale: `"${skills[0]}" is listed in your profile as a focus area but starts as self-declared until it is backed by work.`,
        steps: [
          `Attach a project or submission that demonstrates ${skills[0]}.`,
          'Complete a challenge whose certificate references this skill.',
          'Request mentor feedback so the skill has an external reviewer.',
        ],
        evidence,
      })
    }

    if (interests.length > 0) {
      pathways.push({
        id: 'direction',
        title: `Explore ${interests[0]} next`,
        rationale: `Your stated career interests include ${interests.slice(0, 3).join(', ')}. This pathway uses platform activity only.`,
        steps: [
          'Browse open opportunities and note the skills each role asks for.',
          'Match one missing skill to a current challenge and register.',
          'Review the result with a mentor before applying.',
        ],
        evidence,
      })
    }

    if (pathways.length === 0) {
      pathways.push({
        id: 'start',
        title: 'Start with one evaluated challenge',
        rationale: 'No evaluated challenges, skills or career interests are recorded yet, so suggestions stay deliberately generic.',
        steps: [
          'Complete your profile skills and career interests.',
          'Register for one open challenge in an area you want to explore.',
          'Submit it for human evaluation to build evidence.',
        ],
        evidence,
      })
    }

    res.json({ data: { generatedFrom: 'profile-activity', pathways } })
  }),
)

/* ------------------------------------------------------------------ Phase 15
 * Consent registry. Grants and withdrawals are recorded separately from profile
 * visibility so an audit trail exists for each change.
 */

export const consentRouter = Router()
consentRouter.use(requireAuth)

function publicPortfolioDefault(student: { portfolioVisible: boolean } | null) {
  return student?.portfolioVisible ?? false
}

consentRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const user = sessionUser(req)!
    const [rows, student] = await Promise.all([
      prisma.consent.findMany({ where: { userId: user.id } }),
      prisma.studentProfile.findUnique({ where: { userId: user.id }, select: { portfolioVisible: true } }),
    ])
    const byKind = new Map(rows.map((row) => [row.kind, row]))
    const portfolioDefault = publicPortfolioDefault(student)
    const consents = CONSENT_KINDS.map((kind) => {
      const row = byKind.get(kind)
      const granted = row ? row.granted : kind === 'PUBLIC_PORTFOLIO' ? portfolioDefault : DEFAULT_CONSENT[kind]
      return {
        kind,
        granted,
        grantedAt: row?.grantedAt?.toISOString() ?? null,
        revokedAt: row?.revokedAt?.toISOString() ?? null,
        updatedAt: row?.updatedAt.toISOString() ?? null,
        source: row ? 'recorded' : 'default',
      }
    })
    res.json({ data: consents })
  }),
)

consentRouter.put(
  '/:kind',
  asyncHandler(async (req, res) => {
    const user = sessionUser(req)!
    const kind = req.params.kind as ConsentKind
    if (!CONSENT_KINDS.includes(kind)) throw new AppError(400, 'invalid_consent', 'Unknown consent type.')
    const { granted } = z.object({ granted: z.boolean() }).parse(req.body)
    const now = new Date()
    const row = await prisma.consent.upsert({
      where: { userId_kind: { userId: user.id, kind } },
      update: { granted, grantedAt: granted ? now : undefined, revokedAt: granted ? null : now },
      create: { userId: user.id, kind, granted, grantedAt: granted ? now : null, revokedAt: granted ? null : now },
    })
    if (kind === 'PUBLIC_PORTFOLIO') {
      await prisma.studentProfile.updateMany({ where: { userId: user.id }, data: { portfolioVisible: granted } })
    }
    await audit(req, granted ? 'consent.granted' : 'consent.revoked', 'Consent', row.id, { kind })
    res.json({ data: { kind, granted, grantedAt: row.grantedAt?.toISOString() ?? null, revokedAt: row.revokedAt?.toISOString() ?? null } })
  }),
)

/* ------------------------------------------------------------------ Phase 14
 * Signed outbound webhooks. Deliveries are retried, persisted and never expose
 * the signing secret after creation.
 */

export const webhookRouter = Router()
webhookRouter.use(requireAuth, requireRole('ADMIN'))

const SUPPORTED_EVENTS = ['certificate.issued', 'submission.evaluated', 'governance.data_request.reviewed', 'webhook.test']

const webhookSchema = z.object({
  name: z.string().trim().min(3).max(120),
  url: z.string().url().refine((value) => value.startsWith('https://') || (process.env.NODE_ENV !== 'production' && value.startsWith('http://')), {
    message: 'Webhook URLs must use HTTPS outside development.',
  }),
  events: z.array(z.enum(SUPPORTED_EVENTS as [string, ...string[]])).min(1).optional(),
})

function publicWebhook(row: { secret: string; createdById: string; createdBy?: unknown }) {
  const { secret: _secret, ...rest } = row
  return rest
}

async function deliver(endpointId: string, event: string, payload: unknown) {
  const endpoint = await prisma.webhookEndpoint.findUnique({ where: { id: endpointId } })
  if (!endpoint) throw new AppError(404, 'not_found', 'Webhook not found.')
  const body = JSON.stringify(payload)
  const signature = createHmac('sha256', decryptSecret(endpoint.secret)).update(body).digest('hex')
  const delivery = await prisma.webhookDelivery.create({
    data: { endpointId, event, payload: body, signature: `sha256=${signature}`, status: 'PENDING' },
  })
  let lastError: string | null = null
  let lastCode: number | null = null
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(endpoint.url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-alumniconnect-event': event,
          'x-alumniconnect-signature': `sha256=${signature}`,
        },
        body,
        signal: AbortSignal.timeout(4000),
      })
      lastCode = response.status
      if (response.ok) {
        return prisma.webhookDelivery.update({
          where: { id: delivery.id },
          data: { status: 'DELIVERED', attempts: attempt, responseCode: response.status, deliveredAt: new Date() },
        })
      }
      lastError = `HTTP ${response.status}`
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'Delivery failed'
    }
  }
  return prisma.webhookDelivery.update({
    where: { id: delivery.id },
    data: { status: 'FAILED', attempts: 3, responseCode: lastCode, error: lastError },
  })
}

/** Fire-and-forget dispatch used by other routes. Failures stay in the log. */
export async function dispatchWebhook(event: string, payload: Record<string, unknown>) {
  const endpoints = await prisma.webhookEndpoint.findMany({ where: { status: 'ACTIVE' } })
  const matching = endpoints.filter((endpoint) => {
    const events = endpoint.events.split(',').map((value) => value.trim())
    return events.includes('*') || events.includes(event)
  })
  await Promise.all(matching.map((endpoint) => deliver(endpoint.id, event, { event, sentAt: new Date().toISOString(), data: payload }).catch(() => null)))
}

webhookRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const rows = await prisma.webhookEndpoint.findMany({
      orderBy: { createdAt: 'desc' },
      include: { createdBy: { select: { name: true } }, deliveries: { orderBy: { createdAt: 'desc' }, take: 5 } },
    })
    res.json({ data: rows.map((row) => publicWebhook(row)) })
  }),
)

webhookRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const user = sessionUser(req)!
    const input = webhookSchema.parse(req.body)
    const secret = `whsec_${randomBytes(24).toString('hex')}`
    const endpoint = await prisma.webhookEndpoint.create({
      data: {
        name: input.name,
        url: input.url,
        secret: encryptSecret(secret),
        events: input.events?.join(',') ?? '*',
        createdById: user.id,
      },
    })
    await audit(req, 'developer.webhook_created', 'WebhookEndpoint', endpoint.id, { url: input.url })
    res.status(201).json({ data: { ...publicWebhook(endpoint), secret } })
  }),
)

webhookRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const existing = await prisma.webhookEndpoint.findUnique({ where: { id: req.params.id }, select: { id: true } })
    if (!existing) throw new AppError(404, 'not_found', 'Webhook not found.')
    await prisma.webhookEndpoint.delete({ where: { id: existing.id } })
    await audit(req, 'developer.webhook_deleted', 'WebhookEndpoint', existing.id)
    res.json({ data: { deleted: true } })
  }),
)

webhookRouter.post(
  '/:id/test',
  asyncHandler(async (req, res) => {
    const endpoint = await prisma.webhookEndpoint.findUnique({ where: { id: req.params.id }, select: { id: true, status: true } })
    if (!endpoint) throw new AppError(404, 'not_found', 'Webhook not found.')
    if (endpoint.status !== 'ACTIVE') throw new AppError(409, 'disabled', 'Enable this webhook before testing.')
    const delivery = await deliver(endpoint.id, 'webhook.test', {
      event: 'webhook.test',
      sentAt: new Date().toISOString(),
      data: { message: 'Test delivery from AlumniConnect.' },
    })
    res.status(delivery.status === 'DELIVERED' ? 200 : 502).json({ data: delivery })
  }),
)
