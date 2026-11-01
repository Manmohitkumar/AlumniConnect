import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../db'
import { requireAuth, requireRole } from '../middleware/auth'
import { AppError, asyncHandler } from '../lib/http'
import { audit, sessionUser } from '../lib/audit'
import { notify } from '../lib/notify'

export const alumniAiRouter = Router()
alumniAiRouter.use(requireAuth)

const KNOWLEDGE_TYPES = ['PROFILE', 'EXPERIENCE', 'RESOURCE', 'APPROVED_ANSWER', 'FAQ', 'PROJECT', 'CERTIFICATION', 'ACHIEVEMENT'] as const

const disclosureFor = (name: string) =>
  `This is the AI assistant of ${name}. It shares guidance based on information and experiences the alumnus has approved. You are not currently chatting with the alumnus personally.`

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'you', 'your', 'can', 'how', 'what', 'should', 'with', 'about', 'from', 'that',
  'this', 'have', 'are', 'was', 'were', 'will', 'would', 'could', 'please', 'help', 'need', 'want',
  'tell', 'give', 'some', 'more', 'into', 'when', 'where', 'which', 'there', 'their', 'them', 'they',
])

const tokens = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word))

const GENERAL_GUIDANCE: Array<{ match: string[]; steps: string[] }> = [
  {
    match: ['skill', 'skills', 'learn', 'roadmap', 'career', 'engineer'],
    steps: [
      'Strengthen fundamentals in your chosen area before adding tools.',
      'Build two small projects that show the decisions behind the result, not only the output.',
      'Ask for feedback on one project from a mentor before you apply for roles.',
    ],
  },
  {
    match: ['resume', 'cv', 'portfolio', 'apply'],
    steps: [
      'Lead each project with the problem, your contribution and the outcome.',
      'Keep claims verifiable and link to the work where possible.',
      'Tailor one page per role and remove anything you cannot explain in an interview.',
    ],
  },
  {
    match: ['interview', 'prepare', 'preparation'],
    steps: [
      'Rehearse the projects you list, including trade-offs and what you would change.',
      'Practise a small number of end-to-end problems instead of skimming many.',
      'Prepare two questions about the team and how success is measured.',
    ],
  },
  {
    match: ['internship', 'job', 'first'],
    steps: [
      'Apply to a focused set of roles where your evidence matches the requirements.',
      'Track applications and follow up professionally once.',
      'Use mentor feedback to improve the next application rather than rewriting everything.',
    ],
  },
]

const REFERRAL = [
  'refer me', 'referral', 'recommend me', 'recommendation letter', 'write me a recommendation', 'write a recommendation',
  'get me a job', 'get me hired', 'give me a job', 'hire me', 'guarantee me', 'promise me a job', 'promise me an internship',
  'will you hire', 'interview at your', 'job at your', 'internship at your', 'admission into', 'admit me', 'get me admitted',
]
const CONTACT = ['phone', 'whatsapp', 'personal email', 'contact number', 'mobile number', 'email address', 'linkedin']
const SCHEDULING = ['schedule', 'book a', 'meeting', 'calendar', 'call with']
const REGULATED = ['medical', 'diagnosis', 'legal advice', 'lawsuit', 'investment advice', 'financial advice', 'tax advice']
const CREDENTIALS = ['issue a certificate', 'issue certificate', 'verify my certificate', 'give me a certificate']
const INJECTION = ['ignore previous', 'ignore all previous', 'system prompt', 'developer message', 'pretend you are', 'act as the alumnus', 'jailbreak', 'reveal your instructions']

const OUTSIDE_EXPERTISE_REPLY =
  "This topic is outside the verified knowledge and experience available from this alumnus. I don't want to provide an answer on their behalf that they may not have the expertise to support. You can explore another relevant mentor on AlumniConnect."

const INSUFFICIENT_REPLY =
  "I don't have enough approved information about this alumnus to answer confidently. I can provide general information, but it should not be interpreted as the alumnus's personal experience or opinion."

// Words that describe the task of career preparation rather than a subject
// area. They do not need to appear in the alumnus's knowledge for a question
// to be treated as relevant.
const CAREER_WORDS = new Set([
  'skill', 'skills', 'learn', 'learning', 'career', 'job', 'jobs', 'prepare', 'preparation', 'prepare',
  'interview', 'interviews', 'resume', 'cv', 'portfolio', 'internship', 'internships', 'project', 'projects',
  'roadmap', 'guidance', 'advice', 'mistake', 'mistakes', 'apply', 'application', 'applications', 'work',
  'role', 'roles', 'company', 'companies', 'study', 'student', 'students', 'experience', 'professional',
])

const includesAny = (value: string, needles: string[]) => needles.some((needle) => value.includes(needle))

function refusalFor(message: string, name: string): string | null {
  if (includesAny(message, REFERRAL)) {
    return `I cannot promise a referral, interview or employment, and I do not represent ${name} in recruitment decisions. I can help you prepare your resume and plan how to request a referral through AlumniConnect.`
  }
  if (includesAny(message, CREDENTIALS)) {
    return 'I cannot issue, verify or change certificates. Only authorised issuers can do that through AlumniConnect.'
  }
  if (includesAny(message, CONTACT)) {
    return `I cannot share private contact details for ${name}. You can request a mentorship conversation through AlumniConnect.`
  }
  if (includesAny(message, SCHEDULING)) {
    return `I cannot schedule meetings or promise ${name}'s availability. You can request a human mentorship session and ${name} will decide whether to accept.`
  }
  if (includesAny(message, REGULATED)) {
    return 'I cannot provide definitive medical, legal or financial advice. Please consult a qualified professional for those decisions.'
  }
  return null
}

function sourcesFor(settings: {
  useProfile: boolean
  useExperience: boolean
  useResources: boolean
  useApprovedAnswers: boolean
}) {
  const types: string[] = []
  if (settings.useProfile) types.push('PROFILE')
  if (settings.useExperience) types.push('EXPERIENCE')
  if (settings.useResources) types.push('RESOURCE', 'FAQ', 'PROJECT', 'CERTIFICATION')
  if (settings.useApprovedAnswers) types.push('APPROVED_ANSWER', 'ACHIEVEMENT')
  return types
}

/* ------------------------------------------------------------------ Alumni
 * Control panel: enable/pause, permission level, knowledge sources, aggregate
 * analytics. Students' conversation content is never exposed here.
 */

alumniAiRouter.get(
  '/settings',
  requireRole('ALUMNI'),
  asyncHandler(async (req, res) => {
    const user = sessionUser(req)!
    const settings = await prisma.alumniAiSettings.upsert({
      where: { alumniId: user.id },
      update: {},
      create: { alumniId: user.id },
    })
    const profile = await prisma.alumniProfile.findUnique({ where: { userId: user.id }, select: { verificationStatus: true } })
    res.json({
      data: {
        ...settings,
        usePrivateMessages: false,
        alumnusVerified: profile?.verificationStatus === 'VERIFIED',
        availableLevels: [1, 2],
      },
    })
  }),
)

const settingsSchema = z.object({
  enabled: z.boolean().optional(),
  paused: z.boolean().optional(),
  permissionLevel: z.number().int().min(1).max(2).optional(),
  useProfile: z.boolean().optional(),
  useExperience: z.boolean().optional(),
  useResources: z.boolean().optional(),
  useApprovedAnswers: z.boolean().optional(),
})

alumniAiRouter.put(
  '/settings',
  requireRole('ALUMNI'),
  asyncHandler(async (req, res) => {
    const user = sessionUser(req)!
    const input = settingsSchema.parse(req.body)
    const profile = await prisma.alumniProfile.findUnique({ where: { userId: user.id }, select: { verificationStatus: true } })
    if (input.enabled === true && profile?.verificationStatus !== 'VERIFIED') {
      throw new AppError(409, 'alumni_not_verified', 'Your institution must verify your alumni profile before enabling the AI representative.')
    }
    const now = new Date()
    const settings = await prisma.alumniAiSettings.upsert({
      where: { alumniId: user.id },
      update: {
        ...input,
        usePrivateMessages: false,
        pausedAt: input.paused === true ? now : input.paused === false ? null : undefined,
        disabledAt: input.enabled === false ? now : input.enabled === true ? null : undefined,
      },
      create: {
        alumniId: user.id,
        ...input,
        usePrivateMessages: false,
        pausedAt: input.paused ? now : null,
        disabledAt: input.enabled === false ? now : null,
      },
    })
    await audit(req, 'alumni_ai.settings_updated', 'AlumniAiSettings', settings.id, {
      enabled: settings.enabled,
      paused: settings.paused,
      permissionLevel: settings.permissionLevel,
    })
    res.json({ data: { ...settings, usePrivateMessages: false } })
  }),
)

alumniAiRouter.get(
  '/knowledge',
  requireRole('ALUMNI'),
  asyncHandler(async (req, res) => {
    const user = sessionUser(req)!
    const rows = await prisma.alumniAiKnowledge.findMany({ where: { alumniId: user.id }, orderBy: { createdAt: 'desc' } })
    res.json({ data: rows })
  }),
)

const knowledgeSchema = z.object({
  type: z.enum(KNOWLEDGE_TYPES),
  title: z.string().trim().min(3).max(160),
  content: z.string().trim().min(10).max(4000),
})

alumniAiRouter.post(
  '/knowledge',
  requireRole('ALUMNI'),
  asyncHandler(async (req, res) => {
    const user = sessionUser(req)!
    const input = knowledgeSchema.parse(req.body)
    const row = await prisma.alumniAiKnowledge.create({ data: { alumniId: user.id, ...input } })
    await audit(req, 'alumni_ai.knowledge_created', 'AlumniAiKnowledge', row.id, { type: row.type })
    res.status(201).json({ data: row })
  }),
)

alumniAiRouter.patch(
  '/knowledge/:id',
  requireRole('ALUMNI'),
  asyncHandler(async (req, res) => {
    const user = sessionUser(req)!
    const input = knowledgeSchema.partial().extend({ approved: z.boolean().optional(), revoked: z.boolean().optional() }).parse(req.body)
    const existing = await prisma.alumniAiKnowledge.findUnique({ where: { id: req.params.id } })
    if (!existing) throw new AppError(404, 'not_found', 'Knowledge source not found.')
    if (existing.alumniId !== user.id) throw new AppError(403, 'forbidden', 'This source belongs to another alumnus.')
    const now = new Date()
    const row = await prisma.alumniAiKnowledge.update({
      where: { id: existing.id },
      data: {
        type: input.type,
        title: input.title,
        content: input.content,
        approved: input.approved === true ? true : input.revoked === true ? false : input.approved,
        approvedAt: input.approved === true ? now : undefined,
        revokedAt: input.revoked === true ? now : input.revoked === false ? null : undefined,
      },
    })
    await audit(req, input.revoked ? 'alumni_ai.knowledge_revoked' : 'alumni_ai.knowledge_updated', 'AlumniAiKnowledge', row.id)
    res.json({ data: row })
  }),
)

alumniAiRouter.delete(
  '/knowledge/:id',
  requireRole('ALUMNI'),
  asyncHandler(async (req, res) => {
    const user = sessionUser(req)!
    const existing = await prisma.alumniAiKnowledge.findUnique({ where: { id: req.params.id } })
    if (!existing) throw new AppError(404, 'not_found', 'Knowledge source not found.')
    if (existing.alumniId !== user.id) throw new AppError(403, 'forbidden', 'This source belongs to another alumnus.')
    await prisma.alumniAiKnowledge.delete({ where: { id: existing.id } })
    await audit(req, 'alumni_ai.knowledge_deleted', 'AlumniAiKnowledge', existing.id)
    res.json({ data: { deleted: true } })
  }),
)

alumniAiRouter.get(
  '/conversations',
  requireRole('ALUMNI'),
  asyncHandler(async (req, res) => {
    const user = sessionUser(req)!
    const [total, recent, flagged] = await Promise.all([
      prisma.alumniAiConversation.count({ where: { alumniId: user.id } }),
      prisma.alumniAiMessage.count({ where: { conversation: { alumniId: user.id }, createdAt: { gte: new Date(Date.now() - 7 * 86_400_000) } } }),
      prisma.alumniAiMessage.count({ where: { conversation: { alumniId: user.id }, flagged: true } }),
    ])
    res.json({ data: { totalConversations: total, messagesLast7d: recent, flaggedMessages: flagged } })
  }),
)

/* ------------------------------------------------------------------ Admin
 * Moderation queue and inventory. Administrators see flagged assistant
 * messages only; the student's email address is never included.
 */

alumniAiRouter.get(
  '/admin/overview',
  requireRole('ADMIN'),
  asyncHandler(async (_req, res) => {
    const weekAgo = new Date(Date.now() - 7 * 86_400_000)
    const [enabled, paused, approvedSources, conversations, messages7d, flaggedOpen, levels] = await Promise.all([
      prisma.alumniAiSettings.count({ where: { enabled: true, disabledAt: null } }),
      prisma.alumniAiSettings.count({ where: { enabled: true, paused: true } }),
      prisma.alumniAiKnowledge.count({ where: { approved: true, revokedAt: null } }),
      prisma.alumniAiConversation.count(),
      prisma.alumniAiMessage.count({ where: { createdAt: { gte: weekAgo } } }),
      prisma.alumniAiMessage.count({ where: { role: 'ASSISTANT', flagged: true, OR: [{ moderationStatus: 'OPEN' }, { moderationStatus: null }] } }),
      prisma.alumniAiSettings.groupBy({ by: ['permissionLevel'], where: { enabled: true, disabledAt: null }, _count: { _all: true } }),
    ])
    res.json({
      data: {
        enabledAssistants: enabled,
        pausedAssistants: paused,
        approvedSources,
        conversations,
        messagesLast7d: messages7d,
        flaggedOpen,
        levels: levels.map((row) => ({ level: row.permissionLevel, count: row._count._all })),
      },
    })
  }),
)

alumniAiRouter.get(
  '/admin/flagged',
  requireRole('ADMIN'),
  asyncHandler(async (_req, res) => {
    const rows = await prisma.alumniAiMessage.findMany({
      where: { role: 'ASSISTANT', flagged: true, OR: [{ moderationStatus: 'OPEN' }, { moderationStatus: null }] },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        conversation: {
          select: {
            id: true,
            alumni: { select: { id: true, name: true } },
            student: { select: { id: true, name: true, role: true } },
          },
        },
      },
    })
    res.json({
      data: rows.map(({ conversation, ...row }) => ({
        ...row,
        alumni: conversation.alumni,
        student: conversation.student,
        conversationId: conversation.id,
      })),
    })
  }),
)

alumniAiRouter.patch(
  '/admin/flagged/:id',
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const user = sessionUser(req)!
    const { action, note } = z.object({ action: z.enum(['RESOLVE', 'DISMISS']), note: z.string().trim().max(500).optional() }).parse(req.body)
    const message = await prisma.alumniAiMessage.findUnique({ where: { id: req.params.id } })
    if (!message) throw new AppError(404, 'not_found', 'Message not found.')
    const updated = await prisma.alumniAiMessage.update({
      where: { id: message.id },
      data: {
        flagged: false,
        moderationStatus: action === 'RESOLVE' ? 'RESOLVED' : 'DISMISSED',
        moderationNote: note ?? null,
        reviewedAt: new Date(),
        reviewedById: user.id,
      },
    })
    await audit(req, action === 'RESOLVE' ? 'alumni_ai.flag_resolved' : 'alumni_ai.flag_dismissed', 'AlumniAiMessage', message.id, { note })
    res.json({ data: updated })
  }),
)

/* ------------------------------------------------------------------ Student
 * Chat experience. Every response includes the disclosure, uses only approved
 * sources for that alumnus, and never claims an action was accepted.
 */

alumniAiRouter.get(
  '/assistants',
  requireRole('STUDENT'),
  asyncHandler(async (_req, res) => {
    const rows = await prisma.alumniAiSettings.findMany({
      where: { enabled: true, paused: false, disabledAt: null },
      include: {
        alumni: {
          select: {
            id: true,
            name: true,
            headline: true,
            avatarUrl: true,
            location: true,
            alumniProfile: {
              select: {
                company: true,
                designation: true,
                expertise: true,
                mentorshipTopics: true,
                yearsExperience: true,
                verificationStatus: true,
              },
            },
          },
        },
      },
    })
    const assistants = rows
      .filter((row) => row.alumni.alumniProfile?.verificationStatus === 'VERIFIED')
      .map((row) => ({
        alumniId: row.alumni.id,
        name: row.alumni.name,
        headline: row.alumni.headline,
        avatarUrl: row.alumni.avatarUrl,
        location: row.alumni.location,
        company: row.alumni.alumniProfile?.company ?? null,
        designation: row.alumni.alumniProfile?.designation ?? null,
        topics: row.alumni.alumniProfile?.mentorshipTopics ?? row.alumni.alumniProfile?.expertise ?? '',
        yearsExperience: row.alumni.alumniProfile?.yearsExperience ?? null,
        permissionLevel: row.permissionLevel,
        disclosure: disclosureFor(row.alumni.name),
      }))
    res.json({ data: assistants })
  }),
)

async function assistantContext(alumniId: string) {
  const user = await prisma.user.findUnique({
    where: { id: alumniId },
    select: {
      id: true,
      name: true,
      headline: true,
      alumniProfile: { select: { verificationStatus: true, expertise: true, mentorshipTopics: true, designation: true, company: true } },
      aiSettings: true,
    },
  })
  if (!user || !user.alumniProfile) throw new AppError(404, 'not_found', 'Alumnus not found.')
  if (user.alumniProfile.verificationStatus !== 'VERIFIED') {
    throw new AppError(403, 'alumni_not_verified', 'This alumnus is not verified, so the AI representative is unavailable.')
  }
  if (!user.aiSettings || !user.aiSettings.enabled || user.aiSettings.paused || user.aiSettings.disabledAt) {
    throw new AppError(403, 'assistant_unavailable', 'This alumnus has not enabled the AI representative.')
  }
  return { user, settings: user.aiSettings }
}

alumniAiRouter.get(
  '/:alumniId',
  requireRole('STUDENT'),
  asyncHandler(async (req, res) => {
    const { user, settings } = await assistantContext(req.params.alumniId)
    const sources = await prisma.alumniAiKnowledge.findMany({
      where: { alumniId: user.id, approved: true, revokedAt: null, type: { in: sourcesFor(settings) } },
      select: { id: true, type: true, title: true, content: true },
    })
    res.json({
      data: {
        alumniId: user.id,
        name: user.name,
        headline: user.headline,
        permissionLevel: settings.permissionLevel,
        disclosure: disclosureFor(user.name),
        sources,
        suggestedQuestions: [
          'What skills should I learn for this career?',
          'How should I prepare my portfolio?',
          'What mistakes should students avoid?',
          'Can you suggest a career roadmap?',
        ],
      },
    })
  }),
)

alumniAiRouter.get(
  '/:alumniId/conversation',
  requireRole('STUDENT'),
  asyncHandler(async (req, res) => {
    const user = sessionUser(req)!
    const conversation = await prisma.alumniAiConversation.findUnique({
      where: { studentId_alumniId: { studentId: user.id, alumniId: req.params.alumniId } },
      include: { messages: { orderBy: { createdAt: 'asc' }, take: 100 } },
    })
    res.json({ data: conversation ?? { messages: [] } })
  }),
)

alumniAiRouter.delete(
  '/:alumniId/conversation',
  requireRole('STUDENT'),
  asyncHandler(async (req, res) => {
    const user = sessionUser(req)!
    const conversation = await prisma.alumniAiConversation.findUnique({
      where: { studentId_alumniId: { studentId: user.id, alumniId: req.params.alumniId } },
      select: { id: true },
    })
    if (conversation) {
      await prisma.alumniAiConversation.delete({ where: { id: conversation.id } })
      await audit(req, 'alumni_ai.conversation_cleared', 'AlumniAiConversation', conversation.id, { alumniId: req.params.alumniId })
    }
    res.json({ data: { cleared: Boolean(conversation) } })
  }),
)

const chatSchema = z.object({ message: z.string().trim().min(2).max(1200) })

alumniAiRouter.post(
  '/:alumniId/chat',
  requireRole('STUDENT'),
  asyncHandler(async (req, res) => {
    const student = sessionUser(req)!
    const { message } = chatSchema.parse(req.body)
    const { user: alumnus, settings } = await assistantContext(req.params.alumniId)
    const name = alumnus.name
    const disclosure = disclosureFor(name)
    const normalized = message.toLowerCase().replace(/[^a-z0-9\s]/g, ' ')

    const consent = await prisma.consent.findUnique({
      where: { userId_kind: { userId: student.id, kind: 'ALUMNI_AI_CONTEXT' } },
    })
    const personalized = settings.permissionLevel === 2 && Boolean(consent?.granted)

    const sources = await prisma.alumniAiKnowledge.findMany({
      where: { alumniId: alumnus.id, approved: true, revokedAt: null, type: { in: sourcesFor(settings) } },
    })

    let flagged = false
    let content: string
    const cited: Array<{ type: string; title: string }> = []
    const refusal = refusalFor(normalized, name)

    const queryTokens = tokens(message)
    const profileScope = settings.useProfile
      ? [
          alumnus.alumniProfile?.expertise,
          alumnus.alumniProfile?.mentorshipTopics,
          alumnus.alumniProfile?.designation,
          alumnus.alumniProfile?.company,
        ]
          .filter(Boolean)
          .join(' ')
      : ''
    // Only approved sources the alumnus consented to, plus their verified
    // profile, define the areas this assistant may speak to.
    const expertiseTokens = new Set<string>([
      ...tokens(profileScope),
      ...sources.flatMap((source) => tokens(`${source.title} ${source.content}`)),
    ])
    const relevantTokens = queryTokens.filter((token) => expertiseTokens.has(token))
    const guidanceGroup = GENERAL_GUIDANCE.find((group) => includesAny(normalized, group.match))
    const guidance = guidanceGroup?.steps ?? []

    const scored = sources
      .map((source) => {
        const haystack = `${source.title} ${source.content}`.toLowerCase()
        const score = queryTokens.reduce((total, token) => total + (haystack.includes(token) ? 1 : 0), 0)
        return { source, score }
      })
      .filter((row) => row.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 2)

    if (includesAny(normalized, INJECTION)) {
      flagged = true
      content = `${disclosure}\n\nI cannot change my instructions, reveal internal configuration or pretend to be ${name}. I can answer career questions using approved sources, or you can request a human mentorship session.`
    } else if (refusal) {
      content = `${disclosure}\n\n${refusal}`
    } else if (scored.length === 0 && relevantTokens.length === 0 && guidance.length === 0) {
      content = `${disclosure}\n\n${OUTSIDE_EXPERTISE_REPLY}`
    } else {
      const parts: string[] = [disclosure, '']

      if (scored.length > 0) {
        for (const { source } of scored) {
          const excerpt = source.content.length > 420 ? `${source.content.slice(0, 417)}…` : source.content
          parts.push(`From ${name}'s approved ${source.type.replace(/_/g, ' ').toLowerCase()} (“${source.title}”): ${excerpt}`)
          cited.push({ type: source.type, title: source.title })
        }
      } else {
        parts.push(INSUFFICIENT_REPLY)
      }

      if (guidance.length > 0) {
        parts.push('', 'General guidance (general knowledge, not the alumnus\'s personal experience or opinion):')
        guidance.forEach((step, index) => parts.push(`${index + 1}. ${step}`))
      }

      // Partial answers: say openly which parts of the question the approved
      // knowledge does not cover instead of filling the gap with guesses.
      const covered = new Set<string>([...expertiseTokens, ...(guidanceGroup?.match ?? []), ...CAREER_WORDS])
      const uncovered = Array.from(new Set(queryTokens.filter((token) => !covered.has(token)))).slice(0, 3)
      if (scored.length > 0 && uncovered.length > 0) {
        parts.push(
          '',
          `I can only answer from approved information. I don't have approved details from ${name} about: ${uncovered.join(', ')}.`,
        )
      }

      if (personalized) {
        const studentProfile = await prisma.studentProfile.findUnique({
          where: { userId: student.id },
          select: { skills: true, careerInterests: true },
        })
        if (studentProfile?.skills || studentProfile?.careerInterests) {
          parts.push(
            '',
            `Personalized context you authorized: skills — ${studentProfile.skills || 'not added'}; interests — ${studentProfile.careerInterests || 'not added'}. Use this only as a starting point and verify requirements with the role you target.`,
          )
        }
      } else if (settings.permissionLevel === 2) {
        parts.push('', 'Personalization is off until you grant AI context consent in your profile.')
      }

      parts.push('', `For decisions that matter, request a human mentorship session with ${name}.`)
      content = parts.join('\n')
    }

    const conversation = await prisma.alumniAiConversation.upsert({
      where: { studentId_alumniId: { studentId: student.id, alumniId: alumnus.id } },
      update: { updatedAt: new Date() },
      create: { studentId: student.id, alumniId: alumnus.id },
    })
    await prisma.alumniAiMessage.create({
      data: { conversationId: conversation.id, role: 'STUDENT', content: message, flagged },
    })
    const assistantMessage = await prisma.alumniAiMessage.create({
      data: {
        conversationId: conversation.id,
        role: 'ASSISTANT',
        content,
        sources: cited.length > 0 ? JSON.stringify(cited) : null,
        flagged,
        moderationStatus: flagged ? 'OPEN' : null,
      },
    })
    await audit(req, 'alumni_ai.chat', 'AlumniAiConversation', conversation.id, {
      alumniId: alumnus.id,
      level: settings.permissionLevel,
      sources: cited.length,
      flagged,
      personalized,
    })

    res.json({
      data: {
        conversationId: conversation.id,
        disclosure,
        personalized,
        permissionLevel: settings.permissionLevel,
        sources: cited,
        message: assistantMessage,
      },
    })
  }),
)

alumniAiRouter.post(
  '/messages/:id/report',
  requireRole('STUDENT'),
  asyncHandler(async (req, res) => {
    const user = sessionUser(req)!
    const message = await prisma.alumniAiMessage.findUnique({
      where: { id: req.params.id },
      include: { conversation: { select: { studentId: true } } },
    })
    if (!message || message.conversation.studentId !== user.id) {
      throw new AppError(404, 'not_found', 'Message not found.')
    }
    const updated = await prisma.alumniAiMessage.update({
      where: { id: message.id },
      data: { flagged: true, moderationStatus: 'OPEN' },
    })
    const admins = await prisma.user.findMany({ where: { role: 'ADMIN', status: 'ACTIVE' }, select: { id: true } })
    await Promise.all(
      admins.map((admin) =>
        notify(
          admin.id,
          'MODERATION',
          'Reported AI response',
          'A student reported an Alumni AI response for moderation review.',
          '/admin/dashboard?tab=ai',
        ),
      ),
    )
    await audit(req, 'alumni_ai.message_reported', 'AlumniAiMessage', message.id)
    res.json({ data: { id: updated.id, flagged: updated.flagged } })
  }),
)

alumniAiRouter.post(
  '/:alumniId/escalate',
  requireRole('STUDENT'),
  asyncHandler(async (req, res) => {
    const student = sessionUser(req)!
    const studentRow = await prisma.user.findUnique({ where: { id: student.id }, select: { name: true } })
    const { message } = z.object({ message: z.string().trim().max(600).optional() }).parse(req.body)
    const { user: alumnus } = await assistantContext(req.params.alumniId)
    const existing = await prisma.mentorshipRequest.findFirst({
      where: { studentId: student.id, mentorId: alumnus.id, status: 'PENDING' },
    })
    if (existing) {
      res.json({ data: { request: existing, alreadyRequested: true } })
      return
    }
    const request = await prisma.mentorshipRequest.create({
      data: {
        studentId: student.id,
        mentorId: alumnus.id,
        topic: 'Follow-up from AI assistant',
        message: message || 'I would like to speak with you directly after using your AI assistant.',
      },
    })
    await notify(
      alumnus.id,
      'MENTORSHIP_REQUEST',
      'New mentorship request',
      `${studentRow?.name ?? 'A student'} requested a human follow-up after using your AI representative.`,
      '/alumni/dashboard?tab=mentorship',
    )
    await audit(req, 'alumni_ai.escalation_requested', 'MentorshipRequest', request.id, { alumniId: alumnus.id })
    res.status(201).json({ data: { request, alreadyRequested: false } })
  }),
)
