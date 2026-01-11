import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { deleteFromCloudinary } from "../../../../utils/cloudinary"
import { getPgPool } from "../../../../utils/pg"

export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  const { filename: id } = req.params // Filename parameter is used as ID

  if (!id) {
    return res.status(400).json({ message: "ID is required" })
  }

  try {
    const pool = getPgPool()

    // 1. Get reel info
    const selectQuery = `SELECT * FROM "reels" WHERE id = $1`
    const selectRes = await pool.query(selectQuery, [id])

    if (selectRes.rowCount === 0) {
      return res.status(404).json({ message: "Reel not found" })
    }

    const reel = selectRes.rows[0]

    // 2. Delete from Cloudinary
    await deleteFromCloudinary(reel.public_id, reel.type as any)

    // 3. Delete from Neon
    await pool.query(`DELETE FROM "reels" WHERE id = $1`, [id])

    res.json({ message: "deleted", id })
  } catch (error: any) {
    res.status(500).json({ message: "Failed to delete reel", error: error.message })
  }
}
