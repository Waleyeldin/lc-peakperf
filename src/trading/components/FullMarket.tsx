import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import DataTable, { type Column } from './DataTable'
import { Panel, Select, Button, Badge, PopOutButton } from './ui'
import { useLiveData } from '../liveData'
import type { Symbol } from '../data'
import {
  FULL_MARKET,
  FULL_MARKET_COLUMNS,
  MARKET_OPTIONS,
  WATCHLIST_OPTIONS,
  SECTOR_OPTIONS,
  TRADING_SESSION_OPTIONS,
  CLIENT_OPTIONS,
  fmtPrice,
  fmtInt,
  fmtPct,
  fmtChange,
} from '../data'

interface FullMarketProps {
  visibleColumns: string[]
  onOpenColumns: () => void
  onTrade: (symbol: Symbol, side: 'buy' | 'sell') => void
  onPopOut?: () => void
}

/** Sign-based colour class for change / pct values. */
function signClass(n: number): string {
  if (n > 0) return 'text-up'
  if (n < 0) return 'text-down'
  return 'text-content'
}

/**
 * Main content table for the dark FAB Securities dashboard.
 * Renders a compact filter bar over a sticky-header Full Market table whose
 * columns are driven dynamically by `visibleColumns` against the column
 * registry, plus a trailing per-row Buy/Sell action cell.
 */
export default function FullMarket({ visibleColumns, onOpenColumns, onTrade, onPopOut }: FullMarketProps) {
  const [search, setSearch] = useState('')
  const [market, setMarket] = useState(MARKET_OPTIONS[0])
  const [watchlist, setWatchlist] = useState(WATCHLIST_OPTIONS[0])
  const [sector, setSector] = useState(SECTOR_OPTIONS[0])
  const [session, setSession] = useState(TRADING_SESSION_OPTIONS[0])
  const [client, setClient] = useState(CLIENT_OPTIONS[0])
  const [portfolio, setPortfolio] = useState(CLIENT_OPTIONS[0])

  // ─── Filtering: search + sector + market ───────────────────────────────
  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return FULL_MARKET.filter((s) => {
      if (q) {
        const hit =
          s.symbolName.toLowerCase().includes(q) ||
          s.symbolShortName.toLowerCase().includes(q) ||
          s.id.toLowerCase().includes(q)
        if (!hit) return false
      }
      if (sector !== 'All' && s.sector !== sector) return false
      if (market !== 'All Markets' && s.marketName !== market) return false
      return true
    })
  }, [search, sector, market])

  // Overlay live Yahoo prices onto covered DFM symbols.
  const { quotes } = useLiveData()
  const displayRows = useMemo(
    () =>
      rows.map((s) => {
        const q = quotes.get(s.symbolShortName)
        if (!q) return s
        const spread = Math.max(0.005, +(q.last * 0.001).toFixed(3))
        return {
          ...s,
          lastPrice: q.last,
          change: q.change,
          changePct: q.changePct,
          prevClose: q.prevClose,
          bidPrice: +(q.last - spread).toFixed(3),
          offerPrice: +(q.last + spread).toFixed(3),
        }
      }),
    [rows, quotes],
  )

  // ─── Columns: registry order, filtered by visibleColumns, mapped by format ─
  const columns = useMemo<Column<Symbol>[]>(() => {
    const visible = new Set(visibleColumns)
    const mapped: Column<Symbol>[] = FULL_MARKET_COLUMNS.filter((c) => visible.has(c.key)).map(
      (col) => {
        const base: Pick<Column<Symbol>, 'key' | 'header' | 'align'> = {
          key: col.key,
          header: col.label,
          align: col.align,
        }
        const get = (row: Symbol) => row[col.key as keyof Symbol]

        switch (col.format) {
          case 'price':
            return { ...base, render: (row) => fmtPrice(get(row) as number) }
          case 'int':
            return { ...base, render: (row) => fmtInt(get(row) as number) }
          case 'pct':
            return {
              ...base,
              render: (row) => {
                const n = get(row) as number
                return <span className={signClass(n)}>{fmtPct(n)}</span>
              },
            }
          case 'change':
            return {
              ...base,
              render: (row) => {
                const n = get(row) as number
                return <span className={signClass(n)}>{fmtChange(n)}</span>
              },
            }
          case 'bid':
            return {
              ...base,
              cellClassName: 'bg-bid-surface text-up font-medium',
              render: (row) => fmtPrice(get(row) as number),
            }
          case 'offer':
            return {
              ...base,
              cellClassName: 'bg-offer-surface text-down font-medium',
              render: (row) => fmtPrice(get(row) as number),
            }
          case 'text':
          default:
            return { ...base, render: (row) => renderText(col.key, row) }
        }
      },
    )

    // Trailing actions column (not from the registry).
    mapped.push({
      key: 'actions',
      header: '',
      align: 'right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button
            size="sm"
            variant="buy"
            onClick={(e) => {
              e.stopPropagation()
              onTrade(row, 'buy')
            }}
          >
            Buy
          </Button>
          <Button
            size="sm"
            variant="sell"
            onClick={(e) => {
              e.stopPropagation()
              onTrade(row, 'sell')
            }}
          >
            Sell
          </Button>
        </div>
      ),
    })

    return mapped
  }, [visibleColumns, onTrade])

  return (
    <div className="flex flex-1 flex-col gap-3 min-h-0">
      {/* ─── Filter bar ─── */}
      <div className="flex flex-wrap items-end gap-2">
        <Select label="Market" value={market} onChange={(e) => setMarket(e.target.value)}>
          {MARKET_OPTIONS.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </Select>
        <Select label="Watchlist" value={watchlist} onChange={(e) => setWatchlist(e.target.value)}>
          {WATCHLIST_OPTIONS.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </Select>
        <Select label="Sector" value={sector} onChange={(e) => setSector(e.target.value)}>
          {SECTOR_OPTIONS.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </Select>
        <Select label="Trading Session" value={session} onChange={(e) => setSession(e.target.value)}>
          {TRADING_SESSION_OPTIONS.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </Select>
        <Select label="Client" value={client} onChange={(e) => setClient(e.target.value)}>
          {CLIENT_OPTIONS.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </Select>
        <Select label="Portfolio" value={portfolio} onChange={(e) => setPortfolio(e.target.value)}>
          {CLIENT_OPTIONS.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </Select>

        <label className="flex min-w-0 flex-col gap-1">
          <span className="text-[11px] font-medium text-content-muted">Search</span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Symbol, short name or ID"
            className="h-8 w-[200px] rounded-md border border-border-dark bg-[#15171a] px-2.5 text-[13px] text-content outline-none transition-colors placeholder:text-content-muted hover:border-[#3a3d42] focus:border-action"
          />
        </label>

        <div className="ml-auto flex items-center gap-2">
          <Badge tone="neutral">
            {rows.length} {rows.length === 1 ? 'symbol' : 'symbols'}
          </Badge>
          <Button variant="default" size="sm" onClick={onOpenColumns}>
            Columns
          </Button>
          {onPopOut && <PopOutButton onClick={onPopOut} />}
        </div>
      </div>

      {/* ─── Table panel ─── */}
      <Panel title="Full Market" noPadding bodyClassName="flex flex-col" className="flex-1 min-h-0">
        <div className="overflow-auto flex-1">
          <DataTable
            columns={columns}
            rows={displayRows}
            rowKey={(row) => row.symbolShortName}
            dense
            stickyHeader
            emptyLabel="No symbols match the current filters"
          />
        </div>
      </Panel>
    </div>
  )
}

/** Text-format renderer with special handling for symbol name and remarks. */
function renderText(key: string, row: Symbol): ReactNode {
  if (key === 'remarks') {
    if (row.remarks === 'suspended') return <Badge tone="warn">Suspended</Badge>
    if (row.remarks === 'rights') return <Badge tone="info">Rights</Badge>
    return null
  }
  if (key === 'symbolName') {
    const toneClass =
      row.tone === 'up' ? 'text-up' : row.tone === 'down' ? 'text-down' : 'text-content'
    return <span className={`font-medium ${toneClass}`}>{row.symbolName}</span>
  }
  const value = row[key as keyof Symbol]
  return value == null ? '' : String(value)
}
