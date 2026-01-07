import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Client } from "pg"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
    const secret = process.env.PING_SECRET
    if (secret && req.query.secret !== secret) {
        return res.status(401).send("Unauthorized")
    }

    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined,
    })

    try {
        await client.connect()
        await client.query("select 1")
        await client.end()
    } catch (err) {
        console.error("Ping database error:", err)
        return res.status(500).json({ ok: false, error: "Database ping failed" })
    }

    return res.json({ ok: true, ts: new Date().toISOString() })
}
