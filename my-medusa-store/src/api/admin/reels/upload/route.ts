import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { uploadToCloudinary } from "../../../../utils/cloudinary"
import { getPgPool } from "../../../../utils/pg"
import fs from "fs"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const file = (req as any).file as any
  const { duration_type = "always" } = req.body as { duration_type: string }

  if (!file) {
    return res.status(400).json({ message: "file is required" })
  }

  try {
    // 1. Upload to Cloudinary
    const resourceType = file.mimetype.startsWith("video") ? "video" : "image"
    const cloudRes: any = await uploadToCloudinary(file.path, resourceType)

    // 2. Calculate expires_at
    let expiresAt: Date | null = null
    if (duration_type === "5min") {
      expiresAt = new Date(Date.now() + 5 * 60 * 1000)
    } else if (duration_type === "24h") {
      expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
    }

    // 3. Save to Neon
    const pool = getPgPool()
    const query = `
      INSERT INTO "reels" (url, public_id, type, duration_type, expires_at)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `
    const result = await pool.query(query, [
      cloudRes.secure_url,
      cloudRes.public_id,
      resourceType,
      duration_type,
      expiresAt
    ])

    // 4. Cleanup local file
    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path)
    }

    res.json(result.rows[0])
  } catch (error: any) {
    // Cleanup on error
    if (file && fs.existsSync(file.path)) {
      fs.unlinkSync(file.path)
    }
    res.status(500).json({ message: "Upload failed", error: error.message })
  }
}
