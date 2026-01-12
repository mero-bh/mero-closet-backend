import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js"
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js"
import fs from "fs/promises"
import path from "path"

// Configuration types
export type McpServerConfig = {
    command?: string
    args?: string[]
    env?: Record<string, string>
    url?: string
    headers?: Record<string, string>
    disabled?: boolean
}

export type McpConfig = {
    mcpServers: Record<string, McpServerConfig>
}

// Runtime server state
type ActiveServer = {
    client: Client
    transport: SSEClientTransport | StdioClientTransport
    config: McpServerConfig
    status: "connected" | "failed"
    error?: string
    tools?: any[]
}

const ACTIVE_SERVERS: Record<string, ActiveServer> = {}
const CONFIG_FILE = path.join(process.cwd(), "mcp.config.json")

// Helper to read config
export async function getMcpConfig(): Promise<McpConfig> {
    try {
        const data = await fs.readFile(CONFIG_FILE, "utf-8")
        return JSON.parse(data)
    } catch (error) {
        // Default config if missing
        return { mcpServers: {} }
    }
}

// Helper to save config
export async function saveMcpConfig(config: McpConfig): Promise<void> {
    await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2), "utf-8")
    // Refresh connections after save
    await connectToServers(config)
}

// Connect to all configured servers
export async function connectToServers(config?: McpConfig) {
    if (!config) {
        config = await getMcpConfig()
    }

    // Identify removed servers
    const currentNames = new Set(Object.keys(config.mcpServers))
    for (const name of Object.keys(ACTIVE_SERVERS)) {
        if (!currentNames.has(name) || config.mcpServers[name].disabled) {
            await disconnectServer(name)
        }
    }

    // Connect/Reconnect servers
    for (const [name, serverConfig] of Object.entries(config.mcpServers)) {
        if (serverConfig.disabled) continue

        // If already connected and config hasn't changed deeply, skip (optimization)
        // For now, we will just skip if connected. User can force reconnect by saving.
        if (ACTIVE_SERVERS[name]?.status === "connected") {
            continue
        }

        await connectSingleServer(name, serverConfig)
    }

    return ACTIVE_SERVERS
}

async function disconnectServer(name: string) {
    const server = ACTIVE_SERVERS[name]
    if (server) {
        try {
            await server.transport.close()
        } catch (e) {
            console.error(`Error closing transport for ${name}:`, e)
        }
        delete ACTIVE_SERVERS[name]
    }
}

async function connectSingleServer(name: string, config: McpServerConfig) {
    let transport: SSEClientTransport | StdioClientTransport

    try {
        if (config.url) {
            // remote/sse
            transport = new SSEClientTransport(new URL(config.url), {
                eventSourceInit: {
                    headers: config.headers,
                } as any,
            })
        } else if (config.command) {
            // stdio
            transport = new StdioClientTransport({
                command: config.command,
                args: config.args,
                env: { ...process.env, ...(config.env || {}) } as any,
            })
        } else {
            throw new Error("Invalid config: missing 'url' or 'command'")
        }

        const client = new Client(
            { name: "Medusa Store Agent", version: "1.0.0" },
            { capabilities: {} }
        )

        await client.connect(transport)

        // Fetch available tools
        const toolsResult = await client.listTools()

        ACTIVE_SERVERS[name] = {
            client,
            transport,
            config,
            status: "connected",
            tools: toolsResult.tools,
        }
        console.log(`[MCP] Connected to ${name}`)
    } catch (e: any) {
        console.error(`[MCP] Failed to connect to ${name}:`, e)
        ACTIVE_SERVERS[name] = {
            client: null as any,
            transport: null as any,
            config,
            status: "failed",
            error: e.message,
        }
    }
}

// Get all tools from all connected servers
export async function listMcpTools() {
    // Ensure we are connected
    if (Object.keys(ACTIVE_SERVERS).length === 0) {
        await connectToServers()
    }

    const allTools: any[] = []
    for (const [serverName, server] of Object.entries(ACTIVE_SERVERS)) {
        if (server.status === "connected" && server.tools) {
            allTools.push(
                ...server.tools.map((t) => ({
                    ...t,
                    // Optional: Namespacing to avoid collisions? e.g. "github_create_issue"
                    // For now, assume unique names or let LLM figure it out.
                    sourceServer: serverName,
                }))
            )
        }
    }
    return allTools
}

export async function callMcpTool(name: string, args: any) {
    // Find which server has this tool
    for (const server of Object.values(ACTIVE_SERVERS)) {
        if (server.status === "connected" && server.tools) {
            const tool = server.tools.find((t) => t.name === name)
            if (tool) {
                return await server.client.callTool({
                    name,
                    arguments: args
                })
            }
        }
    }
    throw new Error(`Tool ${name} not found on any active MCP server`)
}

export function getActiveServerStatus() {
    return Object.entries(ACTIVE_SERVERS).map(([name, s]) => ({
        name,
        status: s.status,
        error: s.error,
        toolsCount: s.tools?.length || 0,
        tools: s.tools || []
    }))
}
