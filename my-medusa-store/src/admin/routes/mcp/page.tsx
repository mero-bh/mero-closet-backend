import { Container, Heading, Text, Button, Textarea, StatusBadge } from "@medusajs/ui"
import { useState, useEffect } from "react"
import { defineRouteConfig } from "@medusajs/admin-sdk"
import { ComputerDesktop, ArrowPath } from "@medusajs/icons"

type ServerStatus = {
    name: string
    status: "connected" | "failed"
    error?: string
    toolsCount: number
    tools: any[]
}

const MCPPage = () => {
    const [functionJson, setFunctionJson] = useState<string>("{\n  \"mcpServers\": {}\n}")
    const [servers, setServers] = useState<ServerStatus[]>([])
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)

    // Fetch initial config
    useEffect(() => {
        fetch("/admin/mcp/config")
            .then((res) => res.json())
            .then((data) => {
                if (data.config) {
                    setFunctionJson(JSON.stringify(data.config, null, 2))
                }
            })
            .catch((err) => console.error("Failed to load config", err))

        refreshStatus()
    }, [])

    const refreshStatus = () => {
        setLoading(true)
        fetch("/admin/mcp/tools")
            .then((res) => res.json())
            .then((data) => {
                if (data.servers) {
                    setServers(data.servers)
                }
            })
            .catch((err) => console.error("Failed to load status", err))
            .finally(() => setLoading(false))
    }

    const handleSave = async () => {
        setSaving(true)
        try {
            const parsed = JSON.parse(functionJson)
            const res = await fetch("/admin/mcp/config", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(parsed),
            })
            if (res.ok) {
                alert("Configuration saved!")
                refreshStatus()
            } else {
                alert("Failed to save configuration")
            }
        } catch (e: any) {
            alert("Invalid JSON: " + e.message)
        } finally {
            setSaving(false)
        }
    }

    return (
        <Container className="p-8 gap-y-8 flex flex-col min-h-screen bg-ui-bg-subtle">
            <div className="flex items-center justify-between">
                <div>
                    <Heading level="h1" className="text-2xl font-bold text-ui-fg-base">MCP Configuration</Heading>
                    <Text className="text-ui-fg-subtle">Manage your Model Context Protocol servers and tools.</Text>
                </div>
                <Button variant="secondary" onClick={refreshStatus}>
                    <ArrowPath className={loading ? "animate-spin" : ""} />
                    Refresh Status
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
                {/* Editor Column */}
                <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <Heading level="h2">Configuration (JSON)</Heading>
                        <Button
                            variant="primary"
                            onClick={handleSave}
                            isLoading={saving}
                        >
                            Save Configuration
                        </Button>
                    </div>
                    <Text className="text-sm text-ui-fg-muted">
                        Define your `mcpServers` here. Secrets should be handled via env vars if possible, strictly for dev/admin use.
                    </Text>
                    <Textarea
                        className="w-full h-[600px] font-mono text-sm"
                        value={functionJson}
                        onChange={(e) => setFunctionJson(e.target.value)}
                        spellCheck={false}
                        placeholder='{ "mcpServers": { ... } }'
                    />
                </div>

                {/* Status Column */}
                <div className="flex flex-col gap-4">
                    <Heading level="h2">Connected Servers</Heading>
                    {loading ? (
                        <Text>Loading status...</Text>
                    ) : servers.length === 0 ? (
                        <Text className="text-ui-fg-muted italic">No active servers found. Add one in the config.</Text>
                    ) : (
                        <div className="flex flex-col gap-4">
                            {servers.map((server) => (
                                <Container key={server.name} className="p-4 border border-ui-border-base bg-ui-bg-base rounded-lg shadow-sm">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-2">
                                            <Heading level="h3" className="text-lg">{server.name}</Heading>
                                            <StatusBadge color={server.status === "connected" ? "green" : "red"}>
                                                {server.status}
                                            </StatusBadge>
                                        </div>
                                        <Text className="text-xs text-ui-fg-subtle">
                                            {server.toolsCount} tools
                                        </Text>
                                    </div>

                                    {server.error && (
                                        <div className="bg-red-500/10 text-red-500 p-2 rounded text-xs font-mono mb-2 break-all">
                                            {server.error}
                                        </div>
                                    )}

                                    {server.tools.length > 0 && (
                                        <div className="mt-2">
                                            <Text className="text-xs font-semibold uppercase text-ui-fg-muted mb-2">Available Tools</Text>
                                            <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto">
                                                {server.tools.map((tool: any) => (
                                                    <div key={tool.name} className="p-2 bg-ui-bg-subtle rounded border border-ui-border-transparent hover:border-ui-border-base transition-colors">
                                                        <div className="font-mono text-xs font-bold text-ui-fg-base">{tool.name}</div>
                                                        <div className="text-xs text-ui-fg-subtle truncate">{tool.description}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </Container>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </Container>
    )
}

export const config = defineRouteConfig({
    label: "MCP Config",
    icon: ComputerDesktop,
})

export default MCPPage
