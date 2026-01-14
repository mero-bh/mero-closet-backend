import { Button, Drawer, Heading, Text, Input, Switch, Badge } from "@medusajs/ui"
import { useEffect, useMemo, useState } from "react"

export type GenerationSettings = {
  // Text generation
  temperature: number
  topP: number
  topK: number
  maxOutputTokens: number

  // Output style
  outputProsCons: boolean

  // Image generation
  aspectRatio: string
  imageSize: string
  imageModel: string

  // Connections (optional)
  apiKey?: string
  medusaBaseUrl?: string
  medusaPublishableKey?: string
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  settings: GenerationSettings
  onSave: (next: GenerationSettings) => void
}

const ASPECT_RATIOS = ["1:1", "3:4", "4:3", "9:16", "16:9"]
const IMAGE_SIZES = ["1K", "2K", "4K"]

const IMAGE_MODELS = [
  { id: "gemini-2.0-flash-image", label: "Gemini 2.0 Flash Image (Compat)" },
  { id: "gemini-2.5-flash-image", label: "Gemini 2.5 Flash Image (Fast)" },
  { id: "gemini-3-pro-image-preview", label: "Gemini 3 Pro Image (HQ)" },
]

export const SettingsModal = ({ open, onOpenChange, settings, onSave }: Props) => {
  const [tab, setTab] = useState<"text" | "image" | "connections">("text")
  const [local, setLocal] = useState<GenerationSettings>(settings)

  useEffect(() => {
    if (open) setLocal(settings)
  }, [open, settings])

  const canSave = useMemo(() => {
    // allow empty apiKey (fallback to env)
    return (
      local.temperature >= 0 &&
      local.temperature <= 2 &&
      local.topP >= 0 &&
      local.topP <= 1 &&
      local.topK >= 1 &&
      local.maxOutputTokens >= 256
    )
  }, [local])

  const save = () => {
    if (!canSave) return
    onSave(local)
    onOpenChange(false)
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <Drawer.Content className="z-50 bg-ui-bg-base border-r border-ui-border-base w-[420px] sm:w-[520px] overflow-y-auto">
        <Drawer.Header>
          <Drawer.Title asChild>
            <Heading className="flex items-center gap-2">
              <span aria-hidden>⚙️</span>
              Settings
            </Heading>
          </Drawer.Title>
          <Drawer.Description className="sr-only">AI chat settings</Drawer.Description>
        </Drawer.Header>

        <Drawer.Body className="p-4 flex flex-col gap-6">
          {/* Tabs */}
          <div className="flex items-center gap-2">
            <Button
              size="small"
              variant={tab === "text" ? "primary" : "secondary"}
              onClick={() => setTab("text")}
              className="rounded-xl"
            >
              Text
            </Button>
            <Button
              size="small"
              variant={tab === "image" ? "primary" : "secondary"}
              onClick={() => setTab("image")}
              className="rounded-xl"
            >
              Image
            </Button>
            <Button
              size="small"
              variant={tab === "connections" ? "primary" : "secondary"}
              onClick={() => setTab("connections")}
              className="rounded-xl"
            >
              Connections
            </Button>
          </div>

          {tab === "text" && (
            <div className="space-y-5">
              <div className="space-y-2">
                <Text className="text-ui-fg-subtle text-xs font-medium uppercase">Temperature</Text>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={0}
                    max={2}
                    step={0.05}
                    value={local.temperature}
                    onChange={(e) => setLocal((p) => ({ ...p, temperature: Number(e.target.value) }))}
                    className="w-full"
                  />
                  <Badge>{local.temperature.toFixed(2)}</Badge>
                </div>
              </div>

              <div className="space-y-2">
                <Text className="text-ui-fg-subtle text-xs font-medium uppercase">Top P</Text>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={local.topP}
                    onChange={(e) => setLocal((p) => ({ ...p, topP: Number(e.target.value) }))}
                    className="w-full"
                  />
                  <Badge>{local.topP.toFixed(2)}</Badge>
                </div>
              </div>

              <div className="space-y-2">
                <Text className="text-ui-fg-subtle text-xs font-medium uppercase">Top K</Text>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={1}
                    max={128}
                    step={1}
                    value={local.topK}
                    onChange={(e) => setLocal((p) => ({ ...p, topK: Number(e.target.value) }))}
                    className="w-full"
                  />
                  <Badge>{local.topK}</Badge>
                </div>
              </div>

              <div className="space-y-2">
                <Text className="text-ui-fg-subtle text-xs font-medium uppercase">Max Output Tokens</Text>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={256}
                    max={8192}
                    step={128}
                    value={local.maxOutputTokens}
                    onChange={(e) => setLocal((p) => ({ ...p, maxOutputTokens: Number(e.target.value) }))}
                    className="w-full"
                  />
                  <Badge>{local.maxOutputTokens}</Badge>
                </div>
                <Text className="text-ui-fg-muted text-xs">If you want “bigger thinking”, increase tokens + thinking budget.</Text>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-ui-border-base bg-ui-bg-subtle/30 p-3">
                <div className="space-y-0.5">
                  <Text className="text-ui-fg-base text-sm font-semibold">Pros / Cons Mode</Text>
                  <Text className="text-ui-fg-muted text-xs">Adds short pros/cons when giving recommendations.</Text>
                </div>
                <Switch checked={local.outputProsCons} onCheckedChange={(v) => setLocal((p) => ({ ...p, outputProsCons: v }))} size="small" />
              </div>
            </div>
          )}

          {tab === "image" && (
            <div className="space-y-5">
              <div className="space-y-2">
                <Text className="text-ui-fg-subtle text-xs font-medium uppercase">Image Model</Text>
                <select
                  value={local.imageModel}
                  onChange={(e) => setLocal((p) => ({ ...p, imageModel: e.target.value }))}
                  className="w-full text-sm bg-ui-bg-subtle border border-ui-border-base rounded-xl px-3 py-2 outline-none"
                >
                  {IMAGE_MODELS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>
                <Text className="text-ui-fg-muted text-xs">If your key doesn’t support a model, switch to a compatible one.</Text>
              </div>

              <div className="space-y-2">
                <Text className="text-ui-fg-subtle text-xs font-medium uppercase">Aspect Ratio</Text>
                <div className="grid grid-cols-5 gap-2">
                  {ASPECT_RATIOS.map((r) => (
                    <button
                      key={r}
                      onClick={() => setLocal((p) => ({ ...p, aspectRatio: r }))}
                      className={
                        "px-2 py-2 rounded-xl text-[11px] font-semibold border transition-all " +
                        (local.aspectRatio === r
                          ? "bg-ui-bg-interactive text-ui-fg-on-color border-ui-border-interactive"
                          : "bg-ui-bg-subtle text-ui-fg-muted border-ui-border-base hover:bg-ui-bg-base-hover")
                      }
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Text className="text-ui-fg-subtle text-xs font-medium uppercase">Image Size</Text>
                <div className="grid grid-cols-3 gap-2">
                  {IMAGE_SIZES.map((s) => (
                    <button
                      key={s}
                      onClick={() => setLocal((p) => ({ ...p, imageSize: s }))}
                      className={
                        "px-3 py-2 rounded-xl text-[11px] font-semibold border transition-all " +
                        (local.imageSize === s
                          ? "bg-ui-bg-interactive text-ui-fg-on-color border-ui-border-interactive"
                          : "bg-ui-bg-subtle text-ui-fg-muted border-ui-border-base hover:bg-ui-bg-base-hover")
                      }
                    >
                      {s}
                    </button>
                  ))}
                </div>
                <Text className="text-ui-fg-muted text-xs">Higher sizes may cost more / take longer.</Text>
              </div>
            </div>
          )}

          {tab === "connections" && (
            <div className="space-y-5">
              <div className="space-y-2">
                <Text className="text-ui-fg-subtle text-xs font-medium uppercase">Google AI API Key</Text>
                <Input
                  value={local.apiKey || ""}
                  onChange={(e) => setLocal((p) => ({ ...p, apiKey: e.target.value }))}
                  placeholder="Optional. Stored in your browser only."
                />
                <Text className="text-ui-fg-muted text-xs">
                  If empty, the backend will use GOOGLE_AI_API_KEY from environment.
                </Text>
              </div>

              <div className="space-y-2">
                <Text className="text-ui-fg-subtle text-xs font-medium uppercase">Medusa Base URL</Text>
                <Input
                  value={local.medusaBaseUrl || ""}
                  onChange={(e) => setLocal((p) => ({ ...p, medusaBaseUrl: e.target.value }))}
                  placeholder="Optional (for future integrations)"
                />
              </div>

              <div className="space-y-2">
                <Text className="text-ui-fg-subtle text-xs font-medium uppercase">Medusa Publishable Key</Text>
                <Input
                  value={local.medusaPublishableKey || ""}
                  onChange={(e) => setLocal((p) => ({ ...p, medusaPublishableKey: e.target.value }))}
                  placeholder="Optional (for future integrations)"
                />
              </div>

              <Text className="text-ui-fg-muted text-xs">
                MCP config is not managed here (as requested). Your existing MCP logic stays untouched.
              </Text>
            </div>
          )}
        </Drawer.Body>

        <Drawer.Footer className="flex gap-2">
          <Drawer.Close asChild>
            <Button variant="secondary" className="w-full rounded-xl">
              Cancel
            </Button>
          </Drawer.Close>
          <Button variant="primary" className="w-full rounded-xl" onClick={save} disabled={!canSave}>
            Save
          </Button>
        </Drawer.Footer>
      </Drawer.Content>
    </Drawer>
  )
}
