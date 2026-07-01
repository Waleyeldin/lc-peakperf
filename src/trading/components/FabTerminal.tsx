import { useEffect, useMemo, useRef, useState } from 'react'
import type { DragEvent, PointerEvent, ReactNode } from 'react'
import { sendToBoard } from '../popout'
import { usePrices, useLiveSymbols } from '../simData'
import { Panel, Button, Badge, SegmentedTabs } from './ui'
import BuySellDrawer from './BuySellDrawer'
import {
  MARKET_INDICES,
  FULL_MARKET,
  WATCHLIST,
  TOP_SYMBOLS,
  TICKERS,
  MARKET_DEPTH_FULL,
  TIME_SALES,
  getCandles,
  fmtPrice,
  fmtInt,
  fmtPct,
  fmtChange,
  fmtMoney,
} from '../data'
import type { Symbol, Candle } from '../data'

/**
 * FabTerminal — a Bloomberg-grade, information-dense multi-panel securities
 * terminal re-skinned in the FAB design language: rounded #1a1c1e cards on a
 * #111315 page, 1px #2a2c2e borders, FAB-blue accents, Inter type, soft
 * green/red market movement and crisp pure-inline-SVG charts. No literal
 * amber/black mono Bloomberg styling — same density & features, FAB beautiful.
 */

// ── Chart palette ──────────────────────────────────────────────────────────
const UP = '#2fd07a'
const DOWN = '#ff6b72'
const GRID = '#2a2c2e'
const LABEL = '#979797'

// ── Deterministic LCG (stable across renders, no Math.random) ───────────────
function makeRng(seedStr: string) {
  let seed = [...seedStr].reduce((a, c) => a + c.charCodeAt(0), 7) & 0x7fffffff
  return () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff
    return seed / 0x7fffffff
  }
}

/** A faint deterministic 24-point sparkline series for an index. */
function sparkSeries(seedStr: string, count = 24): number[] {
  const rng = makeRng(seedStr)
  const out: number[] = []
  let v = 50
  for (let i = 0; i < count; i++) {
    v += (rng() - 0.48) * 14
    v = Math.max(8, Math.min(92, v))
    out.push(v)
  }
  return out
}

function buildPath(values: number[], w: number, h: number, pad = 1): string {
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const step = (w - pad * 2) / (values.length - 1)
  return values
    .map((v, i) => {
      const x = pad + i * step
      const y = pad + (1 - (v - min) / span) * (h - pad * 2)
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
}

const fmt2 = (n: number) => `${n > 0 ? '+' : ''}${n.toFixed(2)}%`

// ── Simulated live feed ─────────────────────────────────────────────────────
// A single shared tick drives every animated value. Values OSCILLATE around
// their base via Math.sin, so they "breathe" and loop back instead of drifting.

/** Shared 1.2s tick. Static (no interval) when prefers-reduced-motion. */
function useLiveTick(): number {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const id = setInterval(() => setTick((t) => t + 1), 1200)
    return () => clearInterval(id)
  }, [])
  return tick
}

/** Oscillate `base` around itself (loops, never drifts). `amp` ≤ 0.4%. */
function live(base: number, tick: number, seed: number, amp = 0.0018): number {
  return base * (1 + Math.sin(tick * 0.7 + seed) * amp)
}

/** Stable per-item seed from a string (sum of char codes). */
function seedOf(s: string): number {
  return [...s].reduce((a, c) => a + c.charCodeAt(0), 0)
}

/**
 * Brief green/red flash on change. Keeps a ref of the previously shown value
 * and returns the matching `tick-up` / `tick-down` class, re-triggered by `key`.
 */
function FlashNum({ value, className = '' }: { value: number; className?: string }) {
  const prev = useRef(value)
  const dir = value > prev.current ? 'tick-up' : value < prev.current ? 'tick-down' : ''
  prev.current = value
  return <span className={`${className} ${dir}`}>{fmtPrice(value)}</span>
}

// ── Sparkline ────────────────────────────────────────────────────────────
function Sparkline({ seed, dir }: { seed: string; dir: 'up' | 'down' | 'flat' }) {
  const w = 70
  const h = 20
  const values = sparkSeries(seed)
  const stroke = dir === 'down' ? DOWN : dir === 'up' ? UP : LABEL
  return (
    <svg width={w} height={h} className="shrink-0" aria-hidden>
      <path d={buildPath(values, w, h)} fill="none" stroke={stroke} strokeWidth={1.25} strokeOpacity={0.7} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

// ── Row sparkline (close-price micro chart for a symbol) ────────────────────
function RowSparkline({ short, w = 56, h = 16 }: { short: string; w?: number; h?: number }) {
  const closes = getCandles(short).slice(-20).map((c) => c.c)
  const dir: 'up' | 'down' | 'flat' =
    closes.length < 2 ? 'flat' : closes[closes.length - 1] > closes[0] ? 'up' : closes[closes.length - 1] < closes[0] ? 'down' : 'flat'
  const stroke = dir === 'down' ? DOWN : dir === 'up' ? UP : LABEL
  return (
    <svg width={w} height={h} className="shrink-0" aria-hidden>
      <path d={buildPath(closes, w, h)} fill="none" stroke={stroke} strokeWidth={1.25} strokeOpacity={0.85} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

/** Resolve a full Symbol from FULL_MARKET by short name. */
function bySymbol(short: string): Symbol | undefined {
  return FULL_MARKET.find((r) => r.symbolShortName === short)
}

// ── Indices panel ──────────────────────────────────────────────────────────
function IndicesPanel({ tick }: { tick: number }) {
  const price = usePrices()
  return (
    <Panel title="Indices" bodyClassName="overflow-y-auto" noPadding>
      <ul className="divide-y divide-border-dark">
        {MARKET_INDICES.map((ix) => {
          // Base off the real (DFM index) / simulated (ADX etc.) value, then a
          // tiny oscillation; chg% recomputed vs prevClose so ▲/▼ stay in sync.
          const base = price(ix.shortName)?.last ?? ix.indexCurrent
          const liveVal = live(base, tick, seedOf(ix.shortName))
          const liveChgPct = ((liveVal - ix.prevClose) / ix.prevClose) * 100
          const dir: 'up' | 'down' | 'flat' = liveChgPct > 0.0005 ? 'up' : liveChgPct < -0.0005 ? 'down' : 'flat'
          const tone = dir === 'down' ? 'text-down' : dir === 'up' ? 'text-up' : 'text-flat'
          return (
            <li key={ix.shortName} className="flex items-center gap-2.5 px-4 py-2">
              <span className="w-16 shrink-0 truncate text-[12px] font-medium text-content" title={ix.name}>
                {ix.shortName}
              </span>
              <Sparkline seed={ix.shortName} dir={ix.direction} />
              <span className="ml-auto text-right text-[12px] tabular-nums text-content">
                <FlashNum value={liveVal} />
              </span>
              <span className={`flex w-[64px] shrink-0 items-center gap-1 text-[12px] tabular-nums ${tone}`}>
                <span className="w-3 shrink-0 text-center text-[10px]">{dir === 'up' ? '▲' : dir === 'down' ? '▼' : '—'}</span>
                <span className="flex-1 text-right">{fmtPct(liveChgPct).replace('+', '')}</span>
              </span>
            </li>
          )
        })}
      </ul>
    </Panel>
  )
}

// ── EMAAR hero + candlestick + volume ───────────────────────────────────────
const PAD_L = 12
const PAD_R = 46

function CandleChart({ candles: src, mode, tick }: { candles: Candle[]; mode: 'Candles' | 'Line'; tick: number }) {
  const w = 760
  const h = 200
  const padL = PAD_L
  const padR = PAD_R
  const padT = 8
  const padB = 8
  const plotW = w - padL - padR
  const plotH = h - padT - padB

  // Animate ONLY the last candle so the chart "breathes" — never mutate source.
  const candles = useMemo(() => {
    if (src.length === 0) return src
    const last = src[src.length - 1]
    const lc = live(last.c, tick, 1, 0.004)
    const next = src.slice()
    next[next.length - 1] = { ...last, c: lc, h: Math.max(last.h, lc), l: Math.min(last.l, lc) }
    return next
  }, [src, tick])

  const highs = candles.map((c) => c.h)
  const lows = candles.map((c) => c.l)
  const max = Math.max(...highs)
  const min = Math.min(...lows)
  const span = max - min || 1
  const y = (p: number) => padT + (1 - (p - min) / span) * plotH

  const slot = plotW / candles.length
  const bodyW = Math.max(2, slot * 0.62)

  const gridVals = Array.from({ length: 5 }, (_, i) => min + (span * i) / 4)

  // Smooth-ish close-price line (centred in each slot) for Line mode.
  const linePts = candles.map((c, i) => {
    const x = padL + i * slot + slot / 2
    return { x, y: y(c.c) }
  })
  const linePath = linePts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const areaPath =
    linePts.length > 0
      ? `${linePath} L${linePts[linePts.length - 1].x.toFixed(1)},${h - padB} L${linePts[0].x.toFixed(1)},${h - padB} Z`
      : ''
  const lineDir = candles.length >= 2 && candles[candles.length - 1].c >= candles[0].c ? UP : DOWN

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height: h }} preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="heroArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0062ff" stopOpacity={0.28} />
          <stop offset="100%" stopColor="#0062ff" stopOpacity={0} />
        </linearGradient>
      </defs>
      {gridVals.map((gv, i) => (
        <g key={i}>
          <line x1={padL} x2={padL + plotW} y1={y(gv)} y2={y(gv)} stroke={GRID} strokeWidth={1} />
          <text x={w - 4} y={y(gv) + 3} textAnchor="end" fontSize={9} fill={LABEL} className="tabular-nums">
            {gv.toFixed(2)}
          </text>
        </g>
      ))}
      {mode === 'Line' ? (
        <>
          {areaPath && <path d={areaPath} fill="url(#heroArea)" stroke="none" />}
          <path d={linePath} fill="none" stroke="#0062ff" strokeWidth={1.75} strokeLinejoin="round" strokeLinecap="round" />
          {linePts.length > 0 && <circle cx={linePts[linePts.length - 1].x} cy={linePts[linePts.length - 1].y} r={2.6} fill={lineDir} />}
        </>
      ) : (
        candles.map((c, i) => {
          const cx = padL + i * slot + slot / 2
          const up = c.c >= c.o
          const col = up ? UP : DOWN
          const yo = y(c.o)
          const yc = y(c.c)
          const top = Math.min(yo, yc)
          const bh = Math.max(1, Math.abs(yc - yo))
          return (
            <g key={i}>
              <line x1={cx} x2={cx} y1={y(c.h)} y2={y(c.l)} stroke={col} strokeWidth={1} />
              <rect x={cx - bodyW / 2} y={top} width={bodyW} height={bh} fill={col} rx={0.6} />
            </g>
          )
        })
      )}
    </svg>
  )
}

function VolumeChart({ candles }: { candles: Candle[] }) {
  const w = 760
  const h = 40
  const padL = PAD_L
  const padR = PAD_R
  const plotW = w - padL - padR
  const max = Math.max(...candles.map((c) => c.v)) || 1
  const slot = plotW / candles.length
  const barW = Math.max(2, slot * 0.62)
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height: h }} preserveAspectRatio="xMidYMid meet">
      {candles.map((c, i) => {
        const cx = padL + i * slot + slot / 2
        const bh = (c.v / max) * (h - 2)
        const up = c.c >= c.o
        return <rect key={i} x={cx - barW / 2} y={h - bh} width={barW} height={bh} fill={up ? UP : DOWN} opacity={0.4} />
      })}
    </svg>
  )
}

function HeroField({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-wide text-content-muted">{label}</span>
      <span className={`text-[13px] tabular-nums ${tone ?? 'text-content'}`}>{value}</span>
    </div>
  )
}

const CHART_MODES = ['Candles', 'Line'] as const
type ChartMode = (typeof CHART_MODES)[number]

function HeroPanel({ sym, onTrade, tick }: { sym: Symbol; onTrade: (symbol: Symbol, side: 'buy' | 'sell') => void; tick: number }) {
  const [mode, setMode] = useState<ChartMode>('Candles')
  const candles = useMemo(() => getCandles(sym.symbolShortName).slice(-45), [sym.symbolShortName])

  // Base off the real live (DFM) / simulated (ADX) price where available, then
  // add a tiny oscillation so ▲/▼, colour and the pct chip move together.
  const price = usePrices()
  const base = price(sym.symbolShortName)?.last ?? sym.lastPrice
  const liveLast = live(base, tick, seedOf(sym.symbolShortName), 0.0022)
  const liveChange = liveLast - sym.prevClose
  const liveChangePct = sym.prevClose ? (liveChange / sym.prevClose) * 100 : 0
  const tone = liveChange > 0 ? 'text-up' : liveChange < 0 ? 'text-down' : 'text-flat'
  return (
    <Panel
      title={
        <div className="flex items-baseline gap-2">
          <span className="text-[14px] font-semibold text-content">{sym.symbolShortName}</span>
          <span className="text-[12px] text-content-muted">· {sym.symbolName}</span>
        </div>
      }
      actions={
        <div className="flex items-center gap-1.5 pr-7">
          <Button variant="buy" size="sm" onClick={() => onTrade(sym, 'buy')}>Buy</Button>
          <Button variant="sell" size="sm" onClick={() => onTrade(sym, 'sell')}>Sell</Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        {/* Last + change */}
        <div className="flex flex-wrap items-end gap-3">
          <FlashNum value={liveLast} className={`text-[32px] font-semibold leading-none tabular-nums ${tone}`} />
          <span className={`text-[15px] tabular-nums ${tone}`}>
            {liveChange > 0 ? '▲' : liveChange < 0 ? '▼' : '—'} {fmtChange(liveChange)}
          </span>
          <Badge tone={liveChange > 0 ? 'up' : liveChange < 0 ? 'down' : 'neutral'}>{fmtPct(liveChangePct)}</Badge>
          <span className="ml-auto text-[11px] text-content-muted">AED · {sym.marketShortName} · {sym.sector}</span>
        </div>

        {/* Field grid */}
        <div className="grid grid-cols-3 gap-x-6 gap-y-3 rounded-lg border border-border-dark bg-[#15171a] p-3.5">
          <HeroField label="Open" value={fmtPrice(sym.openPrice)} />
          <HeroField label="High" value={fmtPrice(sym.high)} tone="text-up" />
          <HeroField label="Low" value={fmtPrice(sym.low)} tone="text-down" />
          <HeroField label="Prev Close" value={fmtPrice(sym.prevClose)} />
          <HeroField label="Bid" value={fmtPrice(sym.bidPrice)} tone="text-up" />
          <HeroField label="Ask" value={fmtPrice(sym.offerPrice)} tone="text-down" />
          <HeroField label="Volume" value={fmtInt(sym.volume)} />
          <HeroField label="Value" value={fmtMoney(sym.value)} />
          <HeroField label="VWAP" value={fmtPrice(sym.vwap)} />
          <HeroField label="52W Hi" value={fmtPrice(sym.weekHigh52)} />
          <HeroField label="52W Lo" value={fmtPrice(sym.weekLow52)} />
          <HeroField label="P/E" value={sym.per.toFixed(2)} />
          <HeroField label="Mkt Cap" value={fmtMoney(sym.marketCap)} />
          <HeroField label="Sector" value={sym.sector} />
        </div>

        {/* Candles + volume */}
        <div className="rounded-lg border border-border-dark bg-[#15171a] p-2.5">
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <span className="text-[11px] font-medium text-content-muted">Price · last 45 sessions</span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-content-subtle tabular-nums">{mode === 'Line' ? 'Close line' : 'OHLC daily'}</span>
              <SegmentedTabs tabs={CHART_MODES} value={mode} onChange={setMode} />
            </div>
          </div>
          <CandleChart candles={candles} mode={mode} tick={tick} />
          <VolumeChart candles={candles} />
        </div>
      </div>
    </Panel>
  )
}

// ── Order Book ───────────────────────────────────────────────────────────
function OrderBookPanel({ short, tick }: { short: string; tick: number }) {
  const maxSize = Math.max(...MARKET_DEPTH_FULL.flatMap((l) => [l.bidSize, l.offerSize])) || 1

  // Cumulative depth area chart, mirrored around mid.
  const w = 280
  const h = 60
  const half = w / 2
  let cumB = 0
  let cumO = 0
  const totBid = MARKET_DEPTH_FULL.reduce((s, l) => s + l.bidSize, 0)
  const totOff = MARKET_DEPTH_FULL.reduce((s, l) => s + l.offerSize, 0)
  const totMax = Math.max(totBid, totOff) || 1
  const bidPts = MARKET_DEPTH_FULL.map((l, i) => {
    cumB += l.bidSize
    const x = half - (i / (MARKET_DEPTH_FULL.length - 1)) * half
    const y = h - (cumB / totMax) * (h - 2)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })
  const offPts = MARKET_DEPTH_FULL.map((l, i) => {
    cumO += l.offerSize
    const x = half + (i / (MARKET_DEPTH_FULL.length - 1)) * half
    const y = h - (cumO / totMax) * (h - 2)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })

  return (
    <Panel title={`Order Book — ${short}`} noPadding>
      <div className="flex h-full flex-col">
        <div className="grid grid-cols-4 gap-1 px-3 py-1.5 text-[10px] uppercase tracking-wide text-content-muted">
          <span className="text-right">Bid Size</span>
          <span className="text-right">Bid</span>
          <span className="text-left">Ask</span>
          <span className="text-left">Ask Size</span>
        </div>
        <ul className="flex-1">
          {MARKET_DEPTH_FULL.map((l, i) => (
            <li key={i} className="grid grid-cols-4 items-center gap-1 px-3 py-[3px] text-[11px] tabular-nums">
              <div className="relative text-right">
                <span className="absolute inset-y-0 right-0 rounded-sm bg-bid-surface" style={{ width: `${(l.bidSize / maxSize) * 100}%` }} />
                <span className="relative text-content">{fmtInt(l.bidSize)}</span>
              </div>
              <span className="text-right font-medium text-up">{live(l.bidPrice, tick, seedOf(short) + i, 0.0006).toFixed(2)}</span>
              <span className="text-left font-medium text-down">{live(l.offerPrice, tick, seedOf(short) + i + 50, 0.0006).toFixed(2)}</span>
              <div className="relative text-left">
                <span className="absolute inset-y-0 left-0 rounded-sm bg-offer-surface" style={{ width: `${(l.offerSize / maxSize) * 100}%` }} />
                <span className="relative text-content">{fmtInt(l.offerSize)}</span>
              </div>
            </li>
          ))}
        </ul>
        <div className="border-t border-border-dark p-2.5">
          <div className="mb-1 flex items-center justify-between text-[10px] text-content-muted">
            <span className="text-up">Cumulative Bids</span>
            <span>Depth</span>
            <span className="text-down">Cumulative Offers</span>
          </div>
          <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height: h }} preserveAspectRatio="none">
            <polygon points={`${half},${h} ${bidPts.join(' ')} ${bidPts[bidPts.length - 1].split(',')[0]},${h}`} fill={UP} fillOpacity={0.18} />
            <polyline points={bidPts.join(' ')} fill="none" stroke={UP} strokeWidth={1.5} />
            <polygon points={`${half},${h} ${offPts.join(' ')} ${offPts[offPts.length - 1].split(',')[0]},${h}`} fill={DOWN} fillOpacity={0.18} />
            <polyline points={offPts.join(' ')} fill="none" stroke={DOWN} strokeWidth={1.5} />
            <line x1={half} x2={half} y1={0} y2={h} stroke={GRID} strokeWidth={1} strokeDasharray="2 2" />
          </svg>
        </div>
      </div>
    </Panel>
  )
}

// ── Market Breadth ───────────────────────────────────────────────────────
function BreadthPanel({ tick }: { tick: number }) {
  const adv = FULL_MARKET.filter((s) => s.changePct > 0)
  const dec = FULL_MARKET.filter((s) => s.changePct < 0)
  const unch = FULL_MARKET.filter((s) => s.changePct === 0)
  const total = FULL_MARKET.length || 1
  const upVol = adv.reduce((s, x) => s + x.volume, 0)
  const downVol = dec.reduce((s, x) => s + x.volume, 0)
  const volMax = Math.max(upVol, downVol) || 1

  // Subtle deterministic ±1 wobble (one ticker flips adv↔dec each beat).
  const jitter = Math.round(Math.sin(tick * 0.7))
  const advN = Math.max(0, Math.min(total, adv.length + jitter))
  const decN = Math.max(0, Math.min(total, dec.length - jitter))

  // Donut
  const R = 26
  const C = 2 * Math.PI * R
  const advFrac = advN / (advN + decN || 1)
  const advLen = C * advFrac

  return (
    <Panel title="Market Breadth">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <svg width="64" height="64" viewBox="0 0 64 64" className="shrink-0 -rotate-90">
            <circle cx="32" cy="32" r={R} fill="none" stroke={DOWN} strokeWidth="8" />
            <circle cx="32" cy="32" r={R} fill="none" stroke={UP} strokeWidth="8" strokeDasharray={`${advLen} ${C}`} strokeLinecap="butt" />
          </svg>
          <div className="flex-1">
            <div className="mb-1.5 flex justify-between text-[11px]">
              <span className="text-up">▲ {advN} Adv</span>
              <span className="text-content-muted">— {unch.length} Unch</span>
              <span className="text-down">▼ {decN} Dec</span>
            </div>
            <div className="flex h-2.5 overflow-hidden rounded-full bg-[#15171a]">
              <div className="bg-up" style={{ width: `${(advN / total) * 100}%` }} />
              <div className="bg-flat opacity-50" style={{ width: `${(unch.length / total) * 100}%` }} />
              <div className="bg-down" style={{ width: `${(decN / total) * 100}%` }} />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-[11px] tabular-nums">
            <span className="w-16 text-content-muted">Up Vol</span>
            <div className="h-3 flex-1 overflow-hidden rounded-full bg-[#15171a]">
              <div className="h-full rounded-full bg-up" style={{ width: `${(upVol / volMax) * 100}%` }} />
            </div>
            <span className="w-24 text-right text-up">{fmtInt(upVol)}</span>
          </div>
          <div className="flex items-center gap-2 text-[11px] tabular-nums">
            <span className="w-16 text-content-muted">Down Vol</span>
            <div className="h-3 flex-1 overflow-hidden rounded-full bg-[#15171a]">
              <div className="h-full rounded-full bg-down" style={{ width: `${(downVol / volMax) * 100}%` }} />
            </div>
            <span className="w-24 text-right text-down">{fmtInt(downVol)}</span>
          </div>
        </div>
      </div>
    </Panel>
  )
}

// ── Sector Performance ─────────────────────────────────────────────────────
function SectorPanel() {
  const map = new Map<string, { sum: number; n: number }>()
  for (const s of FULL_MARKET) {
    const e = map.get(s.sector) ?? { sum: 0, n: 0 }
    e.sum += s.changePct
    e.n += 1
    map.set(s.sector, e)
  }
  const rows = [...map.entries()]
    .map(([sector, { sum, n }]) => ({ sector, avg: sum / n }))
    .sort((a, b) => b.avg - a.avg)
  const maxAbs = Math.max(...rows.map((r) => Math.abs(r.avg)), 0.1)

  // Tile background tinted green→red by avg change%.
  const tileBg = (avg: number) => {
    const t = Math.min(1, Math.abs(avg) / maxAbs)
    const alpha = (0.1 + t * 0.42).toFixed(2)
    return avg >= 0 ? `rgba(47,208,122,${alpha})` : `rgba(255,107,114,${alpha})`
  }

  return (
    <Panel title="Sector Performance" bodyClassName="overflow-y-auto">
      {/* Heatmap grid */}
      <div className="mb-3 grid grid-cols-3 gap-1.5">
        {rows.map((r) => (
          <div
            key={r.sector}
            className="flex flex-col justify-between rounded-md px-2 py-1.5"
            style={{ backgroundColor: tileBg(r.avg) }}
            title={r.sector}
          >
            <span className="truncate text-[10px] font-medium text-content">{r.sector}</span>
            <span className={`text-[11px] font-semibold tabular-nums ${r.avg >= 0 ? 'text-up' : 'text-down'}`}>{fmt2(r.avg)}</span>
          </div>
        ))}
      </div>
      <ul className="flex flex-col gap-2">
        {rows.map((r) => {
          const pos = r.avg >= 0
          const widthPct = (Math.abs(r.avg) / maxAbs) * 50
          return (
            <li key={r.sector} className="flex items-center gap-2 text-[11px]">
              <span className="w-20 shrink-0 truncate text-content-muted" title={r.sector}>{r.sector}</span>
              <div className="relative flex h-3.5 flex-1 items-center">
                <span className="absolute inset-y-0 left-1/2 w-px bg-border-dark" />
                {pos ? (
                  <span className="absolute left-1/2 h-2.5 rounded-r-sm bg-up" style={{ width: `${widthPct}%` }} />
                ) : (
                  <span className="absolute right-1/2 h-2.5 rounded-l-sm bg-down" style={{ width: `${widthPct}%` }} />
                )}
              </div>
              <span className={`w-12 shrink-0 text-right tabular-nums ${pos ? 'text-up' : 'text-down'}`}>{fmt2(r.avg)}</span>
            </li>
          )
        })}
      </ul>
    </Panel>
  )
}

// ── Movers ─────────────────────────────────────────────────────────────────
function MoversPanel({ onSelect, onTrade }: { onSelect: (s: Symbol) => void; onTrade: (symbol: Symbol, side: 'buy' | 'sell') => void }) {
  const active = useLiveSymbols(FULL_MARKET).filter((s) => s.lastPrice > 0)
  const gainers = [...active].sort((a, b) => b.changePct - a.changePct).slice(0, 6)
  const losers = [...active].sort((a, b) => a.changePct - b.changePct).slice(0, 6)
  const maxG = Math.max(...gainers.map((s) => s.changePct), 0.1)
  const maxL = Math.max(...losers.map((s) => Math.abs(s.changePct)), 0.1)

  const Row = ({ s, up, max }: { s: Symbol; up: boolean; max: number }) => (
    <li
      onClick={() => onSelect(s)}
      className="group flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-0.5 text-[11px] tabular-nums hover:bg-[rgba(255,255,255,0.04)]"
    >
      <span className="w-16 shrink-0 truncate font-medium text-content">{s.symbolShortName}</span>
      <RowSparkline short={s.symbolShortName} w={42} h={14} />
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#15171a] group-hover:hidden">
        <div className={`h-full rounded-full ${up ? 'bg-up' : 'bg-down'}`} style={{ width: `${(Math.abs(s.changePct) / max) * 100}%` }} />
      </div>
      <div className="hidden flex-1 items-center justify-end gap-1 group-hover:flex">
        <Button size="sm" variant="buy" className="h-5 px-1.5 text-[10px]" onClick={(e) => { e.stopPropagation(); onTrade(s, 'buy') }}>Buy</Button>
        <Button size="sm" variant="sell" className="h-5 px-1.5 text-[10px]" onClick={(e) => { e.stopPropagation(); onTrade(s, 'sell') }}>Sell</Button>
      </div>
      <span className={`w-12 shrink-0 text-right ${up ? 'text-up' : 'text-down'}`}>{fmtPct(s.changePct)}</span>
    </li>
  )

  return (
    <Panel title="Movers">
      <div className="grid grid-cols-2 gap-x-4">
        <div>
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-up">Top Gainers</div>
          <ul className="flex flex-col gap-1">
            {gainers.map((s) => <Row key={s.id} s={s} up max={maxG} />)}
          </ul>
        </div>
        <div>
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-down">Top Losers</div>
          <ul className="flex flex-col gap-1">
            {losers.map((s) => <Row key={s.id} s={s} up={false} max={maxL} />)}
          </ul>
        </div>
      </div>
    </Panel>
  )
}

// ── Most Active ──────────────────────────────────────────────────────────
function MostActivePanel({ onSelect, onTrade }: { onSelect: (s: Symbol) => void; onTrade: (symbol: Symbol, side: 'buy' | 'sell') => void }) {
  const price = usePrices()
  return (
    <Panel title="Most Active" bodyClassName="overflow-y-auto" noPadding>
      <table className="w-full text-[12px]">
        <thead>
          <tr className="text-[10px] uppercase tracking-wide text-content-muted">
            <th className="px-4 py-1.5 text-left font-medium">Symbol</th>
            <th className="px-2 py-1.5 text-left font-medium">Name</th>
            <th className="px-2 py-1.5 text-center font-medium">Trend</th>
            <th className="px-2 py-1.5 text-right font-medium">Last</th>
            <th className="px-2 py-1.5 text-right font-medium">Chg%</th>
            <th className="px-4 py-1.5 text-right font-medium">Volume</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border-dark">
          {TOP_SYMBOLS.map((s) => {
            const q = price(s.symbolShortName)
            const last = q?.last ?? s.lastPrice
            const pct = q?.changePct ?? s.changePct
            const tone = pct > 0 ? 'text-up' : pct < 0 ? 'text-down' : 'text-flat'
            const full = bySymbol(s.symbolShortName)
            return (
              <tr
                key={s.id}
                onClick={() => full && onSelect(full)}
                className="group cursor-pointer hover:bg-[rgba(255,255,255,0.03)]"
              >
                <td className="px-4 py-1.5 font-medium text-content">{s.symbolShortName}</td>
                <td className="relative max-w-0 truncate px-2 py-1.5 text-content-muted">
                  <span className="group-hover:invisible">{s.symbolName}</span>
                  {full && (
                    <span className="invisible absolute inset-y-0 left-2 flex items-center gap-1 group-hover:visible">
                      <Button size="sm" variant="buy" className="h-5 px-1.5 text-[10px]" onClick={(e) => { e.stopPropagation(); onTrade(full, 'buy') }}>Buy</Button>
                      <Button size="sm" variant="sell" className="h-5 px-1.5 text-[10px]" onClick={(e) => { e.stopPropagation(); onTrade(full, 'sell') }}>Sell</Button>
                    </span>
                  )}
                </td>
                <td className="px-2 py-1.5 text-center"><span className="inline-flex justify-center"><RowSparkline short={s.symbolShortName} /></span></td>
                <td className="px-2 py-1.5 text-right tabular-nums text-content">{fmtPrice(last)}</td>
                <td className={`px-2 py-1.5 text-right tabular-nums ${tone}`}>{fmtPct(pct)}</td>
                <td className="px-4 py-1.5 text-right tabular-nums text-content-muted">{fmtInt(s.volume)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </Panel>
  )
}

// ── News ─────────────────────────────────────────────────────────────────
const NEWS: { time: string; headline: string }[] = [
  { time: '10:42', headline: 'DFM extends gains led by real estate' },
  { time: '10:31', headline: 'Emaar Q4 profit beats estimates' },
  { time: '10:18', headline: 'ADNOC Drilling declares dividend' },
  { time: '09:57', headline: 'UAE banks rally on rate outlook' },
  { time: '09:44', headline: 'Salik volumes surge as traffic scheme expands' },
  { time: '09:30', headline: 'ADX IPO pipeline broadens into industrials' },
  { time: '09:12', headline: 'Tabreed wins KSA district-cooling concession' },
  { time: '08:55', headline: 'Foreign inflows lift Nasdaq Dubai to fresh high' },
]

function NewsPanel() {
  return (
    <Panel title="News" bodyClassName="overflow-y-auto" noPadding>
      <ul className="divide-y divide-border-dark">
        {NEWS.map((n, i) => (
          <li key={i} className="flex items-center gap-2.5 px-4 py-2 hover:bg-[rgba(255,255,255,0.03)]">
            <span className="shrink-0 text-[10px] tabular-nums text-content-subtle">{n.time}</span>
            <span className="truncate text-[12px] text-content" title={n.headline}>{n.headline}</span>
          </li>
        ))}
      </ul>
    </Panel>
  )
}

// ── Time & Sales ───────────────────────────────────────────────────────────
function TimeSalesPanel({ short }: { short: string }) {
  return (
    <Panel title={`Time & Sales — ${short}`} bodyClassName="overflow-y-auto" noPadding>
      <table className="w-full text-[11px]">
        <thead>
          <tr className="text-[10px] uppercase tracking-wide text-content-muted">
            <th className="px-4 py-1.5 text-left font-medium">Time</th>
            <th className="px-2 py-1.5 text-right font-medium">Price</th>
            <th className="px-4 py-1.5 text-right font-medium">Size</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border-dark">
          {TIME_SALES.map((t, i) => (
            <tr key={i} className="hover:bg-[rgba(255,255,255,0.03)]">
              <td className="px-4 py-[5px] tabular-nums text-content-muted">{t.time}</td>
              <td className={`px-2 py-[5px] text-right font-medium tabular-nums ${t.side === 'buy' ? 'text-up' : 'text-down'}`}>{fmtPrice(t.price)}</td>
              <td className="px-4 py-[5px] text-right tabular-nums text-content">{fmtInt(t.size)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  )
}

// ── Watchlist (from the MSN dashboard) ───────────────────────────────────────
function WatchlistPanel({ selected, onSelect, onTrade }: { selected: Symbol; onSelect: (s: Symbol) => void; onTrade: (symbol: Symbol, side: 'buy' | 'sell') => void }) {
  const rows = useLiveSymbols(WATCHLIST)
  return (
    <Panel title="Watchlist" bodyClassName="overflow-y-auto" noPadding>
      <ul className="divide-y divide-border-dark">
        {rows.map((s) => {
          const tone = s.changePct > 0 ? 'text-up' : s.changePct < 0 ? 'text-down' : 'text-flat'
          const active = s.symbolShortName === selected.symbolShortName
          return (
            <li
              key={s.id}
              onClick={() => onSelect(s)}
              className={`group flex cursor-pointer items-center gap-2 px-3 py-2 hover:bg-[rgba(255,255,255,0.04)] ${active ? 'bg-[rgba(0,98,255,0.12)]' : ''}`}
            >
              <div className="min-w-0 flex-1">
                <div className="text-[12px] font-medium text-content">{s.symbolShortName}</div>
                <div className="truncate text-[10px] text-content-muted" title={s.symbolName}>{s.symbolName}</div>
              </div>
              <RowSparkline short={s.symbolShortName} w={44} h={16} />
              <div className="flex w-[72px] shrink-0 flex-col items-end group-hover:hidden">
                <span className="text-[12px] tabular-nums text-content">{fmtPrice(s.lastPrice)}</span>
                <span className={`text-[10px] tabular-nums ${tone}`}>{fmtPct(s.changePct)}</span>
              </div>
              <div className="hidden w-[72px] shrink-0 items-center justify-end gap-1 group-hover:flex">
                <Button size="sm" variant="buy" className="h-5 px-1.5 text-[10px]" onClick={(e) => { e.stopPropagation(); onTrade(s, 'buy') }}>Buy</Button>
                <Button size="sm" variant="sell" className="h-5 px-1.5 text-[10px]" onClick={(e) => { e.stopPropagation(); onTrade(s, 'sell') }}>Sell</Button>
              </div>
            </li>
          )
        })}
      </ul>
    </Panel>
  )
}

// ── Header — functional symbol picker ───────────────────────────────────────
function Header({
  selected,
  onSelect,
  resetLayout,
  canReset,
}: {
  selected: Symbol
  onSelect: (s: Symbol) => void
  resetLayout: () => void
  canReset: boolean
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = q
      ? FULL_MARKET.filter(
          (s) => s.symbolShortName.toLowerCase().includes(q) || s.symbolName.toLowerCase().includes(q),
        )
      : FULL_MARKET
    return list.slice(0, 12)
  }, [query])

  const pick = (s: Symbol) => {
    onSelect(s)
    setQuery(s.symbolShortName)
    setOpen(false)
  }

  return (
    <header className="flex h-12 shrink-0 items-center gap-3 border-b border-border-dark px-4">
      <h1 className="text-[15px] font-semibold text-content">Securities Terminal</h1>
      <div className="relative">
        <div className="flex h-8 items-center gap-2 rounded-full border border-border-dark bg-[#15171a] px-3">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={LABEL} strokeWidth="2" className="shrink-0">
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            id="terminal-symbol-search"
            type="text"
            value={query}
            placeholder="Search symbol… (SALIK, DIB, EIB)"
            onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 120)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') { setOpen(false); (e.target as HTMLInputElement).blur() }
              else if (e.key === 'Enter' && matches[0]) pick(matches[0])
            }}
            className="w-56 bg-transparent text-[12px] text-content placeholder:text-content-subtle outline-none"
          />
        </div>
        {open && matches.length > 0 && (
          <ul className="absolute left-0 top-full z-30 mt-1 max-h-72 w-80 overflow-auto rounded-lg border border-border-dark bg-surface shadow-xl">
            {matches.map((s) => {
              const tone = s.changePct > 0 ? 'text-up' : s.changePct < 0 ? 'text-down' : 'text-flat'
              return (
                <li
                  key={s.id}
                  onMouseDown={(e) => { e.preventDefault(); pick(s) }}
                  className={`flex cursor-pointer items-center gap-2 px-3 py-1.5 text-[12px] hover:bg-[rgba(255,255,255,0.04)] ${
                    s.symbolShortName === selected.symbolShortName ? 'bg-[rgba(0,98,255,0.12)]' : ''
                  }`}
                >
                  <span className="w-20 shrink-0 font-medium text-content">{s.symbolShortName}</span>
                  <span className="flex-1 truncate text-content-muted" title={s.symbolName}>{s.symbolName}</span>
                  <span className="shrink-0 tabular-nums text-content">{fmtPrice(s.lastPrice)}</span>
                  <span className={`w-14 shrink-0 text-right tabular-nums ${tone}`}>{fmtPct(s.changePct)}</span>
                </li>
              )
            })}
          </ul>
        )}
      </div>
      <Badge tone="info">DFM</Badge>
      <div className="ml-auto flex items-center gap-4 text-[12px]">
        <span className="hidden items-center gap-1 text-content-subtle lg:flex" title="Drag a panel's grip to rearrange · drag its right edge to resize (double-click for full width)">
          <span className="text-[13px] leading-none">⠿</span>
          Drag to rearrange · resize edges
        </span>
        <Button variant="ghost" size="sm" onClick={resetLayout} disabled={!canReset} title="Restore the default panel layout">
          Reset layout
        </Button>
        <span className="flex items-center gap-1.5 text-up">
          <span className="inline-block h-2 w-2 rounded-full bg-up shadow-[0_0_6px_#2fd07a]" />
          Live
        </span>
        <span className="font-medium text-content">{selected.symbolShortName}</span>
      </div>
    </header>
  )
}

// ── Ticker tape ──────────────────────────────────────────────────────────
function TickerTape({ tick }: { tick: number }) {
  return (
    <div className="shrink-0 overflow-x-auto whitespace-nowrap border-t border-border-dark bg-surface px-3 py-2">
      {TICKERS.map((t, i) => {
        // Live value oscillates; net change/pct recomputed from the same base so
        // the ▲/▼ glyph and colour stay in sync with the moving number.
        const liveVal = live(t.value, tick, seedOf(t.label))
        const base = t.value - t.netChange // implied previous close
        const liveNet = liveVal - base
        const livePct = base ? (liveNet / base) * 100 : 0
        const dir: 'up' | 'down' | 'flat' = liveNet > 0.0005 ? 'up' : liveNet < -0.0005 ? 'down' : 'flat'
        const tone = dir === 'up' ? 'text-up' : dir === 'down' ? 'text-down' : 'text-flat'
        return (
          <span key={t.label} className="inline-flex items-center gap-2 text-[12px]">
            {i > 0 && <span className="mx-3 text-content-subtle">·</span>}
            <span className="text-content-muted">{t.label}</span>
            <span className="font-medium tabular-nums text-content">{fmtPrice(liveVal)}</span>
            <span className={`tabular-nums ${tone}`}>
              {dir === 'up' ? '▲' : dir === 'down' ? '▼' : '—'} {fmtChange(liveNet)} ({fmtPct(livePct)})
            </span>
          </span>
        )
      })}
    </div>
  )
}

// ── Drag-to-reorder layout ───────────────────────────────────────────────────
// Each top-level grid panel is described by a stable id, its default numeric
// column span and a render fn returning the EXISTING panel component
// (props/behaviour unchanged). The user can drag the ⠿ grip to reorder and drag
// the right edge to resize; both order and per-panel spans are persisted.

type PanelId =
  | 'indices' | 'hero' | 'orderbook' | 'breadth' | 'sector'
  | 'movers' | 'watchlist' | 'mostactive' | 'news' | 'timesales'

interface PanelDef {
  id: PanelId
  defaultSpan: number
  render: () => ReactNode
}

const LAYOUT_KEY = 'fab-terminal-layout-v2'

/** Min / max column span a panel may occupy. */
const MIN_SPAN = 3
const MAX_SPAN = 12

const clampSpan = (n: number) => Math.max(MIN_SPAN, Math.min(MAX_SPAN, n))

/** Default order — matches the original fixed layout exactly. */
const DEFAULT_ORDER: PanelId[] = [
  'indices', 'hero', 'orderbook',
  'breadth', 'sector', 'movers',
  'watchlist', 'mostactive', 'news',
  'timesales',
]

/** Default width (column span) per panel — matches the original fixed layout. */
const DEFAULT_SPANS: Record<PanelId, number> = {
  indices: 3,
  hero: 6,
  orderbook: 3,
  breadth: 4,
  sector: 4,
  movers: 4,
  watchlist: 3,
  mostactive: 6,
  news: 3,
  timesales: 12,
}

interface Layout {
  order: PanelId[]
  spans: Record<PanelId, number>
}

const defaultLayout = (): Layout => ({
  order: DEFAULT_ORDER.slice(),
  spans: { ...DEFAULT_SPANS },
})

function isValidOrder(value: unknown): value is PanelId[] {
  if (!Array.isArray(value) || value.length !== DEFAULT_ORDER.length) return false
  const ids = new Set<string>(DEFAULT_ORDER)
  const seen = new Set<string>()
  for (const v of value) {
    if (typeof v !== 'string' || !ids.has(v) || seen.has(v)) return false
    seen.add(v)
  }
  return true
}

function isValidSpans(value: unknown): value is Record<PanelId, number> {
  if (typeof value !== 'object' || value === null) return false
  const rec = value as Record<string, unknown>
  for (const id of DEFAULT_ORDER) {
    const n = rec[id]
    if (typeof n !== 'number' || !Number.isInteger(n) || n < MIN_SPAN || n > MAX_SPAN) return false
  }
  return true
}

/** Read+validate a persisted layout; fall back to defaults if missing/invalid. */
function loadLayout(): Layout {
  try {
    const raw = localStorage.getItem(LAYOUT_KEY)
    if (!raw) return defaultLayout()
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return defaultLayout()
    const { order, spans } = parsed as { order?: unknown; spans?: unknown }
    if (!isValidOrder(order) || !isValidSpans(spans)) return defaultLayout()
    return { order, spans }
  } catch {
    return defaultLayout()
  }
}

// ── Draggable + resizable wrapper ──────────────────────────────────────────
function DraggablePanel({
  id,
  span,
  draggingId,
  overId,
  onDragStartPanel,
  onDragOverPanel,
  onDropPanel,
  onDragEndPanel,
  onResizeSpan,
  onToggleFullWidth,
  onTearOut,
  highlight,
  children,
}: {
  id: PanelId
  span: number
  draggingId: PanelId | null
  overId: PanelId | null
  onDragStartPanel: (id: PanelId) => void
  onDragOverPanel: (id: PanelId) => void
  onDropPanel: (id: PanelId) => void
  onDragEndPanel: () => void
  onResizeSpan: (id: PanelId, span: number) => void
  onToggleFullWidth: (id: PanelId) => void
  onTearOut?: (id: PanelId, screenX?: number, screenY?: number) => void
  highlight?: boolean
  children: ReactNode
}) {
  // Drag is only armed when the grip handle is pressed, so buttons/charts inside
  // the panel never start an accidental drag.
  const [armed, setArmed] = useState(false)
  const [resizing, setResizing] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)
  // Captured at pointer-down so a continuous drag maps px → column delta
  // independently of intermediate re-renders.
  const resizeRef = useRef<{ startX: number; startSpan: number; unit: number } | null>(null)
  const isDragging = draggingId === id
  const isOver = overId === id && draggingId !== null && draggingId !== id

  const beginResize = (e: PointerEvent<HTMLDivElement>) => {
    // Keep the resize completely separate from the reorder grip so it never
    // arms a native HTML5 drag.
    e.stopPropagation()
    e.preventDefault()
    const el = wrapperRef.current
    if (!el) return
    const width = el.getBoundingClientRect().width
    e.currentTarget.setPointerCapture(e.pointerId)
    resizeRef.current = { startX: e.clientX, startSpan: span, unit: width / span }
    setResizing(true)
  }

  const moveResize = (e: PointerEvent<HTMLDivElement>) => {
    const ctx = resizeRef.current
    if (!ctx || !resizing) return
    const deltaCols = Math.round((e.clientX - ctx.startX) / ctx.unit)
    const next = clampSpan(ctx.startSpan + deltaCols)
    if (next !== span) onResizeSpan(id, next)
  }

  const endResize = (e: PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
    resizeRef.current = null
    setResizing(false)
  }

  return (
    <div
      ref={wrapperRef}
      data-panel-id={id}
      style={{ gridColumn: `span ${span} / span ${span}` }}
      className={`group relative h-full [&>section]:h-full transition-shadow ${isDragging ? 'opacity-50' : ''} ${
        isOver ? 'rounded-xl ring-2 ring-action/70' : ''
      } ${highlight ? 'rounded-xl ring-2 ring-action shadow-[0_0_0_4px_rgba(0,98,255,0.25)]' : ''}`}
      draggable={armed}
      onDragStart={(e: DragEvent<HTMLDivElement>) => {
        e.dataTransfer.setData('text/plain', id)
        e.dataTransfer.effectAllowed = 'move'
        onDragStartPanel(id)
      }}
      onDragOver={(e: DragEvent<HTMLDivElement>) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
        onDragOverPanel(id)
      }}
      onDrop={(e: DragEvent<HTMLDivElement>) => {
        e.preventDefault()
        onDropPanel(id)
        setArmed(false)
      }}
      onDragEnd={(e: DragEvent<HTMLDivElement>) => {
        setArmed(false)
        // Released outside this app window → tear the panel off into its own
        // window at the drop point. (The ⤢ button is the guaranteed path.)
        const outside =
          e.screenX < window.screenX ||
          e.screenX > window.screenX + window.outerWidth ||
          e.screenY < window.screenY ||
          e.screenY > window.screenY + window.outerHeight
        if (outside && e.screenX !== 0 && e.screenY !== 0) onTearOut?.(id, e.screenX, e.screenY)
        onDragEndPanel()
      }}
    >
      <div className="pointer-events-none absolute right-1.5 top-1.5 z-30 flex items-center gap-0.5 rounded-md border border-border-dark bg-surface/95 px-0.5 py-0.5 opacity-0 shadow-sm transition-opacity group-hover:pointer-events-auto group-hover:opacity-100">
        <button
          type="button"
          aria-label="Send panel to the Workspace board"
          title="Send to the Workspace board (drag/arrange on another monitor)"
          onClick={() => onTearOut?.(id)}
          className="flex h-5 w-5 items-center justify-center rounded text-content-muted hover:bg-[rgba(255,255,255,0.06)] hover:text-content"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 4h6v6" />
            <path d="M20 4l-8 8" />
            <path d="M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4" />
          </svg>
        </button>
        <button
          type="button"
          aria-label="Drag to rearrange panel"
          title="Drag to rearrange · drag off the window to pop out"
          onPointerDown={() => setArmed(true)}
          onPointerUp={() => setArmed(false)}
          className="flex h-5 w-5 cursor-grab items-center justify-center rounded text-[13px] leading-none text-content-muted hover:bg-[rgba(255,255,255,0.06)] hover:text-content active:cursor-grabbing"
        >
          ⠿
        </button>
      </div>
      {children}
      {/* Width indicator (only while actively resizing). */}
      {resizing && (
        <span className="pointer-events-none absolute right-3 top-1/2 z-30 -translate-y-1/2 rounded bg-action/90 px-1.5 py-0.5 text-[10px] font-medium leading-none tabular-nums text-white shadow">
          {span}/12
        </span>
      )}
      {/* Vertical resize handle on the right edge. Double-click toggles full width. */}
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize panel width"
        title="Drag to resize · double-click for full width"
        onPointerDown={beginResize}
        onPointerMove={moveResize}
        onPointerUp={endResize}
        onLostPointerCapture={endResize}
        onDoubleClick={(e) => {
          e.stopPropagation()
          onToggleFullWidth(id)
        }}
        className={`absolute right-0 top-0 z-20 h-full w-1.5 cursor-col-resize transition-colors ${
          resizing ? 'bg-action' : 'bg-transparent group-hover:bg-[rgba(255,255,255,0.12)] hover:!bg-action/70'
        }`}
      />
    </div>
  )
}

// ── Function-key hotkeys ─────────────────────────────────────────────────────
// F1–F10 drive the terminal the way a Bloomberg-style desk would. `panel` keys
// scroll the matching card into view and flash it; the rest fire an action.
type HotkeyAction =
  | { kind: 'help' }
  | { kind: 'buy' }
  | { kind: 'sell' }
  | { kind: 'search' }
  | { kind: 'reset' }
  | { kind: 'broker' }
  | { kind: 'panel'; panel: PanelId }

const HOTKEYS: { key: string; label: string; hint: string; action: HotkeyAction }[] = [
  { key: 'F1', label: 'Help', hint: 'Show / hide this shortcuts panel', action: { kind: 'help' } },
  { key: 'F2', label: 'Buy', hint: 'Open a buy ticket for the selected symbol', action: { kind: 'buy' } },
  { key: 'F3', label: 'Sell', hint: 'Open a sell ticket for the selected symbol', action: { kind: 'sell' } },
  { key: 'F4', label: 'Search', hint: 'Jump to the symbol search box', action: { kind: 'search' } },
  { key: 'F5', label: 'Broker Flow', hint: 'Open the Broker Flow as its own window', action: { kind: 'broker' } },
  { key: 'F6', label: 'Movers', hint: 'Jump to the Top Movers panel', action: { kind: 'panel', panel: 'movers' } },
  { key: 'F7', label: 'Order Book', hint: 'Jump to the Order Book panel', action: { kind: 'panel', panel: 'orderbook' } },
  { key: 'F8', label: 'News', hint: 'Jump to the News panel', action: { kind: 'panel', panel: 'news' } },
  { key: 'F9', label: 'Time & Sales', hint: 'Jump to the Time & Sales panel', action: { kind: 'panel', panel: 'timesales' } },
  { key: 'F10', label: 'Reset', hint: 'Restore the default panel layout', action: { kind: 'reset' } },
]

/** Always-visible legend strip above the ticker tape. */
function HotkeyBar({ onTrigger }: { onTrigger: (a: HotkeyAction) => void }) {
  return (
    <div className="flex shrink-0 items-center gap-1.5 overflow-x-auto whitespace-nowrap border-t border-border-dark bg-[#15171a] px-3 py-1.5">
      <span className="mr-1 text-[10px] font-semibold uppercase tracking-wide text-content-subtle">Shortcuts</span>
      {HOTKEYS.map((h) => (
        <button
          key={h.key}
          type="button"
          title={h.hint}
          onClick={() => onTrigger(h.action)}
          className="flex items-center gap-1.5 rounded border border-border-dark bg-[#1a1c1e] px-1.5 py-0.5 text-[11px] text-content-muted transition-colors hover:border-action/60 hover:text-content"
        >
          <kbd className="rounded bg-[#0b0c0d] px-1 py-px font-mono text-[10px] font-semibold text-action">{h.key}</kbd>
          {h.label}
        </button>
      ))}
    </div>
  )
}

/** Centered overlay opened by F1. */
function HotkeyHelp({ open, onClose, onTrigger }: { open: boolean; onClose: () => void; onTrigger: (a: HotkeyAction) => void }) {
  if (!open) return null
  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-[460px] max-w-[90%] rounded-2xl border border-border-dark bg-surface p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-content">Keyboard shortcuts</h2>
          <button type="button" onClick={onClose} className="rounded p-1 text-content-muted hover:bg-[rgba(255,255,255,0.06)] hover:text-content" aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
        <ul className="flex flex-col gap-1">
          {HOTKEYS.map((h) => (
            <li key={h.key}>
              <button
                type="button"
                onClick={() => onTrigger(h.action)}
                className="flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left hover:bg-[rgba(255,255,255,0.05)]"
              >
                <kbd className="w-10 shrink-0 rounded bg-[#0b0c0d] py-0.5 text-center font-mono text-[11px] font-semibold text-action">{h.key}</kbd>
                <span className="w-24 shrink-0 text-[12px] font-medium text-content">{h.label}</span>
                <span className="flex-1 text-[12px] text-content-muted">{h.hint}</span>
              </button>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[11px] text-content-subtle">Press <kbd className="rounded bg-[#0b0c0d] px-1 font-mono text-action">F1</kbd> or <kbd className="rounded bg-[#0b0c0d] px-1 font-mono text-action">Esc</kbd> to close.</p>
      </div>
    </div>
  )
}

// ── Pop-out (tear-off) panels ────────────────────────────────────────────────
export const PANEL_TITLES: Record<PanelId, string> = {
  indices: 'Indices', hero: 'Quote', orderbook: 'Order Book', breadth: 'Breadth',
  sector: 'Sectors', movers: 'Top Movers', watchlist: 'Watchlist',
  mostactive: 'Most Active', news: 'News', timesales: 'Time & Sales',
}

/**
 * Renders ONE Graph panel with its own live tick, local selected symbol and
 * order ticket, filling its parent container. Shared by the full-window
 * `DetachedPanel` and by the Workspace board (a card in the grid).
 */
export function GraphPanelBody({ id }: { id: string }) {
  const tick = useLiveTick()
  const [selected, setSelected] = useState<Symbol>(() => FULL_MARKET.find((s) => s.symbolShortName === 'EMAAR')!)
  // The detached window has no parent terminal to host the order ticket, so it
  // carries its own — this makes Buy/Sell work on another monitor.
  const [trade, setTrade] = useState<{ open: boolean; side: 'buy' | 'sell'; symbol: Symbol | null }>({ open: false, side: 'buy', symbol: null })
  const onTrade = (symbol: Symbol, side: 'buy' | 'sell') => setTrade({ open: true, side, symbol })

  const body = (): ReactNode => {
    switch (id as PanelId) {
      case 'indices': return <IndicesPanel tick={tick} />
      case 'hero': return <HeroPanel sym={selected} onTrade={onTrade} tick={tick} />
      case 'orderbook': return <OrderBookPanel short={selected.symbolShortName} tick={tick} />
      case 'breadth': return <BreadthPanel tick={tick} />
      case 'sector': return <SectorPanel />
      case 'movers': return <MoversPanel onSelect={setSelected} onTrade={onTrade} />
      case 'watchlist': return <WatchlistPanel selected={selected} onSelect={setSelected} onTrade={onTrade} />
      case 'mostactive': return <MostActivePanel onSelect={setSelected} onTrade={onTrade} />
      case 'news': return <NewsPanel />
      case 'timesales': return <TimeSalesPanel short={selected.symbolShortName} />
      default: return <div className="p-6 text-content">Unknown panel: {id}</div>
    }
  }

  return (
    <div className="h-full w-full overflow-auto bg-page p-3 [&>section]:h-full">
      {body()}
      <BuySellDrawer
        open={trade.open}
        side={trade.side}
        symbol={trade.symbol}
        onSideChange={(side) => setTrade((t) => ({ ...t, side }))}
        onClose={() => setTrade((t) => ({ ...t, open: false }))}
      />
    </div>
  )
}

/**
 * Renders ONE Graph panel filling its own window (the target of `/?detach=<id>`).
 * Thin wrapper around {@link GraphPanelBody}.
 */
export function DetachedPanel({ id }: { id: string }) {
  return (
    <div className="h-screen w-screen bg-page">
      <GraphPanelBody id={id} />
    </div>
  )
}

// ── Root ───────────────────────────────────────────────────────────────────
export default function FabTerminal({ onTrade, onBrokerFlow }: { onTrade: (symbol: Symbol, side: 'buy' | 'sell') => void; onBrokerFlow?: () => void }) {
  const [selected, setSelected] = useState<Symbol>(() => FULL_MARKET.find((s) => s.symbolShortName === 'EMAAR')!)
  const tick = useLiveTick()

  const initialLayout = useMemo(() => loadLayout(), [])
  const [order, setOrder] = useState<PanelId[]>(initialLayout.order)
  const [spans, setSpans] = useState<Record<PanelId, number>>(initialLayout.spans)
  const [draggingId, setDraggingId] = useState<PanelId | null>(null)
  const [overId, setOverId] = useState<PanelId | null>(null)
  // Remembers each panel's pre-full-width span so double-click can toggle back.
  const prevSpanRef = useRef<Partial<Record<PanelId, number>>>({})

  // ── Hotkeys (F1–F10) ──────────────────────────────────────────────────────
  const [helpOpen, setHelpOpen] = useState(false)
  const [flashId, setFlashId] = useState<PanelId | null>(null)
  const flashTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // ── Pop-out to the shared Workspace board ──────────────────────────────────
  // Popping a Graph panel out sends it to the same draggable board the Detailed
  // look uses (grid arrangement, resize, dock-to-main, always-on-top), so both
  // looks share one workspace board. The panel also stays in the graph.
  const popOut = (id: PanelId) => { void sendToBoard(id) }

  // Persist order AND spans together (v2 layout).
  useEffect(() => {
    try {
      localStorage.setItem(LAYOUT_KEY, JSON.stringify({ order, spans }))
    } catch {
      /* ignore quota/availability errors */
    }
  }, [order, spans])

  // Panel registry — keeps each panel's existing props/behaviour identical.
  const panels: Record<PanelId, PanelDef> = useMemo(
    () => ({
      indices: { id: 'indices', defaultSpan: 3, render: () => <IndicesPanel tick={tick} /> },
      hero: { id: 'hero', defaultSpan: 6, render: () => <HeroPanel sym={selected} onTrade={onTrade} tick={tick} /> },
      orderbook: { id: 'orderbook', defaultSpan: 3, render: () => <OrderBookPanel short={selected.symbolShortName} tick={tick} /> },
      breadth: { id: 'breadth', defaultSpan: 4, render: () => <BreadthPanel tick={tick} /> },
      sector: { id: 'sector', defaultSpan: 4, render: () => <SectorPanel /> },
      movers: { id: 'movers', defaultSpan: 4, render: () => <MoversPanel onSelect={setSelected} onTrade={onTrade} /> },
      watchlist: { id: 'watchlist', defaultSpan: 3, render: () => <WatchlistPanel selected={selected} onSelect={setSelected} onTrade={onTrade} /> },
      mostactive: { id: 'mostactive', defaultSpan: 6, render: () => <MostActivePanel onSelect={setSelected} onTrade={onTrade} /> },
      news: { id: 'news', defaultSpan: 3, render: () => <NewsPanel /> },
      timesales: { id: 'timesales', defaultSpan: 12, render: () => <TimeSalesPanel short={selected.symbolShortName} /> },
    }),
    [selected, onTrade, tick],
  )

  const handleDrop = (targetId: PanelId) => {
    setOrder((prev) => {
      if (draggingId === null || draggingId === targetId) return prev
      const next = prev.filter((pid) => pid !== draggingId)
      const idx = next.indexOf(targetId)
      next.splice(idx, 0, draggingId)
      return next
    })
    setDraggingId(null)
    setOverId(null)
  }

  const handleResizeSpan = (id: PanelId, span: number) => {
    setSpans((prev) => (prev[id] === span ? prev : { ...prev, [id]: clampSpan(span) }))
  }

  const handleToggleFullWidth = (id: PanelId) => {
    setSpans((prev) => {
      if (prev[id] !== MAX_SPAN) {
        prevSpanRef.current[id] = prev[id]
        return { ...prev, [id]: MAX_SPAN }
      }
      const restored = prevSpanRef.current[id] ?? DEFAULT_SPANS[id]
      return { ...prev, [id]: clampSpan(restored) }
    })
  }

  const resetLayout = () => {
    const fresh = defaultLayout()
    setOrder(fresh.order)
    setSpans(fresh.spans)
    prevSpanRef.current = {}
    try {
      localStorage.removeItem(LAYOUT_KEY)
    } catch {
      /* ignore */
    }
  }

  // Scroll a panel into view and flash a ring around it for ~1.4s.
  const focusPanel = (id: PanelId) => {
    setFlashId(id)
    document.querySelector(`[data-panel-id="${id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    clearTimeout(flashTimer.current)
    flashTimer.current = setTimeout(() => setFlashId(null), 1400)
  }

  const runHotkey = (a: HotkeyAction) => {
    switch (a.kind) {
      case 'help': setHelpOpen((o) => !o); break
      case 'buy': onTrade(selected, 'buy'); break
      case 'sell': onTrade(selected, 'sell'); break
      case 'search': setHelpOpen(false); document.getElementById('terminal-symbol-search')?.focus(); break
      case 'reset': resetLayout(); break
      case 'broker': setHelpOpen(false); onBrokerFlow?.(); break
      case 'panel': setHelpOpen(false); focusPanel(a.panel); break
    }
  }

  // Global F-key listener. F1–F10 are intercepted (so the webview never reloads
  // on F5 or pops its own help on F1); other keys pass straight through.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && helpOpen) { setHelpOpen(false); return }
      if (e.key === 'F5') return // F5 (Broker Flow) is handled by the workspace
      const hk = HOTKEYS.find((h) => h.key === e.key)
      if (!hk) return
      e.preventDefault()
      runHotkey(hk.action)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, helpOpen])

  const orderCustomized = order.some((id, i) => id !== DEFAULT_ORDER[i])
  const spansCustomized = DEFAULT_ORDER.some((id) => spans[id] !== DEFAULT_SPANS[id])
  const isCustomized = orderCustomized || spansCustomized

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-page">
      <Header selected={selected} onSelect={setSelected} resetLayout={resetLayout} canReset={isCustomized} />
      <div className="flex-1 overflow-y-auto p-3">
        <div className="grid auto-rows-auto grid-flow-dense grid-cols-12 gap-3">
          {order.map((id) => {
            const def = panels[id]
            return (
              <DraggablePanel
                key={def.id}
                id={def.id}
                span={spans[def.id]}
                draggingId={draggingId}
                overId={overId}
                onDragStartPanel={setDraggingId}
                onDragOverPanel={setOverId}
                onDropPanel={handleDrop}
                onDragEndPanel={() => {
                  setDraggingId(null)
                  setOverId(null)
                }}
                onResizeSpan={handleResizeSpan}
                onToggleFullWidth={handleToggleFullWidth}
                onTearOut={popOut}
                highlight={flashId === def.id}
              >
                {def.render()}
              </DraggablePanel>
            )
          })}
        </div>
      </div>
      <HotkeyBar onTrigger={runHotkey} />
      <TickerTape tick={tick} />
      <HotkeyHelp open={helpOpen} onClose={() => setHelpOpen(false)} onTrigger={runHotkey} />
    </div>
  )
}
