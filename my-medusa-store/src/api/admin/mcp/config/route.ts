import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { getMcpConfig, saveMcpConfig, McpConfig } from "../../../../utils/mcp-integration"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
    try {
        const config = await getMcpConfig()
        res.json({ config })
    } catch (error: any) {
        res.status(500).json({ message: "Failed to read config", error: error.message })
    }
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
    try {
        const config = req.body as McpConfig
        // Basic validation
        if (!config || typeof config !== "object") {
            return res.status(400).json({ message: "Invalid config body" })
        }

        await saveMcpConfig(config)
        res.json({ message: "Config saved", success: true })
    } catch (error: any) {
        res.status(500).json({ message: "Failed to save config", error: error.message })
    }
}
