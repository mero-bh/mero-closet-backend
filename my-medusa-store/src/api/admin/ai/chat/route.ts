import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { randomUUID } from "crypto"
import { getPgPool } from "../../../../utils/pg"

type ImagePart = { mimeType: string; data: string }

type RouteConfig = {
  model?: string
  resolution?: string
  searchEnabled?: boolean
  thinkingBudget?: number
  agentMode?: boolean
  /** If true (default), mutating tools require explicit user confirmation before execution */
  confirmMode?: boolean
}

const AVAILABLE_GOOGLE_MODELS = [
  // Gemini 2.5 (recommended)
  "gemini-2.5-flash",
  "gemini-2.5-pro",
  "gemini-2.5-flash-lite",

  // Fallbacks
  "gemini-2.0-flash",
] as const

const MODEL_ALIASES: Record<string, string> = {
  // UI preview ids -> stable ids
  "gemini-2.5-flash-preview": "gemini-2.5-flash",
  "gemini-2.5-pro-preview": "gemini-2.5-pro",
  "gemini-2.5-flash-lite-preview": "gemini-2.5-flash-lite",

  // Common legacy ids seen in examples
  "gemini-2.0-flash-exp": "gemini-2.0-flash",
  "gemini-2.0-flash-thinking-exp-01-21": "gemini-2.0-flash",
}

const AVAILABLE_MODEL_SET = new Set<string>(AVAILABLE_GOOGLE_MODELS)

function tryParseJsonString(value: unknown): unknown {
  if (typeof value !== "string") return value
  const s = value.trim()
  if (!s) return value
  if (!(s.startsWith("{") || s.startsWith("["))) return value
  try {
    return JSON.parse(s)
  } catch {
    return value
  }
}

function safeForJson(input: any): any {
  try {
    return JSON.parse(
      JSON.stringify(input, (_k, v) => (typeof v === "bigint" ? v.toString() : v))
    )
  } catch {
    return { result: String(input) }
  }
}

function normalizeText(input: unknown): string {
  const maybeParsed = tryParseJsonString(input)

  if (typeof maybeParsed === "string") return maybeParsed

  if (maybeParsed && typeof maybeParsed === "object") {
    const obj: any = maybeParsed

    if (typeof obj.text === "string") return obj.text
    if (typeof obj.content === "string") return obj.content
    if (typeof obj.message === "string") return obj.message

    return JSON.stringify(obj)
  }

  if (maybeParsed == null) return ""
  return String(maybeParsed)
}

function sanitizeImages(images: any): ImagePart[] {
  if (!Array.isArray(images)) return []
  return images
    .map((img) => {
      const mimeType = typeof img?.mimeType === "string" ? img.mimeType : ""
      const data = typeof img?.data === "string" ? img.data : ""
      if (!mimeType || !data) return null
      return { mimeType, data }
    })
    .filter(Boolean) as ImagePart[]
}

function buildMessageParts(text: string, images: ImagePart[]): any[] {
  const parts: any[] = []
  const t = (text ?? "").trim()
  if (t) parts.push({ text: t })

  for (const img of images ?? []) {
    parts.push({
      inlineData: {
        mimeType: img.mimeType,
        data: img.data,
      },
    })
  }

  return parts
}

function pickModel(requestedModel: unknown): string {
  const fallback = "gemini-2.5-flash"

  if (typeof requestedModel !== "string" || !requestedModel.trim()) return fallback

  const requested = requestedModel.trim()
  const mapped = MODEL_ALIASES[requested] ?? requested
  if (AVAILABLE_MODEL_SET.has(mapped)) return mapped

  return fallback
}

function isMutatingTool(toolName: string): boolean {
  const n = (toolName ?? "").toLowerCase()
  if (n.startsWith("create_") || n.startsWith("update_") || n.startsWith("delete_")) return true

  const explicit: Record<string, boolean> = {
    // Add non-standard mutating tool names here
  }

  return Boolean(explicit[n])
}

function parseConfirmedCallIds(body: any): string[] {
  const raw = body?.confirmations ?? body?.confirmed_call_ids ?? body?.confirmedCallIds
  if (!Array.isArray(raw)) return []

  return raw
    .map((x: any) => {
      if (typeof x === "string") return x
      if (x && typeof x === "object" && typeof x.call_id === "string") return x.call_id
      return null
    })
    .filter(Boolean)
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { sessionId, prompt, history = [], images = [], config = {} } = req.body as {
    sessionId: string
    prompt: any
    history: any[]
    images: ImagePart[]
    config: RouteConfig
  }

  const apiKey = process.env.GOOGLE_AI_API_KEY
  if (!apiKey) {
    return res.status(500).json({ message: "GOOGLE_AI_API_KEY is not set in environment" })
  }

  if (!sessionId) {
    return res.status(400).json({ message: "sessionId is required" })
  }

  const modelName = pickModel(config.model)
  const confirmMode = config.confirmMode !== false
  const confirmedCallIds = parseConfirmedCallIds(req.body)

  try {
    const genAI = new GoogleGenerativeAI(apiKey)

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { aiTools, executeTool } = require("../../../../utils/ai-tools")

    const isGemini25 = modelName.startsWith("gemini-2.5-")

    const tools: any[] = []
    if (config.agentMode !== false) {
      tools.push({ functionDeclarations: aiTools?.[0]?.functionDeclarations ?? [] })
    }

    if (config.searchEnabled) {
      tools.push({ googleSearch: {} })
    }

    const thinkingBudget =
      typeof config.thinkingBudget === "number" ? config.thinkingBudget : undefined

    const model = genAI.getGenerativeModel({
      model: modelName,
      tools: tools.length > 0 ? tools : undefined,
      generationConfig: isGemini25
        ? {
            // @ts-ignore - supported by latest Gemini API for thinking models
            thinkingConfig: {
              includeThoughts: true,
              ...(typeof thinkingBudget === "number" ? { thinkingBudget } : {}),
            },
          }
        : {},
      systemInstruction: `You are Antigravity, a professional AI assistant and specialized Store Agent for the Mero Closet Medusa Dashboard.

CORE COMPETENCIES & INTERFACE CONTROL:
- **UI Navigation**: You have the power to navigate the user's dashboard. If a user asks to "go to products", "show me settings", or "create a product", use the 'navigate_to' tool.
- **Documentation Expert**: You have access to Medusa 2.0 documentation. If asked about how something works ("How do I create a region?", "What is a Sales Channel?"), use 'get_documentation'.
- **Store Management**: You manage products, prices, orders, customers, and inventory.
- **Image Intelligence**: You can see and analyze images to extract product details or create content.

ACTION GUIDELINES:
1. **Control the View**: If a task requires a specific page, NAVIGATE the user there immediately using 'navigate_to'.
2. **Consult Docs**: If you or the user are unsure about a Medusa concept, use 'get_documentation' to provide accurate answers.
3. **Execute Tools**: Don't just talk. If you can do it, DO IT using the available tools.
4. **Be Proactive**: If you list products, offer to navigate to their details.

Use Markdown for all formatting. Be concise, professional, and action-oriented.`,
    })

    const pool = getPgPool()

    // Persist config to session (best-effort)
    try {
      await pool.query(
        `UPDATE "ai_sessions"
         SET model = $1,
             resolution = COALESCE($2, resolution),
             search_enabled = COALESCE($3, search_enabled),
             thinking_budget = COALESCE($4, thinking_budget),
             updated_at = NOW()
         WHERE id = $5`,
        [
          modelName,
          config.resolution ?? null,
          typeof config.searchEnabled === "boolean" ? config.searchEnabled : null,
          typeof config.thinkingBudget === "number" ? config.thinkingBudget : null,
          sessionId,
        ]
      )
    } catch {
      // ignore
    }

    const toolInteractions: any[] = []

    // Helper: execute tool calls OR return confirmation placeholders
    const buildToolResults = async (functionCalls: any[]) => {
      const toolResults: any[] = []

      for (const call of functionCalls) {
        const toolName = String(call?.name ?? "")
        const args = safeForJson(call?.args)

        if (confirmMode && isMutatingTool(toolName)) {
          const call_id = randomUUID()

          // Store proposal in DB (prevents tampering on confirm)
          try {
            await pool.query(
              `INSERT INTO "ai_messages" (session_id, role, content)
               VALUES ($1, $2, $3)`,
              [
                sessionId,
                "tool_proposal",
                JSON.stringify({
                  type: "tool_proposal",
                  call_id,
                  name: toolName,
                  args,
                  created_at: new Date().toISOString(),
                }),
              ]
            )
          } catch {
            // ignore
          }

          toolInteractions.push({
            type: "tool_proposal",
            name: toolName,
            args,
            result: {
              requires_confirmation: true,
              call_id,
              message: "Awaiting confirmation",
            },
          })

          toolResults.push({
            functionResponse: {
              name: toolName,
              response: { requires_confirmation: true, call_id },
            },
          })

          continue
        }

        console.log(`EXECUTING TOOL: ${toolName}`, args)

        try {
          const toolOutput = await executeTool(toolName, args, req.scope)
          const safeOutput = safeForJson(toolOutput)

          toolInteractions.push({
            type: "tool_use",
            name: toolName,
            args,
            result: safeOutput,
          })

          toolResults.push({
            functionResponse: {
              name: toolName,
              response:
                typeof safeOutput === "object" && safeOutput !== null
                  ? safeOutput
                  : { result: safeOutput },
            },
          })
        } catch (toolError: any) {
          console.error(`TOOL EXECUTION FAILED [${toolName}]:`, toolError)
          const errObj = { error: toolError?.message ?? "Tool failed" }

          toolResults.push({
            functionResponse: {
              name: toolName,
              response: errObj,
            },
          })

          toolInteractions.push({
            type: "tool_use",
            name: toolName,
            args,
            result: { success: false, ...errObj },
          })
        }
      }

      return toolResults
    }

    // Normalize history to Gemini "history" format
    const safeHistory = Array.isArray(history) ? history : []
    const chatHistory = safeHistory
      .map((m: any) => {
        const role = m?.role === "user" ? "user" : "model"

        const parsedContent = tryParseJsonString(m?.content ?? m?.text ?? m?.message ?? "")
        const text = normalizeText(parsedContent)

        const imgFromMsg = sanitizeImages(m?.images)
        const imgFromContent = sanitizeImages((parsedContent as any)?.images)
        const mergedImages = imgFromMsg.length > 0 ? imgFromMsg : imgFromContent

        const parts = buildMessageParts(text, mergedImages)
        if (!parts || parts.length === 0) return null

        return { role, parts }
      })
      .filter(Boolean)

    const chat = model.startChat({ history: chatHistory as any })

    let result: any

    // Save user message and drive the first model step
    const promptText = normalizeText(prompt)
    const currentImages = sanitizeImages(images)

    if (confirmedCallIds.length > 0) {
      await pool.query(
        `INSERT INTO "ai_messages" (session_id, role, content)
         VALUES ($1, $2, $3)`,
        [
          sessionId,
          "user",
          JSON.stringify({
            type: "confirm",
            call_ids: confirmedCallIds,
          }),
        ]
      )

      const proposals = await pool.query(
        `SELECT content
         FROM "ai_messages"
         WHERE session_id = $1
           AND role = 'tool_proposal'
           AND (content->>'call_id') = ANY($2)
         ORDER BY created_at ASC`,
        [sessionId, confirmedCallIds]
      )

      if (proposals.rows.length === 0) {
        return res
          .status(400)
          .json({ message: "No matching tool proposals found for confirmation." })
      }

      const toolResults: any[] = []

      for (const row of proposals.rows) {
        const content = safeForJson(tryParseJsonString(row.content)) as any
        const toolName = String(content?.name ?? "")
        const args = safeForJson(content?.args)
        const call_id = String(content?.call_id ?? "")

        try {
          const toolOutput = await executeTool(toolName, args, req.scope)
          const safeOutput = safeForJson(toolOutput)

          toolInteractions.push({
            type: "tool_use",
            name: toolName,
            args,
            result: { ...safeOutput, call_id },
          })

          toolResults.push({
            functionResponse: {
              name: toolName,
              response:
                typeof safeOutput === "object" && safeOutput !== null
                  ? { ...safeOutput, call_id }
                  : { result: safeOutput, call_id },
            },
          })

          try {
            await pool.query(
              `INSERT INTO "ai_messages" (session_id, role, content)
               VALUES ($1, $2, $3)`,
              [
                sessionId,
                "tool_result",
                JSON.stringify({
                  type: "tool_result",
                  call_id,
                  name: toolName,
                  result: safeOutput,
                  success: true,
                  created_at: new Date().toISOString(),
                }),
              ]
            )
          } catch {
            // ignore
          }
        } catch (toolError: any) {
          const errObj = { error: toolError?.message ?? "Tool failed", call_id }

          toolInteractions.push({
            type: "tool_use",
            name: toolName,
            args,
            result: { success: false, ...errObj },
          })

          toolResults.push({
            functionResponse: {
              name: toolName,
              response: errObj,
            },
          })

          try {
            await pool.query(
              `INSERT INTO "ai_messages" (session_id, role, content)
               VALUES ($1, $2, $3)`,
              [
                sessionId,
                "tool_result",
                JSON.stringify({
                  type: "tool_result",
                  call_id,
                  name: toolName,
                  result: errObj,
                  success: false,
                  created_at: new Date().toISOString(),
                }),
              ]
            )
          } catch {
            // ignore
          }
        }
      }

      result = await chat.sendMessage(toolResults)
    } else {
      await pool.query(
        `INSERT INTO "ai_messages" (session_id, role, content)
         VALUES ($1, $2, $3)`,
        [
          sessionId,
          "user",
          JSON.stringify({
            type: "text",
            text: promptText,
            images: currentImages.length > 0 ? currentImages : undefined,
          }),
        ]
      )

      const userParts = buildMessageParts(promptText, currentImages)
      result = await chat.sendMessage(userParts)
    }

    let responseText = result.response.text()

    // Capture thought summaries if available
    let thoughts: string | null = null
    try {
      // @ts-ignore
      const parts = result?.response?.candidates?.[0]?.content?.parts ?? []
      for (const p of parts) {
        if ((p as any).thought && typeof p?.text === "string") {
          thoughts = p.text
          break
        }
      }
    } catch {
      // ignore
    }

    // Tool loop
    let functionCalls = result.response.functionCalls()
    let maxToolLoops = 5

    while (functionCalls && functionCalls.length > 0 && maxToolLoops > 0) {
      maxToolLoops--

      const toolResults = await buildToolResults(functionCalls)
      result = await chat.sendMessage(toolResults)
      responseText = result.response.text()

      functionCalls = result.response.functionCalls()

      // Safety: if we're in confirm mode and only seeing mutating calls, stop.
      if (confirmMode && functionCalls && functionCalls.length > 0) {
        const allMutating = functionCalls.every((c: any) =>
          isMutatingTool(String(c?.name ?? ""))
        )
        if (allMutating) break
      }
    }

    const aiMsgResult = await pool.query(
      `INSERT INTO "ai_messages" (session_id, role, content)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [
        sessionId,
        "model",
        JSON.stringify({
          type: "text",
          text: responseText,
          thoughts: thoughts || undefined,
          interactions: toolInteractions.length > 0 ? toolInteractions : undefined,
          meta: {
            model: modelName,
            thinkingBudget: thinkingBudget ?? undefined,
          },
        }),
      ]
    )

    return res.json(aiMsgResult.rows[0])
  } catch (error: any) {
    console.error("AI CHAT ERROR:", error)
    return res.status(500).json({ message: "AI response failed", error: error.message })
  }
}

export const AUTHENTICATED = true

export const CONFIG = {
  maxBodySize: 50 * 1024 * 1024, // 50MB
}
