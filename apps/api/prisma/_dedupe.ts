import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const before = await prisma.submission.count()
  const duplicates = await prisma.$queryRawUnsafe<Array<{ c: number }>>(
    'SELECT COUNT(*) as c FROM Submission WHERE id NOT IN (SELECT MIN(id) FROM Submission GROUP BY challengeId, studentId)',
  )
  const removable = Number(duplicates[0]?.c ?? 0)
  if (removable > 0) {
    await prisma.$executeRawUnsafe(
      'DELETE FROM Submission WHERE id NOT IN (SELECT MIN(id) FROM Submission GROUP BY challengeId, studentId)',
    )
  }
  const after = await prisma.submission.count()
  console.log({ before, removed: removable, after })
}

main().finally(() => prisma.$disconnect())
