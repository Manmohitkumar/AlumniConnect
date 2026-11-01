import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../db'
import { requireAuth } from '../middleware/auth'
import { AppError, asyncHandler, cleanQuery, httpUrl, pageMeta, pagination } from '../lib/http'
import { audit, sessionUser } from '../lib/audit'

export const knowledgeRouter = Router()

const resourceSchema = z.object({
  title: z.string().trim().min(5).max(180),
  summary: z.string().trim().min(20).max(600),
  body: z.string().trim().min(50).max(40000),
  category: z.string().trim().min(2).max(60),
  tags: z.string().trim().max(300).optional(),
  type: z.enum(['ARTICLE', 'VIDEO', 'GUIDE', 'TEMPLATE']).default('ARTICLE'),
  url: httpUrl().optional().or(z.literal('')),
})

knowledgeRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const page = pagination(req, 12)
    const q = cleanQuery(req.query.q, 100)
    const category = cleanQuery(req.query.category, 60)
    const type = cleanQuery(req.query.type, 20)
    const tag = cleanQuery(req.query.tag, 60)

    const where = {
      status: 'PUBLISHED',
      ...(category ? { category } : {}),
      ...(type ? { type: type.toUpperCase() } : {}),
      ...(tag ? { tags: { contains: tag } } : {}),
      ...(q ? { OR: [{ title: { contains: q } }, { summary: { contains: q } }, { tags: { contains: q } }] } : {}),
    }

    const [rows, total] = await Promise.all([
      prisma.knowledgeResource.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: page.skip,
        take: page.take,
        select: {
          id: true,
          title: true,
          summary: true,
          category: true,
          tags: true,
          type: true,
          url: true,
          views: true,
          createdAt: true,
          author: { select: { id: true, name: true, headline: true, alumniProfile: { select: { company: true } } } },
          _count: { select: { bookmarks: true } },
        },
      }),
      prisma.knowledgeResource.count({ where }),
    ])

    res.json({
      data: rows.map((row) => ({ ...row, bookmarks: row._count.bookmarks })),
      meta: pageMeta(page, total),
    })
  }),
)

knowledgeRouter.get(
  '/bookmarks/mine',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = sessionUser(req)!
    const rows = await prisma.bookmark.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        resource: {
          include: { author: { select: { id: true, name: true } } },
        },
      },
    })
    res.json({ data: rows })
  }),
)

knowledgeRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const viewer = sessionUser(req)
    const row = await prisma.knowledgeResource.findUnique({
      where: { id: req.params.id },
      include: {
        author: { select: { id: true, name: true, headline: true, alumniProfile: { select: { company: true, designation: true } } } },
        _count: { select: { bookmarks: true } },
      },
    })
    if (!row) throw new AppError(404, 'not_found', 'Resource not found.')
    const isAuthor = viewer?.id === row.authorId || viewer?.role === 'ADMIN'
    if (row.status !== 'PUBLISHED' && !isAuthor) {
      throw new AppError(404, 'not_found', 'Resource not found.')
    }

    // View counting: one increment per authenticated read, skipped for the author.
    if (viewer && !isAuthor) {
      await prisma.knowledgeResource.update({ where: { id: row.id }, data: { views: { increment: 1 } } })
    }
    const bookmarked = viewer
      ? Boolean(
          await prisma.bookmark.findUnique({
            where: { userId_resourceId: { userId: viewer.id, resourceId: row.id } },
            select: { userId: true },
          }),
        )
      : false

    res.json({ data: { ...row, bookmarks: row._count.bookmarks, bookmarked } })
  }),
)

knowledgeRouter.post(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = sessionUser(req)!
    if (user.role !== 'ALUMNI' && user.role !== 'ADMIN') {
      throw new AppError(403, 'forbidden', 'Only alumni and administrators can publish resources.')
    }
    const input = resourceSchema.parse(req.body)
    const created = await prisma.knowledgeResource.create({
      data: { ...input, url: input.url || null, authorId: user.id, status: 'PUBLISHED' },
    })
    await audit(req, 'resource.create', 'KnowledgeResource', created.id, { title: created.title })
    res.status(201).json({ data: created })
  }),
)

knowledgeRouter.patch(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = sessionUser(req)!
    const row = await prisma.knowledgeResource.findUnique({ where: { id: req.params.id }, select: { authorId: true } })
    if (!row) throw new AppError(404, 'not_found', 'Resource not found.')
    if (row.authorId !== user.id && user.role !== 'ADMIN') {
      throw new AppError(403, 'forbidden', 'You can only edit your own resources.')
    }
    const input = resourceSchema.partial().extend({ status: z.enum(['PUBLISHED', 'DRAFT', 'REMOVED']).optional() }).parse(req.body)
    const updated = await prisma.knowledgeResource.update({
      where: { id: req.params.id },
      data: { ...input, url: input.url === '' ? null : input.url },
    })
    await audit(req, 'resource.update', 'KnowledgeResource', updated.id, { status: updated.status })
    res.json({ data: updated })
  }),
)

knowledgeRouter.delete(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = sessionUser(req)!
    const row = await prisma.knowledgeResource.findUnique({ where: { id: req.params.id }, select: { authorId: true } })
    if (!row) throw new AppError(404, 'not_found', 'Resource not found.')
    if (row.authorId !== user.id && user.role !== 'ADMIN') {
      throw new AppError(403, 'forbidden', 'You can only remove your own resources.')
    }
    await prisma.knowledgeResource.update({ where: { id: req.params.id }, data: { status: 'REMOVED' } })
    await audit(req, 'resource.remove', 'KnowledgeResource', req.params.id)
    res.status(204).end()
  }),
)

knowledgeRouter.post(
  '/:id/bookmark',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = sessionUser(req)!
    const existing = await prisma.bookmark.findUnique({
      where: { userId_resourceId: { userId: user.id, resourceId: req.params.id } },
    })
    if (existing) {
      await prisma.bookmark.delete({ where: { userId_resourceId: { userId: user.id, resourceId: req.params.id } } })
      res.json({ bookmarked: false })
      return
    }
    await prisma.bookmark.create({ data: { userId: user.id, resourceId: req.params.id } })
    res.json({ bookmarked: true })
  }),
)
