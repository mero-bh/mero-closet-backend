import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { getPgPool } from "../../../utils/pg"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const pool = getPgPool()
    const query = `
      SELECT * FROM "reels" 
      WHERE expires_at IS NULL OR expires_at > NOW()
      ORDER BY created_at DESC
    `
    const result = await pool.query(query)

    res.json({ items: result.rows, count: result.rowCount })
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch reels", error: error.message })
  }
}