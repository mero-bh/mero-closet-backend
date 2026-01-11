import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { getPgPool } from "../../../../utils/pg"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
    try {
        const pool = getPgPool()

        // Check table info
        const tableInfo = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'reels'
    `)

        // Check Cloudinary vars (masked)
        const cloudinaryMasked = {
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "MISSING",
            api_key: process.env.CLOUDINARY_API_KEY ? "PRESENT (MASKED)" : "MISSING",
            api_secret: process.env.CLOUDINARY_API_SECRET ? "PRESENT (MASKED)" : "MISSING",
            url: process.env.CLOUDINARY_URL ? "PRESENT (MASKED)" : "MISSING"
        }

        res.json({
            database: {
                table: 'reels',
                columns: tableInfo.rows
            },
            cloudinary: cloudinaryMasked,
            env: process.env.NODE_ENV
        })
    } catch (error: any) {
        res.status(500).json({ error: error.message })
    }
}
