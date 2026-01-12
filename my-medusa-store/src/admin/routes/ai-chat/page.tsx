import { defineRouteConfig } from "@medusajs/admin-sdk"
import { useNavigate } from "react-router-dom"
import { Heading, Button, toast, Text, Switch } from "@medusajs/ui"
import { ChatBubble, Trash, Plus, SidebarLeft, Photo, GlobeEuropeSolid, ChevronDown, XMark, Eye, CheckCircleSolid, RocketLaunch, ComputerDesktop, Map, Sparkles, ArrowRightOnRectangle, PlaySolid, PauseSolid, InformationCircleSolid } from "@medusajs/icons"
import { useQuery, useMutation } from "@tanstack/react-query"
import { useState, useRef, useEffect } from "react"
import * as SwitchPrimitives from "@radix-ui/react-switch"
import { motion, AnimatePresence } from "framer-motion"
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ImageGenModal } from "./components/ImageGenModal"

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
        thoughts?: string
        interactions?: { type: string, name: string, args: any, result: any }[]
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
            <div className="flex items-center justify-between px-4 py-6 bg-ui-bg-base border-b border-ui-border-base">
                <span className="text-[10px]  font-semibold text-ui-fg-subtle uppercase">Code</span>
                <button
                    onClick={handleCopy}
                    className="text-ui-fg-muted hover:text-ui-fg-interactive transition-colors text-[10px] font-medium flex items-center gap-1"
                >
                    {copied ? "Copied!" : "Copy"}
                </button>
            </div>
            <pre className="p-4 overflow-x-auto text-xs leading-relaxed bg-ui-bg-base/30">
                <code {...props}>{children}</code>
            </pre>
        </div>
    )
}

const models = [
    { id: "gemini-3-pro-preview", name: "Gemini 3.0 Pro", description: "The New Standard • Thinking Enabled", features: { vision: true, agent: true, imageGen: true, thoughts: true }, date: "2026-03-01" },
    { id: "gemini-3-flash-preview", name: "Gemini 3.0 Flash", description: "Ultra-Fast • Thinking Enabled", features: { vision: true, agent: true, thoughts: true }, date: "2026-03-01" },
    { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro", description: "Stable • Higher quality", features: { vision: true, agent: true, imageGen: true, thoughts: false }, date: "2026-01-11" },
    { id: "gemini-2.5-flash-thinking", name: "Gemini 2.5 Flash Thinking", description: "Fast + Deep Reasoning", features: { vision: true, agent: true, thoughts: true }, date: "2026-01-11" },
    { id: "gemini-2.0-flash-thinking-exp-01-21", name: "Gemini 2.0 Flash Thinking", description: "Deep Reasoning (Specialist)", features: { vision: true, thoughts: true, agent: true }, date: "2025-01-21" },
    { id: "gemini-2.0-pro-exp-02-05", name: "Gemini 2.0 Pro", description: "Elite Intelligence & Coding", features: { vision: true, agent: true, imageGen: true, thoughts: false }, date: "2025-02-05" },
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

const ToolInteraction = ({
    interaction,
    onSelect
}: {
    interaction: { type: string, name: string, args: any, result: any }
    onSelect?: () => void
}) => {
    const requiresConfirmation = Boolean(interaction.result?.requires_confirmation)
    const isExecuted = !requiresConfirmation && interaction.result?.success !== false

    // Determine priority from args or defaults (mocking for now)
    const priority = "High"

    return (
        <div
            className="mb-3 bg-ui-bg-subtle/30 rounded-xl border border-ui-border-base/40 overflow-hidden group hover:border-ui-border-interactive/50 hover:shadow-md transition-all cursor-pointer"
            onClick={onSelect}
        >
            <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-ui-fg-muted uppercase tracking-wider mb-1">{interaction.name.replace(/_/g, ' ')}</span>
                        <Heading level="h3" className="text-sm font-semibold text-ui-fg-base leading-tight">
                            {interaction.args?.title || `Execute ${interaction.name}`}
                        </Heading>
                    </div>
                    <div>
                        {isExecuted ? <CheckCircleSolid className="text-green-500" /> : <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />}
                    </div>
                </div>

                <Text className="text-xs text-ui-fg-subtle mb-3 line-clamp-2">
                    {interaction.args?.description || JSON.stringify(interaction.args)}
                </Text>

                <div className="flex items-center justify-between pt-3 border-t border-ui-border-base/30">
                    <div className="flex items-center gap-2 text-[10px]">
                        <span className={`px-1.5 py-0.5 rounded border font-medium ${priority === 'High' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' : 'bg-blue-500/10 text-blue-500'}`}>
                            {priority} Priority
                        </span>
                        <span className={`px-1.5 py-0.5 rounded border font-medium ${requiresConfirmation ? 'bg-orange-500/10 text-orange-500' : 'bg-green-500/10 text-green-500'}`}>
                            {requiresConfirmation ? 'Pending' : 'Done'}
                        </span>
                    </div>
                    <ArrowRightOnRectangle width={14} height={14} className="text-ui-fg-interactive opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
            </div>
        </div>
    )
}

const AnimatedSwitch = ({ checked, onCheckedChange, startIcon, endIcon, thumbIcon }: any) => {
    return (
        <SwitchPrimitives.Root
            checked={checked}
            onCheckedChange={onCheckedChange}
            className="group relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-border-interactive data-[state=checked]:bg-ui-bg-interactive data-[state=unchecked]:bg-ui-bg-subtle shadow-inner"
        >
            <SwitchPrimitives.Thumb
                asChild
            >
                <motion.span
                    layout
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    className="pointer-events-none flex h-5 w-5 items-center justify-center rounded-full bg-white shadow-md ring-0 data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0 z-10"
                >
                    {thumbIcon || (checked ? startIcon : endIcon)}
                </motion.span>
            </SwitchPrimitives.Thumb>
            <div className="absolute inset-0 flex items-center justify-between px-1.5 pointer-events-none">
                <div className={`transition-opacity duration-200 ${checked ? 'opacity-100' : 'opacity-0'}`}>
                    {startIcon}
                </div>
                <div className={`transition-opacity duration-200 ${!checked ? 'opacity-100' : 'opacity-0'}`}>
                    {endIcon}
                </div>
            </div>
        </SwitchPrimitives.Root>
    )
}

const RightPanel = ({ interaction, onClose, onConfirm }: { interaction: any, onClose: () => void, onConfirm: (callId: string) => void }) => {
    const [isPlaying, setIsPlaying] = useState(false)
    const steps = interaction.args?.steps || []
    const missingInfo = interaction.args?.missing_info || []
    const isConfirmed = interaction.result?.success || interaction.result?.confirmed
    const title = interaction.args?.title || interaction.name.replace(/_/g, ' ')
    const description = interaction.args?.description || "Review the details of this action below."

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="w-full md:w-96 border-l bg-ui-bg-base h-full flex flex-col shadow-2xl absolute md:relative right-0 z-40"
        >
            {/* Header */}
            <div className="p-4 border-b flex items-center justify-between bg-ui-bg-subtle/30">
                <Heading level="h2" className="text-base font-semibold text-ui-fg-base">Action Detail</Heading>
                <Button variant="transparent" size="small" onClick={onClose}>
                    <XMark />
                </Button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold px-2 py-1 bg-ui-bg-subtle border border-ui-border-base rounded uppercase tracking-wide text-ui-fg-subtle">
                        {interaction.name.replace(/_/g, ' ')}
                    </span>
                    {isConfirmed && (
                        <span className="text-[10px] font-bold px-2 py-1 bg-green-500/10 text-green-600 border border-green-500/20 rounded flex items-center gap-1">
                            <CheckCircleSolid width={12} height={12} /> Confirmed
                        </span>
                    )}
                </div>

                <div>
                    <Heading level="h1" className="text-xl font-bold text-ui-fg-base mb-2 leading-tight">
                        {title}
                    </Heading>
                    <Text className="text-ui-fg-subtle leading-relaxed">
                        {description}
                    </Text>
                </div>

                <div className="flex gap-2">
                    <Button
                        variant="secondary"
                        size="small"
                        className={`rounded-full gap-2 ${isPlaying ? 'text-ui-fg-interactive' : ''}`}
                        onClick={() => {
                            setIsPlaying(!isPlaying)
                            // Placeholder for audio logic
                            setTimeout(() => setIsPlaying(false), 3000)
                        }}
                    >
                        {isPlaying ? <PauseSolid /> : <PlaySolid />}
                        {isPlaying ? "Playing..." : "Read Aloud"}
                    </Button>
                </div>

                {/* Steps */}
                {steps.length > 0 && (
                    <div className="space-y-3">
                        <Heading level="h3" className="text-sm font-semibold text-ui-fg-base">Steps</Heading>
                        <div className="space-y-2">
                            {steps.map((step: string, idx: number) => (
                                <div key={idx} className="flex gap-3 text-sm text-ui-fg-muted bg-ui-bg-subtle/50 p-3 rounded-lg border border-ui-border-base/50">
                                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-ui-bg-base border flex items-center justify-center text-[10px] font-medium text-ui-fg-subtle">
                                        {idx + 1}
                                    </span>
                                    <span>{step}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Missing Info */}
                {missingInfo.length > 0 && (
                    <div className="p-4 bg-orange-500/10 rounded-xl border border-orange-500/20 space-y-3">
                        <div className="flex items-center gap-2 text-orange-600 font-semibold text-sm">
                            <InformationCircleSolid width={16} height={16} />
                            <span>Missing Information</span>
                        </div>
                        <div className="space-y-2">
                            {missingInfo.map((info: string, idx: number) => (
                                <div key={idx} className="flex items-center justify-between bg-ui-bg-base p-2 rounded border border-orange-500/10 text-xs">
                                    <span className="text-ui-fg-base">{info}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {interaction.result && !isConfirmed && (
                    <div className="space-y-2">
                        <div className="text-[10px] font-semibold text-ui-fg-muted uppercase">Output</div>
                        <pre className="p-3 bg-ui-bg-subtle rounded-lg border text-[10px] overflow-x-auto text-ui-fg-subtle">
                            {JSON.stringify(interaction.result, null, 2)}
                        </pre>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t bg-ui-bg-subtle/30">
                {!isConfirmed && interaction.result?.requires_confirmation ? (
                    <Button
                        size="large"
                        className="w-full bg-ui-bg-interactive text-ui-fg-on-color shadow-lg hover:shadow-ui-shadow-interactive"
                        onClick={() => interaction.result?.call_id && onConfirm(interaction.result.call_id)}
                    >
                        Confirm & Execute <ArrowRightOnRectangle className="ml-2" />
                    </Button>
                ) : (
                    <div className="text-center text-sm font-medium text-green-600 py-2 flex items-center justify-center gap-2">
                        <CheckCircleSolid /> Action Completed
                    </div>
                )}
            </div>
        </motion.div>
    )
}

const AIChatPage = () => {
    const navigate = useNavigate()
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
    const [input, setInput] = useState("")
    const [isSidebarOpen, setIsSidebarOpen] = useState(true)
    const [pendingImages, setPendingImages] = useState<{ mimeType: string, data: string }[]>([])
    const [isTyping, setIsTyping] = useState(false)
    const [animatedText, setAnimatedText] = useState("")
    const [showImageModal, setShowImageModal] = useState(false)
    const [modalImageSrc, setModalImageSrc] = useState<string | null>(null)
    const [editingSessionId, setEditingSessionId] = useState<string | null>(null)
    const [activeInteraction, setActiveInteraction] = useState<any>(null)
    const [editTitle, setEditTitle] = useState("")

    // Image Gen State
    const [showImageGenModal, setShowImageGenModal] = useState(false)
    const [promptForImageGen, setPromptForImageGen] = useState("")

    // Model Config State
    const [model, setModel] = useState("gemini-2.5-flash")
    const [resolution, setResolution] = useState("1024x1024")
    const [searchEnabled, setSearchEnabled] = useState(false)
    const [thinkingBudget, setThinkingBudget] = useState(0)
    const [agentEnabled, setAgentEnabled] = useState(true)
    const [confirmEnabled, setConfirmEnabled] = useState(true)
    const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false)
    const modelDropdownRef = useRef<HTMLDivElement>(null)

    const chatEndRef = useRef<HTMLDivElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth < 768) {
                setIsSidebarOpen(false)
            } else {
                setIsSidebarOpen(true)
            }
        }

        // Initial check
        if (window.innerWidth < 768) {
            setIsSidebarOpen(false)
        }

        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    // --- Data Fetching ---
    const { data: sessionsData, refetch: refetchSessions } = useQuery({
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
                        config: { model, resolution, searchEnabled, thinkingBudget, agentMode: agentEnabled, confirmMode: confirmEnabled }
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

    const confirmTools = useMutation({
        mutationFn: async ({ callIds }: { callIds: string[] }) => {
            const controller = new AbortController()
            setAbortController(controller)

            try {
                const history = activeSessionData?.messages || []

                const res = await fetch("/admin/ai/chat", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        sessionId: activeSessionId,
                        confirmations: callIds,
                        history,
                        config: { model, resolution, searchEnabled, thinkingBudget, agentMode: agentEnabled, confirmMode: confirmEnabled }
                    }),
                    signal: controller.signal
                })

                if (!res.ok) {
                    const err = await res.json()
                    throw new Error(err.message || "Failed to confirm tools")
                }

                return res.json()
            } finally {
                setAbortController(null)
            }
        },
        onSuccess: () => {
            refetchMessages()
            refetchSessions()
        },
        onError: (e: any) => {
            if (e.name === 'AbortError') {
                toast.info("Request stopped")
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

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files
        if (!files) return
        if (pendingImages.length + files.length > 3) {
            toast.error("Limit reached", { description: "You can attach max 3 images." })
            return
        }

        const resizeImage = (file: File): Promise<{ mimeType: string, data: string }> => {
            return new Promise((resolve) => {
                const reader = new FileReader()
                reader.readAsDataURL(file)
                reader.onload = (event) => {
                    const img = new Image()
                    img.src = event.target?.result as string
                    img.onload = () => {
                        const canvas = document.createElement('canvas')
                        const MAX_WIDTH = 1024
                        const MAX_HEIGHT = 1024
                        let width = img.width
                        let height = img.height

                        if (width > height) {
                            if (width > MAX_WIDTH) {
                                height *= MAX_WIDTH / width
                                width = MAX_WIDTH
                            }
                        } else {
                            if (height > MAX_HEIGHT) {
                                width *= MAX_HEIGHT / height
                                height = MAX_HEIGHT
                            }
                        }

                        canvas.width = width
                        canvas.height = height
                        const ctx = canvas.getContext('2d')
                        ctx?.drawImage(img, 0, 0, width, height)

                        // Compress to JPEG 0.8 quality
                        const dataUrl = canvas.toDataURL('image/jpeg', 0.8)
                        resolve({
                            mimeType: 'image/jpeg',
                            data: dataUrl.split(',')[1]
                        })
                    }
                }
            })
        }

        const processedImages = await Promise.all(Array.from(files).map(resizeImage))
        setPendingImages(prev => [...prev, ...processedImages])

        if (fileInputRef.current) fileInputRef.current.value = ""
    }

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [activeSessionData?.messages, sendMessage.isPending, animatedText])

    // Auto-Navigation and Action Effect
    useEffect(() => {
        if (!activeSessionData?.messages) return
        const lastMsg = activeSessionData.messages[activeSessionData.messages.length - 1]

        if (lastMsg?.role === "model" && lastMsg.content.interactions) {
            for (const interaction of lastMsg.content.interactions) {
                const result = interaction.result
                if (!result) continue

                // 1. Navigation
                if (result.action === "NAVIGATE" && result.path) {
                    toast.dismiss("nav-toast")
                    toast.info(`Navigating to ${result.path}...`, { id: "nav-toast" })
                    navigate(result.path)
                }

                // 2. Open Modals
                if (result.action === "OPEN_MODAL") {
                    if (result.modal === "IMAGE_GEN") {
                        setPromptForImageGen(result.prompt || "")
                        setShowImageGenModal(true)
                        // toast.info("Opening Image Studio...", { icon: <Sparkles /> })
                    }
                }

                // 3. Language Change
                if (result.action === "LANGUAGE_CHANGE") {
                    toast.success(`Language changed to ${result.code}`, { icon: <GlobeEuropeSolid /> })
                    // Actual i18n logic would go here (e.g., changing context or localStorage)
                }
            }
        }
    }, [activeSessionData?.messages, navigate])

    const sessions = sessionsData?.sessions || []
    const messages = activeSessionData?.messages || []

    return (
        <div className="flex h-[calc(100vh-80px)] overflow-hidden rounded-xl border bg-ui-bg-subtle shadow-sm m-[-24px] relative google-sans-ai-chat">
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Arsenal+SC:ital,wght@0,400;0,700;1,400;1,700&family=Google+Sans+Flex:opsz,wght@6..144,1..1000&family=Google+Sans:opsz,wght,GRAD@17..18,451,56&family=Scheherazade+New:wght@400;500;600;700&display=swap');
                
                .google-sans-ai-chat {
                    font-family: "Google Sans", sans-serif !important;
                    font-optical-sizing: auto;
                    font-weight: 400;
                    font-style: normal;
                    font-variation-settings: "GRAD" 56;
                }
                
                .google-sans-ai-chat * {
                    font-family: "Google Sans", sans-serif !important;
                }
            `}</style>
            {/* Sidebar */}
            <div
                className={`${isSidebarOpen ? 'w-full md:w-72 absolute md:relative z-40 h-full' : 'w-0'} transition-all duration-300 border-r bg-ui-bg-base flex flex-col overflow-hidden shadow-2xl md:shadow-none`}
            >
                <div className="p-4 py-6 border-b flex items-center justify-between bg-ui-bg-subtle/30">
                    <Heading level="h3" className="text-sm font-semibold flex items-center gap-2">
                        <SidebarLeft /> History
                    </Heading>
                    <div className="flex gap-2">
                        <Button variant="transparent" size="small" onClick={() => setIsSidebarOpen(false)} className="md:hidden">
                            <XMark />
                        </Button>
                        <Button variant="transparent" size="small" onClick={() => createSession.mutate("New Chat")}>
                            <Plus />
                        </Button>
                    </div>
                </div>
                {/* ... existing sidebar content ... */}
                <div className="flex-1 overflow-y-auto p-3 space-y-1 bg-ui-bg-base">
                    {sessions.map((s) => (
                        <div
                            key={s.id}
                            onClick={() => {
                                setActiveSessionId(s.id)
                                if (window.innerWidth < 768) setIsSidebarOpen(false)
                            }}
                            className={`group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${activeSessionId === s.id
                                ? "bg-ui-bg-interactive text-ui-fg-on-color shadow-md shadow-ui-bg-interactive/20"
                                : "hover:bg-ui-bg-base-hover text-ui-fg-base"
                                }`}
                        >
                            {/* ... existing session item content ... */}
                            <div className="flex items-center gap-3 overflow-hidden">
                                <ChatBubble className={`shrink-0 ${activeSessionId === s.id ? "text-white/80" : "text-ui-fg-muted"}`} />
                                <div className="flex flex-col truncate">
                                    <span className="text-[11px] font-semibold leading-none truncate mb-1">
                                        {s.title || "New Chat"}
                                    </span>
                                    <span className={`text-[9px] ${activeSessionId === s.id ? "text-white/60" : "text-ui-fg-muted"}`}>
                                        {new Date(s.updated_at).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
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
            <div className="flex-1 flex flex-col bg-ui-bg-base relative w-full">
                {/* Header with Selective Logic */}
                <div className="min-h-16 border-b flex flex-col md:flex-row items-start md:items-center justify-between px-4 md:px-6 py-6 bg-ui-bg-base/80 backdrop-blur-xl z-50 sticky top-0 gap-y-2">
                    <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-start">
                        <div className="flex items-center gap-4">
                            <Button variant="transparent" onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2">
                                <SidebarLeft />
                            </Button>
                            <div>
                                <Heading level="h2" className="text-sm md:text-base font-semibold text-ui-fg-base truncate max-w-[150px] md:max-w-xs">
                                    {activeSessionData?.session?.title || "Antigravity AI"}
                                </Heading>
                                {activeSessionId && (
                                    <div className="flex items-center gap-x-3 mt-0.5">
                                        <span className="text-[10px] font-semibold text-ui-fg-subtle uppercase px-1.5 py-0.5 bg-ui-bg-subtle rounded">{model}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {activeSessionId && (
                        <div className="flex flex-wrap items-center gap-2 md:gap-x-5 w-full md:w-auto justify-between md:justify-end">
                            {/* Agent Toggle */}
                            <div className="flex items-center gap-x-2 md:gap-x-3 bg-ui-bg-subtle/50 px-2 md:px-3 py-1.5 rounded-2xl border border-ui-border-base/50">
                                <span className={`text-[9px] md:text-[10px] font-semibold uppercase tracking-widest transition-colors ${agentEnabled ? 'text-ui-fg-interactive' : 'text-ui-fg-muted'}`}>
                                    {agentEnabled ? 'Agent' : 'Normal'}
                                </span>
                                <AnimatedSwitch
                                    checked={agentEnabled}
                                    onCheckedChange={setAgentEnabled}
                                    startIcon={<RocketLaunch width={10} height={10} className="text-ui-fg-interactive" />}
                                    endIcon={<ComputerDesktop width={10} height={10} className="text-ui-fg-muted" />}
                                />
                            </div>

                            {/* Search Toggle */}
                            <div className="flex items-center gap-x-2">
                                <GlobeEuropeSolid className={`w-4 h-4 ${searchEnabled ? 'text-blue-500' : 'text-ui-fg-muted'}`} />
                                <Switch checked={searchEnabled} onCheckedChange={setSearchEnabled} size="small" />
                            </div>

                            {/* Confirm Toggle */}
                            <div className="flex items-center gap-x-2">
                                <span className={`text-[10px] font-semibold uppercase tracking-widest ${confirmEnabled ? 'text-ui-fg-interactive' : 'text-ui-fg-muted'}`}>
                                    Confirm
                                </span>
                                <Switch checked={confirmEnabled} onCheckedChange={setConfirmEnabled} size="small" />
                            </div>

                            <div className="flex gap-2">
                                {/* Custom Model Dropdown */}
                                <div className="relative" ref={modelDropdownRef}>
                                    <button
                                        onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                                        className="flex items-center gap-2 text-[11px] md:text-sm font-sans font-medium bg-ui-bg-subtle border border-ui-border-base rounded-xl px-3 py-2 hover:bg-ui-bg-base-hover transition-all shadow-sm min-w-[120px] md:min-w-[160px] justify-between"
                                    >
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                                            <span className="truncate max-w-[90px] md:max-w-[120px]">{models.find(m => m.id === model)?.name || "Select"}</span>
                                        </div>
                                        <ChevronDown width={14} height={14} className={`transition-transform duration-200 ${isModelDropdownOpen ? 'rotate-180' : ''}`} />
                                    </button>

                                    <AnimatePresence>
                                        {isModelDropdownOpen && (
                                            <motion.div
                                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                                animate={{ opacity: 1, y: 4, scale: 1 }}
                                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                                className="absolute top-full right-0 mt-2 w-[85vw] max-w-[320px] md:w-80 bg-ui-bg-base border border-ui-border-base rounded-2xl shadow-2xl z-[100] overflow-hidden backdrop-blur-xl font-sans"
                                            >
                                                <div className="p-2 space-y-1">
                                                    {models.map((m) => (
                                                        <div
                                                            key={m.id}
                                                            onClick={() => {
                                                                setModel(m.id)
                                                                setIsModelDropdownOpen(false)
                                                            }}
                                                            className={`flex items-start justify-between p-2 rounded-xl cursor-pointer transition-all ${model === m.id ? 'bg-ui-bg-interactive/10 border border-ui-border-interactive/20' : 'hover:bg-ui-bg-base-hover border border-transparent'}`}
                                                        >
                                                            <div className="flex flex-col gap-0.5 pr-2 w-full">
                                                                <div className="flex items-center justify-between w-full">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className={`text-xs font-semisemibold ${model === m.id ? 'text-ui-fg-interactive' : 'text-ui-fg-base'}`}>{m.name}</span>
                                                                        <div className="flex items-center gap-1">
                                                                            {m.features.vision && <div title="Has Vision" className="text-purple-500 bg-purple-500/10 p-0.5 rounded"><Eye className="w-3.5 h-3.5" /></div>}
                                                                            {m.features.imageGen && <div title="Can Generate Images" className="text-blue-500 bg-blue-500/10 p-0.5 rounded"><Photo className="w-3.5 h-3.5" /></div>}
                                                                            {m.features.thoughts && <div title="Reasoning" className="text-amber-500 bg-amber-500/10 p-0.5 rounded"><SidebarLeft className="w-3.5 h-3.5" /></div>}
                                                                        </div>
                                                                    </div>
                                                                    {model === m.id && <CheckCircleSolid className="w-4 h-4 text-ui-fg-interactive shrink-0" />}
                                                                </div>
                                                                <span className="text-[10px] text-ui-fg-subtle leading-normal whitespace-normal w-[95%]">{m.description}</span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>

                                <select
                                    value={resolution}
                                    onChange={(e) => setResolution(e.target.value)}
                                    className="hidden md:block text-[11px] font-semibold bg-ui-bg-subtle border rounded-xl px-2 py-1.5 outline-none appearance-none pr-8 shadow-sm"
                                    style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2712%27 height=%2712%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27currentColor%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3E%3Cpolyline points=%276 9 12 15 18 9%27%3E%3C/polyline%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center' }}
                                >
                                    <option value="1024x1024">1024x1024</option>
                                    <option value="1024x1792">1024x1792</option>
                                </select>
                            </div>
                        </div>
                    )}
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 bg-ui-bg-base no-scrollbar">
                    {!activeSessionId ? (
                        <div className="h-full flex flex-col items-center justify-center text-center space-y-6">
                            <div className="w-20 h-20 rounded-3xl bg-ui-bg-interactive/10 flex items-center justify-center rotate-12 shadow-inner">
                                <ChatBubble className="w-10 h-10 text-ui-bg-interactive" />
                            </div>
                            <div>
                                <Heading level="h1" className="text-3xl font-extrasemibold tracking-tight">Antigravity AI</Heading>
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
                                    <div className={`flex gap-4 max-w-[95%] md:max-w-[85%] ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-lg ${m.role === 'model' ? 'bg-ui-bg-interactive shadow-ui-bg-interactive/20' : 'bg-ui-bg-subtle border border-ui-border-base shadow-sm'}`}>
                                            <span className={`text-[10px] font-semibold ${m.role === 'model' ? 'text-white' : 'text-ui-fg-base'}`}>
                                                {m.role === 'model' ? 'AI' : 'U'}
                                            </span>
                                        </div>

                                        <div
                                            className={`rounded-3xl p-4 md:p-5 shadow-sm border ${m.role === 'user'
                                                ? 'bg-ui-bg-interactive/10 border-ui-border-interactive/30'
                                                : 'bg-ui-bg-subtle border-ui-border-base'
                                                }`}
                                        >
                                            {/* ... content ... */}
                                            {m.role === 'model' && m.content.thoughts && (
                                                <Reasoning content={m.content.thoughts} loading={false} />
                                            )}

                                            {m.role === 'model' && m.content.interactions && (
                                                <div className="mb-4 space-y-2">
                                                    {m.content.interactions.map((interaction: any, idx: number) => (
                                                        <ToolInteraction
                                                            key={idx}
                                                            interaction={interaction}
                                                            onSelect={() => {
                                                                setActiveInteraction(interaction)
                                                                if (window.innerWidth < 768) setIsSidebarOpen(false)
                                                            }}
                                                        />
                                                    ))}
                                                </div>
                                            )}

                                            <div className={`prose prose-sm dark:prose-invert max-w-none break-words ${m.role === 'user' ? 'text-ui-fg-base font-medium' : ''}`}>
                                                <ReactMarkdown
                                                    remarkPlugins={[remarkGfm]}
                                                    components={{
                                                        code({ node, inline, className, children, ...props }: any) {
                                                            const match = /language-(\w+)/.exec(className || "")
                                                            return !inline && match ? (
                                                                <CodeBlock language={match[1]} value={String(children).replace(/\n$/, "")} />
                                                            ) : (
                                                                <code className="bg-ui-bg-base/50 px-1.5 py-0.5 rounded text-ui-fg-interactive  text-[11px]" {...props}>
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

                                            <div className={`text-[9px] font-semibold uppercase tracking-wider mt-3 opacity-40 ${m.role === 'user' ? 'text-right' : ''}`}>
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
                                            <span className="text-[10px] font-semibold text-white">AI</span>
                                        </div>
                                        <div className="bg-ui-bg-subtle border border-ui-border-base rounded-3xl p-5 shadow-sm min-w-[100px]">
                                            {sendMessage.isPending ? (
                                                <div className="flex items-center gap-3">
                                                    <div className="flex gap-1.5">
                                                        <div className="w-2 h-2 bg-ui-bg-interactive rounded-full animate-bounce [animation-duration:1s]" />
                                                        <div className="w-2 h-2 bg-ui-bg-interactive rounded-full animate-bounce [animation-delay:0.2s] [animation-duration:1s]" />
                                                        <div className="w-2 h-2 bg-ui-bg-interactive rounded-full animate-bounce [animation-delay:0.4s] [animation-duration:1s]" />
                                                    </div>
                                                    <span className="text-[11px] font-semibold text-ui-fg-subtle tracking-tight">Thinking...</span>
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

                {/* Enhanced Input Area (Composer) */}
                {activeSessionId && (
                    <div className="p-4 border-t bg-ui-bg-base/95 backdrop-blur-xl z-30">
                        <div className="mx-auto max-w-4xl flex flex-col gap-3">

                            {/* Attachments Preview */}
                            {pendingImages.length > 0 && (
                                <div className="flex gap-3 p-2 bg-ui-bg-subtle/30 rounded-2xl border border-ui-border-base overflow-x-auto no-scrollbar">
                                    {pendingImages.map((img, i) => (
                                        <div key={i} className="relative group shrink-0 w-20 h-20">
                                            <img
                                                src={`data:${img.mimeType};base64,${img.data}`}
                                                className="w-full h-full object-cover rounded-xl border border-ui-border-base shadow-sm"
                                                alt=""
                                            />
                                            <button
                                                onClick={() => setPendingImages(prev => prev.filter((_, idx) => idx !== i))}
                                                className="absolute -top-2 -right-2 w-6 h-6 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-black/70 transition-colors backdrop-blur-sm"
                                            >
                                                <XMark width={14} height={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Composer Controls */}
                            <div className="flex items-end gap-3 bg-ui-bg-subtle border border-ui-border-base rounded-[24px] p-2 focus-within:ring-2 focus-within:ring-ui-bg-interactive/10 focus-within:border-ui-bg-interactive transition-all shadow-sm">

                                <div className="flex items-center gap-1 pb-1.5 pl-1">
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
                                        className="p-2 text-ui-fg-muted hover:text-ui-fg-base hover:bg-ui-bg-base-hover rounded-xl transition-colors"
                                        title="Attach Image"
                                    >
                                        <Photo width={20} height={20} />
                                    </button>

                                    <div className="w-px h-5 bg-ui-border-base mx-1" />

                                    <button
                                        onClick={() => setSearchEnabled(!searchEnabled)}
                                        className={`p-2 rounded-xl transition-colors ${searchEnabled ? 'bg-blue-500/10 text-blue-500' : 'text-ui-fg-muted hover:text-ui-fg-base hover:bg-ui-bg-base-hover'}`}
                                        title="Start Search"
                                    >
                                        <GlobeEuropeSolid width={20} height={20} />
                                    </button>

                                    <button
                                        onClick={() => {
                                            // Toggle map mode or just add prompt suggestion
                                            if (!input.includes("Find places")) {
                                                setInput(prev => "Find places in " + prev)
                                                setSearchEnabled(true)
                                            }
                                        }}
                                        className={`p-2 rounded-xl transition-colors ${input.includes("Find places") ? 'bg-green-500/10 text-green-500' : 'text-ui-fg-muted hover:text-ui-fg-base hover:bg-ui-bg-base-hover'}`}
                                        title="Google Maps"
                                    >
                                        <Map width={20} height={20} />
                                    </button>

                                    <button
                                        className="p-2 rounded-xl text-ui-fg-muted hover:text-purple-500 hover:bg-purple-500/10 transition-colors"
                                        title="Improve Prompt"
                                        onClick={() => toast.success("Magic improve active")}
                                    >
                                        <Sparkles width={20} height={20} />
                                    </button>
                                </div>

                                <textarea
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" && !e.shiftKey) {
                                            e.preventDefault()
                                            handleSend()
                                        }
                                    }}
                                    placeholder={searchEnabled ? "Ask Gemini to search..." : "Type a message..."}
                                    className="flex-1 bg-transparent border-none focus:ring-0 resize-none py-3 px-2 text-sm max-h-32 min-h-[44px] leading-relaxed placeholder:text-ui-fg-muted"
                                    rows={1}
                                />

                                <div className="pb-0.5 pr-0.5">
                                    {sendMessage.isPending || isTyping ? (
                                        <button
                                            onClick={() => {
                                                if (abortController) {
                                                    abortController.abort()
                                                    setAbortController(null)
                                                }
                                                setIsTyping(false)
                                            }}
                                            className="p-2.5 rounded-xl bg-ui-bg-error/10 text-ui-fg-error hover:bg-ui-bg-error/20 transition-all shadow-sm"
                                        >
                                            <div className="w-2.5 h-2.5 bg-current rounded-sm mb-[1px]" />
                                        </button>
                                    ) : (
                                        <button
                                            onClick={handleSend}
                                            disabled={(!input.trim() && pendingImages.length === 0) || isTyping}
                                            className={`p-2.5 rounded-xl transition-all flex items-center justify-center ${(!input.trim() && pendingImages.length === 0) || isTyping ? 'bg-ui-bg-subtle text-ui-fg-muted cursor-not-allowed' : 'bg-ui-bg-interactive text-ui-fg-on-color shadow-lg shadow-ui-bg-interactive/20 hover:scale-105 active:scale-95'}`}
                                        >
                                            <RocketLaunch width={20} height={20} className={(!input.trim() && pendingImages.length === 0) ? "opacity-50" : ""} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="flex justify-between px-2 text-[10px] text-ui-fg-muted font-medium">
                                <span>{model}</span>
                                <span>Press Enter to send, Shift + Enter for new line</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Right Panel (Action Detail) */}
            <AnimatePresence>
                {activeInteraction && (
                    <RightPanel
                        interaction={activeInteraction}
                        onClose={() => setActiveInteraction(null)}
                        onConfirm={(callId) => {
                            if (!confirmEnabled) {
                                toast.error("Confirm mode is disabled")
                                return
                            }
                            confirmTools.mutate({ callIds: [callId] })
                        }}
                    />
                )}
            </AnimatePresence>

            {/* Image Preview Modal */}
            {showImageModal && modalImageSrc && (
                <div
                    className="fixed inset-0 z-[999] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm transition-all animate-in fade-in duration-200"
                    onClick={() => setShowImageModal(false)}
                >
                    <div className="relative max-w-[90vw] max-h-[90vh] bg-ui-bg-base rounded-2xl overflow-hidden shadow-2xl scale-in-center">
                        <img src={modalImageSrc} className="max-w-full max-h-[85vh] object-contain" />
                        <div className="p-4 border-t bg-ui-bg-subtle flex justify-between items-center">
                            <span className="text-xs text-ui-fg-muted font-medium">Image Preview</span>
                            <Button size="small" variant="secondary" onClick={() => setShowImageModal(false)}>Close</Button>
                        </div>
                        <button className="absolute top-4 right-4 text-white hover:text-gray-300 drop-shadow-lg">
                            <XMark width={24} height={24} />
                        </button>
                    </div>
                </div>
            )}

            {/* Session Edit Modal */}
            {editingSessionId && (
                <div className="fixed inset-0 z-[999] bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-ui-bg-base rounded-2xl p-6 w-full max-w-md shadow-2xl border border-ui-border-base transition-all scale-in-center">
                        <Heading level="h2" className="text-lg mb-4">Edit Chat Title</Heading>
                        <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className="w-full bg-ui-bg-subtle border rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-ui-border-interactive outline-none mb-6"
                            placeholder="New title..."
                            autoFocus
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    updateSessionTitle.mutate({ id: editingSessionId, title: editTitle })
                                    setEditingSessionId(null)
                                }
                            }}
                        />
                        <div className="flex justify-end gap-3">
                            <Button variant="secondary" onClick={() => setEditingSessionId(null)}>Cancel</Button>
                            <Button variant="primary" onClick={() => {
                                updateSessionTitle.mutate({ id: editingSessionId, title: editTitle })
                                setEditingSessionId(null)
                            }}>Save Changes</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Image Gen Modal */}
            <ImageGenModal
                open={showImageGenModal}
                onOpenChange={setShowImageGenModal}
                initialPrompt={promptForImageGen}
            />
        </div>
    )
}

export const config = defineRouteConfig({
    label: "AI Chat",
    icon: ChatBubble,
    rank: 1,
})

export default AIChatPage
