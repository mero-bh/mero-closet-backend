'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';

type ReelItem = {
  id: string;
  url: string;
  type: string;
};

function isVideo(url: string) {
  if (!url) return false;
  const n = url.toLowerCase();
  return n.endsWith('.mp4') || n.endsWith('.webm') || n.endsWith('.mov') || n.endsWith('.m4v') || n.includes('video/upload');
}

export function ReelsBar() {
  const backendBase = useMemo(
    () => (process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || '').replace(/\/$/, ''),
    []
  );
  const publishableKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || '';

  const [items, setItems] = useState<ReelItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState<ReelItem | null>(null);
  const [progress, setProgress] = useState(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const next = () => {
    if (!active || items.length === 0) return;
    const idx = items.findIndex((it) => it.id === active.id);
    if (idx < items.length - 1) {
      setActive(items[idx + 1] || null);
    } else {
      setActive(items[0] || null);
    }
    setProgress(0);
  };

  const prev = () => {
    if (!active || items.length === 0) return;
    const idx = items.findIndex((it) => it.id === active.id);
    if (idx > 0) {
      setActive(items[idx - 1] || null);
    } else {
      setActive(items[items.length - 1] || null);
    }
    setProgress(0);
  };

  async function refresh() {
    if (!backendBase) {
      console.warn('NEXT_PUBLIC_MEDUSA_BACKEND_URL is not set.');
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
      setError(e?.message || 'Failed to load reels');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (active && !isVideo(active.url)) {
      setProgress(0);
      const startTime = Date.now();
      const duration = 5000; // 5 seconds for images

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
    <section className="mx-auto w-full max-w-screen-2xl px-4 pt-4 mb-8">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xl font-bold tracking-tight">Reels</div>
        </div>
      </div>

      {error ? (
        <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-500">{error}</div>
      ) : null}

      <div className="mt-6">
        <div className="flex gap-5 overflow-x-auto pb-4 no-scrollbar">
          {items.map((it) => (
            <button
              key={it.id}
              type="button"
              onClick={() => {
                setActive(it);
                setProgress(0);
              }}
              className="group relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-full border-2 border-primary/20 hover:border-primary/50 transition-all hover:scale-105 active:scale-95"
            >
              {isVideo(it.url) ? (
                <video
                  src={it.url}
                  className="h-full w-full object-cover"
                  muted
                  playsInline
                  preload="metadata"
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={it.url} alt="reel" className="h-full w-full object-cover" />
              )}
            </button>
          ))}

          {!loading && items.length === 0 ? (
            <div className="text-sm opacity-70 py-6">No reels available.</div>
          ) : null}
        </div>
      </div>

      {active ? (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
          onClick={() => setActive(null)}
        >
          <div
            className="relative max-h-[90vh] w-full max-w-lg overflow-hidden rounded-3xl bg-black shadow-2xl transition-all"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Progress Bars */}
            <div className="absolute top-0 left-0 right-0 z-[60] flex gap-1 p-2">
              {items.map((it, idx) => {
                const currentIdx = items.findIndex(a => a?.id === active?.id);
                let p = 0;
                if (idx < currentIdx) p = 100;
                else if (idx === currentIdx) p = progress;

                return (
                  <div key={it.id} className="h-1 flex-1 overflow-hidden rounded-full bg-white/20">
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
                <div className="truncate text-xs font-medium shadow-sm">Reel</div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 backdrop-blur-md hover:bg-white/20 transition-colors"
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

              {isVideo(active.url) ? (
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
                <img src={active.url} alt="active reel" className="max-h-[90vh] w-full object-contain" />
              )}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
