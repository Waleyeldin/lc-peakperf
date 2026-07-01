import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { FULL_MARKET, CANDLES, fmtPrice, fmtInt, fmtPct } from '../data'
import type { PortfolioPosition } from '../data'
import { DESK_CUSTOMERS, findCustomer } from '../deskData'
import type { DeskCustomer } from '../deskData'
import { usePrices } from '../simData'
import { isLiveSymbol } from '../liveData'

/**
 * Broker Desk — a split-screen, widget-based trading desk.
 *
 *  ┌ Market Watch ─────────┬ Customers (stacked) ───────────────┐
 *  │ search · quote · chart │ SIF entry → portfolio + contact +  │
 *  │ market table           │ Buy (blue) / Sell (red) per client │
 *  └────────────────────────┴────────────────────────────────────┘
 *
 * There is no step-through journey: entering a SIF opens/updates a customer and
 * every customer widget reflects it immediately. Multiple customers can be kept
 * open ("stacked"). Buy is blue, Sell is red, and both take multiple line items.
 */

const BLUE = '#0062ff'
const RED = '#e0383d'
const fmtMoney = (n: number) => 'AED ' + Math.round(n).toLocaleString('en-US')
const priceOf = (short: string) => FULL_MARKET.find((s) => s.symbolShortName === short)?.lastPrice ?? 0

// ─── Order-placed toast notifications ────────────────────────────────────────
type ToastTone = 'buy' | 'sell'
const ToastCtx = createContext<(msg: string, tone: ToastTone) => void>(() => {})
const useToast = () => useContext(ToastCtx)

interface Toast { id: number; msg: string; tone: ToastTone }
function ToastHost({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-8 z-[90] flex flex-col items-center gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="flex items-center gap-2.5 rounded-xl px-5 py-3 text-[15px] font-bold text-white shadow-2xl ring-1 ring-white/20"
          style={{ background: t.tone === 'buy' ? BLUE : RED }}
        >
          <span className="grid size-6 place-items-center rounded-full bg-white/25 text-[13px]">✓</span>
          {t.msg}
        </div>
      ))}
    </div>
  )
}

// ─── Mini sparkline from the symbol's candles ────────────────────────────────
function Sparkline({ symbol }: { symbol: string }) {
  const candles = CANDLES[symbol]
  if (!candles || candles.length < 2) return <div className="h-14" />
  const closes = candles.slice(-40).map((c) => c.c)
  const min = Math.min(...closes)
  const max = Math.max(...closes)
  const span = max - min || 1
  const w = 260
  const h = 56
  const pts = closes
    .map((c, i) => `${((i / (closes.length - 1)) * w).toFixed(1)},${(h - ((c - min) / span) * h).toFixed(1)}`)
    .join(' ')
  const up = closes[closes.length - 1] >= closes[0]
  const color = up ? '#2fd07a' : RED
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none" className="block">
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

// ─── Left: Market Watch ──────────────────────────────────────────────────────
function MarketWatch({ symbol, onPick }: { symbol: string; onPick: (s: string) => void }) {
  const [q, setQ] = useState('')
  const price = usePrices()
  const rows = useMemo(() => {
    const query = q.trim().toLowerCase()
    return FULL_MARKET.filter(
      (s) => !query || `${s.symbolName} ${s.symbolShortName}`.toLowerCase().includes(query),
    ).slice(0, 60)
  }, [q])
  const sel = FULL_MARKET.find((s) => s.symbolShortName === symbol)
  const selQ = sel ? price(sel.symbolShortName) : null
  const selLast = selQ?.last ?? sel?.lastPrice ?? 0
  const selChg = selQ?.change ?? sel?.change ?? 0
  const selChgPct = selQ?.changePct ?? sel?.changePct ?? 0

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-border-dark bg-surface">
      <header className="flex h-11 shrink-0 items-center gap-2 border-b border-border-dark px-3">
        <h3 className="text-[13px] font-semibold text-content">Market Watch</h3>
        <span className="text-[11px] text-content-muted">filters the Buy panel</span>
      </header>

      <div className="shrink-0 border-b border-border-dark p-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search symbol… (EMAAR, TALABAT, SALIK)"
          className="h-9 w-full rounded-md border border-border-dark bg-[#15171a] px-3 text-[13px] text-content outline-none focus:border-action"
        />
        {sel && (
          <div className="mt-3 rounded-lg border border-border-dark bg-page p-3">
            <div className="flex items-baseline justify-between">
              <div>
                <div className="flex items-center gap-1.5 text-[14px] font-semibold text-content">
                  {sel.symbolShortName}
                  {isLiveSymbol(sel.symbolShortName)
                    ? <span className="inline-flex items-center gap-1 text-[9px] font-bold text-up"><span className="inline-block size-1.5 rounded-full bg-up shadow-[0_0_5px_#2fd07a]" />LIVE</span>
                    : <span className="text-[9px] font-medium text-content-subtle">SIM</span>}
                </div>
                <div className="text-[11px] text-content-muted">{sel.symbolName}</div>
              </div>
              <div className="text-right">
                <div className="text-[18px] font-semibold tabular-nums text-content">{fmtPrice(selLast)}</div>
                <div className={`text-[12px] tabular-nums ${selChg >= 0 ? 'text-up' : 'text-down'}`}>
                  {selChg >= 0 ? '+' : ''}
                  {fmtPrice(selChg)} ({fmtPct(selChgPct)})
                </div>
              </div>
            </div>
            <div className="mt-2"><Sparkline symbol={sel.symbolShortName} /></div>
            <div className="mt-1 flex justify-between text-[11px] tabular-nums text-content-muted">
              <span>Bid {fmtPrice(sel.bidPrice)}</span>
              <span>Ask {fmtPrice(sel.offerPrice)}</span>
              <span>Vol {fmtInt(sel.volume)}</span>
            </div>
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full border-collapse text-[12.5px] tabular-nums">
          <thead className="sticky top-0 z-10 bg-[#15171a] text-[11px] uppercase tracking-wide text-content-muted">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Symbol</th>
              <th className="px-3 py-2 text-right font-medium">Last</th>
              <th className="px-3 py-2 text-right font-medium">Chg%</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => {
              const rq = price(s.symbolShortName)
              const last = rq?.last ?? s.lastPrice
              const pct = rq?.changePct ?? s.changePct
              return (
                <tr
                  key={s.symbolShortName}
                  onClick={() => onPick(s.symbolShortName)}
                  className={`cursor-pointer border-b border-border-dark/60 hover:bg-[rgba(255,255,255,0.04)] ${
                    s.symbolShortName === symbol ? 'bg-[rgba(0,98,255,0.14)]' : ''
                  }`}
                >
                  <td className="px-3 py-1.5 text-left">
                    {isLiveSymbol(s.symbolShortName) && <span className="mr-1.5 inline-block size-1.5 rounded-full bg-up align-middle shadow-[0_0_4px_#2fd07a]" title="Live" />}
                    <span className="font-medium text-content">{s.symbolShortName}</span>
                    <span className="ml-2 text-[11px] text-content-muted">{s.marketShortName}</span>
                  </td>
                  <td className="px-3 py-1.5 text-right text-content">{fmtPrice(last)}</td>
                  <td className={`px-3 py-1.5 text-right ${pct >= 0 ? 'text-up' : 'text-down'}`}>{fmtPct(pct)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Buy panel (BLUE) — multiple line items ──────────────────────────────────
interface BuyLine { id: number; symbol: string; qty: number }
function BuyPanel({ defaultSymbol, suggestions, available, casaAccount, casaBalance, onMoveFromCasa }: { defaultSymbol: string; suggestions: string[]; available: number; casaAccount: string; casaBalance: number; onMoveFromCasa: (amt: number) => void }) {
  let seq = 1
  const [lines, setLines] = useState<BuyLine[]>(() => [{ id: seq++, symbol: defaultSymbol, qty: 1000 }])
  const notify = useToast()
  const price = usePrices()
  const px = (sym: string) => price(sym)?.last ?? priceOf(sym)

  // Follow the Market Watch: when the filtered stock changes, prefill it into
  // the first Buy line (context-based prefill from the spec).
  useEffect(() => {
    setLines((p) => (p.length ? [{ ...p[0], symbol: defaultSymbol }, ...p.slice(1)] : p))
  }, [defaultSymbol])

  const add = () => {
    const next = suggestions.find((s) => !lines.some((l) => l.symbol === s)) ?? FULL_MARKET[0].symbolShortName
    setLines((p) => [...p, { id: seq++ + p.length, symbol: next, qty: 1000 }])
  }
  const update = (id: number, patch: Partial<BuyLine>) => setLines((p) => p.map((l) => (l.id === id ? { ...l, ...patch } : l)))
  const remove = (id: number) => setLines((p) => (p.length > 1 ? p.filter((l) => l.id !== id) : p))
  const total = lines.reduce((s, l) => s + l.qty * px(l.symbol), 0)
  const short = Math.max(0, Math.round(total - available))

  return (
    <div className="flex flex-1 flex-col overflow-hidden rounded-lg border-2" style={{ borderColor: BLUE, background: 'rgba(0,98,255,0.08)' }}>
      <div className="flex items-center justify-between px-3 py-2 text-white" style={{ background: BLUE }}>
        <span className="text-[13px] font-bold uppercase tracking-wide">Buy</span>
        <button onClick={add} className="rounded bg-white/20 px-2 py-0.5 text-[11px] font-semibold hover:bg-white/30">+ Add instrument</button>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-auto p-3">
        {lines.map((l) => (
          <div key={l.id} className="flex items-center gap-2">
            <select
              value={l.symbol}
              onChange={(e) => update(l.id, { symbol: e.target.value })}
              className="h-8 min-w-0 flex-1 rounded border border-border-dark bg-[#15171a] px-2 text-[12px] text-content outline-none focus:border-action"
            >
              {FULL_MARKET.map((s) => (
                <option key={s.symbolShortName} value={s.symbolShortName} className="bg-surface">{s.symbolShortName}</option>
              ))}
            </select>
            <input
              type="number"
              value={l.qty}
              onChange={(e) => update(l.id, { qty: Math.max(0, +e.target.value) })}
              className="h-8 w-24 rounded border border-border-dark bg-[#15171a] px-2 text-right text-[12px] text-content outline-none focus:border-action"
            />
            <span className="w-24 text-right text-[12px] tabular-nums text-content-muted">{fmtPrice(px(l.symbol))}</span>
            <button onClick={() => remove(l.id)} className="text-content-muted hover:text-down" title="Remove line" aria-label="Remove line">✕</button>
          </div>
        ))}
      </div>
      <div className="border-t px-3 py-2" style={{ borderColor: 'rgba(0,98,255,0.35)' }}>
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-content-muted">Est. <span className="font-semibold tabular-nums text-content">{fmtMoney(total)}</span></span>
          <span className="tabular-nums text-content-muted">Avail {fmtMoney(available)}</span>
        </div>

        {/* Only when there isn't enough cash: warn, and reveal the CASA top-up. */}
        {short > 0 && (
          <div className="mt-2 rounded-md border px-2.5 py-2" style={{ borderColor: 'rgba(255,170,0,0.45)', background: 'rgba(255,170,0,0.1)' }}>
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-warning">
              <span>⚠</span> Not enough available cash — short {fmtMoney(short)}
            </div>
            <div className="mt-1.5 flex items-center justify-between gap-2">
              <span className="text-[11px] tabular-nums text-content-muted">CASA {casaAccount} · {fmtMoney(casaBalance)}</span>
              <button
                onClick={() => onMoveFromCasa(short)}
                disabled={casaBalance < short}
                title={casaBalance < short ? 'CASA balance too low to cover' : 'Move the shortfall from CASA into the investment account'}
                className="shrink-0 rounded px-2.5 py-1 text-[11px] font-semibold text-white disabled:opacity-40"
                style={{ background: BLUE }}
              >
                Move {fmtMoney(short)} from CASA
              </button>
            </div>
          </div>
        )}

        <button
          onClick={() => notify(`Buy order placed — ${lines.length} instrument${lines.length === 1 ? '' : 's'}`, 'buy')}
          className="mt-2 w-full rounded-md px-3 py-1.5 text-[12px] font-bold text-white"
          style={{ background: BLUE }}
        >
          Place {lines.length} Buy{lines.length === 1 ? '' : 's'}
        </button>
      </div>
    </div>
  )
}

// ─── Sell panel (RED) — from holdings, multiple line items ────────────────────
function SellPanel({ holdings }: { holdings: PortfolioPosition[] }) {
  const [qty, setQty] = useState<Record<string, number>>({})
  const notify = useToast()
  const price = usePrices()
  const px = (h: PortfolioPosition) => price(h.symbol)?.last ?? h.evalPrice
  const set = (sym: string, n: number, max: number) => {
    setQty((p) => ({ ...p, [sym]: Math.max(0, Math.min(n, max)) }))
  }
  const selected = holdings.filter((h) => (qty[h.symbol] ?? 0) > 0)
  const total = selected.reduce((s, h) => s + (qty[h.symbol] ?? 0) * px(h), 0)

  return (
    <div className="flex flex-1 flex-col overflow-hidden rounded-lg border-2" style={{ borderColor: RED, background: 'rgba(224,56,61,0.08)' }}>
      <div className="flex items-center justify-between px-3 py-2 text-white" style={{ background: RED }}>
        <span className="text-[13px] font-bold uppercase tracking-wide">Sell</span>
        <span className="text-[11px] opacity-90">holdings & sellable qty</span>
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-3">
        {holdings.length === 0 ? (
          <div className="py-6 text-center text-[12px] text-content-muted">No holdings to sell.</div>
        ) : (
          <table className="w-full text-[12px] tabular-nums">
            <thead className="text-[10px] uppercase tracking-wide text-content-muted">
              <tr>
                <th className="py-1 text-left font-medium">Symbol</th>
                <th className="py-1 text-right font-medium">Avail.</th>
                <th className="py-1 text-right font-medium">Price</th>
                <th className="py-1 text-right font-medium">Sell qty</th>
              </tr>
            </thead>
            <tbody>
              {holdings.map((h) => (
                <tr key={h.symbol} className="border-t border-border-dark/60">
                  <td className="py-1.5 text-left font-medium text-content">{h.symbol}</td>
                  <td className="py-1.5 text-right text-content-muted">{fmtInt(h.available)}</td>
                  <td className="py-1.5 text-right text-content">{fmtPrice(px(h))}</td>
                  <td className="py-1.5 text-right">
                    <input
                      type="number"
                      value={qty[h.symbol] ?? 0}
                      onChange={(e) => set(h.symbol, +e.target.value, h.available)}
                      className="h-7 w-20 rounded border border-border-dark bg-[#15171a] px-2 text-right text-[12px] text-content outline-none focus:border-down"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div className="flex items-center justify-between border-t px-3 py-2" style={{ borderColor: 'rgba(224,56,61,0.35)' }}>
        <span className="text-[12px] text-content-muted">Est. {fmtMoney(total)}</span>
        <button
          disabled={selected.length === 0}
          onClick={() => notify(`Sell order placed — ${selected.length} instrument${selected.length === 1 ? '' : 's'}`, 'sell')}
          className="rounded-md px-3 py-1.5 text-[12px] font-bold text-white disabled:opacity-40"
          style={{ background: RED }}
        >
          Place {selected.length} Sell{selected.length === 1 ? '' : 's'}
        </button>
      </div>
    </div>
  )
}

// ─── One customer widget (portfolio + contact + buy/sell) ────────────────────
function CustomerPanel({ customer, watchSymbol, onClose }: { customer: DeskCustomer; watchSymbol: string; onClose: () => void }) {
  // Prefill Buy with the stock the customer trades most — approximated by their
  // largest holding (e.g. Mahlya → AMANAT). Market Watch selection overrides it.
  const mostTraded = customer.holdings.length
    ? customer.holdings.reduce((a, b) => (b.quantity > a.quantity ? b : a)).symbol
    : undefined
  const buyDefault = watchSymbol || mostTraded || customer.usualStocks[0] || FULL_MARKET[0].symbolShortName

  // Re-value holdings from live/sim prices so the portfolio stays consistent
  // with Market Watch (and moves).
  const price = usePrices()
  const liveHoldings = customer.holdings.map((h) => {
    const last = price(h.symbol)?.last ?? h.evalPrice
    const marketValue = Math.round(last * h.quantity)
    return { ...h, evalPrice: last, marketValue, gainLoss: marketValue - h.cost }
  })
  const totalMV = liveHoldings.reduce((s, h) => s + h.marketValue, 0)
  const totalGL = liveHoldings.reduce((s, h) => s + h.gainLoss, 0)

  // Funds: available investment cash + the linked CASA account it can pull from.
  const [cash, setCash] = useState(customer.cash)
  const [casaBal, setCasaBal] = useState(customer.casaBalance)
  const moveFromCasa = (amt: number) => {
    const m = Math.max(0, Math.min(Math.round(amt), casaBal))
    if (!m) return
    setCash((c) => c + m)
    setCasaBal((b) => b - m)
  }

  return (
    <section className="shrink-0 overflow-hidden rounded-xl border border-border-dark bg-surface">
      {/* Contact / identity header */}
      <header className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-border-dark bg-[#141619] px-3 py-2">
        <span className="flex items-center gap-2">
          <span className="rounded bg-[rgba(0,98,255,0.2)] px-1.5 py-0.5 text-[11px] font-bold text-[#9cc0ff]">{customer.sif}</span>
          <span className="text-[14px] font-semibold text-content">{customer.name}</span>
          {customer.vip && <span className="rounded bg-[rgba(240,185,11,0.18)] px-1.5 py-0.5 text-[10px] font-bold uppercase text-[#f0c33b]">VIP</span>}
        </span>
        <span className="flex items-center gap-1 text-[12px] text-content-muted">📞 {customer.phone}</span>
        <span className="flex items-center gap-1 text-[12px]">
          <span className="text-content-muted">✉ {customer.email}</span>
          {customer.emailVerified
            ? <span className="rounded bg-[rgba(47,208,122,0.16)] px-1.5 py-0.5 text-[10px] font-semibold text-up">verified</span>
            : <span className="rounded bg-[rgba(255,107,114,0.16)] px-1.5 py-0.5 text-[10px] font-semibold text-down">unverified</span>}
        </span>
        <button onClick={onClose} title="Close this customer" aria-label="Close this customer" className="ml-auto rounded p-1 text-content-muted hover:bg-[rgba(255,255,255,0.06)] hover:text-content">✕</button>
      </header>

      {/* Available balance — big and prominent */}
      <div className="flex items-baseline gap-3 border-b border-border-dark bg-[#15171a] px-3 py-2.5">
        <span className="text-[11px] font-medium uppercase tracking-wide text-content-muted">Available balance</span>
        <span className="text-[22px] font-bold leading-none tabular-nums text-content">{fmtMoney(cash)}</span>
      </div>

      {/* Step-2 briefing merged in: risk / KYC / day P&L / positions / tenure */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-border-dark px-3 py-1.5 text-[11px]">
        <span className="text-content-muted">Risk <span className="font-medium text-content">{customer.risk}</span></span>
        <span className="text-content-muted">KYC <span className={`font-medium ${customer.kyc === 'Valid' ? 'text-up' : 'text-warning'}`}>{customer.kyc}</span></span>
        <span className="text-content-muted">Day P/L <span className={`font-medium ${customer.dayPnlPct >= 0 ? 'text-up' : 'text-down'}`}>{customer.dayPnlPct >= 0 ? '+' : ''}{customer.dayPnlPct.toFixed(1)}%</span></span>
        <span className="text-content-muted">Positions <span className="font-medium text-content">{customer.positions}</span></span>
        <span className="text-content-muted">Client since <span className="font-medium text-content">{customer.since}</span></span>
      </div>
      {customer.flag && (
        <div className="flex items-start gap-2 border-b border-[rgba(255,170,0,0.3)] bg-[rgba(255,170,0,0.1)] px-3 py-1.5 text-[11px] text-warning">
          <span>⚠</span><span>{customer.flag}</span>
        </div>
      )}

      <div className="flex flex-col gap-3 p-3">
        {/* Portfolio / positions (full width, on top) */}
        <div className="overflow-hidden rounded-lg border border-border-dark">
          <div className="flex items-center justify-between border-b border-border-dark bg-[#15171a] px-3 py-1.5">
            <span className="text-[12px] font-semibold text-content">Portfolio</span>
            <span className="text-[11px] tabular-nums">
              <span className="text-content-muted">MV </span>
              <span className="font-semibold text-content">{fmtMoney(totalMV)}</span>
              <span className={totalGL >= 0 ? 'text-up' : 'text-down'}> ({totalGL >= 0 ? '+' : ''}{fmtMoney(totalGL)})</span>
            </span>
          </div>
          <table className="w-full text-[12px] tabular-nums">
            <thead className="text-[10px] uppercase tracking-wide text-content-muted">
              <tr>
                <th className="px-3 py-1 text-left font-medium">Symbol</th>
                <th className="px-3 py-1 text-right font-medium">Qty</th>
                <th className="px-3 py-1 text-right font-medium">Avg</th>
                <th className="px-3 py-1 text-right font-medium">P/L</th>
              </tr>
            </thead>
            <tbody>
              {liveHoldings.map((h) => (
                <tr key={h.symbol} className="border-t border-border-dark/60">
                  <td className="px-3 py-1.5 text-left font-medium text-content">{h.symbol}</td>
                  <td className="px-3 py-1.5 text-right text-content-muted">{fmtInt(h.quantity)}</td>
                  <td className="px-3 py-1.5 text-right text-content-muted">{fmtPrice(h.avgCost)}</td>
                  <td className={`px-3 py-1.5 text-right ${h.gainLoss >= 0 ? 'text-up' : 'text-down'}`}>{h.gainLoss >= 0 ? '+' : ''}{fmtInt(h.gainLoss)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {/* Recent activity (from step 2) */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border-dark bg-[#15171a] px-3 py-1.5 text-[11px]">
            <span className="uppercase tracking-wide text-content-subtle">Recent</span>
            <span className="text-content-muted"><span className="font-semibold text-up">Buy</span> {customer.lastBuy.symbol} {fmtInt(customer.lastBuy.qty)} @ {fmtPrice(customer.lastBuy.price)}</span>
            <span className="text-content-muted"><span className="font-semibold text-down">Sell</span> {customer.lastSell.symbol} {fmtInt(customer.lastSell.qty)} @ {fmtPrice(customer.lastSell.price)}</span>
          </div>
        </div>

        {/* Buy + Sell — below the portfolio, side by side, always open */}
        <div className="flex min-h-[260px] gap-3">
          <BuyPanel defaultSymbol={buyDefault} suggestions={customer.usualStocks} available={cash} casaAccount={customer.casa} casaBalance={casaBal} onMoveFromCasa={moveFromCasa} />
          <SellPanel holdings={liveHoldings} />
        </div>
      </div>
    </section>
  )
}

// ─── Right: stacked customers + SIF entry ────────────────────────────────────
function CustomerArea({ watchSymbol }: { watchSymbol: string }) {
  const [open, setOpen] = useState<DeskCustomer[]>([DESK_CUSTOMERS[0]])
  const [sif, setSif] = useState('')
  const [error, setError] = useState('')

  const openSif = (replace: boolean) => {
    const c = findCustomer(sif)
    if (!c) { setError(`No customer found for “${sif.trim()}”`); return }
    setError('')
    setSif('')
    setOpen((prev) => (replace ? [c] : prev.some((p) => p.sif === c.sif) ? prev : [c, ...prev]))
  }
  const close = (s: string) => setOpen((prev) => prev.filter((c) => c.sif !== s))

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      {/* CIF entry — the single action that verifies & opens the customer */}
      <div className="shrink-0 rounded-xl border border-border-dark bg-surface p-3">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-[12px] font-semibold text-content-muted">CIF</span>
          <input
            value={sif}
            onChange={(e) => setSif(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') openSif(false) }}
            placeholder="Enter customer CIF number to verify & open their desk…"
            className="h-9 min-w-0 flex-1 rounded-md border border-border-dark bg-[#15171a] px-3 text-[13px] text-content outline-none focus:border-action"
          />
          <button onClick={() => openSif(false)} className="h-9 rounded-md px-3 text-[12px] font-semibold text-white" style={{ background: BLUE }}>Open (stack)</button>
          <button onClick={() => openSif(true)} className="h-9 rounded-md border border-border-dark px-3 text-[12px] font-medium text-content hover:bg-[rgba(255,255,255,0.06)]">Replace all</button>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-content-muted">Quick:</span>
          {DESK_CUSTOMERS.map((c) => (
            <button
              key={c.sif}
              onClick={() => setOpen((prev) => (prev.some((p) => p.sif === c.sif) ? prev : [c, ...prev]))}
              className="rounded border border-border-dark px-2 py-0.5 text-[11px] text-content-muted hover:bg-[rgba(255,255,255,0.06)] hover:text-content"
              title={`Open ${c.name}`}
            >
              {c.name} · CIF {c.cif}{c.vip ? ' ★' : ''}
            </button>
          ))}
        </div>
        {error && <div className="mt-2 text-[11px] text-down">{error}</div>}
      </div>

      {/* Stacked customer widgets */}
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
        {open.length === 0 ? (
          <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-border-dark text-[13px] text-content-muted">
            Enter a SIF to open a customer.
          </div>
        ) : (
          open.map((c) => (
            <div key={c.sif} className="flex shrink-0 flex-col gap-2">
              {/* Labeled separator so stacked customers are clearly divided */}
              <div className="flex items-center gap-2 px-0.5 pt-1">
                <span className="rounded bg-[rgba(0,98,255,0.18)] px-2 py-0.5 text-[11px] font-bold text-[#9cc0ff]">{c.sif}</span>
                <span className="text-[12px] font-semibold text-content">{c.name}</span>
                <span className="h-px flex-1 bg-border-dark" />
              </div>
              <CustomerPanel customer={c} watchSymbol={watchSymbol} onClose={() => close(c.sif)} />
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// ─── Broker Desk (split screen) ──────────────────────────────────────────────
export default function BrokerDesk() {
  // Empty by default so each customer's Buy prefills THEIR most-traded stock
  // (usualStocks[0]); picking a symbol in Market Watch overrides it.
  const [watchSymbol, setWatchSymbol] = useState<string>('')
  const [toasts, setToasts] = useState<Toast[]>([])
  const idRef = useRef(0)
  const notify = useCallback((msg: string, tone: ToastTone) => {
    const id = ++idRef.current
    setToasts((t) => [...t, { id, msg, tone }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800)
  }, [])

  return (
    <ToastCtx.Provider value={notify}>
      <div className="flex h-full min-h-0 gap-3 p-3">
        <div className="hidden w-[34%] min-w-[340px] max-w-[460px] md:block">
          <MarketWatch symbol={watchSymbol} onPick={setWatchSymbol} />
        </div>
        <div className="min-w-0 flex-1">
          <CustomerArea watchSymbol={watchSymbol} />
        </div>
      </div>
      <ToastHost toasts={toasts} />
    </ToastCtx.Provider>
  )
}
