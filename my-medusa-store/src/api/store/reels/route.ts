import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import fs from "fs"
import path from "path"

const reelsDir = path.join(process.cwd(), "static", "reels")

function publicUrl(req: MedusaRequest, fileName: string) {
  const host = req.headers.host
  const proto = (req.headers["x-forwarded-proto"] as string) || "http"
  // Medusa serves /static ... so we return an absolute URL for convenience.
  return `${proto}://${host}/static/reels/${encodeURIComponent(fileName)}`
}

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    fs.mkdirSync(reelsDir, { recursive: true })
    const files = fs
      .readdirSync(reelsDir)
      .filter((f) => !f.startsWith("."))
      .map((name) => {
        const full = path.join(reelsDir, name)
        const stat = fs.statSync(full)
        const ext = path.extname(name).toLowerCase()
        const type = [".mp4", ".webm", ".mov"].includes(ext) ? "video" : "image"
        return {
          name,
          type,
          size: stat.size,
          createdAt: stat.birthtime?.toISOString?.() || stat.ctime.toISOString(),
          url: publicUrl(req, name),
        }
      })
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))

    res.json({ items: files, count: files.length })
  } catch (error: any) {
    res.status(500).json({ message: "Failed to list reels", error: error?.message })
  }
}