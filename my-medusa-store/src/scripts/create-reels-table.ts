import { getPgPool } from "../utils/pg"
import * as dotenv from "dotenv"
import path from "path"

dotenv.config({ path: path.join(__dirname, "../../.env") })

async function createReelsTable() {
    const pool = getPgPool()
    const query = `
    CREATE EXTENSION IF NOT EXISTS "pgcrypto";
    CREATE TABLE IF NOT EXISTS "reels" (
      "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      "url" TEXT NOT NULL,
      "public_id" TEXT NOT NULL,
      "type" TEXT NOT NULL,
      "duration_type" TEXT NOT NULL,
      "expires_at" TIMESTAMP WITH TIME ZONE,
      "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `
    try {
        console.log("Creating reels table in Neon...")
        await pool.query(query)
        console.log("Table 'reels' created or already exists.")
    } catch (error) {
        console.error("Error creating reels table:", error)
    } finally {
        process.exit()
    }
}

createReelsTable()
