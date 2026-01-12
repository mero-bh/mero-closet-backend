import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { getActiveServerStatus, connectToServers } from "../../../../utils/mcp-integration"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
    try {
        // Ensure we attempt to connect/refresh state based on current config
        await connectToServers()

        const status = getActiveServerStatus()
        res.json({ servers: status })
    } catch (error: any) {
        res.status(500).json({ message: "Failed to get MCP status", error: error.message })
    }
}
