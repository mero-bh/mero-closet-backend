import { PrismaClient } from "@prisma/client"
import { PrismaNeon } from "@prisma/adapter-neon"
import { Pool } from "@neondatabase/serverless"

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

const connectionString = process.env.DATABASE_URL

export const prisma = (() => {
    if (globalForPrisma.prisma) {
        return globalForPrisma.prisma
    }

    if (!connectionString) {
        // This is the #1 reason auth/prisma blows up with a vague "configuration" error.
        // We throw a clear error so you fix the env variable once instead of chasing ghosts.
        throw new Error(
            "DATABASE_URL is missing. Set it in .env.local (Next.js) or your hosting provider environment variables."
        )
    }

    const pool = new Pool({ connectionString: connectionString })
    const adapter = new PrismaNeon(pool as any)
    return new PrismaClient({ adapter })
})()

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
