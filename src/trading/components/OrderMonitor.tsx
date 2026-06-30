import { useMemo, useState } from 'react'
import DataTable, { type Column } from './DataTable'
import { Panel, Button, Badge, SegmentedTabs } from './ui'
import { ORDERS, fmtPrice, fmtInt, fmtMoney } from '../data'
import type { Order, OrderStatus } from '../data'

/**
 * Order Monitor / blotter screen for FAB Securities.
 * Surfaces the day's order flow: a statistics strip, a status-filter toolbar
 * with search, and a dense, sortable-feeling blotter with row-level actions.
 * `initialView` mirrors the legacy Trading ribbon entry (Order Monitor /
 * Order Statistics / Suspended Orders / Transactions Ticker) and seeds the
 * default status filter.
 */

const STATUS_TABS = ['All', 'Working', 'Partially Filled', 'Filled', 'Cancelled', 'Suspended'] as const
type StatusTab = (typeof STATUS_TABS)[number]

const ACTIONABLE: ReadonlySet<OrderStatus> = new Set(['Working', 'Partially Filled'])

function statusTone(status: OrderStatus): 'neutral' | 'up' | 'down' | 'info' | 'warn' {
  switch (status) {
    case 'Working':
      return 'info'
    case 'Partially Filled':
      return 'warn'
    case 'Filled':
      return 'up'
    case 'Rejected':
      return 'down'
    case 'Suspended':
      return 'warn'
    case 'Cancelled':
    default:
      return 'neutral'
  }
}

function defaultTab(initialView?: string): StatusTab {
  return initialView === 'Suspended Orders' ? 'Suspended' : 'All'
}

interface Stat {
  label: string
  value: string
}

export default function OrderMonitor({ initialView }: { initialView?: string }) {
  const [tab, setTab] = useState<StatusTab>(() => defaultTab(initialView))
  const [query, setQuery] = useState('')

  const stats = useMemo<Stat[]>(() => {
    const count = (s: OrderStatus) => ORDERS.filter((o) => o.status === s).length
    const totalValue = ORDERS.reduce((sum, o) => sum + o.qty * (o.price || o.avgFill), 0)
    return [
      { label: 'Total Orders', value: fmtInt(ORDERS.length) },
      { label: 'Working', value: fmtInt(count('Working')) },
      { label: 'Filled', value: fmtInt(count('Filled')) },
      { label: 'Partially Filled', value: fmtInt(count('Partially Filled')) },
      { label: 'Cancelled / Rejected', value: fmtInt(count('Cancelled') + count('Rejected')) },
      { label: 'Total Value', value: fmtMoney(totalValue) },
    ]
  }, [])

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return ORDERS.filter((o) => {
      if (tab !== 'All' && o.status !== tab) return false
      if (q && !o.symbol.toLowerCase().includes(q) && !o.id.toLowerCase().includes(q)) return false
      return true
    })
  }, [tab, query])

  const columns = useMemo<Column<Order>[]>(
    () => [
      { key: 'time', header: 'Time', render: (o) => o.time, cellClassName: 'text-content-muted' },
      { key: 'id', header: 'Order ID', render: (o) => o.id },
      { key: 'symbol', header: 'Symbol', render: (o) => <span className="font-medium">{o.symbol}</span> },
      {
        key: 'side',
        header: 'Side',
        render: (o) => <Badge tone={o.side === 'buy' ? 'up' : 'down'}>{o.side === 'buy' ? 'Buy' : 'Sell'}</Badge>,
      },
      { key: 'type', header: 'Type', render: (o) => o.type },
      { key: 'qty', header: 'Qty', align: 'right', render: (o) => fmtInt(o.qty) },
      { key: 'filled', header: 'Filled', align: 'right', render: (o) => fmtInt(o.filled) },
      {
        key: 'price',
        header: 'Price',
        align: 'right',
        render: (o) => (o.price === 0 || o.type === 'Market' ? '—' : fmtPrice(o.price)),
      },
      {
        key: 'avgFill',
        header: 'Avg Fill',
        align: 'right',
        render: (o) => (o.avgFill === 0 ? '—' : fmtPrice(o.avgFill)),
      },
      {
        key: 'status',
        header: 'Status',
        render: (o) => <Badge tone={statusTone(o.status)}>{o.status}</Badge>,
      },
      { key: 'validity', header: 'Validity', render: (o) => o.validity },
      { key: 'client', header: 'Client', render: (o) => o.client },
      { key: 'broker', header: 'Broker', render: (o) => o.broker },
      {
        key: 'actions',
        header: 'Actions',
        render: (o) =>
          ACTIONABLE.has(o.status) ? (
            <div className="flex items-center gap-1">
              <Button size="sm" variant="ghost">
                Cancel
              </Button>
              <Button size="sm" variant="ghost">
                Amend
              </Button>
            </div>
          ) : (
            <span className="text-content-muted">—</span>
          ),
      },
    ],
    [],
  )

  return (
    <div className="flex flex-col gap-3">
      {/* 1. Order statistics strip */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg border border-border-dark bg-surface p-3">
            <div className="text-[11px] text-content-muted">{s.label}</div>
            <div className="mt-1 text-[18px] font-semibold tabular-nums text-content">{s.value}</div>
          </div>
        ))}
      </div>

      {/* 2. Toolbar: status filter + search */}
      <div className="flex flex-wrap items-center gap-2">
        <SegmentedTabs tabs={STATUS_TABS} value={tab} onChange={setTab} />
        <div className="relative ml-auto">
          <svg
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-content-muted"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search symbol or order ID…"
            className="h-8 w-[240px] max-w-[60vw] rounded-md border border-border-dark bg-[#15171a] pl-8 pr-2.5 text-[13px] text-content outline-none transition-colors placeholder:text-content-muted hover:border-[#3a3d42] focus:border-action"
          />
        </div>
      </div>

      {/* 3. Orders blotter */}
      <Panel title="Orders" noPadding bodyClassName="flex flex-col" className="flex-1">
        <div className="min-h-0 flex-1 overflow-auto">
          <DataTable
            columns={columns}
            rows={rows}
            rowKey={(o) => o.id}
            dense
            stickyHeader
            emptyLabel="No orders match the current filter."
          />
        </div>
      </Panel>
    </div>
  )
}
