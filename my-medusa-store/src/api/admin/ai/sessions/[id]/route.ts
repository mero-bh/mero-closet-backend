import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { getPgPool } from "../../../../../utils/pg"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
    const { id } = req.params
    try {
        const pool = getPgPool()

        // Get session
        const sessionRes = await pool.query('SELECT * FROM "ai_sessions" WHERE id = $1', [id])
        if (sessionRes.rows.length === 0) {
            return res.status(404).json({ message: "Session not found" })
        }

        // Get messages
        const messagesRes = await pool.query(`
      SELECT * FROM "ai_messages"
      WHERE session_id = $1
      ORDER BY created_at ASC
    `, [id])

        res.json({
            session: sessionRes.rows[0],
            messages: messagesRes.rows
        })
    } catch (error: any) {
        res.status(500).json({ message: "Failed to fetch AI session", error: error.message })
    }
}

export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
    const { id } = req.params
    try {
        const pool = getPgPool()
        await pool.query('DELETE FROM "ai_sessions" WHERE id = $1', [id])
        res.json({ message: "Session deleted" })
    } catch (error: any) {
        res.status(500).json({ message: "Failed to delete AI session", error: error.message })
    }
}
