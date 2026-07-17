import { useEffect, useRef, useState } from 'react'
import { FULL_MARKET, CLIENT_OPTIONS, fmtMoney } from '../data'
import type { Symbol } from '../data'
import { usePrices } from '../simData'
import SymbolCombo from './SymbolCombo'

/**
 * Basket Order builder (FAB Securities). The broker stages a list of lines
 * (one symbol each), tunes side / type / qty / price / condition per line, then
 * executes them — one by one (not a single atomic transaction) or as a block.
 *
 * Styled to match the Order Placement desk (dark #0a0c12 panels, #0b0e15 inputs,
 * FAB-blue accents). When given a `client`, it embeds under an open CIF and
 * hides its own client selector.
 */

type Side = 'buy' | 'sell'
type OrderType = 'Limit' | 'Market' // Stop-limit is unsupported in these markets.
type GoodTill = 'Day' | 'GTC' | 'GTD' | 'IOC'
type Condition = 'None' | 'All-or-None' | 'Minimum Fill'
type ExecMode = 'Sequential' | 'Grouped'
type LineStatus = 'Staged' | 'Sending' | 'Sent'

// One client can hold several portfolios; the basket routes to one.
const PORTFOLIOS = ['Regular', 'Margin', 'Margin Lending', 'US Market']
const GOOD_TILL: GoodTill[] = ['Day', 'GTC', 'GTD', 'IOC']
const CONDITIONS: Condition[] = ['None', 'All-or-None', 'Minimum Fill']
const CONDITION_LABEL: Record<Condition, string> = { 'None': 'None', 'All-or-None': 'AON', 'Minimum Fill': 'Min Fill' }

interface BasketLine {
  id: number
  symbol: Symbol
  side: Side
  type: OrderType
  qty: number
  price: number
  condition: Condition
  status: LineStatus
}

/** Value of a single line: Market uses the current (live/sim) price, Limit uses the set price. */
function lineValue(line: BasketLine, marketPx: number): number {
  const px = line.type === 'Market' ? marketPx : line.price
  return line.qty * px
}

/** Build a fresh basket line from a symbol with sensible defaults. */
function makeLine(id: number, symbol: Symbol, side: Side = 'buy'): BasketLine {
  return { id, symbol, side, type: 'Limit', qty: 1000, price: symbol.lastPrice, condition: 'None', status: 'Staged' }
}

const seedSymbol = (short: string) => FULL_MARKET.find((s) => s.symbolShortName === short)!

const SEED: BasketLine[] = [
  makeLine(1, seedSymbol('EMAAR'), 'buy'),
  makeLine(2, seedSymbol('DIB'), 'sell'),
  makeLine(3, seedSymbol('AMANAT'), 'buy'),
]

// ── Desk-matching style tokens ──────────────────────────────────────────────
const PANEL = 'rounded-xl border border-[rgba(0,98,255,0.15)] bg-[#0a0c12] shadow-[0_2px_20px_rgba(0,0,0,0.3)]'
const D_INPUT = 'h-8 rounded border border-[rgba(0,98,255,0.22)] bg-[#0b0e15] px-2 text-[13px] text-content tabular-nums outline-none transition-colors hover:border-[rgba(0,98,255,0.4)] focus:border-[#5b9bff] disabled:opacity-40'
const D_SELECT = `${D_INPUT} appearance-none pr-7 [background-image:url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%235b9bff%22 stroke-width=%222%22><path d=%22M6 9l6 6 6-6%22/></svg>')] bg-[length:14px] bg-[right_0.4rem_center] bg-no-repeat`
const D_LABEL = 'text-[9px] font-bold uppercase tracking-widest text-content-subtle'

export default function BasketOrder({ client: fixedClient }: { client?: string } = {}) {
  const [lines, setLines] = useState<BasketLine[]>(SEED)
  const [client, setClient] = useState<string>(fixedClient ?? CLIENT_OPTIONS[0])
  const [portfolio, setPortfolio] = useState<string>(PORTFOLIOS[0])
  const [goodTill, setGoodTill] = useState<GoodTill>('Day')
  const [execMode, setExecMode] = useState<ExecMode>('Sequential')
  const [sending, setSending] = useState(false)
  const nextId = useRef(SEED.length + 1)
  const price = usePrices()
  const mpx = (l: BasketLine) => price(l.symbol.symbolShortName)?.last ?? l.symbol.lastPrice

  // Keep the fixed (embedded) client in sync with the open CIF.
  useEffect(() => { if (fixedClient) setClient(fixedClient) }, [fixedClient])

  function addBySymbol(short: string) {
    const symbol = FULL_MARKET.find((s) => s.symbolShortName === short)
    if (!symbol) return
    setLines((prev) => [...prev, makeLine(nextId.current++, symbol)])
  }

  function patch(id: number, change: Partial<BasketLine>) {
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...change } : l)))
  }

  const remove = (id: number) => setLines((prev) => prev.filter((l) => l.id !== id))
  const clear = () => { setLines([]); setSending(false) }
  const resetStatuses = () => setLines((prev) => prev.map((l) => ({ ...l, status: 'Staged' as LineStatus })))
  const patchStatus = (id: number, status: LineStatus) =>
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, status } : l)))

  // Stage → review → execute. Sequential walks one by one; Grouped sends a block.
  function submit() {
    if (sending || lines.length === 0) return
    setSending(true)
    if (execMode === 'Grouped') {
      setLines((prev) => prev.map((l) => ({ ...l, status: 'Sent' as LineStatus })))
      setSending(false)
      return
    }
    const ids = lines.map((l) => l.id)
    ids.forEach((id, i) => {
      setTimeout(() => patchStatus(id, 'Sending'), i * 520)
      setTimeout(() => {
        patchStatus(id, 'Sent')
        if (i === ids.length - 1) setSending(false)
      }, i * 520 + 260)
    })
  }

  const totalBuy = lines.filter((l) => l.side === 'buy').reduce((s, l) => s + lineValue(l, mpx(l)), 0)
  const totalSell = lines.filter((l) => l.side === 'sell').reduce((s, l) => s + lineValue(l, mpx(l)), 0)
  const net = totalBuy - totalSell
  const sentCount = lines.filter((l) => l.status === 'Sent').length
  const allSent = lines.length > 0 && sentCount === lines.length

  return (
    <div className="flex flex-col gap-3">
      {/* ── Toolbar ─────────────────────────────────────────────── */}
      <div className={`flex flex-wrap items-end gap-3 p-3 ${PANEL}`}>
        {/* Searchable symbol add — same combo as the single-order ticket */}
        <label className="flex min-w-0 flex-col gap-1">
          <span className={D_LABEL}>Add symbol</span>
          <SymbolCombo
            value=""
            clearOnSelect
            placeholder="Type symbol → adds to basket"
            className="w-[240px]"
            onChange={addBySymbol}
          />
        </label>

        <div className="mx-1 h-8 w-px self-end bg-[rgba(0,98,255,0.2)]" />

        {!fixedClient && (
          <label className="flex flex-col gap-1">
            <span className={D_LABEL}>Client</span>
            <select value={client} onChange={(e) => setClient(e.target.value)} className={`${D_SELECT} w-[210px]`}>
              {CLIENT_OPTIONS.map((c) => <option key={c} value={c} className="bg-surface">{c}</option>)}
            </select>
          </label>
        )}

        <label className="flex flex-col gap-1">
          <span className="text-[9px] font-bold uppercase tracking-widest text-[#5b9bff]">Portfolio<span className="ml-0.5 text-down">*</span></span>
          <select value={portfolio} onChange={(e) => setPortfolio(e.target.value)} className={`${D_SELECT} w-[150px]`}>
            {PORTFOLIOS.map((p) => <option key={p} value={p} className="bg-surface">{p}</option>)}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className={D_LABEL}>Good Till</span>
          <div className="inline-flex overflow-hidden rounded border border-[rgba(0,98,255,0.22)]">
            {GOOD_TILL.map((g) => (
              <button
                key={g}
                onClick={() => setGoodTill(g)}
                className={`px-2.5 py-1.5 text-[11px] font-semibold transition-colors ${goodTill === g ? 'bg-[#0062ff] text-white' : 'bg-[#0b0e15] text-content-muted hover:text-content'}`}
              >
                {g}
              </button>
            ))}
          </div>
        </label>

        <button
          onClick={clear}
          disabled={lines.length === 0}
          className="ml-auto h-8 self-end rounded-md px-3 text-[12px] font-medium text-content-muted hover:bg-[rgba(255,255,255,0.06)] hover:text-content disabled:opacity-40"
        >
          Clear basket
        </button>
      </div>

      {/* What a basket is — stage & review, executed one by one */}
      <div className="flex items-center gap-2 rounded-lg border border-[rgba(0,98,255,0.15)] bg-[rgba(0,98,255,0.05)] px-3 py-1.5 text-[11px] text-content-muted">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#5b9bff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></svg>
        <span>Stage multiple orders here and review them together. They execute <span className="text-content">one by one</span> (not a single atomic transaction) — send sequentially, or as a block in quick succession.</span>
      </div>

      {/* ── Editable basket table ───────────────────────────────── */}
      <div className={`overflow-hidden ${PANEL}`}>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[13px]">
            <thead className="bg-gradient-to-r from-[#0d1220] to-[#0c0f18] text-[10px] uppercase tracking-wide text-content-muted">
              <tr className="[&>th]:px-3 [&>th]:py-2.5 [&>th]:font-medium">
                <th className="text-left">Symbol</th>
                <th className="text-center">Side</th>
                <th className="text-left">Type</th>
                <th className="text-right">Qty</th>
                <th className="text-right">Price</th>
                <th className="text-left">Condition</th>
                <th className="text-right">Est. Value</th>
                <th className="text-center">Status</th>
                <th className="w-10 text-center" />
              </tr>
            </thead>
            <tbody>
              {lines.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-3 py-10 text-center text-[13px] text-content-muted">
                    Basket is empty — add a symbol above to get started.
                  </td>
                </tr>
              )}
              {lines.map((line) => {
                const isMarket = line.type === 'Market'
                return (
                  <tr
                    key={line.id}
                    className="border-t border-[rgba(255,255,255,0.04)] [&>td]:px-3 [&>td]:py-2 hover:bg-[rgba(0,98,255,0.05)]"
                  >
                    {/* Symbol */}
                    <td>
                      <div className="font-semibold text-content">{line.symbol.symbolShortName}</div>
                      <div className="text-[11px] text-content-subtle">{line.symbol.symbolName}</div>
                    </td>

                    {/* Side toggle */}
                    <td>
                      <div className="flex justify-center gap-1">
                        <button
                          onClick={() => patch(line.id, { side: 'buy' })}
                          className={`rounded-md px-2.5 py-1 text-[11px] font-bold transition-colors ${line.side === 'buy' ? 'bg-[rgba(0,98,255,0.18)] text-[#5b9bff] ring-1 ring-[rgba(0,98,255,0.45)]' : 'text-content-subtle hover:text-content'}`}
                        >
                          Buy
                        </button>
                        <button
                          onClick={() => patch(line.id, { side: 'sell' })}
                          className={`rounded-md px-2.5 py-1 text-[11px] font-bold transition-colors ${line.side === 'sell' ? 'bg-[rgba(224,56,61,0.18)] text-down ring-1 ring-[rgba(255,107,114,0.45)]' : 'text-content-subtle hover:text-content'}`}
                        >
                          Sell
                        </button>
                      </div>
                    </td>

                    {/* Type */}
                    <td>
                      <select
                        value={line.type}
                        onChange={(e) => patch(line.id, { type: e.target.value as OrderType })}
                        className={`${D_SELECT} w-[100px]`}
                      >
                        <option value="Limit" className="bg-surface">Limit</option>
                        <option value="Market" className="bg-surface">Market</option>
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
                        className={`${D_INPUT} w-[104px] text-right`}
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
                        className={`${D_INPUT} w-[104px] text-right text-[#9cc0ff]`}
                      />
                    </td>

                    {/* Condition */}
                    <td>
                      <select
                        value={line.condition}
                        onChange={(e) => patch(line.id, { condition: e.target.value as Condition })}
                        className={`${D_SELECT} w-[104px]`}
                      >
                        {CONDITIONS.map((c) => (
                          <option key={c} value={c} className="bg-surface">{CONDITION_LABEL[c]}</option>
                        ))}
                      </select>
                    </td>

                    {/* Est. value */}
                    <td className="text-right tabular-nums text-content">{fmtMoney(lineValue(line, mpx(line)))}</td>

                    {/* Status */}
                    <td className="text-center">
                      <span className={`inline-flex items-center rounded px-2 py-0.5 text-[10px] font-bold ${
                        line.status === 'Sent'
                          ? 'bg-[rgba(47,208,122,0.12)] text-up ring-1 ring-[rgba(47,208,122,0.25)]'
                          : line.status === 'Sending'
                            ? 'bg-[rgba(255,170,0,0.12)] text-warning ring-1 ring-[rgba(255,170,0,0.25)]'
                            : 'bg-[rgba(255,255,255,0.05)] text-content-muted ring-1 ring-[rgba(255,255,255,0.08)]'
                      }`}>
                        {line.status === 'Sending' ? '● Sending' : line.status === 'Sent' ? '✓ Sent' : 'Staged'}
                      </span>
                    </td>

                    {/* Remove */}
                    <td className="text-center">
                      <button
                        onClick={() => remove(line.id)}
                        aria-label="Remove line"
                        className="rounded px-2 py-1 text-content-subtle hover:text-down"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Footer summary ──────────────────────────────────────── */}
      <div className={`flex flex-wrap items-center gap-x-6 gap-y-3 p-3 ${PANEL}`}>
        <div className="flex items-center gap-2">
          <span className={D_LABEL}>Lines</span>
          <span className="rounded bg-[rgba(255,255,255,0.06)] px-2 py-0.5 text-[12px] font-semibold tabular-nums text-content">{lines.length}</span>
        </div>

        <Summary label="Total Buy" value={totalBuy} className="text-up" />
        <Summary label="Total Sell" value={totalSell} className="text-down" />
        <Summary
          label="Net (Buy − Sell)"
          value={net}
          className={net > 0 ? 'text-up' : net < 0 ? 'text-down' : 'text-content'}
          signed
        />

        {/* Execution: one-by-one (default) or grouped as a block */}
        <div className="flex flex-col gap-1">
          <span className={D_LABEL}>Execution</span>
          <div className="inline-flex overflow-hidden rounded border border-[rgba(0,98,255,0.22)]">
            {(['Sequential', 'Grouped'] as ExecMode[]).map((m) => (
              <button
                key={m}
                onClick={() => setExecMode(m)}
                title={m === 'Sequential' ? 'Execute the orders one by one' : 'Execute the basket together as a block'}
                className={`px-3 py-1.5 text-[11px] font-semibold transition-colors ${execMode === m ? 'bg-[#0062ff] text-white' : 'bg-[#0b0e15] text-content-muted hover:text-content'}`}
              >
                {m === 'Sequential' ? 'One by one' : 'Grouped'}
              </button>
            ))}
          </div>
        </div>

        <div className="ml-auto flex items-center gap-3">
          <span className="text-[12px] text-content-muted">{client} · <span className="text-content">{portfolio}</span></span>
          {allSent ? (
            <button onClick={resetStatuses} className="h-8 rounded-md px-3 text-[12px] font-medium text-content-muted hover:bg-[rgba(255,255,255,0.06)] hover:text-content">
              Re-stage
            </button>
          ) : (
            <button
              onClick={submit}
              disabled={sending || lines.length === 0}
              className="btn-glow-blue h-9 rounded-md px-4 text-[12px] font-bold uppercase tracking-wide text-white transition-all hover:brightness-110 disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg, #0062ff 0%, #003dcc 100%)' }}
            >
              {sending ? `Sending ${sentCount}/${lines.length}…` : execMode === 'Grouped' ? `Send Block (${lines.length})` : `Send One by One (${lines.length})`}
            </button>
          )}
        </div>
      </div>
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
      <span className="text-[9px] font-bold uppercase tracking-widest text-content-subtle">{label}</span>
      <span className={`text-[15px] font-semibold tabular-nums ${className}`}>
        {sign}
        {fmtMoney(Math.abs(value))} <span className="text-[11px] font-normal text-content-muted">AED</span>
      </span>
    </div>
  )
}
