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
  /** Optional: user-provided API key (stored locally in browser) */
  apiKey?: string
  /** Generation controls */
  temperature?: number
  topP?: number
  topK?: number
  maxOutputTokens?: number
  /** If true, assistant prefers Pros/Cons sections when giving recommendations */
  outputProsCons?: boolean
}

const AVAILABLE_GOOGLE_MODELS = [
  // Gemini 3 (preview ids used in UI)
  "gemini-3-pro-preview",
  "gemini-3-flash-preview",
  "gemini-3-pro-image-preview",

  // Gemini 2.5 (recommended)
  "gemini-2.5-flash",
  "gemini-2.5-pro",
  "gemini-2.5-flash-lite",

  // Image generation / editing (as supported by your key)
  "gemini-2.5-flash-image",
  "gemini-2.0-flash-image",

  // Fallbacks
  "gemini-2.0-flash",
] as const

const MODEL_ALIASES: Record<string, string> = {
  // UI preview ids -> stable ids
  "gemini-3-pro-preview": "gemini-3-pro-preview",
  "gemini-3-flash-preview": "gemini-3-flash-preview",
  "gemini-3-pro-image-preview": "gemini-3-pro-image-preview",
  "gemini-2.5-flash-preview": "gemini-2.5-flash",
  "gemini-2.5-pro-preview": "gemini-2.5-pro",
  "gemini-2.5-flash-lite-preview": "gemini-2.5-flash-lite",
  "gemini-2.5-flash-thinking": "gemini-2.5-flash",

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


function pickFirstSchema(schema: any): any {
  if (!schema || typeof schema !== "object") return schema
  const candidates = schema.anyOf || schema.oneOf || schema.allOf
  if (Array.isArray(candidates) && candidates.length > 0) {
    return pickFirstSchema(candidates[0])
  }
  return schema
}

/**
 * Convert JSON Schema (common from MCP servers) into Gemini FunctionDeclaration schema.
 * Gemini expects UPPERCASE types like "OBJECT", "STRING", etc.
 */
function toGeminiSchema(inputSchema: any): any {
  const s = pickFirstSchema(inputSchema) || {}
  const rawType = Array.isArray(s.type) ? s.type.find((t: any) => t && t !== "null") : s.type
  const inferredType = rawType || (s.properties ? "object" : s.items ? "array" : undefined)

  const mapType = (t: any) => {
    const v = String(t || "").toLowerCase()
    if (v === "object") return "OBJECT"
    if (v === "string") return "STRING"
    if (v === "number") return "NUMBER"
    if (v === "integer") return "INTEGER"
    if (v === "boolean") return "BOOLEAN"
    if (v === "array") return "ARRAY"
    if (v === "null") return "NULL"
    return "STRING"
  }

  const out: any = {}
  if (s.description) out.description = String(s.description)

  const t = mapType(inferredType)
  out.type = t

  if (t === "OBJECT") {
    const props = s.properties && typeof s.properties === "object" ? s.properties : {}
    out.properties = Object.fromEntries(
      Object.entries(props).map(([k, v]) => [k, toGeminiSchema(v)])
    )
    if (Array.isArray(s.required)) out.required = s.required.filter((x: any) => typeof x === "string")
  }

  if (t === "ARRAY") {
    out.items = toGeminiSchema(s.items || { type: "string" })
  }

  if (Array.isArray(s.enum)) out.enum = s.enum

  // Gemini schema is strict; avoid passing through draft-07 fields that can break validation
  return out
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

  const envApiKey = process.env.GOOGLE_AI_API_KEY
  const apiKey = typeof config.apiKey === "string" && config.apiKey.trim() ? config.apiKey.trim() : envApiKey
  if (!apiKey) {
    return res.status(500).json({ message: "No API key found. Set GOOGLE_AI_API_KEY in env or add it in Chat Settings." })
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
    // Import MCP integration
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { listMcpTools, callMcpTool } = require("../../../../utils/mcp-integration")

    const isGemini25 = modelName.startsWith("gemini-2.5-")

    // Fetch MCP tools
    let mcpToolsList: any[] = []
    try {
      mcpToolsList = await listMcpTools()
    } catch (e) {
      console.warn("Failed to fetch MCP tools:", e)
    }

    const tools: any[] = []

    // Add local tools
    const localFunctionDeclarations = aiTools?.[0]?.functionDeclarations ?? []

    // Add MCP tools converted to Gemini format
    const mcpFunctionDeclarations = mcpToolsList.map((t: any) => ({
      name: t.name,
      description: t.description,
      parameters: toGeminiSchema(t.inputSchema),
    }))

    const allFunctionDeclarations = [
      ...localFunctionDeclarations,
      ...mcpFunctionDeclarations
    ]

    if (config.agentMode !== false) {
      tools.push({ functionDeclarations: allFunctionDeclarations })
    }

    if (config.searchEnabled) {
      tools.push({ googleSearch: {} })
    }

    const thinkingBudget =
      typeof config.thinkingBudget === "number" ? config.thinkingBudget : undefined

    // Inject available tool names into system instruction to guide the model
    const mcpToolNames = mcpToolsList.map((t: any) => t.name).join(", ")

    console.log(`[AI Chat] Serving ${mcpToolsList.length} MCP tools. Names: [${mcpToolNames}]`)

    const model = genAI.getGenerativeModel({
      model: modelName,
      tools: tools.length > 0 ? tools : undefined,
      generationConfig: (() => {
        const gc: any = {}
        if (typeof config.temperature === "number") gc.temperature = config.temperature
        if (typeof config.topP === "number") gc.topP = config.topP
        if (typeof config.topK === "number") gc.topK = config.topK
        if (typeof config.maxOutputTokens === "number") gc.maxOutputTokens = config.maxOutputTokens

        if (isGemini25) {
          // @ts-ignore - supported by latest Gemini API for thinking models
          gc.thinkingConfig = {
            includeThoughts: true,
            ...(typeof thinkingBudget === "number" ? { thinkingBudget } : {}),
          }
        }
        return Object.keys(gc).length ? gc : undefined
      })(),
      systemInstruction: `You are Antigravity, a professional AI assistant and specialized Store Agent for the Mero Closet Medusa Dashboard.

CORE COMPETENCIES & INTERFACE CONTROL:
- **UI Navigation**: You have the power to navigate the user's dashboard. Use 'navigate_to'.
- **Documentation Expert**: Use 'get_documentation' for help.
- **Store Management**: You manage products, prices, orders, customers.
- **Image Intelligence**: Analyze images to extract details.
- **System Tools**: You have access to these specific MCP tools: [${mcpToolNames}]. USE THEM.

CRITICAL RULES FOR DATA ACCURACY:
1. **NEVER GUESS COUNTS**: If asked "How many products?", you MUST call 'admin_list_products'.
2. **CHECK THE 'count' FIELD**: The tool response will contain a 'count' field (e.g. "Total Count: 62"). USE THAT NUMBER. Do not count the items in the list manually as they might be paginated.
3. **Double Check**: If the user challenges your number, call the tool again with a different limit or check 'db_list_tables' if available to verify directly from DB.

ACTION GUIDELINES:
1. **Control the View**: NAVIGATE to specific pages when relevant.
2. **Consult Docs**: Use 'get_documentation' if unsure.
3. **Execute Tools**: Don't guess. Use the tools provided in the "tools" definition.
4. **Be Proactive**: If you list products, offer to navigate to their details.

Use Markdown for all formatting. Be concise, professional, and action-oriented.

${config.outputProsCons ? 'When giving recommendations, include a short Pros / Cons section.' : ''}`,
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
          // Check if it's an MCP tool
          const isMcpTool = mcpToolsList.some((t: any) => t.name === toolName)

          let toolOutput
          if (isMcpTool) {
            toolOutput = await callMcpTool(toolName, args)
          } else {
            toolOutput = await executeTool(toolName, args, req.scope)
          }

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
          // Check if it's an MCP tool
          const isMcpTool = mcpToolsList.some((t: any) => t.name === toolName)

          let toolOutput
          if (isMcpTool) {
            toolOutput = await callMcpTool(toolName, args)
          } else {
            toolOutput = await executeTool(toolName, args, req.scope)
          }

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
