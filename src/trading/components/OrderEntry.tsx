import { useEffect, useMemo, useState } from 'react'
import DataTable, { type Column } from './DataTable'
import { Panel, Select, Button, Badge, SegmentedTabs } from './ui'
import {
  FULL_MARKET,
  CLIENT_OPTIONS,
  BROKERS,
  MARKET_DEPTH,
  PURCHASE_POWER,
  ORDERS,
  fmtPrice,
  fmtInt,
  fmtMoney,
} from '../data'
import type { Symbol, Order } from '../data'
import { useLiveSymbols } from '../simData'

/**
 * Detailed order-entry screen for the FAB Securities dashboard. A self-contained
 * ticket (left) with a live order-book ladder and a working-orders blotter
 * (right). All form state is local; submitting just resets the ticket. The
 * optional `onTrade` callback drives a "Quick ticket" shortcut.
 */

type Side = 'buy' | 'sell'
type OrderType = 'Limit' | 'Market' | 'Stop Limit'
type Validity = 'Day' | 'GTC' | 'IOC'

const ORDER_TYPES: readonly OrderType[] = ['Limit', 'Market', 'Stop Limit']
const VALIDITIES: readonly Validity[] = ['Day', 'GTC', 'IOC']
const SIDE_TABS = ['Buy', 'Sell'] as const

const INPUT_CLASS =
  'h-9 w-full rounded-md border border-border-dark bg-[#15171a] px-3 text-[14px] text-content tabular-nums outline-none transition-colors hover:border-[#3a3d42] focus:border-action disabled:opacity-40'

function defaultPrice(sym: Symbol, side: Side): number {
  return side === 'buy' ? sym.bidPrice || sym.lastPrice : sym.offerPrice || sym.lastPrice
}

export default function OrderEntry({ onTrade }: { onTrade: (symbol: Symbol, side: Side) => void }) {
  const [side, setSide] = useState<Side>('buy')
  const [selected, setSelected] = useState<Symbol>(FULL_MARKET[0])
  const [orderType, setOrderType] = useState<OrderType>('Limit')
  const [quantity, setQuantity] = useState<number>(0)
  const [price, setPrice] = useState<number>(() => defaultPrice(FULL_MARKET[0], 'buy'))
  const [validity, setValidity] = useState<Validity>('Day')
  const [client, setClient] = useState<string>(CLIENT_OPTIONS[0])
  const [broker, setBroker] = useState<string>(BROKERS[0])

  const isMarket = orderType === 'Market'

  // Re-seed the price whenever the symbol, side or type changes (no manual
  // price for Market orders — they execute at the prevailing quote).
  useEffect(() => {
    if (isMarket) return
    setPrice(defaultPrice(selected, side))
  }, [selected, side, isMarket])

  // Live/sim overlay of the picked symbol for pricing + the quote display.
  const liveSel = useLiveSymbols([selected])[0]
  const effectivePrice = isMarket ? liveSel.lastPrice : price
  const orderValue = quantity * effectivePrice
  const isUp = liveSel.changePct >= 0

  // ─── Right-hand panels ──────────────────────────────────────────────────
  const maxDepthSize = useMemo(
    () => Math.max(1, ...MARKET_DEPTH.flatMap((d) => [d.bidSize, d.offerSize])),
    [],
  )

  const workingOrders = useMemo(
    () => ORDERS.filter((o) => o.status === 'Working' || o.status === 'Partially Filled'),
    [],
  )

  function handleSymbolChange(shortName: string) {
    const next = FULL_MARKET.find((s) => s.symbolShortName === shortName)
    if (next) setSelected(next)
  }

  function resetTicket() {
    setQuantity(0)
    setPrice(defaultPrice(selected, side))
  }

  const orderColumns: Column<Order>[] = [
    { key: 'time', header: 'Time', render: (o) => o.time, cellClassName: 'text-content-muted' },
    { key: 'symbol', header: 'Symbol', render: (o) => o.symbol, cellClassName: 'font-medium' },
    {
      key: 'side',
      header: 'Side',
      render: (o) => (
        <Badge tone={o.side === 'buy' ? 'up' : 'down'}>{o.side === 'buy' ? 'Buy' : 'Sell'}</Badge>
      ),
    },
    { key: 'qty', header: 'Qty', align: 'right', render: (o) => fmtInt(o.qty) },
    {
      key: 'price',
      header: 'Price',
      align: 'right',
      render: (o) => (o.type === 'Market' ? 'MKT' : fmtPrice(o.price)),
    },
    {
      key: 'status',
      header: 'Status',
      render: (o) => (
        <Badge tone={o.status === 'Working' ? 'info' : 'warn'}>{o.status}</Badge>
      ),
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,480px)_minmax(0,1fr)]">
      {/* ─── LEFT: the ticket ────────────────────────────────────────────── */}
      <Panel
        title="Order Entry"
        className="max-w-[480px]"
        actions={
          <Button size="sm" variant="ghost" onClick={() => onTrade(selected, side)}>
            Quick ticket
          </Button>
        }
      >
        <div className="flex flex-col gap-3">
          {/* Side toggle */}
          <SegmentedTabs
            tabs={SIDE_TABS}
            value={side === 'buy' ? 'Buy' : 'Sell'}
            onChange={(v) => setSide(v === 'Buy' ? 'buy' : 'sell')}
            className="w-full"
          />

          {/* Symbol */}
          <Select
            label="Symbol"
            value={selected.symbolShortName}
            onChange={(e) => handleSymbolChange(e.target.value)}
          >
            {FULL_MARKET.map((s) => (
              <option key={s.id} value={s.symbolShortName}>
                {s.symbolShortName} — {s.symbolName}
              </option>
            ))}
          </Select>

          {/* Quote panel */}
          <div className="rounded-md border border-border-dark bg-[#15171a] p-3">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] tabular-nums">
              <span className="text-content-muted">
                Last <span className="text-content">{fmtPrice(liveSel.lastPrice)}</span>
              </span>
              <span className="text-content-muted">
                Bid <span className="text-up">{fmtPrice(liveSel.bidPrice)}</span>
              </span>
              <span className="text-content-muted">
                Offer <span className="text-down">{fmtPrice(liveSel.offerPrice)}</span>
              </span>
              <Badge tone={isUp ? 'up' : 'down'} className="ml-auto">
                {isUp ? '+' : ''}
                {liveSel.changePct.toFixed(2)}%
              </Badge>
            </div>
            <div className="mt-3 grid grid-cols-4 gap-2 text-[11px] tabular-nums">
              {(
                [
                  ['Open', fmtPrice(selected.openPrice)],
                  ['High', fmtPrice(selected.high)],
                  ['Low', fmtPrice(selected.low)],
                  ['Volume', fmtInt(selected.volume)],
                ] as const
              ).map(([label, value]) => (
                <div key={label} className="flex flex-col gap-0.5">
                  <span className="text-content-muted">{label}</span>
                  <span className="text-content">{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Order Type */}
          <Select
            label="Order Type"
            value={orderType}
            onChange={(e) => setOrderType(e.target.value as OrderType)}
          >
            {ORDER_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>

          {/* Quantity */}
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-medium text-content-muted">Quantity</span>
            <input
              type="number"
              min={0}
              value={quantity || ''}
              onChange={(e) => setQuantity(Number(e.target.value) || 0)}
              placeholder="0"
              className={INPUT_CLASS}
            />
          </label>

          {/* Price */}
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-medium text-content-muted">Price</span>
            <input
              type="number"
              min={0}
              step="0.001"
              value={isMarket ? '' : price || ''}
              disabled={isMarket}
              onChange={(e) => setPrice(Number(e.target.value) || 0)}
              placeholder={isMarket ? 'Market' : '0.000'}
              className={INPUT_CLASS}
            />
          </label>

          {/* Validity */}
          <Select
            label="Validity"
            value={validity}
            onChange={(e) => setValidity(e.target.value as Validity)}
          >
            {VALIDITIES.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </Select>

          {/* Client */}
          <Select label="Client" value={client} onChange={(e) => setClient(e.target.value)}>
            {CLIENT_OPTIONS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>

          {/* Broker */}
          <Select label="Broker" value={broker} onChange={(e) => setBroker(e.target.value)}>
            {BROKERS.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </Select>

          {/* Summary */}
          <div className="mt-1 flex flex-col gap-1.5 rounded-md border border-border-dark bg-[#15171a] px-3 py-3">
            <div className="flex items-center justify-between">
              <span className="text-[12px] text-content-muted">Order Value</span>
              <span className="text-[15px] font-semibold text-content tabular-nums">
                {fmtMoney(orderValue)} AED
              </span>
            </div>
            <div className="text-[11px] text-content-muted tabular-nums">
              Available cash: {fmtMoney(PURCHASE_POWER.cashAmount)} AED
            </div>
          </div>

          {/* Footer */}
          <Button variant={side === 'buy' ? 'buy' : 'sell'} className="h-11 w-full" onClick={resetTicket}>
            {side === 'buy' ? 'Place Buy Order' : 'Place Sell Order'}
          </Button>
        </div>
      </Panel>

      {/* ─── RIGHT: order book + working orders ──────────────────────────── */}
      <div className="flex flex-col gap-3">
        <Panel title="Order Book" noPadding>
          <div className="overflow-auto">
            <table className="w-full border-collapse text-[13px] tabular-nums">
              <thead>
                <tr className="bg-[#15171a] text-[11px] font-medium uppercase tracking-wide text-content-muted">
                  <th className="border-b border-border-dark px-3 py-2 text-right font-medium">Bid Size</th>
                  <th className="border-b border-border-dark px-3 py-2 text-right font-medium">Bid</th>
                  <th className="border-b border-border-dark px-3 py-2 text-right font-medium">Offer</th>
                  <th className="border-b border-border-dark px-3 py-2 text-right font-medium">Offer Size</th>
                </tr>
              </thead>
              <tbody>
                {MARKET_DEPTH.map((d, i) => (
                  <tr key={i} className="border-b border-[#202327]">
                    <td className="relative px-3 py-2 text-right text-content-muted">
                      <span
                        className="absolute inset-y-0 right-0 bg-bid-surface"
                        style={{ width: `${(d.bidSize / maxDepthSize) * 100}%` }}
                      />
                      <span className="relative">{fmtInt(d.bidSize)}</span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        onClick={() => !isMarket && setPrice(d.bidPrice)}
                        className="font-medium text-up tabular-nums hover:underline"
                      >
                        {fmtPrice(d.bidPrice)}
                      </button>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        onClick={() => !isMarket && setPrice(d.offerPrice)}
                        className="font-medium text-down tabular-nums hover:underline"
                      >
                        {fmtPrice(d.offerPrice)}
                      </button>
                    </td>
                    <td className="relative px-3 py-2 text-right text-content-muted">
                      <span
                        className="absolute inset-y-0 left-0 bg-offer-surface"
                        style={{ width: `${(d.offerSize / maxDepthSize) * 100}%` }}
                      />
                      <span className="relative">{fmtInt(d.offerSize)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title="Working Orders" noPadding>
          <div className="max-h-[360px] overflow-auto">
            <DataTable
              columns={orderColumns}
              rows={workingOrders}
              rowKey={(o) => o.id}
              dense
              emptyLabel="No working orders"
            />
          </div>
        </Panel>
      </div>
    </div>
  )
}
