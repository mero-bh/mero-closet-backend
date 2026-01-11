import { Pool } from "pg"

let pool: Pool | null = null

/**
 * Simple singleton PG pool.
 * We keep it here because some custom routes (auth_user tables) are outside Medusa modules.
 */
export function getPgPool() {
  if (pool) return pool

  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error("DATABASE_URL is missing in backend environment")
  }

  pool = new Pool({
    connectionString,
    ssl: connectionString.includes("sslmode=require") || connectionString.includes("neon.tech")
      ? { rejectUnauthorized: false }
      : false
  })
  return pool
}
