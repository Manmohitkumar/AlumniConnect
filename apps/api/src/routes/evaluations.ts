import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../db'
import { requireAuth } from '../middleware/auth'
import { AppError, asyncHandler } from '../lib/http'
import { audit, sessionUser } from '../lib/audit'
import { notify } from '../lib/notify'

export const evaluationsRouter = Router()

const evaluationSchema = z.object({
  score: z.coerce.number().int().min(0).max(100),
  feedback: z.string().trim().min(10).max(3000),
  criteria: z.record(z.string(), z.coerce.number().min(0).max(10)).optional(),
})

evaluationsRouter.get(
  '/submissions/:submissionId/evaluations',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = sessionUser(req)!
    const submission = await prisma.submission.findUnique({
      where: { id: req.params.submissionId },
      select: { studentId: true, challengeId: true, challenge: { select: { authorId: true } } },
    })
    if (!submission) throw new AppError(404, 'not_found', 'Submission not found.')
    const allowed =
      submission.studentId === user.id || submission.challenge.authorId === user.id || user.role === 'ADMIN'
    if (!allowed) throw new AppError(403, 'forbidden', 'You cannot view these evaluations.')

    const rows = await prisma.evaluation.findMany({
      where: { submissionId: req.params.submissionId },
      orderBy: { createdAt: 'desc' },
      include: { evaluator: { select: { id: true, name: true } } },
    })
    res.json({ data: rows })
  }),
)

evaluationsRouter.post(
  '/submissions/:submissionId/evaluations',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = sessionUser(req)!
    const input = evaluationSchema.parse(req.body)

    const submission = await prisma.submission.findUnique({
      where: { id: req.params.submissionId },
      include: {
        challenge: { select: { id: true, title: true, authorId: true } },
        student: { select: { id: true, name: true, email: true } },
      },
    })
    if (!submission) throw new AppError(404, 'not_found', 'Submission not found.')
    if (submission.challenge.authorId !== user.id && user.role !== 'ADMIN') {
      throw new AppError(403, 'forbidden', 'Only the challenge author can evaluate this submission.')
    }
    if (submission.status === 'WITHDRAWN') {
      throw new AppError(409, 'withdrawn', 'This submission was withdrawn.')
    }

    const existing = await prisma.evaluation.findFirst({
      where: { submissionId: submission.id, evaluatorId: user.id },
      select: { id: true, createdAt: true },
    })
    if (existing && existing.createdAt.getTime() > Date.now() - 60_000) {
      throw new AppError(409, 'duplicate', 'An evaluation was just recorded. Review the existing score before resubmitting.')
    }

    const [evaluation] = await prisma.$transaction([
      prisma.evaluation.create({
        data: {
          submissionId: submission.id,
          evaluatorId: user.id,
          score: input.score,
          feedback: input.feedback,
          criteria: input.criteria ? JSON.stringify(input.criteria) : null,
        },
      }),
      prisma.submission.update({
        where: { id: submission.id },
        data: {
          status: 'EVALUATED',
          score: input.score,
          feedback: input.feedback,
          evaluatedAt: new Date(),
          evaluatedById: user.id,
        },
      }),
    ])

    await audit(req, 'submission.evaluate', 'Submission', submission.id, {
      score: input.score,
      evaluationId: evaluation.id,
    })
    await notify(
      submission.studentId,
      'EVALUATION_RESULT',
      'Your submission has been evaluated',
      `"${submission.challenge.title}" scored ${input.score}/100.`,
      `/student/dashboard?tab=submissions&submission=${submission.id}`,
    )

    res.status(201).json({ data: evaluation })
  }),
)
