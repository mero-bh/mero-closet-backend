import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { GoogleGenerativeAI } from "@google/generative-ai"

type ImageGenConfig = {
  /** Optional: user-provided API key (stored locally in browser) */
  apiKey?: string
  /** Image generation model id */
  model?: string
  aspectRatio?: string
  imageSize?: string
  /** 'generate' or 'edit' */
  mode?: "generate" | "edit"
  /** base image for edit mode (base64 w/out data url prefix) */
  baseImage?: { mimeType: string; data: string }
}

function pickImageModel(requestedModel: unknown): string {
  // Prefer an image-capable fallback. If your key supports Gemini 3 Pro Image, you can select it from Settings.
  const fallback = "gemini-2.0-flash-image"
  if (typeof requestedModel !== "string" || !requestedModel.trim()) return fallback
  return requestedModel.trim()
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { prompt, config = {} } = req.body as { prompt: string; config: ImageGenConfig }

  const envApiKey = process.env.GOOGLE_AI_API_KEY
  const apiKey = typeof config.apiKey === "string" && config.apiKey.trim() ? config.apiKey.trim() : envApiKey
  if (!apiKey) {
    return res.status(500).json({ message: "No API key found. Set GOOGLE_AI_API_KEY in env or add it in Chat Settings." })
  }

  if (!prompt || !String(prompt).trim()) {
    return res.status(400).json({ message: "prompt is required" })
  }

  const modelName = pickImageModel(config.model)

  try {
    const genAI = new GoogleGenerativeAI(apiKey)
    const mode = config.mode || "generate"

    const buildParts = () => {
      const parts: any[] = []
      if (mode === "edit" && config.baseImage?.data) {
        parts.push({
          inlineData: {
            mimeType: config.baseImage.mimeType || "image/png",
            data: config.baseImage.data,
          },
        })
      }
      parts.push({ text: String(prompt) })
      return parts
    }

    const run = async (m: string) => {
      const model = genAI.getGenerativeModel({
        model: m,
        // NOTE: Using 'any' here to support imageConfig on image-capable models.
        generationConfig: {
          // @ts-ignore
          responseModalities: ["IMAGE", "TEXT"],
          // @ts-ignore
          imageConfig: {
            aspectRatio: config.aspectRatio || "1:1",
            imageSize: config.imageSize || "1K",
          },
        } as any,
      })

      const result = await model.generateContent(buildParts() as any)

      const images: { mimeType: string; data: string }[] = []
      const candidates = (result as any)?.response?.candidates || []
      const contentParts = candidates?.[0]?.content?.parts || []

      for (const p of contentParts) {
        if (p?.inlineData?.data && p?.inlineData?.mimeType) {
          images.push({ mimeType: p.inlineData.mimeType, data: p.inlineData.data })
        }
      }

      const text = (result as any)?.response?.text?.() || ""
      return { images, text }
    }

    // First try the requested model. If it returns no images (or fails), retry once with a compatible fallback.
    const fallbackModel = "gemini-2.0-flash-image"
    let usedModel = modelName
    let out: { images: { mimeType: string; data: string }[]; text: string }

    try {
      out = await run(modelName)
      if ((out.images?.length ?? 0) === 0 && modelName !== fallbackModel) {
        usedModel = fallbackModel
        out = await run(fallbackModel)
      }
    } catch (e) {
      if (modelName !== fallbackModel) {
        usedModel = fallbackModel
        out = await run(fallbackModel)
      } else {
        throw e
      }
    }

    return res.json({
      model: usedModel,
      images: out.images,
      text: out.text,
    })
  } catch (error: any) {
    console.error("AI IMAGE GEN ERROR:", error)
    return res.status(500).json({ message: "Image generation failed", error: error.message })
  }
}

export const AUTHENTICATED = true

export const CONFIG = {
  maxBodySize: 50 * 1024 * 1024,
}
