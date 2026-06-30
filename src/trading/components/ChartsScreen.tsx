import { useMemo, useState } from 'react'
import { Panel, Select, SegmentedTabs, Badge } from './ui'
import {
  CANDLES,
  CHART_SYMBOLS,
  FULL_MARKET,
  fmtPrice,
  fmtInt,
  fmtPct,
} from '../data'
import type { Candle } from '../data'

/**
 * CHARTS screen for FAB Securities — dark, flat trading chart built from pure
 * inline SVG (no chart library). Renders a price pane (candles or line) plus a
 * volume pane with grid lines and right-aligned price labels.
 */

const TIMEFRAMES = ['1M', '3M', '6M', 'All'] as const
type Timeframe = (typeof TIMEFRAMES)[number]

const CHART_TYPES = ['Candles', 'Line'] as const
type ChartType = (typeof CHART_TYPES)[number]

// ─── SVG geometry (user space 1000 × 460) ─────────────────────────────────
const VB_W = 1000
const VB_H = 460
const PAD_LEFT = 8 // left padding (labels are right-aligned on the right edge)
const PAD_RIGHT = 56 // room for right-aligned price labels
const PRICE_TOP = 8
const PRICE_BOTTOM = 360
const VOL_TOP = 380
const VOL_BOTTOM = 460
const GRID_LINES = 5

function sliceCandles(all: Candle[], tf: Timeframe): Candle[] {
  switch (tf) {
    case '1M':
      return all.slice(-22)
    case '3M':
      return all.slice(-66)
    case '6M':
    case 'All':
    default:
      return all
  }
}

// ─── Stats strip cell ──────────────────────────────────────────────────────
function Stat({
  label,
  value,
  className = '',
}: {
  label: string
  value: React.ReactNode
  className?: string
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-wide text-content-muted">{label}</span>
      <span className={`text-[13px] font-semibold tabular-nums ${className}`}>{value}</span>
    </div>
  )
}

export default function ChartsScreen() {
  const [symbol, setSymbol] = useState<string>('EMAAR')
  const [timeframe, setTimeframe] = useState<Timeframe>('6M')
  const [chartType, setChartType] = useState<ChartType>('Candles')

  const name = useMemo(
    () => FULL_MARKET.find((r) => r.symbolShortName === symbol)?.symbolName ?? symbol,
    [symbol],
  )

  const candles = useMemo<Candle[]>(
    () => sliceCandles(CANDLES[symbol] ?? [], timeframe),
    [symbol, timeframe],
  )

  // Derived statistics + render geometry over the visible candles.
  const view = useMemo(() => {
    const n = candles.length
    if (n === 0) {
      return null
    }

    const priceMin = Math.min(...candles.map((c) => c.l))
    const priceMax = Math.max(...candles.map((c) => c.h))
    const priceSpan = priceMax - priceMin || 1
    const maxVol = Math.max(...candles.map((c) => c.v)) || 1

    const first = candles[0]
    const last = candles[n - 1]
    const net = last.c - first.c
    const netPct = (net / first.c) * 100
    const totalVol = candles.reduce((a, c) => a + c.v, 0)

    const plotW = VB_W - PAD_LEFT - PAD_RIGHT
    const step = plotW / n
    const bodyW = Math.max(1, step * 0.6)

    const priceH = PRICE_BOTTOM - PRICE_TOP
    const yPrice = (p: number) => PRICE_TOP + ((priceMax - p) / priceSpan) * priceH
    const xCenter = (i: number) => PAD_LEFT + step * (i + 0.5)

    // Grid levels (evenly spaced price values, top → bottom).
    const gridLevels = Array.from({ length: GRID_LINES }, (_, i) => {
      const p = priceMax - (priceSpan * i) / (GRID_LINES - 1)
      return { p, y: yPrice(p) }
    })

    // Line / area path through close prices.
    const linePts = candles.map((c, i) => `${xCenter(i).toFixed(2)},${yPrice(c.c).toFixed(2)}`)
    const linePath = linePts.join(' ')
    const areaPath =
      n > 0
        ? `M ${xCenter(0).toFixed(2)},${PRICE_BOTTOM} L ${linePts.join(' L ')} L ${xCenter(n - 1).toFixed(2)},${PRICE_BOTTOM} Z`
        : ''

    const volH = VOL_BOTTOM - VOL_TOP

    return {
      n,
      priceMin,
      priceMax,
      net,
      netPct,
      totalVol,
      lastClose: last.c,
      maxVol,
      step,
      bodyW,
      yPrice,
      xCenter,
      gridLevels,
      linePath,
      areaPath,
      volH,
    }
  }, [candles])

  const netUp = (view?.net ?? 0) >= 0
  const netColor = netUp ? 'text-up' : 'text-down'

  return (
    <div className="flex flex-col gap-3">
      {/* ── Header: controls + stats ──────────────────────────────────── */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <Select
            label="Symbol"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            className="w-44"
          >
            {CHART_SYMBOLS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-medium text-content-muted">Timeframe</span>
            <SegmentedTabs tabs={TIMEFRAMES} value={timeframe} onChange={setTimeframe} />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-medium text-content-muted">Type</span>
            <SegmentedTabs tabs={CHART_TYPES} value={chartType} onChange={setChartType} />
          </div>
        </div>

        {view && (
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <Stat label="Last" value={fmtPrice(view.lastClose)} className="text-content" />
            <Stat
              label="Change"
              value={
                <span className={netColor}>
                  {netUp ? '+' : ''}
                  {fmtPrice(view.net)} ({fmtPct(view.netPct)})
                </span>
              }
            />
            <Stat label="High" value={fmtPrice(view.priceMax)} className="text-up" />
            <Stat label="Low" value={fmtPrice(view.priceMin)} className="text-down" />
            <Stat label="Volume" value={fmtInt(view.totalVol)} className="text-content" />
          </div>
        )}
      </div>

      {/* ── Chart panel ───────────────────────────────────────────────── */}
      <Panel
        title={
          <div className="flex min-w-0 items-center gap-2">
            <h3 className="text-[13px] font-semibold text-content">{symbol}</h3>
            <span className="truncate text-[12px] text-content-muted">— {name}</span>
          </div>
        }
        actions={<Badge tone={netUp ? 'up' : 'down'}>{fmtPct(view?.netPct ?? 0)}</Badge>}
      >
        {view ? (
          <svg
            viewBox={`0 0 ${VB_W} ${VB_H}`}
            width="100%"
            className="block"
            preserveAspectRatio="none"
            role="img"
            aria-label={`${symbol} price chart`}
          >
            {/* Grid lines + right-aligned price labels */}
            {view.gridLevels.map((g, i) => (
              <g key={`grid-${i}`}>
                <line
                  x1={PAD_LEFT}
                  x2={VB_W - PAD_RIGHT}
                  y1={g.y}
                  y2={g.y}
                  stroke="#2a2c2e"
                  strokeWidth={1}
                />
                <text
                  x={VB_W - PAD_RIGHT + 6}
                  y={g.y + 4}
                  fill="#979797"
                  fontSize={11}
                  textAnchor="start"
                  className="tabular-nums"
                >
                  {fmtPrice(g.p)}
                </text>
              </g>
            ))}

            {/* Separator between price + volume panes */}
            <line
              x1={PAD_LEFT}
              x2={VB_W - PAD_RIGHT}
              y1={(PRICE_BOTTOM + VOL_TOP) / 2}
              y2={(PRICE_BOTTOM + VOL_TOP) / 2}
              stroke="#2a2c2e"
              strokeWidth={1}
            />

            {/* ── Volume bars ── */}
            {candles.map((c, i) => {
              const up = c.c >= c.o
              const h = (c.v / view.maxVol) * view.volH
              const bw = Math.max(0.6, view.bodyW)
              return (
                <rect
                  key={`vol-${i}`}
                  x={view.xCenter(i) - bw / 2}
                  y={VOL_BOTTOM - h}
                  width={bw}
                  height={h}
                  fill={up ? '#2fd07a' : '#ff6b72'}
                  opacity={0.32}
                />
              )
            })}

            {/* ── Price: candles or line ── */}
            {chartType === 'Candles' ? (
              candles.map((c, i) => {
                const up = c.c >= c.o
                const color = up ? '#2fd07a' : '#ff6b72'
                const x = view.xCenter(i)
                const yHigh = view.yPrice(c.h)
                const yLow = view.yPrice(c.l)
                const yO = view.yPrice(c.o)
                const yC = view.yPrice(c.c)
                const bodyTop = Math.min(yO, yC)
                const bodyH = Math.max(1, Math.abs(yC - yO))
                return (
                  <g key={`candle-${i}`}>
                    <line
                      x1={x}
                      x2={x}
                      y1={yHigh}
                      y2={yLow}
                      stroke={color}
                      strokeWidth={1}
                    />
                    <rect
                      x={x - view.bodyW / 2}
                      y={bodyTop}
                      width={view.bodyW}
                      height={bodyH}
                      fill={color}
                    />
                  </g>
                )
              })
            ) : (
              <g>
                <path d={view.areaPath} fill="#5b9bff" opacity={0.1} />
                <polyline
                  points={view.linePath}
                  fill="none"
                  stroke="#5b9bff"
                  strokeWidth={1.5}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              </g>
            )}
          </svg>
        ) : (
          <div className="flex h-40 items-center justify-center text-[13px] text-content-muted">
            No data for this symbol.
          </div>
        )}

        {/* ── Legend / note ── */}
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border-dark pt-3 text-[11px] text-content-muted">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-sm bg-up" /> Up
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-sm bg-down" /> Down
          </span>
          {chartType === 'Line' && (
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-sm bg-[#5b9bff]" /> Close
            </span>
          )}
          <span className="ml-auto tabular-nums">
            {view?.n ?? 0} sessions · {timeframe} · {chartType}
          </span>
        </div>
      </Panel>
    </div>
  )
}
