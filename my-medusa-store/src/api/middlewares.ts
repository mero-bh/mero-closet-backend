import { defineMiddlewares } from "@medusajs/framework/http"
import multer from "multer"
import fs from "fs"
import path from "path"

/**
 * Reels upload (video/images) middleware.
 * Enables multipart/form-data handling for both:
 *   - /admin/reels/upload (Medusa Admin)
 *   - /store/reels/upload (Frontend)
 */
const reelsDir = path.join(process.cwd(), "static", "reels")
fs.mkdirSync(reelsDir, { recursive: true })

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, reelsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || "")
    const base = path
      .basename(file.originalname || "file", ext)
      .replace(/[^a-zA-Z0-9-_]/g, "_")
      .slice(0, 60)
    cb(null, `${Date.now()}-${base}${ext}`)
  },
})

const upload = multer({
  storage,
  limits: {
    fileSize: 150 * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
      "video/mp4",
      "video/webm",
      "video/quicktime",
    ]
    if (allowed.includes(file.mimetype)) return cb(null, true)
    cb(new Error(`Unsupported file type: ${file.mimetype}`))
  },
})

export default defineMiddlewares({
  routes: [
    {
      matcher: "/admin/reels/upload",
      middlewares: [upload.single("file")],
    },
    {
      matcher: "/store/reels/upload",
      middlewares: [upload.single("file")],
    },
  ],
})
