'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';

type ReelItem = {
  name: string;
  url: string;
  size?: number;
  mtime?: string;
};

function isVideo(name: string) {
  const n = name.toLowerCase();
  return n.endsWith('.mp4') || n.endsWith('.webm') || n.endsWith('.mov') || n.endsWith('.m4v');
}

function formatBytes(bytes?: number) {
  if (bytes === undefined) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  let v = bytes;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i += 1;
  }
  const rounded = i === 0 ? Math.round(v).toString() : v.toFixed(1);
  return `${rounded} ${units[i]}`;
}

export function ReelsBar() {
  const backendBase = useMemo(
    () => (process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || 'https://mero-admin.koyeb.app').replace(/\/$/, ''),
    []
  );
  const publishableKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || 'pk_448ea0ce3b5b682802ce8ba6bec567782e3a88a9eec38b5d3693ae4123ce2d31';

  const [items, setItems] = useState<ReelItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState<ReelItem | null>(null);
  const [progress, setProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const next = () => {
    if (!active || items.length === 0) return;
    const idx = items.findIndex((it) => it.name === active.name);
    if (idx < items.length - 1) {
      setActive(items[idx + 1] || null);
    } else {
      setActive(items[0] || null);
    }
    setProgress(0);
  };

  const prev = () => {
    if (!active || items.length === 0) return;
    const idx = items.findIndex((it) => it.name === active.name);
    if (idx > 0) {
      setActive(items[idx - 1] || null);
    } else {
      setActive(items[items.length - 1] || null);
    }
    setProgress(0);
  };

  async function refresh() {
    if (!backendBase) {
      setError('NEXT_PUBLIC_MEDUSA_BACKEND_URL غير مضبوط.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${backendBase}/store/reels`, {
        cache: 'no-store',
        headers: {
          'x-publishable-api-key': publishableKey
        }
      });
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || `Failed to fetch reels (${res.status})`);
      }
      const data = await res.json();
      setItems(Array.isArray(data?.items) ? data.items : []);
    } catch (e: any) {
      setError(e?.message || 'فشل تحميل الريلز');
    } finally {
      setLoading(false);
    }
  }

  async function uploadFile(file: File) {
    if (!backendBase) {
      setError('NEXT_PUBLIC_MEDUSA_BACKEND_URL غير مضبوط.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(`${backendBase}/store/reels/upload`, {
        method: 'POST',
        headers: {
          'x-publishable-api-key': publishableKey
        },
        body: form
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || `Upload failed (${res.status})`);
      }
      await refresh();
    } catch (e: any) {
      setError(e?.message || 'فشل رفع الملف');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (active && !isVideo(active.name)) {
      setProgress(0);
      const startTime = Date.now();
      const duration = 10000; // 10s

      const interval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const p = Math.min((elapsed / duration) * 100, 100);
        setProgress(p);
        if (p >= 100) {
          clearInterval(interval);
          next();
        }
      }, 50);

      return () => clearInterval(interval);
    }
  }, [active, items]);

  return (
    <section className="mx-auto w-full max-w-screen-2xl px-4 pt-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">Reels</div>
          <div className="text-xs opacity-70">رفع صور/فيديو (مثل ريلز) وعرضهم في شريط علوي.</div>
        </div>

        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void uploadFile(f);
              e.currentTarget.value = '';
            }}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="rounded-full border px-4 py-2 text-sm hover:opacity-80"
            disabled={loading}
          >
            {loading ? 'جاري...' : 'أنزل ريل 📥'}
          </button>
        </div>
      </div>

      {error ? (
        <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm">{error}</div>
      ) : null}

      <div className="mt-6">
        <div className="flex gap-5 overflow-x-auto pb-4 no-scrollbar">
          {items.map((it) => (
            <button
              key={it.name}
              type="button"
              onClick={() => {
                setActive(it);
                setProgress(0);
              }}
              className="group relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-full border-2 border-primary/20 hover:border-primary/50 transition-all hover:scale-105 active:scale-95"
              title={it.name}
            >
              {isVideo(it.name) ? (
                <video
                  src={it.url}
                  className="h-full w-full object-cover"
                  muted
                  playsInline
                  preload="metadata"
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={it.url} alt={it.name} className="h-full w-full object-cover" />
              )}
              <div className="absolute bottom-0 left-0 right-0 bg-black/45 px-2 py-1 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100">
                {formatBytes(it.size)}
              </div>
            </button>
          ))}

          {!loading && items.length === 0 ? (
            <div className="text-sm opacity-70 py-6">ما فيه ريلز للحين—اضغط “أنزل ريل” 👆</div>
          ) : null}
        </div>
      </div>

      {active ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setActive(null)}
        >
          <div
            className="relative max-h-[90vh] w-full max-w-lg overflow-hidden rounded-3xl bg-black shadow-2xl transition-all"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Progress Bars */}
            <div className="absolute top-0 left-0 right-0 z-[60] flex gap-1 p-2">
              {items.map((it, idx) => {
                const currentIdx = items.findIndex(a => a?.name === active?.name);
                let p = 0;
                if (idx < currentIdx) p = 100;
                else if (idx === currentIdx) p = progress;

                return (
                  <div key={it.name} className="h-1 flex-1 overflow-hidden rounded-full bg-white/20">
                    <div
                      className="h-full bg-white transition-all duration-100 ease-linear"
                      style={{ width: `${p}%` }}
                    />
                  </div>
                );
              })}
            </div>
            <div className="absolute top-4 left-0 right-0 z-50 flex items-center justify-between px-4 text-white">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full border border-white/20 bg-white/10 p-1">
                  <div className="h-full w-full rounded-full bg-primary" />
                </div>
                <div className="truncate text-xs font-medium shadow-sm">{active.name}</div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 backdrop-blur-md hover:bg-white/20"
                  onClick={() => setActive(null)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
              </div>
            </div>

            <div className="relative flex min-h-[60vh] items-center justify-center bg-black">
              {/* Navigation overlay */}
              <div className="absolute inset-0 z-10 flex">
                <div className="h-full w-1/3 cursor-pointer" onClick={prev} />
                <div className="h-full w-1/3 cursor-pointer" onClick={() => {
                  if (videoRef.current) {
                    if (videoRef.current.paused) videoRef.current.play();
                    else videoRef.current.pause();
                  }
                }} />
                <div className="h-full w-1/3 cursor-pointer" onClick={next} />
              </div>

              {isVideo(active.name) ? (
                <video
                  ref={videoRef}
                  src={active.url}
                  autoPlay
                  playsInline
                  className="max-h-[90vh] w-full object-contain"
                  onTimeUpdate={() => {
                    if (videoRef.current) {
                      const p = (videoRef.current.currentTime / videoRef.current.duration) * 100;
                      setProgress(p);
                    }
                  }}
                  onEnded={next}
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={active.url} alt={active.name} className="max-h-[90vh] w-full object-contain" />
              )}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
