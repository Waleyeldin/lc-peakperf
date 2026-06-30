import { useState } from 'react'
import type { Symbol } from '../data'
import {
  TOP_SYMBOLS,
  WATCHLIST,
  MARKET_DEPTH,
  MARKET_DEPTH_SYMBOL,
  PORTFOLIO,
  PORTFOLIO_TOTALS,
  PURCHASE_POWER,
  fmtPrice,
  fmtInt,
  fmtPct,
  fmtMoney,
  directionColor,
} from '../data'
import DataTable, { type Column } from './DataTable'
import { Select, Button, PopOutButton } from './ui'

/**
 * Right-hand utility panel for the FAB Securities trading dashboard.
 * Four stacked tools behind a segmented switcher: Top Symbols (market movers),
 * Watchlist (the primary screen, with inline trade actions), Market Depth
 * (a 5-level order-book ladder) and Portfolio (positions + purchase power).
 */

type Tab = 'Top Symbols' | 'Watchlist' | 'Market Depth' | 'Portfolio'
const TABS = ['Top Symbols', 'Watchlist', 'Market Depth', 'Portfolio'] as const

type TopRow = (typeof TOP_SYMBOLS)[number]
type PortfolioRow = (typeof PORTFOLIO)[number]

/** Colour a percentage by its sign. */
function pctColor(n: number): string {
  return n > 0 ? 'text-up' : n < 0 ? 'text-down' : 'text-flat'
}

export default function RightPanel({
  onTrade,
  onPopOut,
}: {
  onTrade: (symbol: Symbol, side: 'buy' | 'sell') => void
  onPopOut?: () => void
}) {
  const [tab, setTab] = useState<Tab>('Watchlist')

  return (
    <div className="flex w-[360px] shrink-0 flex-col border-l border-border-dark bg-[#141619]">
      <div className="flex shrink-0 items-center gap-2 p-3">
        <div className="inline-flex w-full rounded-lg border border-border-dark bg-[#15171a] p-0.5">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 rounded-md px-2 py-1 text-[11px] font-medium leading-tight transition-colors ${
                tab === t ? 'bg-action text-white' : 'text-content-muted hover:text-content'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        {onPopOut && <PopOutButton onClick={onPopOut} />}
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-3">
        {tab === 'Top Symbols' && <TopSymbolsTab />}
        {tab === 'Watchlist' && <WatchlistTab onTrade={onTrade} />}
        {tab === 'Market Depth' && <MarketDepthTab />}
        {tab === 'Portfolio' && <PortfolioTab />}
      </div>
    </div>
  )
}

// ─── Top Symbols ───────────────────────────────────────────────────────────
function TopSymbolsTab() {
  const [view, setView] = useState('Most Active by Volume')

  const columns: Column<TopRow>[] = [
    {
      key: 'symbol',
      header: 'Symbol',
      render: (r) => (
        <div className="flex flex-col">
          <span className="font-bold text-content">{r.symbolShortName}</span>
          <span className="truncate text-[11px] text-content-muted">{r.symbolName}</span>
        </div>
      ),
    },
    { key: 'last', header: 'Last', align: 'right', render: (r) => fmtPrice(r.lastPrice) },
    {
      key: 'chg',
      header: 'Chg%',
      align: 'right',
      render: (r) => <span className={directionColor(r.direction)}>{fmtPct(r.changePct)}</span>,
    },
    {
      key: 'vol',
      header: 'Volume',
      align: 'right',
      cellClassName: 'text-content-muted',
      render: (r) => fmtInt(r.volume),
    },
  ]

  return (
    <div className="flex flex-col gap-3 pt-1">
      <Select
        label="View"
        value={view}
        onChange={(e) => setView(e.target.value)}
        className="w-full"
      >
        <option>Most Active by Volume</option>
        <option>Top Gainers</option>
        <option>Top Losers</option>
      </Select>
      <div className="overflow-hidden rounded-lg border border-border-dark">
        <DataTable
          columns={columns}
          rows={TOP_SYMBOLS}
          rowKey={(r) => r.symbolShortName}
          dense
          stickyHeader={false}
        />
      </div>
    </div>
  )
}

// ─── Watchlist (primary screen) ──────────────────────────────────────────────
function WatchlistTab({
  onTrade,
}: {
  onTrade: (symbol: Symbol, side: 'buy' | 'sell') => void
}) {
  return (
    <div className="flex flex-col gap-1 pt-1">
      {WATCHLIST.map((row) => (
        <div
          key={row.symbolShortName}
          className="group flex items-center gap-2 rounded-md border border-transparent px-2 py-2 transition-colors hover:border-border-dark hover:bg-[rgba(255,255,255,0.03)]"
        >
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="font-medium text-content">{row.symbolShortName}</span>
            <span className="truncate text-[11px] text-content-muted">{row.symbolName}</span>
          </div>

          <div className="flex flex-col items-end tabular-nums">
            <span className="text-[13px] text-content">{fmtPrice(row.lastPrice)}</span>
            <span className={`text-[11px] ${pctColor(row.changePct)}`}>{fmtPct(row.changePct)}</span>
          </div>

          <div className="flex shrink-0 items-center gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
            <Button size="sm" variant="buy" onClick={() => onTrade(row, 'buy')}>
              Buy
            </Button>
            <Button size="sm" variant="sell" onClick={() => onTrade(row, 'sell')}>
              Sell
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Market Depth ────────────────────────────────────────────────────────────
function MarketDepthTab() {
  const maxBid = Math.max(...MARKET_DEPTH.map((d) => d.bidSize), 1)
  const maxOffer = Math.max(...MARKET_DEPTH.map((d) => d.offerSize), 1)

  return (
    <div className="flex flex-col gap-3 pt-1">
      <div className="flex items-baseline justify-between">
        <span className="text-[14px] font-semibold text-content">{MARKET_DEPTH_SYMBOL}</span>
        <span className="text-[11px] uppercase tracking-wide text-content-muted">Order book</span>
      </div>

      <div className="overflow-hidden rounded-lg border border-border-dark">
        <div className="grid grid-cols-4 border-b border-border-dark bg-[#15171a] text-[10px] font-medium uppercase tracking-wide text-content-muted">
          <div className="px-2.5 py-1.5 text-left">Bid Size</div>
          <div className="px-2.5 py-1.5 text-center">Bid</div>
          <div className="px-2.5 py-1.5 text-center">Offer</div>
          <div className="px-2.5 py-1.5 text-right">Offer Size</div>
        </div>

        {MARKET_DEPTH.map((d, i) => (
          <div
            key={i}
            className="grid grid-cols-4 items-center border-b border-[#202327] text-[12px] tabular-nums last:border-b-0"
          >
            {/* Bid size with proportional bar */}
            <div className="relative px-2.5 py-1.5 text-left">
              <span
                className="absolute inset-y-0.5 left-0 rounded-sm bg-bid-surface"
                style={{ width: `${(d.bidSize / maxBid) * 100}%` }}
              />
              <span className="relative text-up">{fmtInt(d.bidSize)}</span>
              <span className="relative ml-1 text-[10px] text-content-muted">{d.bidAccounts}</span>
            </div>
            {/* Bid price */}
            <div className="px-2.5 py-1.5 text-center font-medium text-up">{fmtPrice(d.bidPrice)}</div>
            {/* Offer price */}
            <div className="px-2.5 py-1.5 text-center font-medium text-down">{fmtPrice(d.offerPrice)}</div>
            {/* Offer size with proportional bar */}
            <div className="relative px-2.5 py-1.5 text-right">
              <span
                className="absolute inset-y-0.5 right-0 rounded-sm bg-offer-surface"
                style={{ width: `${(d.offerSize / maxOffer) * 100}%` }}
              />
              <span className="relative mr-1 text-[10px] text-content-muted">{d.offerAccounts}</span>
              <span className="relative text-down">{fmtInt(d.offerSize)}</span>
            </div>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-content-muted">
        Showing top {MARKET_DEPTH.length} price levels. Numbers in muted are participating accounts.
      </p>
    </div>
  )
}

// ─── Portfolio ───────────────────────────────────────────────────────────────
function PortfolioTab() {
  const columns: Column<PortfolioRow>[] = [
    {
      key: 'symbol',
      header: 'Symbol',
      render: (r) => <span className="font-medium text-content">{r.symbol}</span>,
    },
    { key: 'qty', header: 'Qty', align: 'right', render: (r) => fmtInt(r.quantity) },
    { key: 'avg', header: 'Avg Cost', align: 'right', render: (r) => fmtPrice(r.avgCost) },
    { key: 'eval', header: 'Eval', align: 'right', render: (r) => fmtPrice(r.evalPrice) },
    {
      key: 'mv',
      header: 'Mkt Value',
      align: 'right',
      render: (r) => fmtMoney(r.marketValue),
    },
    {
      key: 'gl',
      header: 'Gain/Loss',
      align: 'right',
      render: (r) => (
        <span className={r.gainLoss >= 0 ? 'text-up' : 'text-down'}>{fmtMoney(r.gainLoss)}</span>
      ),
    },
  ]

  const totals = [
    { label: 'Market Value', value: fmtMoney(PORTFOLIO_TOTALS.marketValue), tone: 'text-content' },
    { label: 'Cost', value: fmtMoney(PORTFOLIO_TOTALS.cost), tone: 'text-content' },
    {
      label: 'Gain / Loss',
      value: fmtMoney(PORTFOLIO_TOTALS.gainLoss),
      tone: PORTFOLIO_TOTALS.gainLoss >= 0 ? 'text-up' : 'text-down',
    },
  ]

  const power = [
    { label: 'Cash Amount', value: fmtMoney(PURCHASE_POWER.cashAmount) },
    { label: 'Blocked', value: fmtMoney(PURCHASE_POWER.blocked) },
    { label: 'Coverage Ratio', value: `${PURCHASE_POWER.coverageRatio}x` },
    { label: 'Account Limit', value: fmtMoney(PURCHASE_POWER.accountLimit) },
    { label: 'Outstanding Buy Orders', value: fmtMoney(PURCHASE_POWER.outstandingBuyOrders) },
    { label: 'LTV Ratio', value: `${(PURCHASE_POWER.ltvRatio * 100).toFixed(2)}%` },
  ]

  return (
    <div className="flex flex-col gap-3 pt-1">
      <div className="overflow-hidden rounded-lg border border-border-dark">
        <DataTable
          columns={columns}
          rows={PORTFOLIO}
          rowKey={(r) => r.symbol}
          dense
          stickyHeader={false}
        />
      </div>

      <div className="grid grid-cols-3 gap-2">
        {totals.map((t) => (
          <div key={t.label} className="rounded-md border border-border-dark p-2">
            <div className="text-[11px] text-content-muted">{t.label}</div>
            <div className={`mt-0.5 text-[13px] font-semibold tabular-nums ${t.tone}`}>{t.value}</div>
          </div>
        ))}
      </div>

      <div>
        <h4 className="mb-2 text-[12px] font-semibold text-content">Purchase Power</h4>
        <div className="grid grid-cols-2 gap-2">
          {power.map((p) => (
            <div key={p.label} className="rounded-md border border-border-dark p-2">
              <div className="text-[11px] text-content-muted">{p.label}</div>
              <div className="mt-0.5 text-[13px] font-semibold tabular-nums text-content">{p.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
