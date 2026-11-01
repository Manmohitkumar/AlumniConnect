import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const migrations = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
    'SELECT migration_name, finished_at, rolled_back_at, applied_steps_count FROM _prisma_migrations ORDER BY started_at',
  )
  console.log('migrations', migrations)
  const tables = await prisma.$queryRawUnsafe<Array<{ name: string }>>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_prisma%' ORDER BY name",
  )
  console.log('tables', tables.map((t) => t.name))
  const cols = await prisma.$queryRawUnsafe<Array<{ name: string }>>("SELECT name FROM pragma_table_info('AlumniProfile')")
  console.log('alumni cols', cols.map((c) => c.name))
}

main().finally(() => prisma.$disconnect())
