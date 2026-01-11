import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Button, toast } from "@medusajs/ui"
import { PlaySolid, ArrowPath, Trash, ArrowDownTray } from "@medusajs/icons"
import { useQuery } from "@tanstack/react-query"
import { useRef, useState } from "react"

type ReelItem = {
  id: string
  url: string
  type: "video" | "image"
  duration_type: string
  expires_at: string
  created_at: string
}

const ReelsPage = () => {
  const fileRef = useRef<HTMLInputElement | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [durationType, setDurationType] = useState("always")

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["admin_reels"],
    queryFn: async () => {
      const response = await fetch("/admin/reels")
      if (!response.ok) throw new Error("Failed to fetch reels")
      return response.json() as Promise<{ items: ReelItem[]; count: number }>
    },
  })

  const upload = async (file: File) => {
    setIsUploading(true)
    try {
      const form = new FormData()
      form.append("file", file)
      form.append("duration_type", durationType)

      const response = await fetch("/admin/reels/upload", {
        method: "POST",
        body: form,
      })

      if (!response.ok) {
        const msg = await response.json().catch(() => ({}))
        throw new Error(msg?.message || "Upload failed")
      }

      toast.success("Uploaded", { description: "Reel media uploaded successfully" })
      if (fileRef.current) fileRef.current.value = ""
      refetch()
    } catch (e: any) {
      toast.error("Upload error", { description: e?.message || "Upload failed" })
    } finally {
      setIsUploading(false)
    }
  }

  const remove = async (id: string) => {
    if (!confirm("Delete this media file?")) return
    try {
      const response = await fetch(`/admin/reels/${encodeURIComponent(id)}`, { method: "DELETE" })
      if (!response.ok) {
        const msg = await response.json().catch(() => ({}))
        throw new Error(msg?.message || "Delete failed")
      }
      toast.success("Deleted", { description: "File deleted" })
      refetch()
    } catch (e: any) {
      toast.error("Delete error", { description: e?.message || "Delete failed" })
    }
  }

  const items = data?.items ?? []

  return (
    <Container className="divide-y p-0 overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 bg-ui-bg-base">
        <div>
          <Heading level="h1" className="flex items-center gap-x-2">
            <PlaySolid /> Reels
          </Heading>
          <p className="text-ui-fg-subtle txt-small">
            Upload images/videos to Cloudinary and specify their visibility duration.
          </p>
        </div>

        <div className="flex items-center gap-x-3">
          <div className="flex items-center gap-x-2">
            <label className="txt-xsmall font-medium text-ui-fg-subtle">Duration:</label>
            <select
              value={durationType}
              onChange={(e) => setDurationType(e.target.value)}
              className="txt-xsmall border rounded px-2 py-1 bg-ui-bg-field outline-none"
            >
              <option value="always">Always</option>
              <option value="24h">24 Hours</option>
              <option value="5min">5 Minutes</option>
            </select>
          </div>

          <Button variant="secondary" size="small" onClick={() => refetch()}>
            {isFetching ? <ArrowPath className="animate-spin" /> : <ArrowPath />} Refresh
          </Button>

          <input
            ref={fileRef}
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) upload(f)
            }}
          />
          <Button
            size="small"
            isLoading={isUploading}
            onClick={() => fileRef.current?.click()}
          >
            Upload
          </Button>
        </div>
      </div>

      <div className="px-6 py-4 bg-ui-bg-subtle">
        <div className="flex items-center justify-between mb-3">
          <div className="txt-small text-ui-fg-subtle">
            {items.length} active item(s)
          </div>
          <div className="txt-small text-ui-fg-subtle">Scroll horizontally →</div>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {(isLoading ? Array.from({ length: 6 }).map((_, i) => ({ id: `s-${i}`, type: "image" as const, url: "", created_at: "", duration_type: "", expires_at: "" })) : items)
            .map((item) => (
              <div
                key={item.id}
                className="min-w-[240px] max-w-[240px] rounded-lg border border-ui-border-base bg-ui-bg-base overflow-hidden"
              >
                <div className="h-[160px] bg-ui-bg-subtle flex items-center justify-center">
                  {item.url ? (
                    item.type === "video" ? (
                      <video src={item.url} controls className="h-full w-full object-cover" />
                    ) : (
                      <img src={item.url} className="h-full w-full object-cover" alt="" />
                    )
                  ) : (
                    <div className="h-full w-full animate-pulse" />
                  )}
                </div>
                <div className="p-3">
                  <div className="txt-xsmall font-medium uppercase text-ui-fg-subtle">{item.duration_type}</div>
                  {item.expires_at ? (
                    <div className="text-ui-fg-error txt-xsmall mt-0.5" title="Expires at">
                      End: {new Date(item.expires_at).toLocaleTimeString()}
                    </div>
                  ) : (
                    <div className="text-green-600 txt-xsmall mt-0.5">Permanent</div>
                  )}

                  <div className="flex items-center justify-between mt-3">
                    <a
                      className="inline-flex items-center gap-x-1 txt-small text-ui-fg-interactive"
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <ArrowDownTray /> Open
                    </a>

                    <Button
                      variant="transparent"
                      size="small"
                      className="text-ui-fg-error"
                      onClick={() => remove(item.id)}
                      title="Delete"
                    >
                      <Trash />
                    </Button>
                  </div>
                </div>
              </div>
            ))}

          {!isLoading && items.length === 0 && (
            <div className="txt-small text-ui-fg-subtle py-6">No reels yet.</div>
          )}
        </div>
      </div>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Reels",
  icon: PlaySolid,
  rank: 46,
})

export default ReelsPage
