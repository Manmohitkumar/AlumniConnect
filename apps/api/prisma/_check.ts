import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const [mentorshipRequests, users, submissions] = await Promise.all([
    prisma.mentorshipRequest.count(),
    prisma.user.count(),
    prisma.submission.count(),
  ])
  console.log({ mentorshipRequests, users, submissions })
}

main().finally(() => prisma.$disconnect())
