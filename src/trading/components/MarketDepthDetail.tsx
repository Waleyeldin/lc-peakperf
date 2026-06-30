import { useMemo, useState } from 'react'
import DataTable, { type Column } from './DataTable'
import { Panel, Select, Button, Badge } from './ui'
import {
  FULL_MARKET,
  CHART_SYMBOLS,
  MARKET_DEPTH_FULL,
  TIME_SALES,
  fmtPrice,
  fmtInt,
  directionColor,
} from '../data'
import type { Symbol, DepthLevel, Trade } from '../data'

/**
 * Market Depth detail screen — a modernised, dark FAB take on the legacy
 * "Market Depth by Order / by Price" windows. Shows a full 10-level order-book
 * ladder with size bars, a pure-SVG cumulative depth chart, and a Time & Sales
 * tape for the selected symbol.
 */
export default function MarketDepthDetail({
  onTrade,
}: {
  onTrade: (symbol: Symbol, side: 'buy' | 'sell') => void
}) {
  const [selectedShort, setSelectedShort] = useState('EMAAR')

  const symbol = useMemo<Symbol>(
    () =>
      FULL_MARKET.find((s) => s.symbolShortName === selectedShort) ??
      FULL_MARKET.find((s) => s.symbolShortName === 'EMAAR') ??
      FULL_MARKET[0],
    [selectedShort],
  )

  const maxBid = useMemo(() => Math.max(...MARKET_DEPTH_FULL.map((d) => d.bidSize)), [])
  const maxOffer = useMemo(() => Math.max(...MARKET_DEPTH_FULL.map((d) => d.offerSize)), [])

  const bestBid = MARKET_DEPTH_FULL[0]?.bidPrice ?? 0
  const bestOffer = MARKET_DEPTH_FULL[0]?.offerPrice ?? 0
  const spread = +(bestOffer - bestBid).toFixed(3)

  const dir = symbol.changePct > 0 ? 'up' : symbol.changePct < 0 ? 'down' : 'flat'

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 bg-page p-3 text-content">
      {/* ── Header: symbol select + quote strip + trade buttons ─────────── */}
      <Panel noPadding>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 p-3">
          <Select
            label="Symbol"
            value={selectedShort}
            onChange={(e) => setSelectedShort(e.target.value)}
            className="w-44"
          >
            {CHART_SYMBOLS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>

          <div className="flex flex-wrap items-end gap-x-6 gap-y-2">
            <Quote label="Last">
              <span className="text-[18px] font-semibold tabular-nums">{fmtPrice(symbol.lastPrice)}</span>
            </Quote>
            <Quote label="Bid">
              <span className="text-up tabular-nums">{fmtPrice(symbol.bidPrice)}</span>
            </Quote>
            <Quote label="Offer">
              <span className="text-down tabular-nums">{fmtPrice(symbol.offerPrice)}</span>
            </Quote>
            <Quote label="Change">
              <Badge tone={dir === 'up' ? 'up' : dir === 'down' ? 'down' : 'neutral'}>
                {symbol.changePct > 0 ? '+' : ''}
                {symbol.changePct.toFixed(2)}%
              </Badge>
            </Quote>
            <Quote label="Open">
              <span className="tabular-nums text-content-muted">{fmtPrice(symbol.openPrice)}</span>
            </Quote>
            <Quote label="High">
              <span className="tabular-nums text-content-muted">{fmtPrice(symbol.high)}</span>
            </Quote>
            <Quote label="Low">
              <span className="tabular-nums text-content-muted">{fmtPrice(symbol.low)}</span>
            </Quote>
            <Quote label="Volume">
              <span className="tabular-nums text-content-muted">{fmtInt(symbol.volume)}</span>
            </Quote>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <Button variant="buy" onClick={() => onTrade(symbol, 'buy')}>
              Buy
            </Button>
            <Button variant="sell" onClick={() => onTrade(symbol, 'sell')}>
              Sell
            </Button>
          </div>
        </div>
      </Panel>

      {/* ── Main grid: ladder (wide) | depth + time&sales ─────────────────── */}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-3">
        {/* Order book ladder */}
        <Panel
          title="Order Book"
          className="lg:col-span-2"
          noPadding
          actions={
            <span className="text-[11px] text-content-muted tabular-nums">
              Spread <span className="font-semibold text-content">{spread.toFixed(3)}</span>
            </span>
          }
        >
          <div className="overflow-auto">
            <Ladder maxBid={maxBid} maxOffer={maxOffer} />
          </div>
        </Panel>

        {/* Right column: depth chart + time & sales */}
        <div className="flex min-h-0 flex-col gap-3">
          <Panel title="Depth" noPadding>
            <div className="p-3">
              <DepthChart maxBid={maxBid} maxOffer={maxOffer} />
            </div>
          </Panel>

          <Panel title="Time & Sales" noPadding className="min-h-[260px] flex-1">
            <div className="max-h-[340px] min-h-0 flex-1 overflow-auto">
              <DataTable<Trade>
                dense
                rowKey={(r, i) => `${r.time}-${i}`}
                rows={TIME_SALES}
                columns={timeSalesColumns}
              />
            </div>
          </Panel>
        </div>
      </div>
    </div>
  )
}

// ─── Quote strip cell ──────────────────────────────────────────────────────
function Quote({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] font-medium uppercase tracking-wide text-content-muted">{label}</span>
      <span className="text-[13px] leading-none">{children}</span>
    </div>
  )
}

// ─── Ladder table ──────────────────────────────────────────────────────────
function Ladder({ maxBid, maxOffer }: { maxBid: number; maxOffer: number }) {
  return (
    <table className="w-full border-collapse text-[13px] tabular-nums">
      <thead className="sticky top-0 z-10">
        <tr className="bg-[#15171a] text-[11px] font-medium uppercase tracking-wide text-content-muted">
          <th className="border-b border-border-dark px-3 py-2 text-right font-medium">Bid Accts</th>
          <th className="border-b border-border-dark px-3 py-2 text-right font-medium">Bid Size</th>
          <th className="border-b border-border-dark px-3 py-2 text-center font-medium">Bid</th>
          <th className="border-b border-border-dark px-3 py-2 text-center font-medium">Offer</th>
          <th className="border-b border-border-dark px-3 py-2 text-right font-medium">Offer Size</th>
          <th className="border-b border-border-dark px-3 py-2 text-right font-medium">Offer Accts</th>
        </tr>
      </thead>
      <tbody>
        {MARKET_DEPTH_FULL.map((lvl: DepthLevel, i) => (
          <tr key={i} className="border-b border-[#202327]">
            <td className="px-3 py-2 text-right text-content-muted">{fmtInt(lvl.bidAccounts)}</td>
            <td className="relative px-3 py-2 text-right">
              <div
                className="absolute inset-y-0.5 right-0 rounded-sm bg-bid-surface"
                style={{ width: `${(lvl.bidSize / maxBid) * 100}%` }}
              />
              <span className="relative text-up">{fmtInt(lvl.bidSize)}</span>
            </td>
            <td className="border-x border-border-dark px-3 py-2 text-center font-semibold text-up">
              {fmtPrice(lvl.bidPrice)}
            </td>
            <td className="border-r border-border-dark px-3 py-2 text-center font-semibold text-down">
              {fmtPrice(lvl.offerPrice)}
            </td>
            <td className="relative px-3 py-2 text-right">
              <div
                className="absolute inset-y-0.5 left-0 rounded-sm bg-offer-surface"
                style={{ width: `${(lvl.offerSize / maxOffer) * 100}%` }}
              />
              <span className="relative text-down">{fmtInt(lvl.offerSize)}</span>
            </td>
            <td className="px-3 py-2 text-right text-content-muted">{fmtInt(lvl.offerAccounts)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// ─── Pure-SVG cumulative depth chart ───────────────────────────────────────
function DepthChart({ maxBid, maxOffer }: { maxBid: number; maxOffer: number }) {
  const W = 320
  const H = 180
  const mid = W / 2

  // Cumulative bids: best (highest) price nearest the mid, growing leftwards.
  const { bidPoints, offerPoints } = useMemo(() => {
    let cum = 0
    const maxCum =
      MARKET_DEPTH_FULL.reduce((s, d) => s + d.bidSize, 0) ||
      MARKET_DEPTH_FULL.reduce((s, d) => s + d.offerSize, 0) ||
      1
    // bids: i=0 at mid, increasing index moves left
    const bids = MARKET_DEPTH_FULL.map((d, i) => {
      cum += d.bidSize
      const x = mid - (i / (MARKET_DEPTH_FULL.length - 1)) * mid
      const y = H - (cum / maxCum) * (H - 6)
      return { x, y }
    })
    cum = 0
    const offers = MARKET_DEPTH_FULL.map((d, i) => {
      cum += d.offerSize
      const x = mid + (i / (MARKET_DEPTH_FULL.length - 1)) * mid
      const y = H - (cum / maxCum) * (H - 6)
      return { x, y }
    })
    return { bidPoints: bids, offerPoints: offers }
  }, [mid])

  // Build a stepped path: horizontal then vertical between cumulative levels.
  const step = (pts: { x: number; y: number }[]) => {
    if (pts.length === 0) return ''
    let d = `M ${pts[0].x.toFixed(1)} ${H} L ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`
    for (let i = 1; i < pts.length; i++) {
      // step: move horizontally to next x at previous y, then drop/raise to new y
      d += ` L ${pts[i].x.toFixed(1)} ${pts[i - 1].y.toFixed(1)} L ${pts[i].x.toFixed(1)} ${pts[i].y.toFixed(1)}`
    }
    return d
  }

  const bidLine = step(bidPoints)
  const offerLine = step(offerPoints)
  const lastBid = bidPoints[bidPoints.length - 1]
  const lastOffer = offerPoints[offerPoints.length - 1]
  const bidArea = `${bidLine} L ${lastBid.x.toFixed(1)} ${H} Z`
  const offerArea = `${offerLine} L ${lastOffer.x.toFixed(1)} ${H} Z`

  // Reference: silence unused destructure lint if maxBid/maxOffer not needed.
  void maxBid
  void maxOffer

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-[180px] w-full" preserveAspectRatio="none">
      {/* baseline + mid divider */}
      <line x1={0} y1={H - 0.5} x2={W} y2={H - 0.5} className="stroke-border-dark" strokeWidth={1} />
      <line x1={mid} y1={0} x2={mid} y2={H} className="stroke-border-dark" strokeWidth={1} strokeDasharray="3 3" />
      {/* bid (green) on the left */}
      <path d={bidArea} className="fill-up" fillOpacity={0.14} />
      <path d={bidLine} className="stroke-up" fill="none" strokeWidth={1.5} />
      {/* offer (red) on the right */}
      <path d={offerArea} className="fill-down" fillOpacity={0.14} />
      <path d={offerLine} className="stroke-down" fill="none" strokeWidth={1.5} />
    </svg>
  )
}

// ─── Time & Sales columns ──────────────────────────────────────────────────
const timeSalesColumns: Column<Trade>[] = [
  {
    key: 'time',
    header: 'Time',
    align: 'left',
    render: (r) => <span className="text-content-muted">{r.time}</span>,
  },
  {
    key: 'price',
    header: 'Price',
    align: 'right',
    render: (r) => <span className={directionColor(r.side === 'buy' ? 'up' : 'down')}>{fmtPrice(r.price)}</span>,
  },
  {
    key: 'size',
    header: 'Size',
    align: 'right',
    render: (r) => fmtInt(r.size),
  },
]
