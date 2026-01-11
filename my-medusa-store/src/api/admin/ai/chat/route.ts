import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { getPgPool } from "../../../../utils/pg"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
    const { sessionId, prompt, history = [] } = req.body as {
        sessionId: string;
        prompt: string;
        history: any[]
    }

    const apiKey = process.env.GOOGLE_AI_API_KEY
    if (!apiKey) {
        return res.status(500).json({ message: "GOOGLE_AI_API_KEY is not set in environment" })
    }

    try {
        const genAI = new GoogleGenerativeAI(apiKey)
        const model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash-exp",
            systemInstruction: "You are Antigravity, a professional AI assistant integrated into the Mero Closet Medusa Dashboard. You are helpful, expert in coding and e-commerce. If the user asks for an image, acknowledge their request and try to describe what you would generate."
        })

        // Save User Message
        const pool = getPgPool()
        const userMsgQuery = `
      INSERT INTO "ai_messages" (session_id, role, content)
      VALUES ($1, $2, $3)
      RETURNING *
    `
        await pool.query(userMsgQuery, [sessionId, "user", JSON.stringify({ type: "text", text: prompt })])

        // Update session timestamp and potentially title if it's the first message
        await pool.query('UPDATE "ai_sessions" SET updated_at = NOW() WHERE id = $1', [sessionId])

        // Generate AI Response
        // Convert history to Gemini format
        const chat = model.startChat({
            history: history.map((m: any) => ({
                role: m.role === "user" ? "user" : "model",
                parts: [{ text: m.content.text || "" }]
            }))
        })

        const result = await chat.sendMessage(prompt)
        const responseText = result.response.text()

        // Save AI Response
        const aiMsgQuery = `
      INSERT INTO "ai_messages" (session_id, role, content)
      VALUES ($1, $2, $3)
      RETURNING *
    `
        const aiMsgResult = await pool.query(aiMsgQuery, [sessionId, "model", JSON.stringify({ type: "text", text: responseText })])

        res.json(aiMsgResult.rows[0])
    } catch (error: any) {
        console.error("AI CHAT ERROR:", error)
        res.status(500).json({ message: "AI response failed", error: error.message })
    }
}
