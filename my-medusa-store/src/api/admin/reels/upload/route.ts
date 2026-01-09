import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  // multer middleware (src/api/middlewares.ts) adds req.file
  const file = (req as any).file as any

  if (!file) {
    return res.status(400).json({ message: "file is required (multipart/form-data, field name: file)" })
  }

  const host = req.headers.host
  const proto = (req.headers["x-forwarded-proto"] as string) || "http"

  res.json({
    name: file.filename,
    originalName: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
    url: `${proto}://${host}/static/reels/${encodeURIComponent(file.filename)}`,
  })
}
