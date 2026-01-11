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
            systemInstruction: `You are Antigravity, a professional AI assistant and specialized Store Agent for the Mero Closet Medusa Dashboard.
            
            CORE COMPETENCIES:
            - You are an expert in Medusa 2.0 (Medusa JS v2).
            - You manage products, prices, inventory, and dashboard settings using specialized tools.
            - You can process images to identify products and add them to the store.
            
            ACTION GUIDELINES:
            1. If a user asks to perform a task (e.g., "Add this product", "Change price"), check your tools FIRST.
            2. If you have a tool for the task, USE IT immediately. Do not just say you will do it; EXECUTE the tool.
            3. If information is missing (like price if not in image/text), ask the user.
            4. Once a tool is executed, summarize the result to the user.
            
            Use Markdown for all formatting. Be concise but extremely helpful.`
        })

        const pool = getPgPool()

        // Generate AI Response with tool handling
        const chatParts: any[] = history.map((m: any) => {
            const parts: any[] = []
            if (m.content.text) parts.push({ text: m.content.text })
            if (m.content.interactions) {
                m.content.interactions.forEach((inter: any) => {
                    parts.push({ functionCall: { name: inter.name, args: inter.args } })
                    parts.push({ functionResponse: { name: inter.name, response: inter.result } })
                })
            }
            return {
                role: m.role === "user" ? "user" : "model",
                parts
            }
        })

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

        // Save User Message
        await pool.query(`
          INSERT INTO "ai_messages" (session_id, role, content)
          VALUES ($1, $2, $3)
        `, [sessionId, "user", JSON.stringify({ type: "text", text: prompt, has_images: images.length > 0 })])

        const chat = model.startChat({
            history: chatParts,
            generationConfig: {
                ...(config.thinkingBudget ? { thinkingConfig: { include_thoughts: true, total_thinking_budget_token_count: config.thinkingBudget } } : {})
            } as any
        })

        let result = await chat.sendMessage(activeUserParts)
        let responseText = ""
        let thoughts = ""
        let toolInteractions: any[] = []

        // Extract thoughts if any (Gemini 2.0 Flash Thinking)
        const extractThoughts = (response: any) => {
            let t = ""
            const parts = response.candidates?.[0]?.content?.parts || []
            for (const part of parts) {
                if (part.thought) {
                    t += part.text || ""
                }
            }
            return t
        }

        thoughts += extractThoughts(result.response)

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
                    toolInteractions.push({ type: "call", name, args, result: toolResult })
                }
            }

            // Send tool results back to get the final text response
            result = await chat.sendMessage(toolResults)
            thoughts += extractThoughts(result.response)
        }

        responseText = result.response.text()

        // Save AI Response with interactions
        const aiMsgResult = await pool.query(`
          INSERT INTO "ai_messages" (session_id, role, content)
          VALUES ($1, $2, $3)
          RETURNING *
        `, [sessionId, "model", JSON.stringify({
            type: "text",
            text: responseText,
            thoughts: thoughts || undefined,
            interactions: toolInteractions.length > 0 ? toolInteractions : undefined
        })])

        res.json(aiMsgResult.rows[0])
    } catch (error: any) {
        console.error("AI CHAT ERROR:", error)
        res.status(500).json({ message: "AI response failed", error: error.message })
    }
}
