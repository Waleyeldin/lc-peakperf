import { useEffect, useState } from 'react'
import { Drawer, Select, Button, SegmentedTabs, Badge } from './ui'
import { FULL_MARKET, PURCHASE_POWER, fmtPrice, fmtMoney } from '../data'
import type { Symbol } from '../data'

/**
 * Right slide-over order ticket for placing a Buy or Sell order against a
 * symbol. Form state is local (mock — submit just closes the drawer); the
 * `symbol` and `side` props seed the ticket and stay in sync via the parent.
 */

type Side = 'buy' | 'sell'
type OrderType = 'Limit' | 'Market'
type Validity = 'Day' | 'GTC' | 'IOC'

const ORDER_TYPES: readonly OrderType[] = ['Limit', 'Market']
const VALIDITIES: readonly Validity[] = ['Day', 'GTC', 'IOC']

function defaultPrice(sym: Symbol, side: Side): number {
  return side === 'buy'
    ? sym.bidPrice || sym.lastPrice
    : sym.offerPrice || sym.lastPrice
}

export default function BuySellDrawer({
  open,
  side,
  symbol,
  onSideChange,
  onClose,
}: {
  open: boolean
  side: Side
  symbol: Symbol | null
  onSideChange: (s: Side) => void
  onClose: () => void
}) {
  const [selected, setSelected] = useState<Symbol>(symbol ?? FULL_MARKET[0])
  const [orderType, setOrderType] = useState<OrderType>('Limit')
  const [quantity, setQuantity] = useState<number>(0)
  const [price, setPrice] = useState<number>(() => defaultPrice(symbol ?? FULL_MARKET[0], side))
  const [validity, setValidity] = useState<Validity>('Day')

  // Adopt the symbol passed in by the parent whenever it changes.
  useEffect(() => {
    if (symbol) setSelected(symbol)
  }, [symbol])

  // Reseed the price whenever the active symbol or side changes.
  useEffect(() => {
    setPrice(defaultPrice(selected, side))
  }, [selected, side])

  const isMarket = orderType === 'Market'
  const effectivePrice = isMarket ? selected.lastPrice : price
  const estimatedValue = quantity * effectivePrice

  function handleSymbolChange(shortName: string) {
    const next = FULL_MARKET.find((s) => s.symbolShortName === shortName)
    if (next) setSelected(next)
  }

  const isUp = selected.changePct >= 0

  return (
    <Drawer open={open} onClose={onClose} title={`${side === 'buy' ? 'Buy' : 'Sell'} Order`}>
      <div className="flex flex-col gap-3 p-4">
        {/* Buy / Sell toggle */}
        <SegmentedTabs
          tabs={['Buy', 'Sell'] as const}
          value={side === 'buy' ? 'Buy' : 'Sell'}
          onChange={(v) => onSideChange(v === 'Buy' ? 'buy' : 'sell')}
          className="w-full"
        />

        {/* Symbol picker */}
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

        {/* Quote row */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-md border border-border-dark bg-[#15171a] px-3 py-2 text-[12px] tabular-nums">
          <span className="text-content-muted">
            Last <span className="text-content">{fmtPrice(selected.lastPrice)}</span>
          </span>
          <span className="text-content-muted">
            Bid <span className="text-up">{fmtPrice(selected.bidPrice)}</span>
          </span>
          <span className="text-content-muted">
            Offer <span className="text-down">{fmtPrice(selected.offerPrice)}</span>
          </span>
          <Badge tone={isUp ? 'up' : 'down'} className="ml-auto">
            {isUp ? '+' : ''}
            {selected.changePct.toFixed(2)}%
          </Badge>
        </div>

        {/* Order Type */}
        <Select label="Order Type" value={orderType} onChange={(e) => setOrderType(e.target.value as OrderType)}>
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
            className="h-9 w-full rounded-md border border-border-dark bg-[#15171a] px-3 text-[14px] text-content tabular-nums outline-none transition-colors hover:border-[#3a3d42] focus:border-action"
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
            className="h-9 w-full rounded-md border border-border-dark bg-[#15171a] px-3 text-[14px] text-content tabular-nums outline-none transition-colors hover:border-[#3a3d42] focus:border-action disabled:opacity-40"
          />
        </label>

        {/* Validity */}
        <Select label="Validity" value={validity} onChange={(e) => setValidity(e.target.value as Validity)}>
          {VALIDITIES.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </Select>

        {/* Summary */}
        <div className="mt-1 flex flex-col gap-1.5 rounded-md border border-border-dark bg-[#15171a] px-3 py-3">
          <div className="flex items-center justify-between">
            <span className="text-[12px] text-content-muted">Estimated Value</span>
            <span className="text-[15px] font-semibold text-content tabular-nums">{fmtMoney(estimatedValue)} AED</span>
          </div>
          <div className="text-[11px] text-content-muted tabular-nums">
            Available cash: {fmtMoney(PURCHASE_POWER.cashAmount)} AED
          </div>
        </div>

        {/* Submit */}
        <Button variant={side === 'buy' ? 'buy' : 'sell'} className="w-full h-11" onClick={onClose}>
          {side === 'buy' ? 'Place Buy Order' : 'Place Sell Order'}
        </Button>
      </div>
    </Drawer>
  )
}
