import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { FULL_MARKET, fmtPrice, fmtInt, bluechipFirst } from '../data'
import type { PortfolioPosition } from '../data'
import { DESK_CUSTOMERS, findCustomer } from '../deskData'
import type { DeskCustomer } from '../deskData'
import { usePrices } from '../simData'
import BasketOrder from './BasketOrder'
import SymbolCombo from './SymbolCombo'

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

// ─── Order-ticket options (added per the trading-desk requirements) ──────────
// A client holds several portfolios; orders route to one. Types are limited to
// Market / Limit (stop-limit is unsupported in these markets). Conditions cover
// all-or-none / minimum fill. Commission is 0.275% of value, min AED 25.
type OrderType = 'Market' | 'Limit'
type GoodTill = 'Day' | 'GTC' | 'GTD' | 'IOC'
type Condition = 'None' | 'All-or-None' | 'Minimum Fill'
interface OrderOptions { portfolio: string; orderType: OrderType; goodTill: GoodTill; condition: Condition; expiry?: string; minFillQty?: number }
const PORTFOLIOS = ['Regular', 'Margin', 'Margin Lending', 'US Market']
const ORDER_TYPES: OrderType[] = ['Market', 'Limit']
const GOOD_TILL: GoodTill[] = ['Day', 'GTC', 'GTD', 'IOC']
const CONDITIONS: Condition[] = ['None', 'All-or-None', 'Minimum Fill']
// Short tab labels — full names are time-costly to read on a trading desk.
const CONDITION_LABEL: Record<Condition, string> = { 'None': 'None', 'All-or-None': 'AON', 'Minimum Fill': 'Min Fill' }
const FEE_RATE = 0.00275
const MIN_FEE = 25
const feeFor = (v: number) => (v > 0 ? Math.max(v * FEE_RATE, MIN_FEE) : 0)
const optionsSuffix = (o: OrderOptions) =>
  `${o.portfolio} · ${o.orderType} · ${o.goodTill}${o.goodTill === 'GTD' && o.expiry ? ` ${o.expiry}` : ''}` +
  `${o.condition !== 'None' ? ` · ${o.condition}${o.condition === 'Minimum Fill' && o.minFillQty ? ` (min ${fmtInt(o.minFillQty)})` : ''}` : ''}`


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

// ─── Small building blocks for the Buy ticket's detailed sections ───────────
const D_IN = 'h-8 w-full rounded border border-[rgba(0,98,255,0.22)] bg-[#0b0e15] px-2 text-[12px] text-content outline-none transition-colors focus:border-[#5b9bff]'
function Stat({ label, value, cls = '' }: { label: string; value: string; cls?: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[9px] font-medium uppercase tracking-wide text-content-subtle">{label}</span>
      <span className={`text-[11px] tabular-nums text-content ${cls}`}>{value}</span>
    </div>
  )
}
function RangeBar({ leftLabel, leftVal, rightLabel, rightVal, pct }: { leftLabel: string; leftVal: string; rightLabel: string; rightVal: string; pct: number }) {
  return (
    <div>
      <div className="mb-0.5 flex items-center justify-between text-[9px] tabular-nums text-content-subtle">
        <span>{leftLabel} {leftVal}</span>
        <span>{rightLabel} {rightVal}</span>
      </div>
      <div className="relative h-1.5 rounded-full bg-gradient-to-r from-up/30 via-content-subtle/20 to-down/30">
        <span className="absolute top-1/2 h-3 w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-content shadow-[0_0_4px_rgba(255,255,255,0.5)]" style={{ left: `${pct}%` }} />
      </div>
    </div>
  )
}
function BuyField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[9px] font-medium uppercase tracking-wide text-content-subtle">{label}</span>
      {children}
    </label>
  )
}

const FILL_TERMS = ['Normal', 'Fill or Kill', 'Immediate']
const CASH_ACCOUNTS = ['Primary AED', 'Settlement AED', 'USD Sub-account']
const CUSTODIANS = ['FAB Custody', 'HSBC', 'Citi', 'Self-custody']

// ─── Buy panel (BLUE) — single order (one stock at a time) ───────────────────
function BuyPanel({ defaultSymbol, available, casaAccount, casaBalance, onMoveFromCasa, options, holdings, client }: { defaultSymbol: string; available: number; casaAccount: string; casaBalance: number; onMoveFromCasa: (amt: number) => void; options: OrderOptions; holdings: PortfolioPosition[]; client: string }) {
  const [symbol, setSymbol] = useState(defaultSymbol)
  const [qty, setQty] = useState(1000)
  const [limit, setLimit] = useState<number | undefined>(undefined)
  const [showDetails, setShowDetails] = useState(false)
  const [details, setDetails] = useState({ cashAccount: CASH_ACCOUNTS[0], discVolume: 0, fillTerm: FILL_TERMS[0], custodian: CUSTODIANS[0], contract: '', comments: '', orderOriginator: '', suspended: false })
  const [sim, setSim] = useState<{ tone: 'ok' | 'warn'; lines: string[] } | null>(null)
  const notify = useToast()
  const price = usePrices()
  const px = (sym: string) => price(sym)?.last ?? priceOf(sym)
  const isLimit = options.orderType === 'Limit'
  // Price used for costing: the broker's limit when set, else the live quote.
  const effPx = isLimit ? (limit ?? px(symbol)) : px(symbol)
  const total = qty * effPx
  const fees = feeFor(total)
  const short = Math.max(0, Math.round(total + fees - available))

  // Quote + position derived from the selected symbol and the client's holdings.
  const symObj = FULL_MARKET.find((s) => s.symbolShortName === symbol)
  const live = price(symbol)
  const chg = live?.changePct ?? symObj?.changePct ?? 0
  const dayLow = symObj?.low ?? 0
  const dayHigh = symObj?.high ?? 0
  const last = px(symbol)
  const rangePct = dayHigh > dayLow ? Math.min(100, Math.max(0, ((last - dayLow) / (dayHigh - dayLow)) * 100)) : 50
  const bid = symObj?.bidPrice ?? 0
  const offer = symObj?.offerPrice ?? 0
  const mid = (bid + offer) / 2
  const spreadPct = offer > bid ? Math.min(100, Math.max(0, ((last - bid) / (offer - bid)) * 100)) : 50
  const holding = holdings.find((h) => h.symbol === symbol)
  const availShares = holding?.available ?? 0
  const outSellShares = holding ? Math.max(0, holding.quantity - holding.available) : 0
  const purchasePower = available + casaBalance

  // Follow the Market Watch: when the filtered stock changes, load it into the
  // ticket (context-based prefill). A fresh symbol resets the manual limit.
  useEffect(() => { setSymbol(defaultSymbol); setLimit(undefined) }, [defaultSymbol])
  useEffect(() => { setSim(null) }, [symbol, qty, limit, options.orderType])

  const validate = () => {
    const errs: string[] = []
    if (qty <= 0) errs.push('Quantity must be greater than 0.')
    if (isLimit && (limit ?? px(symbol)) <= 0) errs.push('Limit price must be greater than 0.')
    if (options.condition === 'Minimum Fill' && (options.minFillQty ?? 0) > qty) errs.push('Minimum fill exceeds the order quantity.')
    if (total + fees > available) errs.push(`Order exceeds available cash (${fmtMoney(available)}).`)
    return errs
  }
  const placeOrder = () => {
    const errs = validate()
    if (errs.length) { setSim({ tone: 'warn', lines: errs }); return }
    notify(`Buy order placed — ${fmtInt(qty)} ${symbol} · ${optionsSuffix(options)}`, 'buy')
    setQty(1000); setLimit(undefined); setSim(null)
  }
  const simulate = () => {
    const errs = validate()
    setSim(errs.length ? { tone: 'warn', lines: errs } : {
      tone: 'ok',
      lines: [
        `Buy ${fmtInt(qty)} ${symbol} @ ${isLimit ? fmtPrice(effPx) : 'Market'}`,
        `Trade amount ${fmtMoney(total)} · Fees ${fmtMoney(fees)}`,
        `Order amount ${fmtMoney(total + fees)}`,
      ],
    })
  }
  const clearTicket = () => {
    setQty(1000); setLimit(undefined); setSim(null)
    setDetails({ cashAccount: CASH_ACCOUNTS[0], discVolume: 0, fillTerm: FILL_TERMS[0], custodian: CUSTODIANS[0], contract: '', comments: '', orderOriginator: '', suspended: false })
  }
  const printTicket = () => {
    const now = new Date()
    const rows: [string, string][] = [
      ['Client', client],
      ['Portfolio', options.portfolio],
      ['Symbol', symbol],
      ['Side', 'BUY'],
      ['Order Type', options.orderType],
      ['Quantity', fmtInt(qty)],
      ['Order Price', isLimit ? fmtPrice(effPx) : 'Market'],
      ['Good Till', options.goodTill + (options.goodTill === 'GTD' && options.expiry ? ` (${options.expiry})` : '')],
      ['Condition', options.condition + (options.condition === 'Minimum Fill' && options.minFillQty ? ` (min ${fmtInt(options.minFillQty)})` : '')],
      ['Cash Account', details.cashAccount],
      ['Custodian', details.custodian],
      ['Fill Term', details.fillTerm],
      ['Disc. Volume', fmtInt(details.discVolume)],
      ['Contract', details.contract || '—'],
      ['Order Originator', details.orderOriginator || '—'],
      ['Comments', details.comments || '—'],
      ['Trade Amount', fmtMoney(total) + ' AED'],
      ['Fees', fmtMoney(fees) + ' AED'],
      ['Order Amount', fmtMoney(total + fees) + ' AED'],
    ]
    const amtKeys = ['Trade Amount', 'Fees', 'Order Amount']
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Order Ticket — ${symbol}</title>
      <style>
        *{box-sizing:border-box} body{font-family:Arial,Helvetica,sans-serif;color:#111;padding:32px;max-width:640px;margin:0 auto}
        .hd{display:flex;align-items:center;justify-content:space-between;border-bottom:2px solid #0062ff;padding-bottom:10px;margin-bottom:6px}
        h1{font-size:18px;margin:0;color:#0b1b4d} .badge{background:#0062ff;color:#fff;font-size:11px;font-weight:bold;padding:3px 8px;border-radius:4px}
        .sub{color:#666;font-size:11px;margin-bottom:18px}
        table{width:100%;border-collapse:collapse;font-size:13px}
        td{padding:7px 8px;border-bottom:1px solid #ececec} td.k{color:#666;width:42%}
        tr.amt td{font-weight:bold} tr.amt td.k{font-weight:normal}
        .total td{border-top:2px solid #0062ff;font-size:15px;color:#0b1b4d}
        .foot{margin-top:22px;font-size:10px;color:#999;border-top:1px solid #eee;padding-top:10px}
      </style></head><body>
      <div class="hd"><h1>FAB &times; Trade — Order Ticket</h1><span class="badge">BUY</span></div>
      <div class="sub">Generated ${now.toLocaleString()}</div>
      <table>${rows.map(([k, v]) => `<tr class="${k === 'Order Amount' ? 'amt total' : amtKeys.includes(k) ? 'amt' : ''}"><td class="k">${k}</td><td>${v}</td></tr>`).join('')}</table>
      <div class="foot">Broker order ticket generated by FAB &times; Trade for record purposes. Not a contract note.</div>
      </body></html>`
    const iframe = document.createElement('iframe')
    Object.assign(iframe.style, { position: 'fixed', right: '0', bottom: '0', width: '0', height: '0', border: '0' })
    document.body.appendChild(iframe)
    const doc = iframe.contentWindow?.document
    if (!doc) { document.body.removeChild(iframe); return }
    doc.open(); doc.write(html); doc.close()
    iframe.contentWindow?.focus()
    setTimeout(() => {
      iframe.contentWindow?.print()
      setTimeout(() => { if (iframe.parentNode) document.body.removeChild(iframe) }, 800)
    }, 250)
    notify(`Order ticket sent to printer — ${symbol}`, 'buy')
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden rounded-xl border-2 border-[#0062ff] bg-[rgba(0,98,255,0.05)] shadow-[0_0_0_1px_rgba(0,98,255,0.04),inset_0_1px_0_rgba(0,98,255,0.08)]">
      <div className="flex items-center justify-between px-3 py-3 text-white" style={{ background: 'linear-gradient(135deg, #0062ff 0%, #0040cc 100%)' }}>
        <div className="flex items-baseline gap-2">
          <span className="text-[17px] font-black uppercase tracking-widest">Buy</span>
          <span className="text-[10px] font-medium text-white/50">single order ↑</span>
        </div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-auto p-2.5">
        <div className="flex items-center gap-2 rounded-lg bg-[rgba(0,98,255,0.07)] p-2 ring-1 ring-[rgba(0,98,255,0.18)]">
          <SymbolCombo value={symbol} onChange={(s) => { setSymbol(s); setLimit(undefined) }} />
          <input
            type="number"
            value={qty}
            onChange={(e) => setQty(Math.max(0, +e.target.value))}
            title="Quantity"
            className="h-8 w-[68px] rounded border border-[rgba(0,98,255,0.22)] bg-[#0b0e15] px-2 text-right text-[12px] text-content outline-none focus:border-[#5b9bff]"
          />
          {isLimit ? (
            <input
              type="number"
              step="0.001"
              value={limit ?? Number(px(symbol).toFixed(3))}
              onChange={(e) => setLimit(Math.max(0, +e.target.value))}
              title="Limit price"
              className="h-8 w-[72px] rounded border border-[rgba(0,98,255,0.22)] bg-[#0b0e15] px-2 text-right text-[12px] tabular-nums text-[#9cc0ff] outline-none focus:border-[#5b9bff]"
            />
          ) : (
            <div className="flex w-[72px] shrink-0 flex-col items-end gap-0.5">
              <div className="flex items-center gap-1">
                <span className="text-[11px] tabular-nums text-[#9cc0ff]">{fmtPrice(px(symbol))}</span>
                <span className="rounded bg-[rgba(255,255,255,0.08)] px-1 py-px text-[9px] font-bold tabular-nums text-white/70">MKT</span>
              </div>
            </div>
          )}
          <span className="w-[76px] shrink-0 text-right text-[10px] tabular-nums text-content-subtle">{fmtMoney(total)}</span>
        </div>

        {/* ── Quote — always visible (broker glances at this constantly) ── */}
        <div className="rounded-lg border border-[rgba(0,98,255,0.15)] bg-[rgba(0,98,255,0.03)] p-2.5">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[9px] font-bold uppercase tracking-widest text-[#9cc0ff]">Quote</span>
            <span className={`text-[11px] font-semibold tabular-nums ${chg >= 0 ? 'text-up' : 'text-down'}`}>{chg >= 0 ? '+' : ''}{chg.toFixed(2)}%</span>
          </div>
          <div className="grid grid-cols-3 gap-x-2 gap-y-1.5">
            <Stat label="Last" value={fmtPrice(last)} />
            <Stat label="Prev" value={fmtPrice(symObj?.prevClose ?? 0)} />
            <Stat label="Open" value={fmtPrice(symObj?.openPrice ?? 0)} />
            <Stat label="Bid" value={`${fmtPrice(bid)} ×${fmtInt(symObj?.bidSize ?? 0)}`} />
            <Stat label="Offer" value={`${fmtPrice(offer)} ×${fmtInt(symObj?.offerSize ?? 0)}`} />
            <Stat label="Turnover" value={fmtMoney(symObj?.value ?? 0)} />
          </div>
          <div className="mt-2 flex flex-col gap-1.5">
            <RangeBar leftLabel="T.LOW" leftVal={fmtPrice(dayLow)} rightLabel="T.HIGH" rightVal={fmtPrice(dayHigh)} pct={rangePct} />
            <RangeBar leftLabel="MID" leftVal={fmtPrice(mid)} rightLabel="NAT" rightVal={fmtPrice(last)} pct={spreadPct} />
          </div>
          <div className="mt-1.5 text-[9px] tabular-nums text-content-subtle">
            Last Qty {fmtInt(symObj?.trades ?? 0)} · 52w {fmtPrice(symObj?.weekHigh52 ?? 0)} / {fmtPrice(symObj?.weekLow52 ?? 0)}
          </div>
        </div>

        {/* ── Position — always visible (needed to size the order) ── */}
        <div className="rounded-lg border border-[rgba(0,98,255,0.15)] bg-[rgba(0,98,255,0.03)] p-2.5">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[9px] font-bold uppercase tracking-widest text-[#9cc0ff]">Position</span>
            <button
              onClick={() => notify(`Cash position loaded — ${fmtMoney(purchasePower)} available`, 'buy')}
              className="text-[10px] font-semibold text-[#9cc0ff] hover:text-white"
            >
              ↻ Load cash position
            </button>
          </div>
          <div className="grid grid-cols-3 gap-x-2 gap-y-1.5">
            <Stat label="Purchase Power" value={fmtMoney(purchasePower)} />
            <Stat label="Cash Amount" value={fmtMoney(available)} />
            <Stat label="Blocked" value={fmtMoney(0)} />
            <Stat label="Outstanding Buy" value={fmtMoney(0)} />
            <Stat label="Avail. Shares" value={fmtInt(availShares)} />
            <Stat label="Out. Sell Shares" value={fmtInt(outSellShares)} />
          </div>
        </div>

        {/* ── Advanced details — tucked behind one toggle (rarely changed) ── */}
        <div className="rounded-lg border border-[rgba(0,98,255,0.15)] bg-[rgba(0,98,255,0.03)]">
          <button onClick={() => setShowDetails((v) => !v)} className="flex w-full items-center justify-between px-2.5 py-1.5">
            <span className="text-[10px] font-bold uppercase tracking-widest text-content-muted">
              Advanced details
              {details.suspended && <span className="ml-2 rounded bg-[rgba(255,170,0,0.14)] px-1 py-px text-[9px] font-bold text-warning">Suspended</span>}
            </span>
            <svg className={`text-content-muted transition-transform ${showDetails ? 'rotate-180' : ''}`} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
          </button>
          {showDetails && (
            <div className="flex flex-col gap-2.5 border-t border-[rgba(0,98,255,0.12)] p-2.5">
              <div className="grid grid-cols-2 gap-2">
                <BuyField label="Cash Account">
                  <select value={details.cashAccount} onChange={(e) => setDetails((d) => ({ ...d, cashAccount: e.target.value }))} className={D_IN}>
                    {CASH_ACCOUNTS.map((c) => <option key={c} value={c} className="bg-surface">{c}</option>)}
                  </select>
                </BuyField>
                <BuyField label="Disc. Volume">
                  <input type="number" min={0} value={details.discVolume || ''} onChange={(e) => setDetails((d) => ({ ...d, discVolume: Math.max(0, +e.target.value) }))} placeholder="0" className={`${D_IN} text-right tabular-nums`} />
                </BuyField>
                <BuyField label="Fill Term">
                  <select value={details.fillTerm} onChange={(e) => setDetails((d) => ({ ...d, fillTerm: e.target.value }))} className={D_IN}>
                    {FILL_TERMS.map((f) => <option key={f} value={f} className="bg-surface">{f}</option>)}
                  </select>
                </BuyField>
                <BuyField label="Custodian">
                  <select value={details.custodian} onChange={(e) => setDetails((d) => ({ ...d, custodian: e.target.value }))} className={D_IN}>
                    {CUSTODIANS.map((c) => <option key={c} value={c} className="bg-surface">{c}</option>)}
                  </select>
                </BuyField>
                <BuyField label="Contract">
                  <input type="text" value={details.contract} onChange={(e) => setDetails((d) => ({ ...d, contract: e.target.value }))} placeholder="Ref…" className={D_IN} />
                </BuyField>
                <BuyField label="Order Originator">
                  <input type="text" value={details.orderOriginator} onChange={(e) => setDetails((d) => ({ ...d, orderOriginator: e.target.value }))} placeholder="Desk / advisor" className={D_IN} />
                </BuyField>
              </div>
              <BuyField label="Comments">
                <input type="text" value={details.comments} onChange={(e) => setDetails((d) => ({ ...d, comments: e.target.value }))} placeholder="Optional note" className={D_IN} />
              </BuyField>
              <label className="flex items-center gap-2 text-[11px] text-content-muted">
                <input type="checkbox" checked={details.suspended} onChange={(e) => setDetails((d) => ({ ...d, suspended: e.target.checked }))} className="h-3.5 w-3.5 accent-[#0062ff]" />
                Suspended
              </label>
              <div className="text-[9px] text-content-subtle">Expiry date &amp; Min. quantity are set in the order options above.</div>
            </div>
          )}
        </div>
      </div>
      <div className="border-t border-[rgba(0,98,255,0.25)] px-3 py-2">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[9px] font-bold uppercase tracking-widest text-content-subtle">Trade Amount</div>
            <div className="text-[15px] font-black tabular-nums text-content">{fmtMoney(total)}</div>
          </div>
          <div className="text-right">
            <div className="text-[9px] font-bold uppercase tracking-widest text-content-subtle">Available</div>
            <div className="text-[13px] font-semibold tabular-nums text-content-muted">{fmtMoney(available)}</div>
          </div>
        </div>
        <div className="mt-1 flex items-center justify-between text-[10px] tabular-nums text-content-subtle">
          <span>Fees {fmtMoney(fees)}</span>
          <span>Order Amount {fmtMoney(total + fees)}</span>
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

        {/* Simulate result / validation errors */}
        {sim && (
          <div className={`mt-2 rounded-md border px-2.5 py-2 text-[11px] ${sim.tone === 'ok' ? 'border-[rgba(0,98,255,0.4)] bg-[rgba(0,98,255,0.08)]' : 'border-[rgba(255,170,0,0.45)] bg-[rgba(255,170,0,0.1)]'}`}>
            <div className={`mb-0.5 text-[9px] font-bold uppercase tracking-wide ${sim.tone === 'ok' ? 'text-[#9cc0ff]' : 'text-warning'}`}>
              {sim.tone === 'ok' ? 'Simulation' : 'Cannot place'}
            </div>
            {sim.lines.map((l, i) => <div key={i} className="tabular-nums text-content-muted">{sim.tone === 'ok' ? '· ' : '⚠ '}{l}</div>)}
          </div>
        )}

        <button
          onClick={placeOrder}
          disabled={qty <= 0}
          className="btn-glow-blue mt-2 w-full rounded-lg py-2.5 text-[13px] font-black uppercase tracking-widest text-white transition-all hover:brightness-110 disabled:opacity-40"
          style={{ background: 'linear-gradient(135deg, #0062ff 0%, #003dcc 100%)' }}
        >
          ↑ Place Buy Order
        </button>
        <div className="mt-2 grid grid-cols-3 gap-2">
          <button onClick={simulate} className="rounded-md border border-[rgba(0,98,255,0.25)] bg-[rgba(0,98,255,0.06)] py-1.5 text-[11px] font-semibold text-[#9cc0ff] hover:bg-[rgba(0,98,255,0.12)]">Simulate</button>
          <button onClick={clearTicket} className="rounded-md border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] py-1.5 text-[11px] font-semibold text-content-muted hover:bg-[rgba(255,255,255,0.08)] hover:text-content">Clear</button>
          <button onClick={printTicket} className="rounded-md border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] py-1.5 text-[11px] font-semibold text-content-muted hover:bg-[rgba(255,255,255,0.08)] hover:text-content">Print</button>
        </div>
      </div>
    </div>
  )
}

// ─── Sell panel (RED) — from holdings, multiple line items ────────────────────
function SellPanel({ holdings, options }: { holdings: PortfolioPosition[]; options: OrderOptions }) {
  const [qty, setQty] = useState<Record<string, number>>({})
  const [limitPx, setLimitPx] = useState<Record<string, number>>({})
  const notify = useToast()
  const price = usePrices()
  const isLimit = options.orderType === 'Limit'
  const px = (h: PortfolioPosition) => price(h.symbol)?.last ?? h.evalPrice
  const sellPx = (h: PortfolioPosition) => (isLimit ? (limitPx[h.symbol] ?? px(h)) : px(h))
  const set = (sym: string, n: number, max: number) => {
    setQty((p) => ({ ...p, [sym]: Math.max(0, Math.min(n, max)) }))
  }
  const selected = holdings.filter((h) => (qty[h.symbol] ?? 0) > 0)
  const total = selected.reduce((s, h) => s + (qty[h.symbol] ?? 0) * sellPx(h), 0)
  const fees = feeFor(total)

  return (
    <div className="flex flex-1 flex-col overflow-hidden rounded-xl border-2 border-[#e0383d] bg-[rgba(224,56,61,0.05)] shadow-[0_0_0_1px_rgba(224,56,61,0.04),inset_0_1px_0_rgba(224,56,61,0.08)]">
      <div className="flex items-center justify-between px-3 py-3 text-white" style={{ background: 'linear-gradient(135deg, #e0383d 0%, #b02428 100%)' }}>
        <div className="flex items-baseline gap-2">
          <span className="text-[17px] font-black uppercase tracking-widest">Sell</span>
          <span className="text-[10px] font-medium text-white/50">↓</span>
        </div>
        <span className="text-[10px] font-medium uppercase tracking-wide text-white/60">holdings</span>
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-2.5">
        {holdings.length === 0 ? (
          <div className="py-6 text-center text-[12px] text-content-muted">No holdings to sell.</div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {holdings.map((h) => (
              <div key={h.symbol} className="flex items-center gap-2.5 rounded-lg bg-[rgba(224,56,61,0.07)] p-2 ring-1 ring-[rgba(224,56,61,0.18)] transition-colors hover:bg-[rgba(224,56,61,0.11)]">
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-bold text-content">{h.symbol}</div>
                  <div className="text-[9px] tabular-nums text-content-subtle">{fmtInt(h.available)} avail · {fmtPrice(px(h))}</div>
                </div>
                {isLimit && (
                  <input
                    type="number"
                    step="0.001"
                    value={limitPx[h.symbol] ?? Number(px(h).toFixed(3))}
                    onChange={(e) => setLimitPx((p) => ({ ...p, [h.symbol]: Math.max(0, +e.target.value) }))}
                    title="Limit price"
                    className="h-7 w-[68px] rounded border border-[rgba(224,56,61,0.22)] bg-[#0b0e15] px-2 text-right text-[12px] tabular-nums text-[#ff9ea2] outline-none focus:border-down"
                  />
                )}
                <input
                  type="number"
                  value={qty[h.symbol] ?? 0}
                  onChange={(e) => set(h.symbol, +e.target.value, h.available)}
                  title="Quantity"
                  className="h-7 w-20 rounded border border-[rgba(224,56,61,0.22)] bg-[#0b0e15] px-2 text-right text-[12px] text-content outline-none focus:border-down"
                />
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="border-t border-[rgba(224,56,61,0.25)] px-3 py-2">
        <div className="mb-2 flex items-end justify-between">
          <div>
            <div className="text-[9px] font-bold uppercase tracking-widest text-content-subtle">Est. total</div>
            <div className="text-[15px] font-black tabular-nums text-content">{fmtMoney(total)}</div>
          </div>
          <div className="text-right text-[10px] tabular-nums text-content-subtle">
            <div>Est. commission {fmtMoney(fees)}</div>
            <div>Net {fmtMoney(Math.max(0, total - fees))}</div>
          </div>
        </div>
        <button
          disabled={selected.length === 0}
          onClick={() => notify(`Sell order placed — ${selected.length} instrument${selected.length === 1 ? '' : 's'} · ${optionsSuffix(options)}`, 'sell')}
          className={`w-full rounded-lg py-2.5 text-[13px] font-black uppercase tracking-widest text-white transition-all hover:brightness-110 disabled:opacity-40 ${selected.length > 0 ? 'btn-glow-red' : ''}`}
          style={{ background: 'linear-gradient(135deg, #e0383d 0%, #b02428 100%)' }}
        >
          ↓ Place {selected.length} Sell{selected.length === 1 ? '' : 's'}
        </button>
      </div>
    </div>
  )
}

// ─── One customer widget (portfolio + contact + buy/sell) ────────────────────
function CustomerPanel({ customer, watchSymbol, onClose, vip, onToggleVip }: { customer: DeskCustomer; watchSymbol: string; onClose: () => void; vip: boolean; onToggleVip: () => void }) {
  // Prefill Buy with the stock the customer trades most — approximated by their
  // Prefer the highest-priority blue-chip the customer is associated with.
  // Market Watch selection overrides this entirely.
  const suggestions = bluechipFirst(customer.usualStocks)
  const buyDefault = watchSymbol || suggestions[0] || FULL_MARKET[0].symbolShortName

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

  // Order-ticket options shared by the Buy + Sell panels (portfolio is required).
  const [orderOptions, setOrderOptions] = useState<OrderOptions>({ portfolio: PORTFOLIOS[0], orderType: 'Market', goodTill: 'Day', condition: 'None', expiry: '', minFillQty: 0 })
  const setOpt = <K extends keyof OrderOptions>(k: K, v: OrderOptions[K]) => setOrderOptions((o) => ({ ...o, [k]: v }))
  // Per-client flow: single order (one stock at a time) or basket (many, staged).
  const [orderMode, setOrderMode] = useState<'single' | 'basket'>('single')
  const moveFromCasa = (amt: number) => {
    const m = Math.max(0, Math.min(Math.round(amt), casaBal))
    if (!m) return
    setCash((c) => c + m)
    setCasaBal((b) => b - m)
  }

  return (
    <section className="shrink-0 overflow-hidden rounded-xl border border-[rgba(0,98,255,0.22)] bg-[#07090e] shadow-[0_0_0_1px_rgba(0,98,255,0.04),0_8px_40px_rgba(0,0,0,0.5)]">
      {/* Contact / identity header */}
      <header className="border-b border-[rgba(0,98,255,0.15)] bg-gradient-to-r from-[#090f1e] via-[#0b0e18] to-[#0a0d15]">
        <div className="flex items-center gap-3 px-4 py-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[rgba(0,98,255,0.3)] to-[rgba(0,98,255,0.1)] text-[16px] font-black text-[#7ab0ff] ring-1 ring-[rgba(0,98,255,0.4)] shadow-[0_0_12px_rgba(0,98,255,0.2)]">
            {customer.name[0]}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[16px] font-bold text-content">{customer.name}</span>
              <span className="rounded-md bg-[rgba(0,98,255,0.2)] px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-[#7ab0ff] ring-1 ring-[rgba(0,98,255,0.35)]">{customer.sif}</span>
              <button
                onClick={onToggleVip}
                title={vip ? 'VIP client — click to remove VIP status' : 'Mark this client as VIP'}
                className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase transition-colors ${
                  vip
                    ? 'bg-[rgba(240,185,11,0.18)] text-[#f0c33b] ring-1 ring-[rgba(240,185,11,0.3)]'
                    : 'border border-border-dark text-content-subtle hover:bg-[rgba(255,255,255,0.06)] hover:text-content'
                }`}
              >
                {vip ? '★ VIP' : '☆ VIP'}
              </button>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-content-muted">
              <span>📞 {customer.phone}</span>
              <span className="flex items-center gap-1">
                ✉ {customer.email}
                {customer.emailVerified
                  ? <span className="rounded bg-[rgba(47,208,122,0.16)] px-1 py-px text-[9px] font-bold text-up">✓ verified</span>
                  : <span className="rounded bg-[rgba(255,107,114,0.16)] px-1 py-px text-[9px] font-bold text-down">✗</span>}
              </span>
            </div>
          </div>
          <button onClick={onClose} title="Close this customer" aria-label="Close this customer" className="shrink-0 rounded-md p-1.5 text-content-muted hover:bg-[rgba(255,255,255,0.06)] hover:text-content">✕</button>
        </div>
      </header>

      {/* Available balance — two-stat bar */}
      <div className="flex items-center justify-between border-b border-[rgba(0,98,255,0.12)] bg-gradient-to-r from-[rgba(0,40,120,0.3)] via-[rgba(0,20,80,0.2)] to-transparent px-4 py-3">
        <div>
          <div className="text-[9px] font-bold uppercase tracking-[0.15em] text-[#5b9bff] opacity-80">Available balance</div>
          <div className="mt-0.5 text-[28px] font-black leading-none tabular-nums text-white" style={{ textShadow: '0 0 24px rgba(0,98,255,0.35)' }}>{fmtMoney(cash)}</div>
        </div>
        <div className="text-right">
          <div className="text-[9px] font-bold uppercase tracking-[0.15em] text-content-subtle">CASA reserve</div>
          <div className="mt-0.5 text-[16px] font-semibold tabular-nums text-content-muted">{fmtMoney(casaBal)}</div>
        </div>
      </div>

      {/* Step-2 briefing merged in: risk / KYC / day P&L / positions / tenure */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[rgba(0,98,255,0.1)] bg-[rgba(0,0,0,0.2)] px-4 py-2">
        <span className="inline-flex items-center gap-1 rounded-md bg-[rgba(0,98,255,0.12)] px-2 py-0.5 text-[10px] font-bold text-[#7ab0ff] ring-1 ring-[rgba(0,98,255,0.2)]">
          <span className="font-normal opacity-70">Risk</span> {customer.risk}
        </span>
        <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold ring-1 ${customer.kyc === 'Valid' ? 'bg-[rgba(47,208,122,0.1)] text-up ring-[rgba(47,208,122,0.22)]' : 'bg-[rgba(255,170,0,0.1)] text-warning ring-[rgba(255,170,0,0.22)]'}`}>
          {customer.kyc === 'Valid' ? '✓' : '!'} KYC {customer.kyc}
        </span>
        <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold tabular-nums ring-1 ${customer.dayPnlPct >= 0 ? 'bg-[rgba(47,208,122,0.1)] text-up ring-[rgba(47,208,122,0.22)]' : 'bg-[rgba(255,107,114,0.1)] text-down ring-[rgba(255,107,114,0.22)]'}`}>
          Day P/L {customer.dayPnlPct >= 0 ? '+' : ''}{customer.dayPnlPct.toFixed(1)}%
        </span>
        <span className="inline-flex items-center gap-1 rounded-md bg-[rgba(255,255,255,0.05)] px-2 py-0.5 text-[10px] text-content-muted ring-1 ring-[rgba(255,255,255,0.07)]">
          {customer.positions} positions
        </span>
        <span className="inline-flex items-center gap-1 rounded-md bg-[rgba(255,255,255,0.04)] px-2 py-0.5 text-[10px] text-content-subtle ring-1 ring-[rgba(255,255,255,0.06)]">
          Since {customer.since}
        </span>
      </div>
      {customer.flag && (
        <div className="flex items-start gap-2 border-b border-[rgba(255,170,0,0.3)] bg-[rgba(255,170,0,0.1)] px-3 py-1.5 text-[11px] text-warning">
          <span>⚠</span><span>{customer.flag}</span>
        </div>
      )}

      <div className="flex flex-col gap-3 p-3">
        {/* Portfolio / positions (full width, on top) */}
        <div className="overflow-hidden rounded-xl border border-[rgba(0,98,255,0.15)] bg-[#0a0c12] shadow-[0_2px_20px_rgba(0,0,0,0.3)]">
          <div className="flex items-center justify-between border-b border-[rgba(0,98,255,0.12)] bg-gradient-to-r from-[#0d1220] to-[#0c0f18] px-3 py-2">
            <span className="text-[11px] font-bold uppercase tracking-widest text-[#5b9bff]">Portfolio</span>
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
              {liveHoldings.map((h, idx) => {
                const barW = Math.min(Math.abs(h.gainLoss / (h.cost || 1)) * 300, 100)
                return (
                  <tr key={h.symbol} className={`border-t border-[rgba(255,255,255,0.04)] ${idx % 2 === 0 ? '' : 'bg-[rgba(255,255,255,0.018)]'}`}>
                    <td className="px-3 py-1.5 text-left">
                      <div className="font-medium text-content">{h.symbol}</div>
                      <div className="mt-0.5 h-0.5 w-full max-w-[36px] overflow-hidden rounded-full bg-[rgba(255,255,255,0.07)]">
                        <div className={`h-full ${h.gainLoss >= 0 ? 'bg-up' : 'bg-down'}`} style={{ width: `${barW}%` }} />
                      </div>
                    </td>
                    <td className="px-3 py-1.5 text-right text-content-muted">{fmtInt(h.quantity)}</td>
                    <td className="px-3 py-1.5 text-right text-content-muted">{fmtPrice(h.avgCost)}</td>
                    <td className={`px-3 py-1.5 text-right font-semibold ${h.gainLoss >= 0 ? 'text-up' : 'text-down'}`}>{h.gainLoss >= 0 ? '+' : ''}{fmtInt(h.gainLoss)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {/* Recent activity (from step 2) */}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-[rgba(0,98,255,0.1)] bg-[#080a0e] px-3 py-2">
            <span className="text-[9px] font-bold uppercase tracking-widest text-content-subtle">Last trades</span>
            <span className="flex items-center gap-1 rounded-md bg-[rgba(47,208,122,0.09)] px-2 py-0.5 text-[10px] font-medium text-up ring-1 ring-[rgba(47,208,122,0.18)]">
              ↑ {customer.lastBuy.symbol} <span className="tabular-nums">{fmtInt(customer.lastBuy.qty)} @ {fmtPrice(customer.lastBuy.price)}</span>
            </span>
            <span className="flex items-center gap-1 rounded-md bg-[rgba(255,107,114,0.09)] px-2 py-0.5 text-[10px] font-medium text-down ring-1 ring-[rgba(255,107,114,0.18)]">
              ↓ {customer.lastSell.symbol} <span className="tabular-nums">{fmtInt(customer.lastSell.qty)} @ {fmtPrice(customer.lastSell.price)}</span>
            </span>
          </div>
        </div>

        {/* Order flow — single order (default) or basket, scoped to this client */}
        <div className="flex items-center gap-2">
          <div className="inline-flex overflow-hidden rounded-md border border-[rgba(0,98,255,0.25)]">
            {(['single', 'basket'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setOrderMode(m)}
                className={`px-3.5 py-1.5 text-[12px] font-semibold transition-colors ${orderMode === m ? 'bg-[#0062ff] text-white' : 'bg-[#0b0e15] text-[#9cc0ff] hover:bg-[rgba(0,98,255,0.12)]'}`}
              >
                {m === 'single' ? 'Single Order' : 'Basket Order'}
              </button>
            ))}
          </div>
          <span className="text-[11px] text-content-subtle">
            {orderMode === 'single' ? 'One stock at a time' : 'Stage many orders — executed one by one'}
          </span>
        </div>

        {orderMode === 'basket' ? (
          /* Basket, scoped to this open client (no separate client selector) */
          <BasketOrder client={`${customer.sif} — ${customer.name}`} />
        ) : (
        <>
        {/* Order options — apply to both the Buy and Sell tickets below */}
        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 rounded-xl border border-[rgba(0,98,255,0.15)] bg-[#0a0c12] px-3 py-2.5 shadow-[0_2px_20px_rgba(0,0,0,0.3)]">
          <label className="flex min-w-0 flex-col gap-1">
            <span className="text-[9px] font-bold uppercase tracking-widest text-[#5b9bff]">Portfolio<span className="ml-0.5 text-down">*</span></span>
            <select
              value={orderOptions.portfolio}
              onChange={(e) => setOpt('portfolio', e.target.value)}
              className="h-8 rounded border border-[rgba(0,98,255,0.22)] bg-[#0b0e15] px-2 text-[12px] text-content outline-none focus:border-[#5b9bff]"
            >
              {PORTFOLIOS.map((p) => <option key={p} value={p} className="bg-surface">{p}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[9px] font-bold uppercase tracking-widest text-content-subtle">Order type</span>
            <div className="inline-flex overflow-hidden rounded border border-[rgba(0,98,255,0.22)]">
              {ORDER_TYPES.map((t) => (
                <button
                  key={t}
                  onClick={() => setOpt('orderType', t)}
                  className={`px-2.5 py-1.5 text-[11px] font-semibold transition-colors ${orderOptions.orderType === t ? 'bg-[#0062ff] text-white' : 'bg-[#0b0e15] text-content-muted hover:text-content'}`}
                >
                  {t}
                </button>
              ))}
            </div>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[9px] font-bold uppercase tracking-widest text-content-subtle">Good till</span>
            <div className="inline-flex overflow-hidden rounded border border-[rgba(0,98,255,0.22)]">
              {GOOD_TILL.map((g) => (
                <button
                  key={g}
                  onClick={() => setOpt('goodTill', g)}
                  className={`px-2.5 py-1.5 text-[11px] font-semibold transition-colors ${orderOptions.goodTill === g ? 'bg-[#0062ff] text-white' : 'bg-[#0b0e15] text-content-muted hover:text-content'}`}
                >
                  {g}
                </button>
              ))}
            </div>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[9px] font-bold uppercase tracking-widest text-content-subtle">Condition</span>
            <div className="inline-flex overflow-hidden rounded border border-[rgba(0,98,255,0.22)]">
              {CONDITIONS.map((c) => (
                <button
                  key={c}
                  onClick={() => setOpt('condition', c)}
                  title={c}
                  className={`px-2.5 py-1.5 text-[11px] font-semibold transition-colors ${orderOptions.condition === c ? 'bg-[#0062ff] text-white' : 'bg-[#0b0e15] text-content-muted hover:text-content'}`}
                >
                  {CONDITION_LABEL[c]}
                </button>
              ))}
            </div>
          </label>
          {/* Good-Till-Date needs an expiry date */}
          {orderOptions.goodTill === 'GTD' && (
            <label className="flex flex-col gap-1">
              <span className="text-[9px] font-bold uppercase tracking-widest text-[#5b9bff]">Expiry<span className="ml-0.5 text-down">*</span></span>
              <input
                type="date"
                value={orderOptions.expiry ?? ''}
                onChange={(e) => setOpt('expiry', e.target.value)}
                className="h-8 rounded border border-[rgba(0,98,255,0.22)] bg-[#0b0e15] px-2 text-[12px] text-content outline-none focus:border-[#5b9bff]"
              />
            </label>
          )}
          {/* Minimum-fill needs a minimum quantity */}
          {orderOptions.condition === 'Minimum Fill' && (
            <label className="flex flex-col gap-1">
              <span className="text-[9px] font-bold uppercase tracking-widest text-[#5b9bff]">Min. qty<span className="ml-0.5 text-down">*</span></span>
              <input
                type="number"
                min={0}
                value={orderOptions.minFillQty || ''}
                onChange={(e) => setOpt('minFillQty', Math.max(0, +e.target.value))}
                placeholder="0"
                className="h-8 w-24 rounded border border-[rgba(0,98,255,0.22)] bg-[#0b0e15] px-2 text-right text-[12px] tabular-nums text-content outline-none focus:border-[#5b9bff]"
              />
            </label>
          )}
        </div>

        {/* Buy + Sell — below the portfolio, side by side, always open */}
        <div className="flex min-h-[260px] gap-3">
          <BuyPanel defaultSymbol={buyDefault} available={cash} casaAccount={customer.casa} casaBalance={casaBal} onMoveFromCasa={moveFromCasa} options={orderOptions} holdings={liveHoldings} client={`${customer.sif} — ${customer.name}`} />
          <SellPanel holdings={liveHoldings} options={orderOptions} />
        </div>
        </>
        )}
      </div>
    </section>
  )
}

// ─── Right: stacked customers + SIF entry ────────────────────────────────────
// Session snapshot (shared across the app's windows) so "Dock to main" and
// reopening restore the open client tabs instead of refreshing to empty.
const DESK_SESSION_KEY = 'order-placement-session-v1'
interface DeskSnapshot { openSifs: string[]; activeSif: string; pinned: string[]; vipMap: Record<string, boolean> }
function loadDeskSnapshot(): DeskSnapshot | null {
  try { const raw = localStorage.getItem(DESK_SESSION_KEY); return raw ? (JSON.parse(raw) as DeskSnapshot) : null } catch { return null }
}

function CustomerArea({ watchSymbol, compact, snapshotRef }: { watchSymbol: string; compact?: boolean; snapshotRef?: { current: DeskSnapshot | null } }) {
  // Only the docked (compact) instance restores a session; fresh opens start empty.
  const snap = useMemo(() => (compact ? loadDeskSnapshot() : null), [compact])
  const [open, setOpen] = useState<DeskCustomer[]>(() => (snap?.openSifs ?? []).map((sif) => DESK_CUSTOMERS.find((c) => c.sif === sif)).filter((c): c is DeskCustomer => Boolean(c)))
  const [activeSif, setActiveSif] = useState(() => snap?.activeSif ?? '') // which open client's tab is shown
  const [vipMap, setVipMap] = useState<Record<string, boolean>>(() => snap?.vipMap ?? {}) // manual VIP overrides, survive tab switches
  const [dragSif, setDragSif] = useState<string | null>(null) // tab being dragged to reorder
  const dragSifRef = useRef<string | null>(null) // synchronous mirror of dragSif for the pointer handlers
  const tabDownRef = useRef<{ sif: string; x: number } | null>(null) // pointer-down bookkeeping
  const justDraggedRef = useRef(false) // suppress the click that follows a drag
  const [pinned, setPinned] = useState<Set<string>>(() => new Set(snap?.pinned ?? [])) // pinned tabs — kept, close-protected
  const [cif, setCif] = useState('')
  const [error, setError] = useState('')
  const [pickerOpen, setPickerOpen] = useState(false)
  // Keep the parent's snapshot ref current so "Dock to main" can hand it over.
  if (snapshotRef) snapshotRef.current = { openSifs: open.map((c) => c.sif), activeSif, pinned: [...pinned], vipMap }
  const isVip = (c: DeskCustomer) => vipMap[c.sif] ?? c.vip
  const toggleVip = (c: DeskCustomer) => setVipMap((m) => ({ ...m, [c.sif]: !(m[c.sif] ?? c.vip) }))

  // Browser-tab drag-to-reorder: live-swap the dragged tab over the hovered one.
  const reorder = (targetSif: string) => {
    const dragging = dragSifRef.current
    if (dragging === null || dragging === targetSif) return
    setOpen((prev) => {
      const from = prev.findIndex((c) => c.sif === dragging)
      const to = prev.findIndex((c) => c.sif === targetSif)
      if (from < 0 || to < 0) return prev
      const next = prev.slice()
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved)
      return next
    })
  }

  // Autocomplete: match the typed text against CIF number, name or SIF.
  const matches = useMemo(() => {
    const q = cif.trim().toLowerCase()
    const d = cif.replace(/\D/g, '')
    if (!q) return DESK_CUSTOMERS
    return DESK_CUSTOMERS.filter(
      (c) => (d !== '' && c.cif.includes(d)) || c.name.toLowerCase().includes(q) || c.sif.toLowerCase().includes(q),
    )
  }, [cif])

  const openCustomer = (c: DeskCustomer, replace: boolean) => {
    setError('')
    setCif('')
    setPickerOpen(false)
    setOpen((prev) => (replace ? [c] : prev.some((p) => p.sif === c.sif) ? prev : [c, ...prev]))
    setActiveSif(c.sif) // focus the newly opened client's tab
  }
  const openByInput = (replace: boolean) => {
    const c = findCustomer(cif)
    if (!c) { setError(`No customer found for “${cif.trim()}”`); return }
    openCustomer(c, replace)
  }
  // When the search matches several clients, open them all (stacked).
  const addAllMatches = () => {
    setError('')
    setCif('')
    setPickerOpen(false)
    setOpen((prev) => {
      const seen = new Set(prev.map((p) => p.sif))
      return [...matches.filter((c) => !seen.has(c.sif)), ...prev]
    })
    if (matches[0]) setActiveSif(matches[0].sif)
  }
  // Close a tab; if it was the active one, activate the neighbour to its right
  // (or left if it was last) — same as a browser closing a tab.
  const close = (s: string) => {
    const idx = open.findIndex((c) => c.sif === s)
    const next = open.filter((c) => c.sif !== s)
    setOpen(next)
    if (s === activeSif) setActiveSif((next[idx] ?? next[idx - 1])?.sif ?? '')
  }

  const isPinned = (s: string) => pinned.has(s)
  const togglePin = (s: string) => setPinned((prev) => {
    const n = new Set(prev)
    n.has(s) ? n.delete(s) : n.add(s)
    return n
  })
  // Pinned tabs cluster at the front (like a browser), preserving relative order.
  const orderedTabs = useMemo(() => {
    const pin = open.filter((c) => pinned.has(c.sif))
    const rest = open.filter((c) => !pinned.has(c.sif))
    return [...pin, ...rest]
  }, [open, pinned])

  // The client whose tab is shown (falls back to the first open one).
  const activeCustomer = open.find((c) => c.sif === activeSif) ?? orderedTabs[0]

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      {/* CIF entry — type or pick a client; add several to stack their desks. */}
      <div className="shrink-0 rounded-xl border border-[rgba(0,98,255,0.18)] bg-[#07090e] p-3 shadow-[0_0_0_1px_rgba(0,98,255,0.04)]">
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-bold text-[#5b9bff]">CIF</span>
          <div className="relative min-w-0 flex-1">
            <input
              value={cif}
              onChange={(e) => { setCif(e.target.value); setPickerOpen(true) }}
              onFocus={() => setPickerOpen(true)}
              onBlur={() => setTimeout(() => setPickerOpen(false), 150)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') openByInput(false)
                else if (e.key === 'Escape') setPickerOpen(false)
              }}
              placeholder="Type or select a CIF / client…"
              className="h-9 w-full rounded-md border border-[rgba(0,98,255,0.2)] bg-[#0b0e15] px-3 text-[13px] text-content outline-none focus:border-[#5b9bff]"
            />
            {pickerOpen && matches.length > 0 && (
              <ul className="absolute left-0 top-full z-30 mt-1 max-h-64 w-full min-w-[300px] overflow-auto rounded-lg border border-border-dark bg-surface shadow-xl">
                {matches.map((c) => (
                  <li key={c.sif}>
                    <button
                      onMouseDown={(e) => { e.preventDefault(); openCustomer(c, false) }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] hover:bg-[rgba(0,98,255,0.12)]"
                    >
                      <span className="rounded bg-[rgba(0,98,255,0.2)] px-1.5 py-0.5 text-[11px] font-bold tabular-nums text-[#9cc0ff]">{c.cif}</span>
                      <span className="flex-1 truncate font-medium text-content">{c.name}</span>
                      {c.vip && <span className="text-[10px] font-bold text-[#f0c33b]">★ VIP</span>}
                      <span className="text-[11px] text-content-muted">{c.sif}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {cif.trim() !== '' && matches.length > 1 && (
            <button onClick={addAllMatches} className="h-9 shrink-0 rounded-md px-3 text-[12px] font-semibold text-white" style={{ background: BLUE }} title={`Open all ${matches.length} matching clients`}>Add all ({matches.length})</button>
          )}
        </div>
        {/* Quick-open is limited to VIP clients to keep it short; everyone else
            is reachable via the search box above. */}
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-medium text-[#f0c33b]">★ VIP:</span>
          {DESK_CUSTOMERS.filter((c) => isVip(c)).map((c) => (
            <button
              key={c.sif}
              onClick={() => openCustomer(c, false)}
              className="rounded border border-[rgba(240,185,11,0.35)] bg-[rgba(240,185,11,0.08)] px-2 py-0.5 text-[11px] text-content-muted hover:bg-[rgba(240,185,11,0.16)] hover:text-content"
              title={`Open ${c.name}`}
            >
              {c.name} · CIF {c.cif}
            </button>
          ))}
          {!DESK_CUSTOMERS.some((c) => isVip(c)) && <span className="text-[11px] text-content-subtle">none — search above to open a client</span>}
          <span className="ml-auto text-[10px] text-content-subtle">Add multiple to stack their desks</span>
        </div>
        {error && <div className="mt-2 text-[11px] text-down">{error}</div>}
      </div>

      {/* Open clients as tabs — switch between them instead of a tall stack. */}
      <div className="flex min-h-0 flex-1 flex-col">
        {open.length === 0 || !activeCustomer ? (
          <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-[rgba(0,98,255,0.15)] bg-[rgba(0,98,255,0.02)] text-[13px] text-[#5b9bff] opacity-50">
            Enter a CIF to open a customer.
          </div>
        ) : (
          <>
            {/* Tab strip */}
            <div className="flex shrink-0 items-end gap-1 overflow-x-auto border-b border-border-dark">
              {orderedTabs.map((c) => {
                const active = c.sif === activeCustomer.sif
                return (
                  <div
                    key={c.sif}
                    role="tab"
                    aria-selected={active}
                    data-sif={c.sif}
                    onClick={() => { if (justDraggedRef.current) { justDraggedRef.current = false; return } setActiveSif(c.sif) }}
                    onAuxClick={(e) => { if (e.button === 1 && !isPinned(c.sif)) { e.preventDefault(); close(c.sif) } }}
                    // Pointer-based reorder (reliable in macOS WebView, unlike HTML5 drag).
                    onPointerDown={(e) => { if (e.button === 0) tabDownRef.current = { sif: c.sif, x: e.clientX } }}
                    onPointerMove={(e) => {
                      const d = tabDownRef.current
                      if (!d) return
                      if (dragSifRef.current === null) {
                        if (Math.abs(e.clientX - d.x) < 5) return // small threshold so a click doesn't start a drag
                        dragSifRef.current = d.sif
                        setDragSif(d.sif)
                        e.currentTarget.setPointerCapture(e.pointerId)
                      }
                      const over = (document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null)?.closest('[data-sif]')?.getAttribute('data-sif')
                      if (over) reorder(over)
                    }}
                    onPointerUp={(e) => {
                      if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId)
                      if (dragSifRef.current !== null) justDraggedRef.current = true
                      dragSifRef.current = null
                      setDragSif(null)
                      tabDownRef.current = null
                    }}
                    onPointerCancel={() => { dragSifRef.current = null; setDragSif(null); tabDownRef.current = null }}
                    title={`${c.name} · CIF ${c.cif}`}
                    className={`group flex shrink-0 cursor-pointer select-none items-center gap-1.5 rounded-t-md border border-b-0 px-2.5 py-1.5 text-[12px] transition-opacity ${
                      dragSif === c.sif ? 'opacity-50' : ''
                    } ${
                      active
                        ? 'border-[rgba(0,98,255,0.3)] bg-[rgba(0,98,255,0.14)] text-content shadow-[inset_0_2px_0_rgba(0,98,255,0.5)]'
                        : 'border-transparent text-content-muted hover:bg-[rgba(255,255,255,0.05)]'
                    }`}
                  >
                    {isPinned(c.sif) && (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" className="shrink-0 text-action" aria-hidden><path d="M9 3h6l-1 6 3 3v2H7v-2l3-3-1-6z" /></svg>
                    )}
                    <span className="rounded bg-[rgba(0,98,255,0.18)] px-1 py-0.5 text-[10px] font-bold tabular-nums text-[#9cc0ff]">{c.cif}</span>
                    <span className="max-w-[140px] truncate font-medium">{c.name}</span>
                    {isVip(c) && <span className="text-[10px] text-[#f0c33b]">★</span>}
                    {isPinned(c.sif) ? (
                      <button
                        onClick={(e) => { e.stopPropagation(); togglePin(c.sif) }}
                        className="rounded p-0.5 text-action hover:bg-[rgba(255,255,255,0.1)]"
                        aria-label={`Unpin ${c.name}`}
                        title="Pinned — click to unpin"
                      >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M9 3h6l-1 6 3 3v2h-4v6l-1 2-1-2v-6H7v-2l3-3-1-6z" /></svg>
                      </button>
                    ) : (
                      <span className="flex items-center">
                        <button
                          onClick={(e) => { e.stopPropagation(); togglePin(c.sif) }}
                          className="rounded p-0.5 text-content-muted opacity-0 transition-opacity hover:bg-[rgba(255,255,255,0.1)] hover:text-content group-hover:opacity-100"
                          aria-label={`Pin ${c.name}`}
                          title="Pin tab"
                        >
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 3h6l-1 6 3 3v2H7v-2l3-3-1-6z" /><path d="M12 16v5" /></svg>
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); close(c.sif) }}
                          className="rounded p-0.5 text-content-muted hover:bg-[rgba(255,255,255,0.1)] hover:text-content"
                          aria-label={`Close ${c.name}`}
                          title="Close"
                        >
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 6l12 12M18 6L6 18" /></svg>
                        </button>
                      </span>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Active client */}
            <div className="min-h-0 flex-1 overflow-y-auto pt-3">
              <CustomerPanel
                key={activeCustomer.sif}
                customer={activeCustomer}
                watchSymbol={watchSymbol}
                onClose={() => close(activeCustomer.sif)}
                vip={isVip(activeCustomer)}
                onToggleVip={() => toggleVip(activeCustomer)}
              />
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Order Placement desk (split screen) ─────────────────────────────────────
export default function BrokerDesk({ compact = false, onDock }: { compact?: boolean; onDock?: () => void }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const idRef = useRef(0)
  const notify = useCallback((msg: string, tone: ToastTone) => {
    const id = ++idRef.current
    setToasts((t) => [...t, { id, msg, tone }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800)
  }, [])
  // Save the open-tabs snapshot only when docking, so the docked copy restores it.
  const snapshotRef = useRef<DeskSnapshot | null>(null)
  const handleDock = () => {
    try { if (snapshotRef.current) localStorage.setItem(DESK_SESSION_KEY, JSON.stringify(snapshotRef.current)) } catch { /* ignore */ }
    onDock?.()
  }

  return (
    <ToastCtx.Provider value={notify}>
      <div className="flex h-full min-h-0 flex-col bg-[#07090e]">
        {/* Toolbar */}
        <div className="flex h-10 shrink-0 items-center gap-3 border-b border-[rgba(0,98,255,0.2)] bg-gradient-to-r from-[#0b1220] via-[#0d1018] to-[#0f1018] px-3">
          <div className="flex shrink-0 items-center gap-2">
            <span className="h-4 w-[3px] rounded-full bg-[#0062ff] shadow-[0_0_6px_rgba(0,98,255,0.6)]" />
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-[#5b9bff]">Order Placement</span>
          </div>
          {onDock && (
            <button
              onClick={handleDock}
              title="Bring this into the main window"
              className="ml-auto inline-flex items-center gap-1.5 rounded-md border border-[rgba(0,98,255,0.2)] bg-[rgba(0,98,255,0.06)] px-2.5 py-1 text-[11px] font-medium text-[#9cc0ff] hover:bg-[rgba(0,98,255,0.12)]"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 10l-5 5 5 5" /><path d="M4 15h11a5 5 0 0 0 5-5V4" /></svg>
              Dock to main
            </button>
          )}
        </div>
        {/* Client area takes the full width — the CIF search + the searchable
            symbol picker in the ticket replace the old Market Watch panel. */}
        <div className="flex min-h-0 flex-1 gap-3 p-3">
          <div className="min-h-0 min-w-0 flex-1">
            <CustomerArea watchSymbol="" compact={compact} snapshotRef={snapshotRef} />
          </div>
        </div>
      </div>
      <ToastHost toasts={toasts} />
    </ToastCtx.Provider>
  )
}
