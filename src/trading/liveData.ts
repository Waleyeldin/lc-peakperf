import { useSyncExternalStore } from 'react'
import { fetch as tauriFetch } from '@tauri-apps/plugin-http'

/**
 * Best-effort live market data for the Dubai Financial Market (DFM), pulled
 * free from Yahoo Finance (the `.AE` suffix). Yahoo has no Abu Dhabi (ADX)
 * coverage, so ADX rows stay on the bundled simulation. Requests go through the
 * Tauri HTTP plugin (Rust side) to bypass the webview's CORS restriction; in a
 * plain browser they CORS-fail and we fall back to the mock data gracefully.
 */

export interface LiveQuote { last: number; prevClose: number; change: number; changePct: number }
export type LiveStatus = 'connecting' | 'live' | 'offline'

// App symbol shortName → Yahoo ticker. DFM equities + the DFM General Index.
// Only real, Yahoo-listed DFM tickers are included; anything else stays mock.
const SYMBOL_MAP: Record<string, string> = {
  DFMGI: 'DFMGI.AE', // DFM General Index
  EMAAR: 'EMAAR.AE',
  EMAARDEV: 'EMAARDEV.AE',
  DIB: 'DIB.AE',
  EMIRATESNBD: 'EMIRATESNBD.AE',
  SALIK: 'SALIK.AE',
  PARKIN: 'PARKIN.AE',
  AMANAT: 'AMANAT.AE',
  DAMAC: 'DAMAC.AE',
  DEYAAR: 'DEYAAR.AE',
  CBD: 'CBD.AE',
  DU: 'DU.AE',
  TABREED: 'TABREED.AE',
  TALABAT: 'TALABAT.AE',
  GFH: 'GFH.AE',
}

const POLL_MS = 7000
const inTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window

interface LiveSnapshot { quotes: Map<string, LiveQuote>; status: LiveStatus; lastUpdated: number }

let quotes = new Map<string, LiveQuote>()
let status: LiveStatus = 'connecting'
let lastUpdated = 0
let snapshot: LiveSnapshot = { quotes, status, lastUpdated }

const listeners = new Set<() => void>()
let started = false

function emit() {
  snapshot = { quotes, status, lastUpdated }
  listeners.forEach((l) => l())
}

async function getJson(url: string): Promise<unknown> {
  const res = inTauri ? await tauriFetch(url, { method: 'GET' }) : await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

interface ChartMeta { regularMarketPrice?: number; chartPreviousClose?: number; previousClose?: number }
function readMeta(json: unknown): ChartMeta | null {
  const r = (json as { chart?: { result?: Array<{ meta?: ChartMeta }> } })?.chart?.result?.[0]
  return r?.meta ?? null
}

async function poll() {
  const entries = Object.entries(SYMBOL_MAP)
  let anyOk = false
  const next = new Map(quotes)
  await Promise.all(
    entries.map(async ([appKey, ysym]) => {
      try {
        const meta = readMeta(await getJson(`https://query1.finance.yahoo.com/v8/finance/chart/${ysym}`))
        const last = meta?.regularMarketPrice
        if (typeof last !== 'number') return
        const prevClose = meta?.chartPreviousClose ?? meta?.previousClose ?? last
        const change = +(last - prevClose).toFixed(3)
        const changePct = prevClose ? +((change / prevClose) * 100).toFixed(3) : 0
        next.set(appKey, { last, prevClose, change, changePct })
        anyOk = true
      } catch {
        /* ignore a single symbol's failure */
      }
    }),
  )
  if (anyOk) {
    quotes = next
    status = 'live'
    lastUpdated = Date.now()
  } else if (quotes.size === 0) {
    status = 'offline'
  }
  emit()
}

function ensureStarted() {
  if (started) return
  started = true
  void poll()
  setInterval(() => void poll(), POLL_MS)
}

function subscribe(cb: () => void) {
  listeners.add(cb)
  ensureStarted()
  return () => listeners.delete(cb)
}

/** Subscribe to the whole live-quote store (re-renders on each poll). */
export function useLiveData() {
  return useSyncExternalStore(subscribe, () => snapshot, () => snapshot)
}

export function isLiveSymbol(shortName: string): boolean {
  return shortName in SYMBOL_MAP
}
