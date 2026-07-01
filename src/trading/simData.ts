import { useSyncExternalStore } from 'react'
import { FULL_MARKET, MARKET_INDICES } from './data'
import { isLiveSymbol, useLiveData } from './liveData'
import type { Direction, Symbol } from './data'

/**
 * Simulated "live" quotes for everything the real DFM feed doesn't cover — i.e.
 * ADX and Nasdaq Dubai symbols/indices, plus DFM names Yahoo doesn't list. Each
 * value does a small mean-reverting random walk around its seed price every few
 * seconds so the board looks alive, while genuine DFM data stays real (see
 * liveData.ts). Keyed by symbol / index shortName.
 */

export interface SimQuote { last: number; change: number; changePct: number; direction: Direction }

// Seed base prices for every non-live symbol and index.
const bases = new Map<string, { base: number; prevClose: number }>()
for (const s of FULL_MARKET) {
  if (!isLiveSymbol(s.symbolShortName) && s.lastPrice > 0) {
    bases.set(s.symbolShortName, { base: s.lastPrice, prevClose: s.prevClose })
  }
}
for (const ix of MARKET_INDICES) {
  if (ix.shortName !== 'DFMGI') bases.set(ix.shortName, { base: ix.indexCurrent, prevClose: ix.prevClose })
}

const SIM_MS = 2500
let sim = new Map<string, SimQuote>()
const listeners = new Set<() => void>()
let started = false

function step() {
  const next = new Map<string, SimQuote>()
  for (const [key, { base, prevClose }] of bases) {
    const prev = sim.get(key)?.last ?? base
    const drift = (base - prev) * 0.05 // gentle pull back toward the seed price
    const noise = (Math.random() - 0.5) * base * 0.004
    const last = +(prev + drift + noise).toFixed(base > 100 ? 2 : 3)
    const change = +(last - prevClose).toFixed(3)
    const changePct = prevClose ? +((change / prevClose) * 100).toFixed(3) : 0
    next.set(key, { last, change, changePct, direction: change > 0 ? 'up' : change < 0 ? 'down' : 'flat' })
  }
  sim = next
  listeners.forEach((l) => l())
}

function ensureStarted() {
  if (started) return
  started = true
  step()
  setInterval(step, SIM_MS)
}

function subscribe(cb: () => void) {
  listeners.add(cb)
  ensureStarted()
  return () => listeners.delete(cb)
}

/** Subscribe to the simulated-quote store (re-renders every tick). */
export function useSimData(): Map<string, SimQuote> {
  return useSyncExternalStore(subscribe, () => sim, () => sim)
}

/**
 * Unified price lookup: real live DFM data where Yahoo has it, otherwise the
 * simulated tick (ADX / Nasdaq / unmapped names). Returns null if the symbol is
 * neither — the caller can fall back to the static seed price.
 */
export function usePrices(): (short: string) => SimQuote | null {
  const { quotes } = useLiveData()
  const sim = useSimData()
  return (short: string) => {
    const l = quotes.get(short)
    if (l) return { last: l.last, change: l.change, changePct: l.changePct, direction: l.change > 0 ? 'up' : l.change < 0 ? 'down' : 'flat' }
    return sim.get(short) ?? null
  }
}

/** Overlay live/sim price fields onto a list of Symbol rows (last / change /
 *  % / tone / bid / ask). Symbols with no live or sim quote pass through. */
export function useLiveSymbols(rows: Symbol[]): Symbol[] {
  const price = usePrices()
  return rows.map((s) => {
    const q = price(s.symbolShortName)
    if (!q) return s
    const spread = Math.max(0.005, +(q.last * 0.001).toFixed(3))
    return {
      ...s,
      lastPrice: q.last,
      change: q.change,
      changePct: q.changePct,
      tone: q.direction,
      bidPrice: +(q.last - spread).toFixed(3),
      offerPrice: +(q.last + spread).toFixed(3),
    }
  })
}
