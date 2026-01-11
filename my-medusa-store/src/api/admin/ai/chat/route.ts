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
            agentMode?: boolean;
        }
    }

    const apiKey = process.env.GOOGLE_AI_API_KEY
    if (!apiKey) {
        return res.status(500).json({ message: "GOOGLE_AI_API_KEY is not set in environment" })
    }

    // Default to stable Flash model if 2.0 Pro is failing
    const modelName = config.model || "gemini-2.0-flash-exp"

    try {
        const genAI = new GoogleGenerativeAI(apiKey)

        const { aiTools, executeTool } = require("../../../../utils/ai-tools")

        // Only use thinking on supported models to avoid crashes
        const isThinkingModel = modelName.includes("thinking")

        const model = genAI.getGenerativeModel({
            model: modelName,
            tools: config.agentMode !== false ? aiTools : undefined,
            generationConfig: isThinkingModel ? {
                // @ts-ignore - latest SDK supports thinkingConfig
                thinkingConfig: {
                    includeThoughts: true,
                }
            } : {},
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
            const role = m.role === "user" ? "user" : "model"

            // Handle multimodal inputs (images + text)
            if (role === "user" && m.images && m.images.length > 0) {
                return {
                    role,
                    parts: [
                        { text: m.content },
                        ...m.images.map((img: any) => ({
                            inlineData: {
                                mimeType: img.mimeType,
                                data: img.data
                            }
                        }))
                    ]
                }
            }

            return { role, parts: [{ text: m.content }] }
        })

        // Current Interaction
        const userParts: any[] = [{ text: prompt }]
        if (images && images.length > 0) {
            images.forEach(img => {
                userParts.push({
                    inlineData: {
                        mimeType: img.mimeType,
                        data: img.data
                    }
                })
            })
        }

        const chat = model.startChat({
            history: chatParts
        })

        let result = await chat.sendMessage(userParts)
        let responseText = result.response.text()
        const toolInteractions: any[] = []
        let thoughts: string | null = null

        // Capture Thinking Process if available (Gemini 2.0 Thinking)
        // @ts-ignore
        if (result.response.candidates?.[0]?.content?.parts?.[0]?.thought) {
            // @ts-ignore
            thoughts = result.response.candidates[0].content.parts[0].thought
        }

        // --- RECURSIVE TOOL EXECUTION LOOP ---
        let functionCalls = result.response.functionCalls()

        // Loop while the model wants to call functions (up to a limit to prevent infinite loops)
        let maxToolLoops = 5
        while (functionCalls && functionCalls.length > 0 && maxToolLoops > 0) {
            maxToolLoops--

            const toolResults: any[] = []

            for (const call of functionCalls) {
                console.log(`EXECUTING TOOL: ${call.name}`, call.args)

                // Execute the tool locally
                try {
                    const toolOutput = await executeTool(call.name, call.args, req.scope)

                    toolInteractions.push({
                        type: "tool_use",
                        name: call.name,
                        args: call.args,
                        result: toolOutput
                    })

                    toolResults.push({
                        functionResponse: {
                            name: call.name,
                            response: toolOutput
                        }
                    })
                } catch (toolError: any) {
                    console.error(`TOOL EXECUTION FAILED [${call.name}]:`, toolError)
                    toolResults.push({
                        functionResponse: {
                            name: call.name,
                            response: { error: toolError.message }
                        }
                    })
                    toolInteractions.push({
                        type: "tool_use",
                        name: call.name,
                        args: call.args,
                        result: { success: false, error: toolError.message }
                    })
                }
            }

            // Feed results back to the model
            result = await chat.sendMessage(toolResults)
            responseText = result.response.text()
            functionCalls = result.response.functionCalls()
        }

        // Save User Message
        await pool.query(`
          INSERT INTO "ai_messages" (session_id, role, content)
          VALUES ($1, $2, $3)
        `, [sessionId, "user", JSON.stringify({
            type: "text",
            text: prompt,
            images: images && images.length > 0 ? images.map(i => ({ mimeType: i.mimeType, data: i.data })) : undefined
        })])

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

export const AUTHENTICATED = true

export const CONFIG = {
    maxBodySize: 50 * 1024 * 1024, // 50MB
}
