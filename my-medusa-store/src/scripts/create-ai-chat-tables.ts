import { getPgPool } from "../utils/pg"
import * as dotenv from "dotenv"
import path from "path"

dotenv.config({ path: path.join(__dirname, "../../.env") })

async function createAiChatTables() {
    const pool = getPgPool()
    const query = `
    CREATE EXTENSION IF NOT EXISTS "pgcrypto";

    CREATE TABLE IF NOT EXISTS "ai_sessions" (
      "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      "title" TEXT NOT NULL DEFAULT 'New Conversation',
      "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS "ai_messages" (
      "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      "session_id" UUID NOT NULL REFERENCES "ai_sessions"("id") ON DELETE CASCADE,
      "role" TEXT NOT NULL,
      "content" JSONB NOT NULL,
      "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS "idx_ai_messages_session_id" ON "ai_messages"("session_id");
  `
    try {
        console.log("Creating AI chat tables in Neon...")
        await pool.query(query)
        console.log("AI chat tables created or already exist.")
    } catch (error) {
        console.error("Error creating AI chat tables:", error)
    } finally {
        process.exit()
    }
}

createAiChatTables()
