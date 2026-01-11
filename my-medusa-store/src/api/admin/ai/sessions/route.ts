import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { getPgPool } from "../../../utils/pg"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
    try {
        const pool = getPgPool()
        const query = `
      SELECT * FROM "ai_sessions"
      ORDER BY updated_at DESC
    `
        const result = await pool.query(query)
        res.json({ sessions: result.rows })
    } catch (error: any) {
        res.status(500).json({ message: "Failed to fetch AI sessions", error: error.message })
    }
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
    const { title = "New Conversation" } = req.body as { title: string }
    try {
        const pool = getPgPool()
        const query = `
      INSERT INTO "ai_sessions" (title)
      VALUES ($1)
      RETURNING *
    `
        const result = await pool.query(query, [title])
        res.json(result.rows[0])
    } catch (error: any) {
        res.status(500).json({ message: "Failed to create AI session", error: error.message })
    }
}
