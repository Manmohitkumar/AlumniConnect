import { Router } from 'express'
import { z } from 'zod'
import { requireAuth, requireRole } from '../middleware/auth'
import { AppError, asyncHandler } from '../lib/http'
import { rateLimit } from '../lib/rate-limit'
import { audit } from '../lib/audit'

export const metaverseRouter = Router()

const meshyBaseUrl = 'https://api.meshy.ai/openapi/v2/text-to-3d'
const generationLimit = rateLimit({ windowMs: 60 * 60 * 1000, max: 3, key: 'meshy-generation' })
const promptSchema = z.object({
  prompt: z.string().trim().min(8).max(800),
})

function meshyKey(): string {
  const key = process.env.MESHY_API_KEY
  if (!key) throw new AppError(503, 'meshy_unavailable', 'Meshy generation is not configured.')
  return key
}

async function meshyRequest(path: string, init: RequestInit) {
  let response: Response
  try {
    response = await fetch(`${meshyBaseUrl}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${meshyKey()}`,
        'Content-Type': 'application/json',
        ...init.headers,
      },
    })
  } catch {
    throw new AppError(503, 'meshy_unavailable', 'Meshy could not be reached. Try again later.')
  }

  const body = (await response.json().catch(() => ({}))) as Record<string, unknown>
  if (!response.ok) {
    const message = typeof body.message === 'string' ? body.message : 'Meshy could not process this request.'
    throw new AppError(response.status === 429 ? 429 : 502, 'meshy_request_failed', message)
  }
  return body
}

// Generation has a cost. It is deliberately administrator-only until an
// approval/quota workflow exists. Meshy creates environment assets, not user
// likenesses; Avaturn remains the personal-avatar path.
metaverseRouter.post(
  '/meshy/preview',
  requireAuth,
  requireRole('ADMIN'),
  generationLimit,
  asyncHandler(async (req, res) => {
    const { prompt } = promptSchema.parse(req.body)
    const data = await meshyRequest('', {
      method: 'POST',
      body: JSON.stringify({
        mode: 'preview',
        prompt,
        ai_model: 'meshy-7.1',
        should_remesh: true,
        target_polycount: 15000,
        target_formats: ['glb'],
        moderation: true,
      }),
    })
    await audit(req, 'metaverse.meshy_preview_requested', 'MeshyTask', typeof data.result === 'string' ? data.result : null)
    res.status(202).json({ data: { taskId: data.result } })
  }),
)

metaverseRouter.get(
  '/meshy/tasks/:taskId',
  requireAuth,
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const taskId = z.string().uuid().parse(req.params.taskId)
    const data = await meshyRequest(`/${encodeURIComponent(taskId)}`, { method: 'GET' })
    // Only return fields the client needs; Meshy URLs are signed and short-lived.
    res.json({
      data: {
        id: data.id,
        status: data.status,
        progress: data.progress,
        prompt: data.prompt,
        thumbnailUrl: data.thumbnail_url,
        glbUrl: (data.model_urls as { glb?: string } | undefined)?.glb ?? null,
        error: (data.task_error as { message?: string } | undefined)?.message ?? null,
      },
    })
  }),
)

metaverseRouter.post(
  '/meshy/tasks/:taskId/refine',
  requireAuth,
  requireRole('ADMIN'),
  generationLimit,
  asyncHandler(async (req, res) => {
    const taskId = z.string().uuid().parse(req.params.taskId)
    const data = await meshyRequest('', {
      method: 'POST',
      body: JSON.stringify({
        mode: 'refine',
        preview_task_id: taskId,
        ai_model: 'meshy-7.1',
        target_formats: ['glb'],
        moderation: true,
      }),
    })
    await audit(req, 'metaverse.meshy_refine_requested', 'MeshyTask', typeof data.result === 'string' ? data.result : taskId)
    res.status(202).json({ data: { taskId: data.result } })
  }),
)
