import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../db'
import { requireAuth } from '../middleware/auth'
import { AppError, asyncHandler, cleanQuery } from '../lib/http'
import { audit, sessionUser } from '../lib/audit'
import { notify } from '../lib/notify'
import {
  aiComplete,
  aiStatus,
  clamp,
  sharedTokens,
  similarity,
  splitList,
  tokenize,
} from '../lib/ai'

export const aiRouter = Router()
aiRouter.use(requireAuth)

const now = () => new Date()

async function viewerContext(userId: string) {
  const row = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
      locale: true,
      timeZone: true,
      headline: true,
      studentProfile: {
        select: {
          skills: true,
          careerInterests: true,
          department: true,
          course: true,
          country: true,
          universityId: true,
          university: { select: { id: true, name: true, country: true } },
        },
      },
      alumniProfile: {
        select: {
          expertise: true,
          mentorshipTopics: true,
          industry: true,
          company: true,
          languages: true,
          country: true,
          universityId: true,
          university: { select: { id: true, name: true, country: true } },
        },
      },
      universityProfile: {
        select: {
          universityId: true,
          university: { select: { id: true, name: true, country: true, defaultLocale: true, languages: true } },
        },
      },
    },
  })
  if (!row) throw new AppError(404, 'not_found', 'Account not found.')
  return row
}

function viewerInterestTokens(viewer: Awaited<ReturnType<typeof viewerContext>>): string[] {
  if (viewer.studentProfile) {
    return tokenize(
      [viewer.studentProfile.skills, viewer.studentProfile.careerInterests, viewer.studentProfile.department, viewer.studentProfile.course]
        .filter(Boolean)
        .join(' '),
    )
  }
  if (viewer.alumniProfile) {
    return tokenize(
      [viewer.alumniProfile.expertise, viewer.alumniProfile.mentorshipTopics, viewer.alumniProfile.industry]
        .filter(Boolean)
        .join(' '),
    )
  }
  return tokenize(viewer.headline)
}

aiRouter.get(
  '/status',
  asyncHandler(async (_req, res) => {
    res.json({ data: aiStatus() })
  }),
)

aiRouter.get(
  '/mentors/matches',
  asyncHandler(async (req, res) => {
    const user = sessionUser(req)!
    const viewer = await viewerContext(user.id)
    const interest = viewerInterestTokens(viewer)
    const viewerUniversity = viewer.studentProfile?.universityId ?? viewer.alumniProfile?.universityId ?? null
    const viewerLanguages = splitList(viewer.alumniProfile?.languages).map((item) => item.toLowerCase())

    const mentors = await prisma.user.findMany({
      where: {
        id: { not: user.id },
        role: 'ALUMNI',
        status: 'ACTIVE',
        alumniProfile: { is: { mentorshipOpen: true } },
      },
      take: 200,
      orderBy: { lastActiveAt: 'desc' },
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
            industry: true,
            expertise: true,
            mentorshipTopics: true,
            graduationYear: true,
            yearsExperience: true,
            timezone: true,
            languages: true,
            country: true,
            universityId: true,
            university: { select: { id: true, name: true, country: true } },
          },
        },
      },
    })

    const matches = mentors
      .map((mentor) => {
        const profile = mentor.alumniProfile!
        const mentorTokens = tokenize(
          [profile.expertise, profile.mentorshipTopics, profile.industry, profile.company, profile.designation]
            .filter(Boolean)
            .join(' '),
        )
        const overlap = sharedTokens(interest, mentorTokens)
        const skillScore = similarity(interest, mentorTokens) * 65
        const industryMatch =
          viewer.alumniProfile?.industry && profile.industry &&
          viewer.alumniProfile.industry.toLowerCase() === profile.industry.toLowerCase()
            ? 15
            : 0
        const sameUniversity = viewerUniversity && profile.universityId === viewerUniversity ? 8 : 0
        const mentorLanguages = splitList(profile.languages).map((item) => item.toLowerCase())
        const languageMatch = viewerLanguages.some((lang) => mentorLanguages.includes(lang)) ? 12 : 0
        const reasons: string[] = []
        if (overlap.length > 0) reasons.push(`Shared focus: ${overlap.join(', ')}`)
        if (industryMatch) reasons.push(`Same industry: ${profile.industry}`)
        if (sameUniversity) reasons.push('From your institution')
        if (languageMatch) reasons.push('Shares a mentorship language')
        if (profile.yearsExperience) reasons.push(`${profile.yearsExperience} yrs experience`)
        if (reasons.length === 0) reasons.push('Open to mentorship requests')
        return {
          ...mentor,
          score: clamp(skillScore + industryMatch + sameUniversity + languageMatch, 1, 99),
          reasons,
        }
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)

    res.json({
      data: matches,
      meta: { provider: aiStatus().provider, generatedAt: now().toISOString(), explanation: 'Rule-based skill and interest overlap. Scores are guidance, not a ranking of people.' },
    })
  }),
)

aiRouter.get(
  '/challenges/matches',
  asyncHandler(async (req, res) => {
    const user = sessionUser(req)!
    const viewer = await viewerContext(user.id)
    const interest = viewerInterestTokens(viewer)
    const skills = splitList(viewer.studentProfile?.skills)

    const challenges = await prisma.challenge.findMany({
      where: {
        status: 'OPEN',
        OR: [{ deadline: null }, { deadline: { gte: now() } }],
      },
      take: 100,
      orderBy: { publishedAt: 'desc' },
      select: {
        id: true,
        slug: true,
        title: true,
        summary: true,
        category: true,
        durationDays: true,
        isPaid: true,
        deadline: true,
        publishedAt: true,
        author: { select: { name: true } },
        skills: { select: { skill: { select: { name: true } } } },
        participants: { where: { userId: user.id }, select: { userId: true } },
        submissions: { where: { studentId: user.id }, select: { id: true, status: true } },
      },
    })

    const matches = challenges
      .map((challenge) => {
        const challengeTokens = tokenize([challenge.title, challenge.summary, challenge.category, ...challenge.skills.map((item) => item.skill.name)].join(' '))
        const overlap = sharedTokens(interest, challengeTokens)
        const skillNames = challenge.skills.map((item) => item.skill.name.toLowerCase())
        const skillHits = skills.filter((skill) => skillNames.some((name) => name.includes(skill.toLowerCase()) || skill.toLowerCase().includes(name)))
        const skillScore = similarity(interest, challengeTokens) * 55
        const categoryScore = viewer.studentProfile?.careerInterests && challenge.category &&
          viewer.studentProfile.careerInterests.toLowerCase().includes(challenge.category.toLowerCase())
          ? 15
          : 0
        const freshness = now().getTime() - challenge.publishedAt.getTime() < 30 * 86_400_000 ? 8 : 0
        const reasons: string[] = []
        if (skillHits.length) reasons.push(`Matches your skills: ${skillHits.slice(0, 3).join(', ')}`)
        else if (overlap.length) reasons.push(`Related to: ${overlap.join(', ')}`)
        if (categoryScore) reasons.push(`Fits your interest in ${challenge.category}`)
        if (freshness) reasons.push('Recently published')
        if (challenge.deadline) {
          const days = Math.ceil((challenge.deadline.getTime() - now().getTime()) / 86_400_000)
          if (days <= 14) reasons.push(`${days} day${days === 1 ? '' : 's'} left`)
        }
        if (reasons.length === 0) reasons.push('Open challenge in your ecosystem')
        return {
          id: challenge.id,
          slug: challenge.slug,
          title: challenge.title,
          summary: challenge.summary,
          category: challenge.category,
          durationDays: challenge.durationDays,
          isPaid: challenge.isPaid,
          deadline: challenge.deadline,
          authorName: challenge.author.name,
          skills: challenge.skills.map((item) => item.skill.name),
          joined: challenge.participants.length > 0,
          submissionStatus: challenge.submissions.find((row) => row.status !== 'WITHDRAWN')?.status ?? null,
          score: clamp(skillScore + categoryScore + freshness + Math.min(skillHits.length, 4) * 5, 1, 99),
          reasons,
        }
      })
      .filter((row) => row.submissionStatus === null)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)

    res.json({
      data: matches,
      meta: { provider: aiStatus().provider, generatedAt: now().toISOString(), explanation: 'Rule-based match on your skills, interests and challenge recency. Already-submitted challenges are hidden.' },
    })
  }),
)

aiRouter.get(
  '/search',
  asyncHandler(async (req, res) => {
    const user = sessionUser(req)!
    const q = cleanQuery(req.query.q, 120)
    if (!q || q.trim().length < 2) throw new AppError(400, 'invalid_query', 'Enter at least two characters to search.')
    const tokens = tokenize(q)

    const [challenges, mentors, resources, events, opportunities] = await Promise.all([
      prisma.challenge.findMany({
        where: { status: { in: ['OPEN', 'CLOSED'] } },
        take: 120,
        orderBy: { publishedAt: 'desc' },
        select: { id: true, slug: true, title: true, summary: true, category: true, deadline: true },
      }),
      prisma.user.findMany({
        where: { role: 'ALUMNI', status: 'ACTIVE' },
        take: 120,
        select: {
          id: true,
          name: true,
          headline: true,
          location: true,
          alumniProfile: { select: { company: true, designation: true, industry: true, expertise: true, mentorshipTopics: true, country: true } },
        },
      }),
      prisma.knowledgeResource.findMany({
        where: { status: 'PUBLISHED' },
        take: 120,
        select: { id: true, title: true, summary: true, category: true, type: true },
      }),
      prisma.event.findMany({
        where: { status: 'PUBLISHED', startsAt: { gte: now() } },
        take: 120,
        select: { id: true, title: true, description: true, category: true, startsAt: true, timeZone: true },
      }),
      prisma.opportunity.findMany({
        where: { status: 'OPEN' },
        take: 120,
        select: { id: true, title: true, description: true, type: true, location: true, country: true, remote: true },
      }),
    ])

    const score = (title: string, body: string) => {
      const titleTokens = tokenize(title)
      const bodyTokens = tokenize(body)
      return clamp(similarity(tokens, titleTokens) * 70 + similarity(tokens, bodyTokens) * 30, 0, 100)
    }

    const challengeHits = challenges
      .map((row) => ({ type: 'challenge' as const, id: row.id, title: row.title, snippet: row.summary, meta: row.category, href: `/challenges/${row.slug}`, score: score(row.title, `${row.summary} ${row.category}`) }))
      .filter((row) => row.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
    const mentorHits = mentors
      .map((row) => {
        const profile = row.alumniProfile
        return {
          type: 'mentor' as const,
          id: row.id,
          title: row.name,
          snippet: [profile?.designation, profile?.company, profile?.expertise].filter(Boolean).join(' · '),
          meta: [profile?.industry, profile?.country].filter(Boolean).join(' · '),
          href: `/alumni/dashboard?tab=discovery&mentor=${row.id}`,
          score: score(row.name, [row.headline, profile?.industry, profile?.expertise, profile?.mentorshipTopics, profile?.company].filter(Boolean).join(' ')),
        }
      })
      .filter((row) => row.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
    const resourceHits = resources
      .map((row) => ({ type: 'resource' as const, id: row.id, title: row.title, snippet: row.summary, meta: row.category, href: `/student/dashboard?tab=resources`, score: score(row.title, `${row.summary} ${row.category}`) }))
      .filter((row) => row.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
    const eventHits = events
      .map((row) => ({ type: 'event' as const, id: row.id, title: row.title, snippet: row.description.slice(0, 180), meta: `${row.category} · ${row.timeZone ?? 'UTC'}`, href: `/student/dashboard?tab=events`, score: score(row.title, `${row.description} ${row.category}`) }))
      .filter((row) => row.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
    const opportunityHits = opportunities
      .map((row) => ({ type: 'opportunity' as const, id: row.id, title: row.title, snippet: row.description.slice(0, 180), meta: [row.type, row.remote ? 'Remote' : row.location, row.country].filter(Boolean).join(' · '), href: `/student/dashboard?tab=opportunities`, score: score(row.title, `${row.description} ${row.location ?? ''} ${row.country ?? ''}`) }))
      .filter((row) => row.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)

    const groups = [
      { type: 'challenge', items: challengeHits },
      { type: 'mentor', items: mentorHits },
      { type: 'resource', items: resourceHits },
      { type: 'event', items: eventHits },
      { type: 'opportunity', items: opportunityHits },
    ].filter((group) => group.items.length > 0)

    res.json({
      data: groups,
      meta: {
        query: q,
        total: groups.reduce((sum, group) => sum + group.items.length, 0),
        provider: aiStatus().provider,
        note: 'Keyword-overlap search across published platform content. Not a web search.',
        viewer: user.id,
      },
    })
  }),
)

const portfolioSchema = z.object({
  projectId: z.string().max(40).optional(),
  title: z.string().trim().min(2).max(120).optional(),
  summary: z.string().trim().min(10).max(2000).optional(),
  skills: z.string().max(400).optional().nullable(),
  url: z.string().trim().max(300).optional().nullable(),
})

aiRouter.post(
  '/portfolio/guidance',
  asyncHandler(async (req, res) => {
    const user = sessionUser(req)!
    const input = portfolioSchema.parse(req.body)
    let project = {
      title: input.title ?? '',
      summary: input.summary ?? '',
      skills: input.skills ?? null,
      url: input.url ?? null,
    }
    if (input.projectId) {
      const saved = await prisma.portfolioProject.findFirst({
        where: { id: input.projectId, studentId: user.id },
        select: { title: true, summary: true, skills: true, url: true },
      })
      if (!saved) throw new AppError(404, 'not_found', 'Project not found in your portfolio.')
      project = saved
    }
    if (!project.title || project.summary.length < 10) {
      throw new AppError(400, 'invalid', 'Provide a project title and at least a short summary.')
    }

    const skills = splitList(project.skills)
    const hasMetric = /\d+\s?(%|x|users|customers|ms|seconds|minutes|hours|days)|\b(increased|reduced|improved|saved)\b/i.test(project.summary)
    const missing: string[] = []
    const strengths: string[] = []
    if (project.url) strengths.push('You included a link where reviewers can inspect the work.')
    else missing.push('Add a repository or live demo link so reviewers can verify the work.')
    if (project.summary.length >= 240) strengths.push('The summary has enough detail to explain context and outcome.')
    else missing.push('Expand the summary: problem, what you built, and the result (aim for 240+ characters).')
    if (skills.length >= 3) strengths.push(`Skills are explicit (${skills.slice(0, 4).join(', ')}).`)
    else missing.push('List at least three concrete skills, tools or methods you used.')
    if (hasMetric) strengths.push('You mention a measurable outcome, which makes impact easier to assess.')
    else missing.push('Add a measurable outcome, for example time saved, accuracy, users reached, or performance gained.')

    const fallbackSuggestions = [
      'Open with one sentence naming the user and the problem, then link the solution.',
      'Name your specific contribution if this was a team project; reviewers need to know what you owned.',
      'Close with what you would do next with more time — it shows judgement, not just output.',
    ].slice(0, Math.max(3, missing.length))

    let provider = aiStatus().provider
    let extra: string[] = []
    if (provider === 'openai') {
      const text = await aiComplete(
        'You review student portfolio summaries. Reply with exactly three short bullet points. Never invent facts, metrics or links. Only suggest improvements to presentation and clarity.',
        `Project title: ${project.title}\nSummary: ${project.summary.slice(0, 1200)}\nSkills: ${skills.join(', ')}\nLink included: ${project.url ? 'yes' : 'no'}`,
      )
      if (text) {
        extra = text.split('\n').map((line) => line.replace(/^[-*•]\s*/, '').trim()).filter(Boolean).slice(0, 4)
      } else {
        provider = 'local'
      }
    }

    res.json({
      data: {
        strengths,
        gaps: missing,
        suggestions: [...fallbackSuggestions, ...extra],
        checklist: [
          { item: 'Problem and audience stated', ok: project.summary.length >= 80 },
          { item: 'Your role is explicit', ok: /built|designed|led|implemented|created/i.test(project.summary) },
          { item: 'Verifiable link', ok: Boolean(project.url) },
          { item: 'Measurable outcome', ok: hasMetric },
          { item: 'Three or more skills listed', ok: skills.length >= 3 },
        ],
      },
      meta: { provider, generatedAt: now().toISOString(), note: 'Guidance is advisory. No content was published or changed.' },
    })
  }),
)

function buildEvaluationDraft(submission: {
  title: string
  summary: string | null
  repoUrl: string | null
  demoUrl: string | null
  fileUrl: string | null
  challenge: { title: string; deliverables: string; requirements: string | null }
}) {
  const summary = submission.summary ?? ''
  const links = [submission.repoUrl, submission.demoUrl, submission.fileUrl].filter(Boolean).length
  const deliverableTokens = tokenize(`${submission.challenge.deliverables} ${submission.challenge.requirements ?? ''}`)
  const submissionTokens = tokenize(`${submission.title} ${summary}`)
  const overlap = sharedTokens(deliverableTokens, submissionTokens)

  const completeness = clamp(55 + links * 8 + (summary.length > 120 ? 8 : 0) + (summary.length > 400 ? 5 : 0), 0, 100)
  const evidence = clamp(45 + links * 15, 0, 100)
  const clarity = clamp(50 + (summary.length >= 200 ? 20 : summary.length >= 80 ? 10 : 0) + (submission.title.length >= 8 ? 10 : 0), 0, 100)
  const fit = clamp(40 + similarity(deliverableTokens, submissionTokens) * 60, 0, 100)
  const score = clamp(completeness * 0.3 + evidence * 0.25 + clarity * 0.2 + fit * 0.25, 40, 95)

  const feedback = [
    'AI-assisted draft — a human evaluator must review and approve before it is shared.',
    '',
    `Completeness ${completeness}/100: ${links > 0 ? `${links} supporting link${links === 1 ? '' : 's'} provided.` : 'No repository, demo or file link was provided.'}`,
    `Evidence ${evidence}/100: ${submission.repoUrl ? 'Repository linked. ' : ''}${submission.demoUrl ? 'Demo linked. ' : ''}${submission.fileUrl ? 'Deliverable file linked.' : ''}`.trim(),
    `Clarity ${clarity}/100: ${summary.length >= 200 ? 'Summary explains the approach with enough detail.' : 'Summary is short; confirm the problem and outcome during review.'}`,
    `Brief fit ${fit}/100: ${overlap.length ? `Submission mentions ${overlap.join(', ')} from the brief.` : 'No direct keyword overlap with the brief; verify requirements manually.'}`,
    '',
    `Suggested next step for the evaluator: verify the ${submission.challenge.deliverables.split(/[.;\n]/)[0]?.trim() || 'stated deliverables'} against the submitted work, then edit this feedback in your own words.`,
  ].join('\n')

  return {
    score,
    feedback,
    criteria: { completeness, evidence, clarity, briefFit: fit },
  }
}

aiRouter.post(
  '/submissions/:submissionId/evaluation-draft',
  asyncHandler(async (req, res) => {
    const user = sessionUser(req)!
    const submission = await prisma.submission.findUnique({
      where: { id: req.params.submissionId },
      select: {
        id: true,
        studentId: true,
        title: true,
        summary: true,
        repoUrl: true,
        demoUrl: true,
        fileUrl: true,
        status: true,
        challenge: { select: { title: true, authorId: true, deliverables: true, requirements: true } },
      },
    })
    if (!submission) throw new AppError(404, 'not_found', 'Submission not found.')
    if (submission.challenge.authorId !== user.id && user.role !== 'ADMIN') {
      throw new AppError(403, 'forbidden', 'Only the challenge author or an administrator can prepare an evaluation draft.')
    }
    if (submission.status === 'WITHDRAWN') throw new AppError(409, 'withdrawn', 'This submission was withdrawn.')

    const draft = buildEvaluationDraft(submission)
    await prisma.submission.update({
      where: { id: submission.id },
      data: {
        aiDraftScore: draft.score,
        aiDraftFeedback: draft.feedback,
        aiDraftAt: now(),
      },
    })
    await audit(req, 'ai.evaluation_draft', 'Submission', submission.id, { score: draft.score, provider: aiStatus().provider, studentId: submission.studentId })
    res.json({
      data: { ...draft, createdAt: now().toISOString(), requiresHumanApproval: true },
      meta: { provider: aiStatus().provider, note: 'Draft saved to the submission. It is not visible to the student until a human approves it.' },
    })
  }),
)

const approveSchema = z.object({
  score: z.coerce.number().int().min(0).max(100).optional(),
  feedback: z.string().trim().min(10).max(3000).optional(),
  criteria: z.record(z.string(), z.coerce.number().min(0).max(10)).optional(),
})

aiRouter.post(
  '/submissions/:submissionId/evaluation-draft/approve',
  asyncHandler(async (req, res) => {
    const user = sessionUser(req)!
    const input = approveSchema.parse(req.body)
    const submission = await prisma.submission.findUnique({
      where: { id: req.params.submissionId },
      select: {
        id: true,
        studentId: true,
        status: true,
        aiDraftScore: true,
        aiDraftFeedback: true,
        aiDraftAt: true,
        challenge: { select: { title: true, authorId: true } },
      },
    })
    if (!submission) throw new AppError(404, 'not_found', 'Submission not found.')
    if (submission.challenge.authorId !== user.id && user.role !== 'ADMIN') {
      throw new AppError(403, 'forbidden', 'Only the challenge author or an administrator can approve this draft.')
    }
    if (submission.status === 'WITHDRAWN') throw new AppError(409, 'withdrawn', 'This submission was withdrawn.')
    if (!submission.aiDraftFeedback || submission.aiDraftScore === null) {
      throw new AppError(409, 'no_draft', 'Generate an AI draft before approving.')
    }

    const score = input.score ?? submission.aiDraftScore
    const feedback = input.feedback ?? submission.aiDraftFeedback

    const [evaluation] = await prisma.$transaction([
      prisma.evaluation.create({
        data: {
          submissionId: submission.id,
          evaluatorId: user.id,
          score,
          feedback,
          criteria: input.criteria ? JSON.stringify(input.criteria) : null,
        },
      }),
      prisma.submission.update({
        where: { id: submission.id },
        data: {
          status: 'EVALUATED',
          score,
          feedback,
          evaluatedAt: now(),
          evaluatedById: user.id,
          aiAssisted: true,
        },
      }),
    ])

    await audit(req, 'ai.evaluation_approved', 'Submission', submission.id, { score, evaluationId: evaluation.id, edited: Boolean(input.score || input.feedback) })
    await notify(
      submission.studentId,
      'EVALUATION_RESULT',
      'Your submission has been evaluated',
      `"${submission.challenge.title}" scored ${score}/100.`,
      `/student/dashboard?tab=submissions&submission=${submission.id}`,
    )

    res.status(201).json({ data: { evaluation, aiAssisted: true }, meta: { note: 'Human approver recorded as the evaluator.' } })
  }),
)

type FaqEntry = { id: string; title: string; answer: string; tags: string; href: string }

const FAQ: FaqEntry[] = [
  {
    id: 'verify-student',
    title: 'Student verification',
    answer: 'Complete your profile, add your institution and registration number, then submit a verification request from your profile tab. Your university representative reviews it. Email verification alone does not grant institutional verification.',
    tags: 'verify verification student pending university registration profile',
    href: '/student/dashboard?tab=profile',
  },
  {
    id: 'join-challenge',
    title: 'Joining a challenge',
    answer: 'Open a challenge from your dashboard and choose Join before submitting. Submissions require an active participation record, and challenges close at their deadline or when the author closes them.',
    tags: 'join challenge submit deadline participant',
    href: '/student/dashboard?tab=challenges',
  },
  {
    id: 'submission',
    title: 'Submitting work',
    answer: 'Add a title, summary and any repository, demo or file links. One submission per challenge is allowed; a withdrawn submission can be replaced. Evaluation feedback appears in your Submissions tab once a reviewer records it.',
    tags: 'submission submit repository demo file withdraw evaluation',
    href: '/student/dashboard?tab=submissions',
  },
  {
    id: 'certificate',
    title: 'Certificates',
    answer: 'Certificates are issued for challenge completion, wins or recognition. Each has a public verification code and a PDF download for the recipient, issuer and administrators. Revoked certificates show as revoked on the public page.',
    tags: 'certificate verify download pdf revoked recognition',
    href: '/student/dashboard?tab=certificates',
  },
  {
    id: 'mentorship',
    title: 'Mentorship requests',
    answer: 'Find alumni with mentorship open, send a topic and message, and wait for acceptance. Accepted requests can schedule sessions. Sessions respect the scheduled time and are listed for both sides.',
    tags: 'mentor mentorship request session schedule alumni accept',
    href: '/student/dashboard?tab=mentorship',
  },
  {
    id: 'privacy-export',
    title: 'Exporting your data',
    answer: 'Your privacy page provides a JSON export of your account data. Use it to review or port your information. Deletion requests follow the documented support workflow so institutions can meet record-keeping obligations.',
    tags: 'privacy export data delete account gdpr consent',
    href: '/student/dashboard?tab=profile',
  },
  {
    id: 'language',
    title: 'Changing language and time zone',
    answer: 'Use the language selector in the dashboard header. Your choice is saved to your account and applied on your next visit. Dates and times use your device time zone unless an event publishes its own authoritative zone.',
    tags: 'language locale translation timezone date format arabic hindi',
    href: '/student/dashboard?tab=overview',
  },
  {
    id: 'ai',
    title: 'How AI features work',
    answer: 'Recommendations use transparent rule-based overlap of your skills and interests. AI evaluation drafts are advisory and require human approval. If an external AI provider is configured, only anonymised text is sent and the platform falls back to local scoring on failure.',
    tags: 'ai recommendation match assistant evaluation draft privacy provider',
    href: '/student/dashboard?tab=ai',
  },
  {
    id: 'university-onboarding',
    title: 'Adding an institution',
    answer: 'Institutions are created by platform administrators with official name, country, region, website and verified email domain. A representative account is provisioned separately. Email domain control alone is not proof of authority.',
    tags: 'university institution onboard register representative domain country',
    href: '/admin/dashboard?tab=universities',
  },
  {
    id: 'company',
    title: 'Company access',
    answer: 'Company accounts are provisioned by administrators. Talent discovery only includes students who explicitly opted in, and contact details stay hidden until the student shares them.',
    tags: 'company recruiter talent discovery opt in students',
    href: '/admin/dashboard?tab=users',
  },
  {
    id: 'notifications',
    title: 'Notification preferences',
    answer: 'Notification preferences are grouped by mentorship, challenges, events, support and marketing. Turning a group off stops those notifications while keeping critical security messages available.',
    tags: 'notification email preferences alerts support marketing',
    href: '/student/dashboard?tab=profile',
  },
  {
    id: 'mobile',
    title: 'Mobile and offline use',
    answer: 'The web app is installable on supported mobile browsers and caches the application shell for offline loading. Changes made offline are not queued yet; reconnect before submitting work.',
    tags: 'mobile android ios pwa offline install app',
    href: '/student/dashboard?tab=overview',
  },
  {
    id: 'support',
    title: 'Contacting support',
    answer: 'Open Support from your dashboard to create a ticket with a category and message. Administrators reply with a note that appears on the ticket. Response times depend on your institution and are shown in the support panel.',
    tags: 'support contact ticket help bug account issue',
    href: '/student/dashboard?tab=support',
  },
  {
    id: 'metaverse',
    title: 'Metaverse rooms',
    answer: 'The Metaverse hub hosts mentor, career, innovation and networking rooms. Access rules follow your account and institution. Ordinary web pages remain available if your device cannot run 3D content.',
    tags: 'metaverse room virtual career networking 3d',
    href: '/metaverse/index.html',
  },
]

aiRouter.post(
  '/support/ask',
  asyncHandler(async (req, res) => {
    const input = z.object({ question: z.string().trim().min(3).max(500) }).parse(req.body)
    const tokens = tokenize(input.question)
    const ranked = FAQ.map((entry) => ({
      entry,
      score: similarity(tokens, tokenize(`${entry.title} ${entry.tags}`)) * 0.7 + similarity(tokens, tokenize(entry.answer)) * 0.3,
    }))
      .sort((a, b) => b.score - a.score)
      .filter((row) => row.score >= 0.12)
      .slice(0, 2)

    if (ranked.length === 0) {
      res.json({
        data: {
          matched: false,
          answer:
            'I could not find this in the verified help content. I will not guess. Please open a support ticket from your dashboard so a person can check your account and institution settings.',
          sources: [],
          suggestedHref: '/student/dashboard?tab=support',
        },
        meta: { provider: 'local', note: 'Grounded only in published help content.' },
      })
      return
    }

    const primary = ranked[0].entry
    let answer = primary.answer
    let provider = 'local'
    if (aiStatus().provider === 'openai') {
      const context = ranked.map((row) => `${row.entry.title}: ${row.entry.answer}`).join('\n\n')
      const text = await aiComplete(
        'Answer only from the provided AlumniConnect help content. Do not invent features, numbers or policies. If the context is insufficient, say so and suggest contacting support. Keep the answer under 120 words.',
        `Question: ${input.question}\n\nHelp content:\n${context}`,
      )
      if (text) {
        answer = text
        provider = 'openai'
      }
    }

    res.json({
      data: {
        matched: true,
        answer,
        sources: ranked.map((row) => ({ id: row.entry.id, title: row.entry.title, href: row.entry.href })),
        suggestedHref: primary.href,
      },
      meta: { provider, note: provider === 'openai' ? 'Answer generated from help content by the configured provider. Verify account-specific details with support.' : 'Answer taken from published help content.' },
    })
  }),
)

aiRouter.get(
  '/university/insights',
  asyncHandler(async (req, res) => {
    const user = sessionUser(req)!
    if (user.role !== 'UNIVERSITY' && user.role !== 'ADMIN') {
      throw new AppError(403, 'forbidden', 'Institution insights are available to university representatives and administrators.')
    }
    const requested = cleanQuery(req.query.universityId, 40)
    let universityId: string | null = null
    if (user.role === 'UNIVERSITY') {
      const rep = await prisma.universityProfile.findUnique({ where: { userId: user.id }, select: { universityId: true } })
      if (!rep) throw new AppError(403, 'forbidden', 'No institution is linked to this account.')
      universityId = rep.universityId
    } else {
      universityId = requested || null
    }

    const weekAgo = new Date(Date.now() - 7 * 86_400_000)
    const staleCutoff = new Date(Date.now() - 3 * 86_400_000)
    const monthAhead = new Date(Date.now() + 30 * 86_400_000)

    if (!universityId) {
      const [students, alumni, universities, active7] = await Promise.all([
        prisma.studentProfile.count(),
        prisma.alumniProfile.count(),
        prisma.university.count(),
        prisma.user.count({ where: { lastActiveAt: { gte: weekAgo }, role: { in: ['STUDENT', 'ALUMNI'] } } }),
      ])
      res.json({
        data: {
          scope: 'platform',
          university: null,
          metrics: { students, alumni, universities, active7 },
          insights: [
            { tone: 'info', text: `${universities} institution${universities === 1 ? '' : 's'} and ${students + alumni} student/alumni profiles are registered.` },
            { tone: 'info', text: `${active7} student and alumni accounts were active in the last 7 days.` },
          ],
          generatedAt: now().toISOString(),
        },
        meta: { provider: 'local', note: 'Counts are read directly from the database. No estimates are generated.' },
      })
      return
    }

    const university = await prisma.university.findUnique({
      where: { id: universityId },
      select: { id: true, name: true, country: true, region: true, defaultLocale: true, languages: true, timeZone: true, verified: true },
    })
    if (!university) throw new AppError(404, 'not_found', 'Institution not found.')

    const [studentGroups, alumniGroups, events, active7, mentorsOpen, staleStudents, staleAlumni, challenges] = await Promise.all([
      prisma.studentProfile.groupBy({ by: ['verificationStatus'], where: { universityId }, _count: { _all: true } }),
      prisma.alumniProfile.groupBy({ by: ['verificationStatus'], where: { universityId }, _count: { _all: true } }),
      prisma.event.count({ where: { universityId, status: 'PUBLISHED', startsAt: { gte: now(), lte: monthAhead } } }),
      prisma.user.count({
        where: {
          lastActiveAt: { gte: weekAgo },
          role: { in: ['STUDENT', 'ALUMNI'] },
          OR: [{ studentProfile: { universityId } }, { alumniProfile: { universityId } }],
        },
      }),
      prisma.alumniProfile.count({ where: { universityId, mentorshipOpen: true } }),
      prisma.studentProfile.count({ where: { universityId, verificationStatus: 'PENDING', updatedAt: { lt: staleCutoff } } }),
      prisma.alumniProfile.count({ where: { universityId, verificationStatus: 'PENDING', updatedAt: { lt: staleCutoff } } }),
      prisma.challenge.count({ where: { author: { alumniProfile: { universityId } } } }),
    ])

    const studentCounts = Object.fromEntries(studentGroups.map((group) => [group.verificationStatus, group._count._all]))
    const alumniCounts = Object.fromEntries(alumniGroups.map((group) => [group.verificationStatus, group._count._all]))
    const students = Object.values(studentCounts).reduce((sum, value) => sum + value, 0)
    const alumni = Object.values(alumniCounts).reduce((sum, value) => sum + value, 0)
    const pending = (studentCounts.PENDING ?? 0) + (alumniCounts.PENDING ?? 0)

    const insights: Array<{ tone: 'info' | 'action' | 'risk'; text: string; href?: string }> = []
    if (pending > 0) {
      insights.push({ tone: 'action', text: `${pending} verification request${pending === 1 ? '' : 's'} are waiting for review.`, href: '/university/dashboard?tab=students' })
    } else {
      insights.push({ tone: 'info', text: 'No verification requests are pending right now.' })
    }
    if (staleStudents + staleAlumni > 0) {
      insights.push({ tone: 'risk', text: `${staleStudents + staleAlumni} request${staleStudents + staleAlumni === 1 ? '' : 's'} have been pending for more than three days.`, href: '/university/dashboard?tab=students' })
    }
    insights.push({ tone: 'info', text: `${students} student and ${alumni} alumni profiles are linked to this institution; ${active7} were active in the last 7 days.` })
    insights.push({ tone: 'info', text: `${mentorsOpen} alumni are open to mentorship and ${challenges} challenge${challenges === 1 ? '' : 's'} were authored by your alumni.` })
    if (events === 0) {
      insights.push({ tone: 'action', text: 'No events are scheduled in the next 30 days.', href: '/university/dashboard?tab=events' })
    } else {
      insights.push({ tone: 'info', text: `${events} event${events === 1 ? '' : 's'} are scheduled in the next 30 days.` })
    }
    if (students === 0) {
      insights.push({ tone: 'action', text: 'No student profiles are linked yet. Share your institution invitation with students before reviewing analytics.', href: '/university/dashboard?tab=students' })
    }

    res.json({
      data: {
        scope: 'university',
        university,
        metrics: {
          students,
          alumni,
          pending,
          active7,
          mentorsOpen,
          challenges,
          eventsNext30: events,
          studentStatuses: studentCounts,
          alumniStatuses: alumniCounts,
        },
        insights,
        generatedAt: now().toISOString(),
      },
      meta: { provider: 'local', note: 'Counts are read directly from the database. Suggestions are rule-based and advice only.' },
    })
  }),
)

aiRouter.post(
  '/reminders/run',
  asyncHandler(async (req, res) => {
    const user = sessionUser(req)!
    if (user.role !== 'ADMIN') throw new AppError(403, 'forbidden', 'Reminder automation is restricted to administrators.')

    const cutoff = new Date(Date.now() - 86_400_000)
    const in24h = new Date(Date.now() + 86_400_000)
    const in48h = new Date(Date.now() + 48 * 3_600_000)
    const in72h = new Date(Date.now() + 72 * 3_600_000)
    let sent = 0
    let skipped = 0

    const deliver = async (userId: string, title: string, body: string, link: string) => {
      const existing = await prisma.notification.findFirst({
        where: { userId, title, link, createdAt: { gte: cutoff } },
        select: { id: true },
      })
      if (existing) {
        skipped += 1
        return
      }
      await notify(userId, 'REMINDER', title, body, link)
      sent += 1
    }

    const [sessions, events, challenges] = await Promise.all([
      prisma.mentorshipSession.findMany({
        where: { status: 'SCHEDULED', scheduledAt: { gte: now(), lte: in24h } },
        take: 200,
        select: {
          scheduledAt: true,
          requestId: true,
          request: { select: { studentId: true, mentorId: true, topic: true } },
        },
      }),
      prisma.event.findMany({
        where: { status: 'PUBLISHED', startsAt: { gte: now(), lte: in48h } },
        take: 100,
        select: { id: true, title: true, startsAt: true, timeZone: true, registrations: { select: { userId: true } } },
      }),
      prisma.challenge.findMany({
        where: { status: 'OPEN', deadline: { gte: now(), lte: in72h } },
        take: 100,
        select: { id: true, slug: true, title: true, deadline: true, participants: { select: { userId: true } } },
      }),
    ])

    for (const session of sessions) {
      const when = session.scheduledAt.toISOString()
      const body = `Your mentorship session "${session.request.topic}" starts at ${when}.`
      await deliver(session.request.studentId, 'Mentorship session reminder', body, `/student/dashboard?tab=mentorship`)
      await deliver(session.request.mentorId, 'Mentorship session reminder', body, `/alumni/dashboard?tab=mentorship`)
    }

    for (const event of events) {
      for (const registration of event.registrations) {
        await deliver(
          registration.userId,
          'Event reminder',
          `"${event.title}" starts at ${event.startsAt.toISOString()} (${event.timeZone ?? 'UTC'}).`,
          `/student/dashboard?tab=events`,
        )
      }
    }

    for (const challenge of challenges) {
      for (const participant of challenge.participants) {
        await deliver(
          participant.userId,
          'Challenge deadline reminder',
          `"${challenge.title}" closes at ${challenge.deadline?.toISOString()}.`,
          `/student/dashboard?tab=challenges`,
        )
      }
    }

    await audit(req, 'ai.reminders_run', 'Automation', 'reminders', { sent, skipped, sessions: sessions.length, events: events.length, challenges: challenges.length })
    res.json({
      data: { sent, skippedDuplicates: skipped, scanned: { sessions: sessions.length, events: events.length, challenges: challenges.length } },
      meta: { note: 'Reminders are deduplicated per recipient and item for 24 hours.' },
    })
  }),
)
