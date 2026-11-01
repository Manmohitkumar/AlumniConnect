import { Router } from 'express'
import { prisma } from '../db'
import { asyncHandler } from '../lib/http'

/** Public, read-only list used by the registration form. No private data. */
export const universitiesRouter = Router()

universitiesRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const rows = await prisma.university.findMany({
      where: { verified: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, shortName: true, city: true, country: true, region: true, website: true, defaultLocale: true, languages: true },
    })
    res.json({ data: rows })
  }),
)
