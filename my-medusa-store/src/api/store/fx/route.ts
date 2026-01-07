import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

/**
 * Simple in-memory cache (5 minutes) to avoid hammering the FX provider.
 * Works fine in the typical long-running Medusa server process.
 */
type CacheEntry = {
  ts: number
  data: any
}

const CACHE_TTL_MS = 5 * 60 * 1000
const cache = new Map<string, CacheEntry>()

const normalizeCurrency = (v: string) => v.trim().toUpperCase()

const parseSymbols = (symbolsParam?: string | string[]) => {
  const raw = Array.isArray(symbolsParam) ? symbolsParam.join(",") : symbolsParam
  if (!raw) return []
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => normalizeCurrency(s))
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const base = normalizeCurrency((req.query.base as string) || "BHD")
  const symbols = parseSymbols(req.query.symbols as any)

  // Cache key includes base + symbols (sorted for stability)
  const key = `${base}:${symbols.slice().sort().join(",")}`
  const now = Date.now()
  const cached = cache.get(key)
  if (cached && now - cached.ts < CACHE_TTL_MS) {
    return res.json({ ...cached.data, cached: true })
  }

  // exchangerate.host is a free FX endpoint (no API key required for basic usage)
  const url = new URL("https://api.exchangerate.host/latest")
  url.searchParams.set("base", base)
  if (symbols.length) {
    url.searchParams.set("symbols", symbols.join(","))
  }

  try {
    const fxRes = await fetch(url.toString(), {
      headers: {
        "accept": "application/json",
      },
    })

    if (!fxRes.ok) {
      return res.status(502).json({
        error: "FX_PROVIDER_ERROR",
        message: `FX provider responded with ${fxRes.status}`,
      })
    }

    const json = await fxRes.json()

    // Minimal response shape
    const payload = {
      provider: "exchangerate.host",
      base: json.base || base,
      date: json.date,
      rates: json.rates || {},
      cached: false,
      ttl_seconds: Math.floor(CACHE_TTL_MS / 1000),
    }

    cache.set(key, { ts: now, data: payload })
    return res.json(payload)
  } catch (e: any) {
    return res.status(502).json({
      error: "FX_FETCH_FAILED",
      message: e?.message || "Failed to fetch FX rates",
    })
  }
}
