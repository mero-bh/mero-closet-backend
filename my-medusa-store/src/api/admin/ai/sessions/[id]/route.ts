import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { getPgPool } from "../../../../../utils/pg"

export const GET = async (
    req: MedusaRequest,
    res: MedusaResponse
) => {
    const { id } = req.params
    const pool = getPgPool()

    try {
        const sessionResult = await pool.query('SELECT * FROM "ai_sessions" WHERE id = $1', [id])
        if (sessionResult.rows.length === 0) {
            return res.status(404).json({ message: "Session not found" })
        }

        const messagesResult = await pool.query(
            'SELECT * FROM "ai_messages" WHERE session_id = $1 ORDER BY created_at ASC',
            [id]
        )

        res.json({
            session: sessionResult.rows[0],
            messages: messagesResult.rows
        })
    } catch (error: any) {
        res.status(500).json({ message: "Failed to fetch session", error: error.message })
    }
}

export const DELETE = async (
    req: MedusaRequest,
    res: MedusaResponse
) => {
    const { id } = req.params
    const pool = getPgPool()

    try {
        await pool.query('DELETE FROM "ai_messages" WHERE session_id = $1', [id])
        await pool.query('DELETE FROM "ai_sessions" WHERE id = $1', [id])
        res.json({ message: "Session deleted successfully" })
    } catch (error: any) {
        res.status(500).json({ message: "Failed to delete session", error: error.message })
    }
}

export const PATCH = async (
    req: MedusaRequest,
    res: MedusaResponse
) => {
    const { id } = req.params
    const { title } = req.body as { title: string }

    if (!title) {
        return res.status(400).json({ message: "Title is required" })
    }

    const pool = getPgPool()

    try {
        const result = await pool.query(
            `UPDATE "ai_sessions" SET title = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
            [title, id]
        )

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Session not found" })
        }

        res.json(result.rows[0])
    } catch (error: any) {
        res.status(500).json({ message: "Failed to update session", error: error.message })
    }
}
