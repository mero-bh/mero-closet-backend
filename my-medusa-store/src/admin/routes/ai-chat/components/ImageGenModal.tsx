import { Button, Drawer, Heading, Text, Badge, toast } from "@medusajs/ui"
import { Sparkles, XMark, ArrowDownTray, Photo } from "@medusajs/icons"
import { useEffect, useMemo, useRef, useState } from "react"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialPrompt?: string

  // Settings (optional)
  apiKey?: string
  model?: string
  defaultAspectRatio?: string
  defaultImageSize?: string
  onDefaultsChange?: (next: { aspectRatio?: string; imageSize?: string }) => void
}

const ASPECT_RATIOS = ["1:1", "3:4", "4:3", "9:16", "16:9"]
const IMAGE_SIZES = ["1K", "2K", "4K"]

export const ImageGenModal = ({
  open,
  onOpenChange,
  initialPrompt = "",
  apiKey,
  model,
  defaultAspectRatio = "1:1",
  defaultImageSize = "1K",
  onDefaultsChange,
}: Props) => {
  const [mode, setMode] = useState<"generate" | "edit">("generate")
  const [prompt, setPrompt] = useState(initialPrompt)
  const [aspectRatio, setAspectRatio] = useState(defaultAspectRatio)
  const [imageSize, setImageSize] = useState(defaultImageSize)
  const [loading, setLoading] = useState(false)
  const [images, setImages] = useState<string[]>([])
  const [baseImage, setBaseImage] = useState<{ mimeType: string; data: string } | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    setPrompt(initialPrompt || "")
  }, [open, initialPrompt])

  useEffect(() => {
    if (!open) return
    setAspectRatio(defaultAspectRatio || "1:1")
    setImageSize(defaultImageSize || "1K")
  }, [open, defaultAspectRatio, defaultImageSize])

  const canRun = useMemo(() => {
    if (!prompt.trim()) return false
    if (mode === "edit" && !baseImage) return false
    return true
  }, [prompt, mode, baseImage])

  const updateAspectRatio = (v: string) => {
    setAspectRatio(v)
    onDefaultsChange?.({ aspectRatio: v })
  }

  const updateImageSize = (v: string) => {
    setImageSize(v)
    onDefaultsChange?.({ imageSize: v })
  }

  const handleUpload = async (file: File) => {
    const mimeType = file.type || "image/png"
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = () => reject(new Error("Failed to read file"))
      reader.readAsDataURL(file)
    })
    const base64 = dataUrl.split(",")[1] || ""
    setBaseImage({ mimeType, data: base64 })
  }

  const generate = async () => {
    if (!canRun) return
    setLoading(true)
    setImages([])

    try {
      const res = await fetch("/admin/ai/image-gen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          config: {
            apiKey: apiKey || "",
            model: model || "gemini-3-pro-image-preview",
            aspectRatio,
            imageSize,
            mode,
            baseImage: mode === "edit" ? baseImage : undefined,
          },
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || "Image generation failed")
      }

      const data = await res.json()
      const out: string[] = (data.images || []).map((img: any) => {
        if (!img?.data || !img?.mimeType) return null
        return `data:${img.mimeType};base64,${img.data}`
      }).filter(Boolean)

      setImages(out)

      if (out.length > 0) {
        toast.success("Image generated")
      } else {
        toast.info("No image returned", { description: data.text ? String(data.text).slice(0, 120) : "Try another model / prompt." })
      }
    } catch (e: any) {
      toast.error("Image Error", { description: e.message })
    } finally {
      setLoading(false)
    }
  }

  const download = (src: string, idx: number) => {
    const a = document.createElement("a")
    a.href = src
    a.download = `generated-${idx + 1}.png`
    document.body.appendChild(a)
    a.click()
    a.remove()
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <Drawer.Content className="z-50 bg-ui-bg-base border-r border-ui-border-base w-[420px] sm:w-[560px] overflow-y-auto">
        <Drawer.Header>
          <Drawer.Title asChild>
            <Heading className="flex items-center gap-2">
              <Sparkles className="text-ui-fg-interactive" />
              Image Studio
            </Heading>
          </Drawer.Title>
          <Drawer.Description className="sr-only">Generate or edit images using AI</Drawer.Description>
        </Drawer.Header>

        <Drawer.Body className="p-4 flex flex-col gap-6">
          {/* Mode */}
          <div className="flex items-center gap-2">
            <Button size="small" variant={mode === "generate" ? "primary" : "secondary"} className="rounded-xl" onClick={() => setMode("generate")}>
              Generate
            </Button>
            <Button size="small" variant={mode === "edit" ? "primary" : "secondary"} className="rounded-xl" onClick={() => setMode("edit")}>
              Edit
            </Button>

            <div className="ml-auto flex items-center gap-2">
              <Badge className="hidden sm:inline">Model: {model || "auto"}</Badge>
            </div>
          </div>

          {/* Edit upload */}
          {mode === "edit" && (
            <div className="space-y-2">
              <Text className="text-ui-fg-subtle text-xs font-medium uppercase">Source Image</Text>
              {!baseImage ? (
                <div className="rounded-xl border border-dashed border-ui-border-base p-4 bg-ui-bg-subtle/30 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Photo className="text-ui-fg-muted" />
                    <Text className="text-ui-fg-muted text-sm">Upload an image to edit</Text>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (f) void handleUpload(f)
                      if (fileInputRef.current) fileInputRef.current.value = ""
                    }}
                  />
                  <Button variant="secondary" size="small" onClick={() => fileInputRef.current?.click()} className="rounded-xl">
                    Upload
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between rounded-xl border border-ui-border-base bg-ui-bg-subtle/30 p-3">
                  <Text className="text-ui-fg-base text-sm">Image ready ✅</Text>
                  <Button variant="secondary" size="small" className="rounded-xl" onClick={() => setBaseImage(null)}>
                    <XMark /> Remove
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Prompt */}
          <div className="space-y-2">
            <Text className="text-ui-fg-subtle text-xs font-medium uppercase">Prompt</Text>
            <textarea
              className="w-full h-28 p-3 text-sm bg-ui-bg-subtle border border-ui-border-base rounded-xl focus:border-ui-border-interactive focus:ring-1 focus:ring-ui-border-interactive outline-none resize-none"
              placeholder={mode === "generate" ? "Describe the image you want…" : "Describe the edits you want…"}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
          </div>

          {/* Generate controls */}
          {mode === "generate" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Text className="text-ui-fg-subtle text-xs font-medium uppercase">Aspect Ratio</Text>
                <select
                  value={aspectRatio}
                  onChange={(e) => updateAspectRatio(e.target.value)}
                  className="w-full text-sm bg-ui-bg-subtle border border-ui-border-base rounded-xl px-3 py-2 outline-none"
                >
                  {ASPECT_RATIOS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Text className="text-ui-fg-subtle text-xs font-medium uppercase">Size</Text>
                <select
                  value={imageSize}
                  onChange={(e) => updateImageSize(e.target.value)}
                  className="w-full text-sm bg-ui-bg-subtle border border-ui-border-base rounded-xl px-3 py-2 outline-none"
                >
                  {IMAGE_SIZES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <Button size="large" className="w-full gap-2 rounded-2xl" onClick={generate} disabled={loading || !canRun}>
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Processing...
              </div>
            ) : (
              <>
                <Sparkles /> {mode === "generate" ? "Generate" : "Apply Edits"}
              </>
            )}
          </Button>

          {/* Results */}
          {images.length > 0 && (
            <div className="grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {images.map((src, idx) => (
                <div key={idx} className="relative group aspect-square rounded-xl overflow-hidden border border-ui-border-base bg-ui-bg-subtle">
                  <img src={src} alt={`Generated ${idx + 1}`} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button variant="secondary" size="small" className="gap-1 rounded-xl" onClick={() => download(src, idx)}>
                      <ArrowDownTray /> Save
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {images.length === 0 && !loading && (
            <Text className="text-ui-fg-muted text-xs">
              Tip: If you get “No image returned”, try a different model in Settings ⚙️ or make the prompt more specific.
            </Text>
          )}
        </Drawer.Body>

        <Drawer.Footer>
          <Drawer.Close asChild>
            <Button variant="secondary" className="w-full rounded-xl">
              Close
            </Button>
          </Drawer.Close>
        </Drawer.Footer>
      </Drawer.Content>
    </Drawer>
  )
}
