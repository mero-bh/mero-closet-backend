import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import EventSource from "eventsource";

// Define the URL of your local MCP server
const MCP_SERVER_URL = "http://localhost:3000/mcp";
const MCP_API_KEY = process.env.MCP_API_KEY || "YOUR_MCP_API_KEY"; // Ensure this is set in .env

// Global client instance to reuse connection if possible, 
// though for stateless HTTP calls like Next.js routes, we might need to reconnect or manage lifecycle carefully.
// Medusa 2.0 API routes are also stateless.
let mcpClient: Client | null = null;
let mcpTransport: SSEClientTransport | null = null;

export async function getMcpClient() {
    if (mcpClient && mcpTransport) {
        return mcpClient; // Return existing client if connected
    }

    // Set up transport
    mcpTransport = new SSEClientTransport(new URL(MCP_SERVER_URL), {
        eventSourceInit: {
            headers: {
                "x-mcp-api-key": MCP_API_KEY,
            }
        }
    });

    // Create client
    mcpClient = new Client({
        name: "Medusa Store Agent",
        version: "1.0.0",
    }, {
        capabilities: {
            tools: {}, // We want to use tools
        }
    });

    // Connect
    try {
        await mcpClient.connect(mcpTransport);
        console.log("Connected to MCP Server at", MCP_SERVER_URL);
    } catch (error) {
        console.error("Failed to connect to MCP Server:", error);
        mcpClient = null;
        mcpTransport = null;
        throw error;
    }

    return mcpClient;
}

export async function listMcpTools() {
    try {
        const client = await getMcpClient();
        const result = await client.listTools();
        return result.tools;
    } catch (error) {
        console.error("Error listing MCP tools:", error);
        return [];
    }
}

export async function callMcpTool(name: string, args: any) {
    try {
        const client = await getMcpClient();
        const result = await client.callTool({
            name,
            arguments: args,
        });
        return result;
    } catch (error) {
        console.error(`Error calling MCP tool ${name}:`, error);
        throw error;
    }
}

// Convert MCP tool definition to Gemini function declaration
export function mcpPropsToGemini(schema: any) {
    // Gemini expects a specific format for parameters.
    // MCP (JSON Schema) is mostly compatible, but we might need minor adjustments.
    // schema is { type: "object", properties: {...}, required: [...] }
    return {
        type: "OBJECT", // Gemini uses uppercase types sometimes, but "object" usually works. Let's stick to standard JSON schema if possible or map it.
        // The Google Generative AI SDK handles standard JSON schema well.
        properties: schema.properties,
        required: schema.required,
    };
}
