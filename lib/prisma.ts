import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const prismaClientSingleton = () => {
  const connectionString = process.env.DATABASE_URL

  // Limit pool size to prevent connection exhaustion in serverless environments.
  // Vercel spins up many function instances — without limits, each could open
  // its own pool and overwhelm the Supabase connection limit.
  const pool = new Pool({
    connectionString,
    max: 10,                    // Max concurrent connections per pool
    idleTimeoutMillis: 30_000,  // Close idle connections after 30s
    connectionTimeoutMillis: 5_000, // Fail fast if DB is unreachable
  })

  const adapter = new PrismaPg(pool)
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development'
      ? ['warn', 'error']
      : ['error'],
  })
}

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>
}

const prisma = globalThis.prisma ?? prismaClientSingleton()

export default prisma

if (process.env.NODE_ENV !== 'production') globalThis.prisma = prisma
