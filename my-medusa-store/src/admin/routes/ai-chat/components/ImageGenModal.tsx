import { Button, Drawer, Heading, Text, Input, Badge, toast } from "@medusajs/ui"
import { Photo, Sparkles, XMark, ArrowDownTray } from "@medusajs/icons"
import { useState } from "react"

type ImageGenModalProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
    initialPrompt?: string
}

export const ImageGenModal = ({ open, onOpenChange, initialPrompt = "" }: ImageGenModalProps) => {
    const [prompt, setPrompt] = useState(initialPrompt)
    const [loading, setLoading] = useState(false)
    const [generatedImages, setGeneratedImages] = useState<string[]>([])

    // Sync initial prompt when opened (optional, if we want it to update dynamically)
    // useEffect(() => { if (open && initialPrompt) setPrompt(initialPrompt) }, [open, initialPrompt])

    const handleGenerate = async () => {
        if (!prompt) return
        setLoading(true)

        // Mock generation delay
        setTimeout(() => {
            setLoading(false)
            // Mock images for demo
            setGeneratedImages([
                "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8ZmFzaGlvbnxlbnwwfHwwfHx8MA%3D%3D",
                "https://images.unsplash.com/photo-1529139574466-a302d2d3f524?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTF8fGZhc2hpb258ZW58MHx8MHx8fDA%3D",
                "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8M3x8ZmFzaGlvbnxlbnwwfHwwfHx8MA%3D%3D"
            ])
            toast.success("Images generated successfully!")
        }, 2000)
    }

    return (
        <Drawer open={open} onOpenChange={onOpenChange}>
            <Drawer.Content className="z-50 bg-ui-bg-base border-r border-ui-border-base w-[400px] sm:w-[500px] overflow-y-auto">
                <Drawer.Header>
                    <Drawer.Title asChild>
                        <Heading className="flex items-center gap-2">
                            <Sparkles className="text-ui-fg-interactive" />
                            Image Generation Studio
                        </Heading>
                    </Drawer.Title>
                    <Drawer.Description className="sr-only">
                        Generate images using AI
                    </Drawer.Description>
                </Drawer.Header>
                <Drawer.Body className="p-4 flex flex-col gap-6">
                    {/* Prompt Input */}
                    <div className="flex flex-col gap-2">
                        <Text className="text-ui-fg-subtle text-xs font-medium uppercase">Prompt</Text>
                        <textarea
                            className="w-full h-32 p-3 text-sm bg-ui-bg-subtle border border-ui-border-base rounded-lg focus:border-ui-border-interactive focus:ring-1 focus:ring-ui-border-interactive outline-none resize-none"
                            placeholder="Describe the image you want to generate..."
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                        />
                    </div>

                    {/* Controls (Mock) */}
                    <div className="flex items-center gap-2">
                        <Badge className="cursor-pointer hover:bg-ui-bg-base-hover">Square (1:1)</Badge>
                        <Badge className="cursor-pointer bg-ui-bg-subtle text-ui-fg-muted">Portrait (9:16)</Badge>
                        <Badge className="cursor-pointer bg-ui-bg-subtle text-ui-fg-muted">Landscape (16:9)</Badge>
                    </div>

                    <Button
                        size="large"
                        className="w-full gap-2 relative overflow-hidden"
                        onClick={handleGenerate}
                        disabled={loading || !prompt}
                    >
                        {loading ? (
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Generating...
                            </div>
                        ) : (
                            <>
                                <Sparkles /> Generate
                            </>
                        )}
                    </Button>

                    {/* Results */}
                    {generatedImages.length > 0 && (
                        <div className="grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {generatedImages.map((src, idx) => (
                                <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden border border-ui-border-base">
                                    <img src={src} alt={`Generated ${idx}`} className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                        <Button variant="secondary" size="small" className="gap-1">
                                            <ArrowDownTray /> Save
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </Drawer.Body>
                <Drawer.Footer>
                    <Drawer.Close asChild>
                        <Button variant="secondary" className="w-full">Close</Button>
                    </Drawer.Close>
                </Drawer.Footer>
            </Drawer.Content>
        </Drawer>
    )
}
