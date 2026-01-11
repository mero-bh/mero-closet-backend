import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Heading, Button, toast, Text } from "@medusajs/ui"
import { ChatBubble, Trash, Plus, SidebarLeft } from "@medusajs/icons"
import { useQuery, useMutation } from "@tanstack/react-query"
import { useState, useRef, useEffect } from "react"
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

type Message = {
    id: string
    session_id: string
    role: "user" | "model"
    content: {
        type: "text" | "image"
        text?: string
        url?: string
    }
    created_at: string
}

type Session = {
    id: string
    title: string
    updated_at: string
}

const AIChatPage = () => {
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
    const [input, setInput] = useState("")
    const [isSidebarOpen, setIsSidebarOpen] = useState(true)
    const chatEndRef = useRef<HTMLDivElement>(null)

    // Fetch Sessions
    const { data: sessionsData, refetch: refetchSessions, isLoading: isLoadingSessions } = useQuery({
        queryKey: ["ai_sessions"],
        queryFn: async () => {
            const res = await fetch("/admin/ai/sessions")
            if (!res.ok) throw new Error("Failed to fetch sessions")
            return res.json() as Promise<{ sessions: Session[] }>
        }
    })

    // Fetch Active Session Messages
    const { data: activeSessionData, refetch: refetchMessages } = useQuery({
        queryKey: ["ai_messages", activeSessionId],
        queryFn: async () => {
            if (!activeSessionId) return null
            const res = await fetch(`/admin/ai/sessions/${activeSessionId}`)
            if (!res.ok) throw new Error("Failed to fetch session messages")
            return res.json() as Promise<{ session: Session, messages: Message[] }>
        },
        enabled: !!activeSessionId
    })

    // Mutations
    const createSession = useMutation({
        mutationFn: async (title: string) => {
            const res = await fetch("/admin/ai/sessions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title })
            })
            return res.json()
        },
        onSuccess: (data) => {
            refetchSessions()
            setActiveSessionId(data.id)
            toast.success("New chat created")
        }
    })

    const deleteSession = useMutation({
        mutationFn: async (id: string) => {
            await fetch(`/admin/ai/sessions/${id}`, { method: "DELETE" })
        },
        onSuccess: () => {
            refetchSessions()
            if (activeSessionId) setActiveSessionId(null)
            toast.success("Chat deleted")
        }
    })

    const sendMessage = useMutation({
        mutationFn: async ({ prompt, history }: { prompt: string, history: Message[] }) => {
            const res = await fetch("/admin/ai/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sessionId: activeSessionId, prompt, history })
            })
            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.message || "Failed to get AI response")
            }
            return res.json()
        },
        onSuccess: () => {
            refetchMessages()
            setInput("")
        },
        onError: (e: any) => {
            toast.error("AI Error", { description: e.message })
        }
    })

    const handleSend = () => {
        if (!input.trim() || !activeSessionId || sendMessage.isPending) return
        const history = activeSessionData?.messages || []
        sendMessage.mutate({ prompt: input, history })
    }

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [activeSessionData?.messages, sendMessage.isPending])

    const sessions = sessionsData?.sessions || []
    const messages = activeSessionData?.messages || []

    return (
        <div className="flex h-[calc(100vh-120px)] overflow-hidden rounded-xl border bg-ui-bg-subtle shadow-sm">
            {/* Sidebar */}
            <div
                className={`${isSidebarOpen ? 'w-64' : 'w-0'} transition-all duration-300 border-r bg-ui-bg-base flex flex-col overflow-hidden`}
            >
                <div className="p-4 border-b flex items-center justify-between">
                    <Heading level="h3" className="text-sm">History</Heading>
                    <Button variant="transparent" size="small" onClick={() => createSession.mutate("New Chat")}>
                        <Plus />
                    </Button>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {sessions.map(s => (
                        <div
                            key={s.id}
                            onClick={() => setActiveSessionId(s.id)}
                            className={`group flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer text-sm transition-colors ${activeSessionId === s.id ? 'bg-ui-bg-interactive text-ui-fg-on-color' : 'hover:bg-ui-bg-base-hover'
                                }`}
                        >
                            <div className="flex items-center gap-2 truncate">
                                <ChatBubble className="w-4 h-4" />
                                <span className="truncate">{s.title}</span>
                            </div>
                            <button
                                onClick={(e) => { e.stopPropagation(); deleteSession.mutate(s.id) }}
                                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:text-ui-fg-error"
                            >
                                <Trash className="w-3 h-3" />
                            </button>
                        </div>
                    ))}
                    {sessions.length === 0 && !isLoadingSessions && (
                        <div className="text-center py-4 text-xs text-ui-fg-subtle">No chats yet</div>
                    )}
                </div>
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col bg-ui-bg-base relative">
                {/* Header */}
                <div className="h-14 border-b flex items-center justify-between px-4">
                    <div className="flex items-center gap-3">
                        <Button variant="transparent" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
                            <SidebarLeft />
                        </Button>
                        <Heading level="h2" className="text-base font-semibold">
                            {activeSessionData?.session?.title || "AI Assistant"}
                        </Heading>
                    </div>
                    <div className="flex items-center gap-2">
                        <Text size="xsmall" className="text-ui-fg-subtle">Powered by Google Gemini</Text>
                    </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {!activeSessionId ? (
                        <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                            <div className="w-16 h-16 rounded-full bg-ui-bg-interactive/10 flex items-center justify-center">
                                <ChatBubble className="w-8 h-8 text-ui-bg-interactive" />
                            </div>
                            <div>
                                <Heading level="h1">How can I help you today?</Heading>
                                <Text className="text-ui-fg-subtle mt-1">Start a new conversation or select one from the history.</Text>
                            </div>
                            <Button onClick={() => createSession.mutate("New Chat")}>
                                New Chat
                            </Button>
                        </div>
                    ) : (
                        <>
                            {messages.map((m) => (
                                <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div
                                        className={`max-w-[80%] rounded-2xl p-4 shadow-sm border ${m.role === 'user'
                                            ? 'bg-ui-bg-interactive text-ui-fg-on-color border-transparent'
                                            : 'bg-ui-bg-subtle border-ui-border-base'
                                            }`}
                                    >
                                        <div className="prose prose-sm dark:prose-invert max-w-none">
                                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                {m.content.text || ""}
                                            </ReactMarkdown>
                                        </div>
                                        <div className={`text-[10px] mt-2 ${m.role === 'user' ? 'text-ui-fg-on-color/70' : 'text-ui-fg-subtle'}`}>
                                            {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {sendMessage.isPending && (
                                <div className="flex justify-start">
                                    <div className="bg-ui-bg-subtle border border-ui-border-base rounded-2xl p-4 shadow-sm flex items-center gap-2">
                                        <div className="flex gap-1">
                                            <div className="w-1.5 h-1.5 bg-ui-fg-subtle rounded-full animate-bounce" />
                                            <div className="w-1.5 h-1.5 bg-ui-fg-subtle rounded-full animate-bounce [animation-delay:0.2s]" />
                                            <div className="w-1.5 h-1.5 bg-ui-fg-subtle rounded-full animate-bounce [animation-delay:0.4s]" />
                                        </div>
                                        <span className="text-xs text-ui-fg-subtle font-medium">AI is thinking...</span>
                                    </div>
                                </div>
                            )}
                            <div ref={chatEndRef} />
                        </>
                    )}
                </div>

                {/* Input Area */}
                {activeSessionId && (
                    <div className="p-4 border-t bg-ui-bg-base/50 backdrop-blur-md">
                        <div className="mx-auto max-w-4xl relative flex items-end gap-2">
                            <div className="flex-1 relative">
                                <textarea
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder="Type your message..."
                                    className="w-full bg-ui-bg-field border rounded-2xl pl-4 pr-12 py-3 focus:ring-2 focus:ring-ui-bg-interactive focus:outline-none text-sm resize-none min-h-[50px] max-h-[200px]"
                                    rows={1}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault()
                                            handleSend()
                                        }
                                    }}
                                    onInput={(e: any) => {
                                        e.target.style.height = 'auto'
                                        e.target.style.height = e.target.scrollHeight + 'px'
                                    }}
                                />
                                <button
                                    onClick={handleSend}
                                    disabled={!input.trim() || sendMessage.isPending}
                                    className="absolute right-2 bottom-2 p-2 rounded-xl bg-ui-bg-interactive text-white disabled:bg-ui-bg-disabled disabled:text-ui-fg-muted transition-all"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                                </button>
                            </div>
                        </div>
                        <div className="text-center mt-2">
                            <Text size="xsmall" className="text-ui-fg-subtle">
                                AI can make mistakes. Consider checking important information.
                            </Text>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

export const config = defineRouteConfig({
    label: "AI Chat",
    icon: ChatBubble,
    rank: 1,
})

export default AIChatPage
