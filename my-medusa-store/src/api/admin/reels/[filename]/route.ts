import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import fs from "fs"
import path from "path"

const reelsDir = path.join(process.cwd(), "static", "reels")

export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  const { filename } = req.params

  if (!filename) {
    return res.status(400).json({ message: "filename is required" })
  }

  try {
    const safeName = path.basename(filename)
    const fullPath = path.join(reelsDir, safeName)
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ message: "file not found" })
    }

    fs.unlinkSync(fullPath)
    res.json({ message: "deleted", name: safeName })
  } catch (error: any) {
    res.status(500).json({ message: "Failed to delete reel", error: error?.message })
  }
}
