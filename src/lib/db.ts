// Prisma client for Neon Postgres.
// Neon connection string works directly with standard Prisma postgres provider.
// No driver adapter needed when DATABASE_URL is the pooled connection string
// (Neon's pooler already handles serverless connection limits).

import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['error', 'warn'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
