import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Heading, Button, toast, Text, Switch, Label } from "@medusajs/ui"
import { ChatBubble, Trash, Plus, SidebarLeft, Photo, GlobeEuropeSolid } from "@medusajs/icons"
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

const AIChatPage = () => {
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
    const [input, setInput] = useState("")
    const [isSidebarOpen, setIsSidebarOpen] = useState(true)
    const [pendingImages, setPendingImages] = useState<{ mimeType: string, data: string }[]>([])
    const [isTyping, setIsTyping] = useState(false)
    const [animatedText, setAnimatedText] = useState("")

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

    const sendMessage = useMutation({
        mutationFn: async ({ prompt, history, images }: { prompt: string, history: Message[], images: any[] }) => {
            const res = await fetch("/admin/ai/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    sessionId: activeSessionId,
                    prompt,
                    history,
                    images,
                    config: { model, resolution, searchEnabled, thinkingBudget }
                })
            })
            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.message || "Failed to get AI response")
            }
            return res.json()
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
            toast.error("AI Error", { description: e.message })
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
                    {sessions.map(s => (
                        <div
                            key={s.id}
                            onClick={() => setActiveSessionId(s.id)}
                            className={`group flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer text-sm transition-all ${activeSessionId === s.id ? 'bg-ui-bg-interactive text-ui-fg-on-color shadow-sm scale-[1.02]' : 'hover:bg-ui-bg-base-hover'
                                }`}
                        >
                            <div className="flex items-center gap-3 truncate">
                                <ChatBubble className={`w-4 h-4 ${activeSessionId === s.id ? 'text-white' : 'text-ui-fg-subtle'}`} />
                                <span className="truncate font-medium">{s.title}</span>
                            </div>
                            <button
                                onClick={(e) => { e.stopPropagation(); deleteSession.mutate(s.id) }}
                                className={`opacity-0 group-hover:opacity-100 transition-opacity p-1 ${activeSessionId === s.id ? 'hover:text-red-200' : 'hover:text-ui-fg-error'}`}
                            >
                                <Trash className="w-3.5 h-3.5" />
                            </button>
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
                                <option value="gemini-2.0-flash-exp">2.0 Flash</option>
                                <option value="gemini-2.0-flash-lite-preview-02-05">2.0 Lite</option>
                                <option value="gemini-2.0-pro-exp-02-05">2.0 Pro</option>
                                <option value="gemini-1.5-pro">1.5 Pro</option>
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
                                    <div className="flex gap-4 max-w-[85%]">
                                        {/* Role Icon */}
                                        {m.role === 'model' && (
                                            <div className="w-8 h-8 rounded-full bg-ui-bg-interactive flex items-center justify-center shrink-0 shadow-lg shadow-ui-bg-interactive/20">
                                                <span className="text-[10px] font-bold text-white">AI</span>
                                            </div>
                                        )}

                                        <div
                                            className={`rounded-3xl p-5 shadow-sm border ${m.role === 'user'
                                                ? 'bg-ui-bg-interactive text-ui-fg-on-color border-transparent'
                                                : 'bg-ui-bg-subtle border-ui-border-base'
                                                }`}
                                        >
                                            <div className="prose prose-sm dark:prose-invert max-w-none">
                                                <ReactMarkdown
                                                    remarkPlugins={[remarkGfm]}
                                                    components={{
                                                        code({ node, inline, className, children, ...props }: any) {
                                                            return !inline ? <CodeBlock {...props}>{children}</CodeBlock> : <code className="bg-ui-bg-base px-1 rounded text-red-400 font-mono" {...props}>{children}</code>
                                                        }
                                                    }}
                                                >
                                                    {m.content.text || ""}
                                                </ReactMarkdown>
                                            </div>

                                            {/* Image Preview for User Messages */}
                                            {m.role === 'user' && m.content.images && (
                                                <div className="grid grid-cols-3 gap-2 mt-4">
                                                    {m.content.images.map((img, i) => (
                                                        <div key={i} className="aspect-square rounded-xl bg-black/20 flex items-center justify-center overflow-hidden border border-white/20">
                                                            <span className="text-[10px] opacity-70">Image Attached</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            <div className={`text-[9px] font-bold uppercase tracking-wider mt-3 opacity-50 ${m.role === 'user' ? 'text-right' : ''}`}>
                                                {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </div>

                                        {m.role === 'user' && (
                                            <div className="w-8 h-8 rounded-full bg-ui-bg-subtle border border-ui-border-base flex items-center justify-center shrink-0">
                                                <span className="text-[10px] font-bold text-ui-fg-base">U</span>
                                            </div>
                                        )}
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
                                    placeholder="Ask Antigravity anything..."
                                    className="flex-1 bg-transparent border-none pl-2 py-4 focus:ring-0 focus:outline-none text-sm font-medium resize-none min-h-[56px] max-h-[300px] leading-relaxed"
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
                                    disabled={(!input.trim() && pendingImages.length === 0) || sendMessage.isPending}
                                    className="mb-2 p-3 rounded-2xl bg-ui-bg-interactive text-white disabled:bg-ui-bg-disabled disabled:text-ui-fg-muted transition-all hover:shadow-lg hover:shadow-ui-bg-interactive/40 active:scale-95 shadow-md"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                                </button>
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
