import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { getPgPool } from "../../../../utils/pg"

type ImagePart = { mimeType: string; data: string }

type RouteConfig = {
    model?: string
    resolution?: string
    searchEnabled?: boolean
    thinkingBudget?: number
    agentMode?: boolean
}

const AVAILABLE_GOOGLE_MODELS = [
    // Gemini 2.5 (recommended)
    "gemini-2.5-flash",
    "gemini-2.5-pro",
    "gemini-2.5-flash-lite",

    // Fallbacks
    "gemini-2.0-flash",
] as const

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

        // Common shapes: { type: "text", text: "..." }
        if (typeof obj.text === "string") return obj.text
        if (typeof obj.content === "string") return obj.content
        if (typeof obj.message === "string") return obj.message

        // If the client sent a rich object, stringify it
        return JSON.stringify(obj)
    }

    if (Array.isArray(maybeParsed)) {
        return maybeParsed.map((x) => normalizeText(x)).join("\n")
    }

    return String(maybeParsed ?? "")
}

function sanitizeImages(images: unknown): ImagePart[] {
    if (!Array.isArray(images)) return []
    return images
        .map((img: any) => ({
            mimeType: typeof img?.mimeType === "string" ? img.mimeType : "",
            data: typeof img?.data === "string" ? img.data : "",
        }))
        .filter((i) => i.mimeType.length > 0 && i.data.length > 0)
}

function buildMessageParts(text: string, imgs: ImagePart[]) {
    const parts: any[] = []
    const t = (text ?? "").toString().trim()
    if (t.length > 0) parts.push({ text: t })

    for (const img of imgs) {
        parts.push({
            inlineData: {
                mimeType: img.mimeType,
                data: img.data,
            },
        })
    }

    return parts
}

function pickModel(requested: string | undefined) {
    // Default to Gemini 2.5 Flash (stable)
    const fallback = "gemini-2.5-flash"

    if (!requested) return fallback
    if (AVAILABLE_MODEL_SET.has(requested)) return requested

    return fallback
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
    const {
        sessionId,
        prompt,
        history = [],
        images = [],
        config = {},
    } = req.body as {
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

    const modelName = pickModel(config.model)

    try {
        const genAI = new GoogleGenerativeAI(apiKey)

        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { aiTools, executeTool } = require("../../../../utils/ai-tools")

        const isGemini25 =
            modelName.startsWith("gemini-2.5-")

        // Tools
        const tools: any[] = []
        if (config.agentMode !== false) {
            tools.push({ functionDeclarations: aiTools?.[0]?.functionDeclarations ?? [] })
        }

        // Search grounding (Gemini >= 2.0 uses GoogleSearch tool)
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
1. **Control the View**: If a task requires a specific page (e.g., "I want to add a product"), NAVIGATE the user there immediately using 'navigate_to'.
2. **Consult Docs**: If you or the user are unsure about a Medusa concept, use 'get_documentation' to provide accurate, context-aware answers.
3. **Execute Tools**: Don't just talk. If you can do it (list customers, create product), DO IT using the available tools.
4. **Be Proactive**: If you list products, offer to navigate to their details.

Use Markdown for all formatting. Be concise, professional, and action-oriented.`,
        })

        const pool = getPgPool()

        // Normalize history to Gemini "history" format
        const safeHistory = Array.isArray(history) ? history : []
        const chatHistory = safeHistory
            .map((m: any) => {
                const role = m?.role === "user" ? "user" : "model"

                // m.content might be string OR object OR JSON-string
                const parsedContent = tryParseJsonString(m?.content ?? m?.text ?? m?.message ?? "")
                const text = normalizeText(parsedContent)

                // Images may exist on m.images OR inside content.images
                const imgFromMsg = sanitizeImages(m?.images)
                const imgFromContent = sanitizeImages((parsedContent as any)?.images)
                const mergedImages = imgFromMsg.length > 0 ? imgFromMsg : imgFromContent

                const parts = buildMessageParts(text, mergedImages)

                // Avoid sending empty parts (can cause weird behavior)
                if (!parts || parts.length === 0) return null

                return { role, parts }
            })
            .filter(Boolean)

        // Current user interaction parts
        const promptText = normalizeText(prompt)
        const currentImages = sanitizeImages(images)

        const userParts = buildMessageParts(promptText, currentImages)

        const chat = model.startChat({
            history: chatHistory as any,
        })

        let result = await chat.sendMessage(userParts)
        let responseText = result.response.text()

        // Capture thought summaries if available
        let thoughts: string | null = null
        try {
            // Gemini API returns thought summaries as parts with "thought" boolean
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

        const toolInteractions: any[] = []

        // Tool loop
        let functionCalls = result.response.functionCalls()
        let maxToolLoops = 5

        while (functionCalls && functionCalls.length > 0 && maxToolLoops > 0) {
            maxToolLoops--

            const toolResults: any[] = []

            for (const call of functionCalls) {
                console.log(`EXECUTING TOOL: ${call.name}`, call.args)

                try {
                    const toolOutput = await executeTool(call.name, call.args, req.scope)
                    const safeOutput = safeForJson(toolOutput)

                    toolInteractions.push({
                        type: "tool_use",
                        name: call.name,
                        args: safeForJson(call.args),
                        result: safeOutput,
                    })

                    toolResults.push({
                        functionResponse: {
                            name: call.name,
                            response: typeof safeOutput === "object" && safeOutput !== null ? safeOutput : { result: safeOutput },
                        },
                    })
                } catch (toolError: any) {
                    console.error(`TOOL EXECUTION FAILED [${call.name}]:`, toolError)

                    const errObj = { error: toolError?.message ?? "Tool failed" }

                    toolResults.push({
                        functionResponse: {
                            name: call.name,
                            response: errObj,
                        },
                    })

                    toolInteractions.push({
                        type: "tool_use",
                        name: call.name,
                        args: safeForJson(call.args),
                        result: { success: false, ...errObj },
                    })
                }
            }

            result = await chat.sendMessage(toolResults)
            responseText = result.response.text()

            // Refresh function calls
            functionCalls = result.response.functionCalls()
        }

        // Save user message (store as structured JSON)
        await pool.query(
            `
      INSERT INTO "ai_messages" (session_id, role, content)
      VALUES ($1, $2, $3)
      `,
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

        // Save AI message
        const aiMsgResult = await pool.query(
            `
      INSERT INTO "ai_messages" (session_id, role, content)
      VALUES ($1, $2, $3)
      RETURNING *
      `,
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
