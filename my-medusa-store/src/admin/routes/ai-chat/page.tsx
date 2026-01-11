import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Heading, Button, toast, Text, Switch, Label } from "@medusajs/ui"
import { ChatBubble, Trash, Plus, SidebarLeft, Photo, GlobeEuropeSolid, ChevronDown } from "@medusajs/icons"
import { useQuery, useMutation } from "@tanstack/react-query"
import { useState, useRef, useEffect, useCallback } from "react"
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

// --- Types ---
type Message = {
    id: string
    session_id: string
    role: "user" | "model"
    content: {
        type: "text" | "image"
        text?: string
        url?: string
        images?: { mimeType: string, data: string }[]
    }
    created_at: string
}

type Session = {
    id: string
    title: string
    updated_at: string
    model: string
    resolution: string
    search_enabled: boolean
    thinking_budget: number
}

// --- Components ---

const CodeBlock = ({ children, ...props }: any) => {
    const [copied, setCopied] = useState(false)
    const code = String(children).replace(/\n$/, '')

    const handleCopy = () => {
        navigator.clipboard.writeText(code)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
        toast.success("Copied to clipboard")
    }

    return (
        <div className="group relative my-4 rounded-lg overflow-hidden border border-ui-border-base bg-ui-bg-subtle/50">
            <div className="flex items-center justify-between px-4 py-1.5 bg-ui-bg-base border-b border-ui-border-base">
                <span className="text-[10px] font-mono font-bold text-ui-fg-subtle uppercase">Code</span>
                <button
                    onClick={handleCopy}
                    className="text-ui-fg-muted hover:text-ui-fg-interactive transition-colors text-[10px] font-medium flex items-center gap-1"
                >
                    {copied ? "Copied!" : "Copy"}
                </button>
            </div>
            <pre className="p-4 overflow-x-auto text-xs font-mono leading-relaxed bg-ui-bg-base/30">
                <code {...props}>{children}</code>
            </pre>
        </div>
    )
}

const models = [
    { id: "gemini-2.0-flash-exp", name: "Gemini 2.0 Flash", description: "Fast and smart (Default)" },
    { id: "gemini-2.0-pro-exp-02-05", name: "Gemini 2.0 Pro", description: "Advanced reasoning & intelligence" },
    { id: "gemini-2.0-flash-lite-preview-02-05", name: "Gemini 2.0 Lite", description: "Lightweight and efficient" },
    { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro", description: "Complex logic and long context" },
    { id: "gemini-3-pro-placeholder", name: "Gemini 3 Pro", description: "Next-gen experimental model" },
    { id: "gemini-2.5-preview-placeholder", name: "Gemini 2.5 Preview", description: "Experimental preview" },
    { id: "gemini-2.5-pro-placeholder", name: "Gemini 2.5 Pro", description: "Experimental pro model" },
]

const Reasoning = ({ content, loading }: { content: string, loading?: boolean }) => {
    const [isOpen, setIsOpen] = useState(false)
    const [initialized, setInitialized] = useState(false)

    useEffect(() => {
        if (!initialized) {
            setInitialized(true)
            if (loading) setIsOpen(true)
        }
    }, [loading, initialized])

    return (
        <div className="mb-4 bg-ui-bg-subtle/50 rounded-lg border border-ui-border-base/50 overflow-hidden">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-3 text-xs font-medium text-ui-fg-muted hover:bg-ui-bg-base-hover transition-colors"
            >
                <div className="flex items-center gap-2">
                    <div className="w-5 h-5 flex items-center justify-center bg-ui-bg-base border rounded shadow-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 32 32">
                            <path
                                className="stroke-ui-fg-muted"
                                style={{ strokeWidth: 2, fill: "none", strokeLinecap: "round", strokeLinejoin: "round" }}
                                d="M16 6v3.33M16 6c0-2.65 3.25-4.3 5.4-2.62 1.2.95 1.6 2.65.95 4.04a3.63 3.63 0 0 1 4.61.16 3.45 3.45 0 0 1 .46 4.37 5.32 5.32 0 0 1 1.87 4.75c-.22 1.66-1.39 3.6-3.07 4.14M16 6c0-2.65-3.25-4.3-5.4-2.62a3.37 3.37 0 0 0-.95 4.04 3.65 3.65 0 0 0-4.6.16 3.37 3.37 0 0 0-.49 4.27 5.57 5.57 0 0 0-1.85 4.85 5.3 5.3 0 0 0 3.07 4.15M16 9.33v17.34m0-17.34c0 2.18 1.82 4 4 4m6.22 7.5c.67 1.3.56 2.91-.27 4.11a4.05 4.05 0 0 1-4.62 1.5c0 1.53-1.05 2.9-2.66 2.9A2.7 2.7 0 0 1 16 26.66m10.22-5.83a4.05 4.05 0 0 0-3.55-2.17m-16.9 2.18a4.05 4.05 0 0 0 .28 4.1c1 1.44 2.92 2.09 4.59 1.5 0 1.52 1.12 2.88 2.7 2.88A2.7 2.7 0 0 0 16 26.67M5.78 20.85a4.04 4.04 0 0 1 3.55-2.18"
                            />
                        </svg>
                    </div>
                    {loading ? "Thinking..." : "Reasoning"}
                </div>
                <div className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}>
                    <ChevronDown />
                </div>
            </button>
            {isOpen && (
                <div className="p-4 pt-0 border-t border-ui-border-base/30 bg-ui-bg-base/20">
                    <div className="prose prose-invert prose-sm max-w-none text-ui-fg-muted italic leading-relaxed">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {content}
                        </ReactMarkdown>
                    </div>
                </div>
            )}
        </div>
    )
}

const AIChatPage = () => {
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
    const [input, setInput] = useState("")
    const [isSidebarOpen, setIsSidebarOpen] = useState(true)
    const [pendingImages, setPendingImages] = useState<{ mimeType: string, data: string }[]>([])
    const [isTyping, setIsTyping] = useState(false)
    const [animatedText, setAnimatedText] = useState("")
    const [showImageModal, setShowImageModal] = useState(false)
    const [modalImageSrc, setModalImageSrc] = useState<string | null>(null)
    const [editingSessionId, setEditingSessionId] = useState<string | null>(null)
    const [editTitle, setEditTitle] = useState("")

    // Model Config State
    const [model, setModel] = useState("gemini-2.0-flash-exp")
    const [resolution, setResolution] = useState("1024x1024")
    const [searchEnabled, setSearchEnabled] = useState(false)
    const [thinkingBudget, setThinkingBudget] = useState(0)

    const chatEndRef = useRef<HTMLDivElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // --- Data Fetching ---
    const { data: sessionsData, refetch: refetchSessions, isLoading: isLoadingSessions } = useQuery({
        queryKey: ["ai_sessions"],
        queryFn: async () => {
            const res = await fetch("/admin/ai/sessions")
            if (!res.ok) throw new Error("Failed to fetch sessions")
            return res.json() as Promise<{ sessions: Session[] }>
        }
    })

    const { data: activeSessionData, refetch: refetchMessages } = useQuery({
        queryKey: ["ai_messages", activeSessionId],
        queryFn: async () => {
            if (!activeSessionId) return null
            const res = await fetch(`/admin/ai/sessions/${activeSessionId}`)
            if (!res.ok) throw new Error("Failed to fetch session messages")
            const data = await res.json() as { session: Session, messages: Message[] }

            // Update config from session
            setModel(data.session.model)
            setResolution(data.session.resolution)
            setSearchEnabled(data.session.search_enabled)
            setThinkingBudget(data.session.thinking_budget)

            return data
        },
        enabled: !!activeSessionId
    })

    // --- Mutations ---
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
            if (activeSessionId === deleteSession.variables) setActiveSessionId(null)
            toast.success("Chat deleted")
        }
    })

    const [abortController, setAbortController] = useState<AbortController | null>(null)

    const updateSessionTitle = useMutation({
        mutationFn: async ({ id, title }: { id: string, title: string }) => {
            const res = await fetch(`/admin/ai/sessions/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title })
            })
            return res.json()
        },
        onSuccess: () => {
            refetchSessions()
            toast.success("Chat renamed")
        }
    })

    const sendMessage = useMutation({
        mutationFn: async ({ prompt, history, images }: { prompt: string, history: Message[], images: any[] }) => {
            const controller = new AbortController()
            setAbortController(controller)

            try {
                const res = await fetch("/admin/ai/chat", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        sessionId: activeSessionId,
                        prompt,
                        history,
                        images,
                        config: { model, resolution, searchEnabled, thinkingBudget }
                    }),
                    signal: controller.signal
                })
                if (!res.ok) {
                    const err = await res.json()
                    throw new Error(err.message || "Failed to get AI response")
                }
                return res.json()
            } finally {
                setAbortController(null)
            }
        },
        onSuccess: (data: Message) => {
            refetchMessages()
            refetchSessions() // Update timestamp
            setInput("")
            setPendingImages([])

            // Typing effect
            setIsTyping(true)
            const text = data.content.text || ""
            let currentIdx = 0
            setAnimatedText("")

            const interval = setInterval(() => {
                setAnimatedText(prev => prev + text.charAt(currentIdx))
                currentIdx++
                if (currentIdx >= text.length) {
                    clearInterval(interval)
                    setIsTyping(false)
                }
            }, 5) // Faster typing
        },
        onError: (e: any) => {
            if (e.name === 'AbortError') {
                toast.info("Generation stopped")
            } else {
                toast.error("AI Error", { description: e.message })
            }
        }
    })

    // --- Handlers ---
    const handleSend = () => {
        if ((!input.trim() && pendingImages.length === 0) || !activeSessionId || sendMessage.isPending) return
        const history = activeSessionData?.messages || []
        sendMessage.mutate({ prompt: input, history, images: pendingImages })
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files
        if (!files) return
        if (pendingImages.length + files.length > 3) {
            toast.error("Limit reached", { description: "You can attach max 3 images." })
            return
        }

        Array.from(files).forEach(file => {
            const reader = new FileReader()
            reader.onload = (ev) => {
                const data = ev.target?.result as string
                setPendingImages(prev => [...prev, {
                    mimeType: file.type,
                    data: data.split(',')[1]
                }])
            }
            reader.readAsDataURL(file)
        })
        if (fileInputRef.current) fileInputRef.current.value = ""
    }

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [activeSessionData?.messages, sendMessage.isPending, animatedText])

    const sessions = sessionsData?.sessions || []
    const messages = activeSessionData?.messages || []

    return (
        <div className="flex h-[calc(100vh-80px)] overflow-hidden rounded-xl border bg-ui-bg-subtle shadow-sm m-[-24px]">
            {/* Sidebar */}
            <div
                className={`${isSidebarOpen ? 'w-72' : 'w-0'} transition-all duration-300 border-r bg-ui-bg-base flex flex-col overflow-hidden`}
            >
                <div className="p-4 border-b flex items-center justify-between bg-ui-bg-subtle/30">
                    <Heading level="h3" className="text-sm font-bold flex items-center gap-2">
                        <SidebarLeft /> History
                    </Heading>
                    <Button variant="transparent" size="small" onClick={() => createSession.mutate("New Chat")}>
                        <Plus />
                    </Button>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-1 bg-ui-bg-base">
                    {sessions.map((s) => (
                        <div
                            key={s.id}
                            onClick={() => setActiveSessionId(s.id)}
                            className={`group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${activeSessionId === s.id
                                ? "bg-ui-bg-interactive text-ui-fg-on-color shadow-md shadow-ui-bg-interactive/20"
                                : "hover:bg-ui-bg-base-hover text-ui-fg-base"
                                }`}
                        >
                            <div className="flex items-center gap-3 overflow-hidden">
                                <ChatBubble className={`shrink-0 ${activeSessionId === s.id ? "text-white/80" : "text-ui-fg-muted"}`} />
                                <div className="flex flex-col truncate">
                                    <span className="text-[11px] font-bold leading-none truncate mb-1">
                                        {s.title || "New Chat"}
                                    </span>
                                    <span className={`text-[9px] ${activeSessionId === s.id ? "text-white/60" : "text-ui-fg-muted"}`}>
                                        {new Date(s.updated_at).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        setEditTitle(s.title)
                                        setEditingSessionId(s.id)
                                    }}
                                    className={`p-1.5 rounded-lg hover:bg-black/10 transition-colors ${activeSessionId === s.id ? "text-white" : "text-ui-fg-muted"}`}
                                >
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                    </svg>
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        deleteSession.mutate(s.id)
                                    }}
                                    className={`p-1.5 rounded-lg hover:bg-black/10 transition-colors ${activeSessionId === s.id ? "text-white" : "text-ui-fg-muted"}`}
                                >
                                    <Trash />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col bg-ui-bg-base relative">
                {/* Header with Selective Logic */}
                <div className="h-16 border-b flex items-center justify-between px-6 bg-ui-bg-base/80 backdrop-blur-xl z-20 sticky top-0">
                    <div className="flex items-center gap-4">
                        <Button variant="transparent" onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2">
                            <SidebarLeft />
                        </Button>
                        <div>
                            <Heading level="h2" className="text-base font-bold text-ui-fg-base">
                                {activeSessionData?.session?.title || "Antigravity AI"}
                            </Heading>
                            {activeSessionId && (
                                <div className="flex items-center gap-x-3 mt-0.5">
                                    <span className="text-[10px] font-bold text-ui-fg-subtle uppercase px-1.5 py-0.5 bg-ui-bg-subtle rounded">{model}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {activeSessionId && (
                        <div className="flex items-center gap-x-4">
                            <div className="flex items-center gap-x-1.5">
                                <GlobeEuropeSolid className={`w-4 h-4 ${searchEnabled ? 'text-blue-500' : 'text-ui-fg-muted'}`} />
                                <Switch checked={searchEnabled} onCheckedChange={setSearchEnabled} size="small" />
                            </div>

                            <select
                                value={model}
                                onChange={(e) => setModel(e.target.value)}
                                className="text-[11px] font-bold bg-ui-bg-subtle border rounded-lg px-2 py-1 outline-none appearance-none hover:bg-ui-bg-base-hover transition-colors pr-6 relative"
                                style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2712%27 height=%2712%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27currentColor%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3E%3Cpolyline points=%276 9 12 15 18 9%27%3E%3C/polyline%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 6px center' }}
                            >
                                {models.map((m) => (
                                    <option key={m.id} value={m.id}>
                                        {m.name}
                                    </option>
                                ))}
                            </select>

                            <select
                                value={resolution}
                                onChange={(e) => setResolution(e.target.value)}
                                className="text-[11px] font-bold bg-ui-bg-subtle border rounded-lg px-2 py-1 outline-none appearance-none pr-6"
                                style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2712%27 height=%2712%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27currentColor%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3E%3Cpolyline points=%276 9 12 15 18 9%27%3E%3C/polyline%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 6px center' }}
                            >
                                <option value="1024x1024">1024x1024</option>
                                <option value="1024x1792">1024x1792</option>
                            </select>
                        </div>
                    )}
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-ui-bg-base no-scrollbar">
                    {!activeSessionId ? (
                        <div className="h-full flex flex-col items-center justify-center text-center space-y-6">
                            <div className="w-20 h-20 rounded-3xl bg-ui-bg-interactive/10 flex items-center justify-center rotate-12 shadow-inner">
                                <ChatBubble className="w-10 h-10 text-ui-bg-interactive" />
                            </div>
                            <div>
                                <Heading level="h1" className="text-3xl font-extrabold tracking-tight">Antigravity AI</Heading>
                                <Text className="text-ui-fg-subtle mt-2 text-lg">Deep reasoning and image awareness built into your store.</Text>
                            </div>
                            <Button size="large" onClick={() => createSession.mutate("New Chat")} className="rounded-2xl px-8">
                                Initialize Connection
                            </Button>
                        </div>
                    ) : (
                        <>
                            {messages.map((m) => (
                                <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in duration-300`}>
                                    <div className={`flex gap-4 max-w-[85%] ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-lg ${m.role === 'model' ? 'bg-ui-bg-interactive shadow-ui-bg-interactive/20' : 'bg-ui-bg-subtle border border-ui-border-base shadow-sm'}`}>
                                            <span className={`text-[10px] font-bold ${m.role === 'model' ? 'text-white' : 'text-ui-fg-base'}`}>
                                                {m.role === 'model' ? 'AI' : 'U'}
                                            </span>
                                        </div>

                                        <div
                                            className={`rounded-3xl p-5 shadow-sm border ${m.role === 'user'
                                                ? 'bg-ui-bg-interactive/10 border-ui-border-interactive/30'
                                                : 'bg-ui-bg-subtle border-ui-border-base'
                                                }`}
                                        >
                                            {m.role === 'model' && m.content.thoughts && (
                                                <Reasoning content={m.content.thoughts} loading={false} />
                                            )}

                                            <div className={`prose prose-sm dark:prose-invert max-w-none ${m.role === 'user' ? 'text-ui-fg-base font-medium' : ''}`}>
                                                <ReactMarkdown
                                                    remarkPlugins={[remarkGfm]}
                                                    components={{
                                                        code({ node, inline, className, children, ...props }: any) {
                                                            const match = /language-(\w+)/.exec(className || "")
                                                            return !inline && match ? (
                                                                <CodeBlock language={match[1]} value={String(children).replace(/\n$/, "")} />
                                                            ) : (
                                                                <code className="bg-ui-bg-base/50 px-1.5 py-0.5 rounded text-ui-fg-interactive font-mono text-[11px]" {...props}>
                                                                    {children}
                                                                </code>
                                                            )
                                                        },
                                                        img({ node, ...props }: any) {
                                                            return (
                                                                <img
                                                                    {...props}
                                                                    className="rounded-2xl border border-ui-border-base cursor-pointer hover:opacity-90 transition-opacity max-w-full h-auto my-3 shadow-md"
                                                                    onClick={() => {
                                                                        setModalImageSrc(props.src)
                                                                        setShowImageModal(true)
                                                                    }}
                                                                />
                                                            )
                                                        }
                                                    }}
                                                >
                                                    {m.role === "model" && m.id === messages[messages.length - 1].id && isTyping ? animatedText : m.content.text}
                                                </ReactMarkdown>
                                            </div>

                                            <div className={`text-[9px] font-bold uppercase tracking-wider mt-3 opacity-40 ${m.role === 'user' ? 'text-right' : ''}`}>
                                                {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {/* Typing Animation Area */}
                            {(sendMessage.isPending || isTyping) && (
                                <div className="flex justify-start animate-in fade-in slide-in-from-left-4 duration-500">
                                    <div className="flex gap-4 max-w-[85%]">
                                        <div className="w-8 h-8 rounded-full bg-ui-bg-interactive flex items-center justify-center shrink-0 animate-pulse">
                                            <span className="text-[10px] font-bold text-white">AI</span>
                                        </div>
                                        <div className="bg-ui-bg-subtle border border-ui-border-base rounded-3xl p-5 shadow-sm min-w-[100px]">
                                            {sendMessage.isPending ? (
                                                <div className="flex items-center gap-3">
                                                    <div className="flex gap-1.5">
                                                        <div className="w-2 h-2 bg-ui-bg-interactive rounded-full animate-bounce [animation-duration:1s]" />
                                                        <div className="w-2 h-2 bg-ui-bg-interactive rounded-full animate-bounce [animation-delay:0.2s] [animation-duration:1s]" />
                                                        <div className="w-2 h-2 bg-ui-bg-interactive rounded-full animate-bounce [animation-delay:0.4s] [animation-duration:1s]" />
                                                    </div>
                                                    <span className="text-[11px] font-bold text-ui-fg-subtle tracking-tight">Thinking...</span>
                                                </div>
                                            ) : (
                                                <div className="prose prose-sm dark:prose-invert max-w-none">
                                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                        {animatedText + "█"}
                                                    </ReactMarkdown>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div ref={chatEndRef} className="h-4" />
                        </>
                    )}
                </div>

                {/* Input Area */}
                {activeSessionId && (
                    <div className="p-6 border-t bg-ui-bg-base/95 backdrop-blur-xl z-30">
                        <div className="mx-auto max-w-5xl">

                            {/* Attachment Previews */}
                            {pendingImages.length > 0 && (
                                <div className="flex gap-3 mb-4 p-2 bg-ui-bg-subtle/50 rounded-2xl border border-ui-border-base overflow-x-auto no-scrollbar">
                                    {pendingImages.map((img, i) => (
                                        <div key={i} className="relative group shrink-0">
                                            <img
                                                src={`data:${img.mimeType};base64,${img.data}`}
                                                className="w-16 h-16 object-cover rounded-xl border border-ui-border-base shadow-sm group-hover:opacity-75 transition-opacity"
                                                alt=""
                                            />
                                            <button
                                                onClick={() => setPendingImages(prev => prev.filter((_, idx) => idx !== i))}
                                                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-ui-fg-error text-white rounded-full flex items-center justify-center text-[10px] shadow-sm hover:scale-110 active:scale-90 transition-transform"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    ))}
                                    {pendingImages.length < 3 && (
                                        <button
                                            onClick={() => fileInputRef.current?.click()}
                                            className="w-16 h-16 rounded-xl border-2 border-dashed border-ui-border-strong flex items-center justify-center text-ui-fg-muted hover:border-ui-bg-interactive hover:text-ui-bg-interactive transition-all"
                                        >
                                            <Plus className="w-5 h-5" />
                                        </button>
                                    )}
                                </div>
                            )}

                            <div className="relative flex items-end gap-3 bg-ui-bg-field border-2 border-transparent focus-within:border-ui-bg-interactive transition-all rounded-[28px] p-2 pr-4 shadow-xl shadow-ui-bg-interactive/5">
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    onChange={handleFileChange}
                                    accept="image/*"
                                    multiple
                                />

                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="p-3.5 rounded-2xl text-ui-fg-subtle hover:bg-ui-bg-base-hover hover:text-ui-bg-interactive transition-all"
                                    title="Attach images (Max 3)"
                                >
                                    <Photo className="w-6 h-6" />
                                </button>

                                <textarea
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" && !e.shiftKey) {
                                            e.preventDefault()
                                            handleSend()
                                        }
                                    }}
                                    placeholder="Ask me anything... (Type / for tools)"
                                    className="flex-1 bg-transparent border-none focus:ring-0 resize-none py-2 px-1 text-sm max-h-32 min-h-[40px] leading-relaxed"
                                />

                                {sendMessage.isPending || isTyping ? (
                                    <button
                                        onClick={() => {
                                            if (abortController) {
                                                abortController.abort()
                                                setAbortController(null)
                                            }
                                            setIsTyping(false)
                                        }}
                                        className="p-2.5 rounded-xl bg-ui-bg-error/10 text-ui-fg-error hover:bg-ui-bg-error/20 transition-all flex items-center gap-2 group"
                                        title="Stop generating"
                                    >
                                        <div className="w-2 h-2 bg-ui-fg-error rounded-sm animate-pulse" />
                                        <span className="text-[10px] font-bold uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">Stop</span>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                        </svg>
                                    </button>
                                ) : (
                                    <button
                                        onClick={handleSend}
                                        disabled={(!input.trim() && pendingImages.length === 0) || isTyping}
                                        className={`p-2.5 rounded-xl transition-all ${(!input.trim() && pendingImages.length === 0) || isTyping ? 'text-ui-fg-muted cursor-not-allowed' : 'bg-ui-bg-interactive text-ui-fg-on-color shadow-lg hover:shadow-ui-shadow-interactive'}`}
                                    >
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <line x1="22" y1="2" x2="11" y2="13"></line>
                                            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                                        </svg>
                                    </button>
                                )}
                            </div>
                            <div className="flex items-center justify-between mt-4 px-2">
                                <div className="flex gap-4">
                                    <div className="flex items-center gap-1.5 opacity-60">
                                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                        <span className="text-[10px] font-bold text-ui-fg-subtle">Ready</span>
                                    </div>
                                </div>
                                <Text size="xsmall" className="text-ui-fg-subtle font-medium italic opacity-60">
                                    Antigravity may provide info that should be verified.
                                </Text>
                            </div>
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
