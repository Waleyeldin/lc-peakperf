import { useRef, useState } from 'react'
import { Panel, Select, Button, Badge } from './ui'
import { FULL_MARKET, CLIENT_OPTIONS, fmtMoney } from '../data'
import type { Symbol } from '../data'
import { usePrices } from '../simData'

/**
 * Basket Order builder (FAB Securities) — modernised version of the legacy
 * "Basket Order" action in the Trading ribbon. The broker assembles a list of
 * lines (one symbol each), tunes side / type / qty / price per line, and submits
 * the whole basket against a single client.
 */

type Side = 'buy' | 'sell'
type OrderType = 'Limit' | 'Market'

interface BasketLine {
  id: number
  symbol: Symbol
  side: Side
  type: OrderType
  qty: number
  price: number
}

/** Value of a single line: Market uses the current (live/sim) price, Limit uses the set price. */
function lineValue(line: BasketLine, marketPx: number): number {
  const px = line.type === 'Market' ? marketPx : line.price
  return line.qty * px
}

/** Build a fresh basket line from a symbol with sensible defaults. */
function makeLine(id: number, symbol: Symbol, side: Side = 'buy'): BasketLine {
  return { id, symbol, side, type: 'Limit', qty: 1000, price: symbol.lastPrice }
}

const seedSymbol = (short: string) => FULL_MARKET.find((s) => s.symbolShortName === short)!

const SEED: BasketLine[] = [
  makeLine(1, seedSymbol('EMAAR'), 'buy'),
  makeLine(2, seedSymbol('DIB'), 'sell'),
  makeLine(3, seedSymbol('AMANAT'), 'buy'),
]

const inputBase =
  'h-8 rounded-md border border-border-dark bg-[#15171a] px-2.5 text-[13px] text-content tabular-nums outline-none transition-colors hover:border-[#3a3d42] focus:border-action disabled:opacity-40'

export default function BasketOrder() {
  const [lines, setLines] = useState<BasketLine[]>(SEED)
  const [pick, setPick] = useState<string>(FULL_MARKET[0].symbolShortName)
  const [client, setClient] = useState<string>(CLIENT_OPTIONS[0])
  const nextId = useRef(SEED.length + 1)
  const price = usePrices()
  const mpx = (l: BasketLine) => price(l.symbol.symbolShortName)?.last ?? l.symbol.lastPrice

  function addLine() {
    const symbol = FULL_MARKET.find((s) => s.symbolShortName === pick)
    if (!symbol) return
    setLines((prev) => [...prev, makeLine(nextId.current++, symbol)])
  }

  function patch(id: number, change: Partial<BasketLine>) {
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...change } : l)))
  }

  const remove = (id: number) => setLines((prev) => prev.filter((l) => l.id !== id))
  const clear = () => setLines([])

  function submit() {
    // No backend in this local build — submitting just clears the basket.
    setLines([])
  }

  const totalBuy = lines.filter((l) => l.side === 'buy').reduce((s, l) => s + lineValue(l, mpx(l)), 0)
  const totalSell = lines.filter((l) => l.side === 'sell').reduce((s, l) => s + lineValue(l, mpx(l)), 0)
  const net = totalBuy - totalSell

  return (
    <div className="flex flex-col gap-3">
      {/* ── Toolbar ─────────────────────────────────────────────── */}
      <Panel noPadding>
        <div className="flex flex-wrap items-end gap-3 p-3">
          <Select
            label="Add symbol"
            value={pick}
            onChange={(e) => setPick(e.target.value)}
            className="w-[220px]"
          >
            {FULL_MARKET.map((s) => (
              <option key={s.symbolShortName} value={s.symbolShortName}>
                {s.symbolShortName} — {s.symbolName}
              </option>
            ))}
          </Select>
          <Button variant="primary" onClick={addLine}>
            <span className="text-[15px] leading-none">＋</span> Add to basket
          </Button>

          <div className="mx-1 h-8 w-px self-end bg-border-dark" />

          <Select
            label="Client"
            value={client}
            onChange={(e) => setClient(e.target.value)}
            className="w-[240px]"
          >
            {CLIENT_OPTIONS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>

          <Button variant="ghost" onClick={clear} className="ml-auto self-end" disabled={lines.length === 0}>
            Clear basket
          </Button>
        </div>
      </Panel>

      {/* ── Editable basket table ───────────────────────────────── */}
      <Panel noPadding>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[13px]">
            <thead className="sticky top-0 z-10 bg-[#15171a] text-[11px] uppercase tracking-wide text-content-muted">
              <tr className="[&>th]:px-3 [&>th]:py-2.5 [&>th]:font-medium">
                <th className="text-left">Symbol</th>
                <th className="text-center">Side</th>
                <th className="text-left">Type</th>
                <th className="text-right">Qty</th>
                <th className="text-right">Price</th>
                <th className="text-right">Est. Value</th>
                <th className="w-10 text-center" />
              </tr>
            </thead>
            <tbody>
              {lines.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-10 text-center text-[13px] text-content-muted">
                    Basket is empty — add a symbol above to get started.
                  </td>
                </tr>
              )}
              {lines.map((line) => {
                const isMarket = line.type === 'Market'
                return (
                  <tr
                    key={line.id}
                    className="border-t border-border-dark [&>td]:px-3 [&>td]:py-2 hover:bg-[rgba(255,255,255,0.02)]"
                  >
                    {/* Symbol (read-only) */}
                    <td>
                      <div className="font-semibold text-content">{line.symbol.symbolShortName}</div>
                      <div className="text-[11px] text-content-muted">{line.symbol.symbolName}</div>
                    </td>

                    {/* Side toggle */}
                    <td>
                      <div className="flex justify-center gap-1">
                        <Button
                          size="sm"
                          variant={line.side === 'buy' ? 'buy' : 'default'}
                          onClick={() => patch(line.id, { side: 'buy' })}
                          className={line.side === 'buy' ? '' : 'opacity-60'}
                        >
                          Buy
                        </Button>
                        <Button
                          size="sm"
                          variant={line.side === 'sell' ? 'sell' : 'default'}
                          onClick={() => patch(line.id, { side: 'sell' })}
                          className={line.side === 'sell' ? '' : 'opacity-60'}
                        >
                          Sell
                        </Button>
                      </div>
                    </td>

                    {/* Type */}
                    <td>
                      <select
                        value={line.type}
                        onChange={(e) => patch(line.id, { type: e.target.value as OrderType })}
                        className={`${inputBase} w-[100px] pr-7 appearance-none [background-image:url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%23979797%22 stroke-width=%222%22><path d=%22M6 9l6 6 6-6%22/></svg>')] bg-[length:14px] bg-[right_0.4rem_center] bg-no-repeat`}
                      >
                        <option value="Limit">Limit</option>
                        <option value="Market">Market</option>
                      </select>
                    </td>

                    {/* Qty */}
                    <td className="text-right">
                      <input
                        type="number"
                        min={0}
                        step={1000}
                        value={line.qty}
                        onChange={(e) => patch(line.id, { qty: Math.max(0, Number(e.target.value) || 0) })}
                        className={`${inputBase} w-[110px] text-right`}
                      />
                    </td>

                    {/* Price */}
                    <td className="text-right">
                      <input
                        type="number"
                        min={0}
                        step={0.001}
                        value={isMarket ? '' : line.price}
                        disabled={isMarket}
                        placeholder={isMarket ? 'MKT' : undefined}
                        onChange={(e) => patch(line.id, { price: Math.max(0, Number(e.target.value) || 0) })}
                        className={`${inputBase} w-[110px] text-right`}
                      />
                    </td>

                    {/* Est. value */}
                    <td className="text-right tabular-nums text-content">{fmtMoney(lineValue(line, mpx(line)))}</td>

                    {/* Remove */}
                    <td className="text-center">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => remove(line.id)}
                        aria-label="Remove line"
                        className="px-2"
                      >
                        ✕
                      </Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* ── Footer summary ──────────────────────────────────────── */}
      <Panel noPadding>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 p-3">
          <div className="flex items-center gap-2">
            <span className="text-[11px] uppercase text-content-muted">Lines</span>
            <Badge tone="neutral">{lines.length}</Badge>
          </div>

          <Summary label="Total Buy" value={totalBuy} className="text-up" />
          <Summary label="Total Sell" value={totalSell} className="text-down" />
          <Summary
            label="Net (Buy − Sell)"
            value={net}
            className={net > 0 ? 'text-up' : net < 0 ? 'text-down' : 'text-content'}
            signed
          />

          <div className="ml-auto flex items-center gap-3">
            <span className="text-[12px] text-content-muted">{client}</span>
            <Badge tone="info">AED</Badge>
            <Button variant="primary" onClick={submit} disabled={lines.length === 0}>
              Submit Basket ({lines.length})
            </Button>
          </div>
        </div>
      </Panel>
    </div>
  )
}

function Summary({
  label,
  value,
  className,
  signed = false,
}: {
  label: string
  value: number
  className: string
  signed?: boolean
}) {
  const sign = signed && value > 0 ? '+' : signed && value < 0 ? '−' : ''
  return (
    <div className="flex flex-col">
      <span className="text-[11px] uppercase text-content-muted">{label}</span>
      <span className={`text-[15px] font-semibold tabular-nums ${className}`}>
        {sign}
        {fmtMoney(Math.abs(value))} <span className="text-[11px] font-normal text-content-muted">AED</span>
      </span>
    </div>
  )
}
