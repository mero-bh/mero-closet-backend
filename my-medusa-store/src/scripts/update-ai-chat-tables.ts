import { getPgPool } from "../utils/pg"
import * as dotenv from "dotenv"
import path from "path"

dotenv.config({ path: path.join(__dirname, "../../.env") })

async function updateAiChatTables() {
    const pool = getPgPool()
    const queries = [
        `ALTER TABLE "ai_sessions" ADD COLUMN IF NOT EXISTS "model" TEXT DEFAULT 'gemini-2.0-flash-exp'`,
        `ALTER TABLE "ai_sessions" ADD COLUMN IF NOT EXISTS "resolution" TEXT DEFAULT '1024x1024'`,
        `ALTER TABLE "ai_sessions" ADD COLUMN IF NOT EXISTS "search_enabled" BOOLEAN DEFAULT FALSE`,
        `ALTER TABLE "ai_sessions" ADD COLUMN IF NOT EXISTS "thinking_budget" INTEGER DEFAULT 0`
    ]

    try {
        console.log("Updating AI chat tables with config columns...")
        for (const q of queries) {
            await pool.query(q)
        }
        console.log("AI chat tables updated successfully.")
    } catch (error) {
        console.error("Error updating AI chat tables:", error)
    } finally {
        process.exit()
    }
}

updateAiChatTables()
