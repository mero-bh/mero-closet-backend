import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { getPgPool } from "../../../../utils/pg"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
    const {
        sessionId,
        prompt,
        history = [],
        images = [], // Array of { mimeType: string, data: string } (base64)
        config = {}
    } = req.body as {
        sessionId: string;
        prompt: string;
        history: any[];
        images: { mimeType: string; data: string }[];
        config: {
            model?: string;
            resolution?: string;
            searchEnabled?: boolean;
            thinkingBudget?: number;
        }
    }

    const apiKey = process.env.GOOGLE_AI_API_KEY
    if (!apiKey) {
        return res.status(500).json({ message: "GOOGLE_AI_API_KEY is not set in environment" })
    }

    const modelName = config.model || "gemini-2.0-flash-exp"

    try {
        const genAI = new GoogleGenerativeAI(apiKey)

        const { aiTools, executeTool } = require("../../../../utils/ai-tools")

        const model = genAI.getGenerativeModel({
            model: modelName,
            tools: aiTools,
            systemInstruction: "You are Antigravity, a professional AI assistant and Agent integrated into the Mero Closet Medusa Dashboard. You are helpful and expert. You have the ability to manage the store by calling functions (tools). If a user asks to add a product or change something, use the appropriate tool. If you need more info (like price), ask the user. Use Markdown for all formatting."
        })

        const pool = getPgPool()

        // Save User Message (with images if any)
        const userMessageContent = {
            type: "text",
            text: prompt,
            images: images.length > 0 ? images.map(img => ({ mimeType: img.mimeType, data: img.data.slice(0, 100) + "..." })) : undefined // Only log thumbnail for DB
        }

        // Save to DB
        await pool.query(`
      INSERT INTO "ai_messages" (session_id, role, content)
      VALUES ($1, $2, $3)
    `, [sessionId, "user", JSON.stringify(userMessageContent)])

        // Update session config
        await pool.query(`
      UPDATE "ai_sessions"
      SET updated_at = NOW(),
          model = $2,
          resolution = $3,
          search_enabled = $4,
          thinking_budget = $5
      WHERE id = $1
    `, [
            sessionId,
            modelName,
            config.resolution || "1024x1024",
            config.searchEnabled || false,
            config.thinkingBudget || 0
        ])

        // Generate AI Response with tool handling
        const chatParts: any[] = history.map((m: any) => ({
            role: m.role === "user" ? "user" : "model",
            parts: [{ text: m.content.text || "" }]
        }))

        const activeUserParts: any[] = []
        images.forEach(img => {
            activeUserParts.push({
                inlineData: {
                    mimeType: img.mimeType,
                    data: img.data
                }
            })
        })
        activeUserParts.push({ text: prompt })

        const chat = model.startChat({
            history: chatParts,
            generationConfig: {
                ...(config.thinkingBudget ? { thinkingConfig: { include_thoughts: true, total_thinking_budget_token_count: config.thinkingBudget } } : {})
            } as any
        })

        let result = await chat.sendMessage(activeUserParts)
        let responseText = ""

        // Tool Handling Loop
        while (result.response.candidates?.[0]?.content?.parts?.some((p: any) => p.functionCall)) {
            const toolResults: any[] = []
            const parts = result.response.candidates[0].content.parts

            for (const part of parts) {
                if (part.functionCall) {
                    const { name, args } = part.functionCall
                    const toolResult = await executeTool(name, args, req.scope)
                    toolResults.push({
                        functionResponse: {
                            name,
                            response: toolResult
                        }
                    })
                }
            }

            // Send tool results back to get the final text response
            result = await chat.sendMessage(toolResults)
        }

        responseText = result.response.text()

        // Save AI Response
        const aiMsgResult = await pool.query(`
      INSERT INTO "ai_messages" (session_id, role, content)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [sessionId, "model", JSON.stringify({ type: "text", text: responseText })])

        res.json(aiMsgResult.rows[0])
    } catch (error: any) {
        console.error("AI CHAT ERROR:", error)
        res.status(500).json({ message: "AI response failed", error: error.message })
    }
}
