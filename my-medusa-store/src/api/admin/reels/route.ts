import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { getPgPool } from "../../../utils/pg"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const pool = getPgPool()
    // We return everything to admin, or maybe just non-expired? 
    // Let's return only non-expired to keep it clean, or everything if they want to manage it.
    // User wants it to "stay" based on choice. So if it's expired, it shouldn't show.
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