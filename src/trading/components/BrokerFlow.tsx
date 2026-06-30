import { useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import { Panel, Button, Badge, Select, SegmentedTabs, PopOutButton } from './ui'
import { FULL_MARKET, fmtPrice } from '../data'
import { useLiveData } from '../liveData'

/**
 * Broker flow — placing a trade for a client.
 *
 * A real, working step-by-step workflow (not a diagram) that a broker walks
 * through to place a trade on a client's behalf: verify the caller, look up the
 * client, capture intent, quote a price, confirm, check funds (with the
 * short-on-cash branch), place the order, and hand off to the system. Reuses the
 * app's fields, prices (live DFM where available), and design tokens.
 */

type Side = 'Buy' | 'Sell'
type Channel = 'Phone' | 'Email'
type Stage =
  | 'contact' | 'lookup' | 'intent'
  | 'movefunds' | 'place' | 'system' | 'stopped'

interface Trade { side: 'Buy' | 'Sell'; symbol: string; qty: number; price: number; date: string }
interface Holding { symbol: string; qty: number; value: number; plPct: number }
interface Client {
  id: string; name: string; phone: string; email: string
  cash: number // investment-account cash available to trade
  casa: string // linked CASA (current/savings) account — backup funding source
  casaBalance: number // money sitting in the CASA account
  holdingsValue: number; positions: number
  since: number; risk: string; status: string
  kyc: string; dayPnlPct: number; workingOrders: number; flag?: string
  lastBuy: Trade; lastSell: Trade; holdings: Holding[]
}

// The FAB client database (mock). The broker verifies a caller by checking
// their phone/email against these records — Mahlya is deliberately cash-light
// so the short-on-cash branch is easy to demo.
const CLIENTS: Client[] = [
  {
    id: '4447', name: 'FQA First Last', phone: '+971 50 123 4567', email: 'fqa@firstlast.ae', casa: '1011 4447 8801', casaBalance: 1_500_000,
    cash: 250_000, holdingsValue: 1_820_000, positions: 6, since: 2018, risk: 'Balanced', status: 'Active',
    kyc: 'Valid', dayPnlPct: 0.8, workingOrders: 1,
    lastBuy: { side: 'Buy', symbol: 'EMAAR', qty: 40_000, price: 8.12, date: '18 Jun 2026' },
    lastSell: { side: 'Sell', symbol: 'DIB', qty: 15_000, price: 7.04, date: '11 Jun 2026' },
    holdings: [
      { symbol: 'EMAAR', qty: 120_000, value: 1_000_800, plPct: 21.4 },
      { symbol: 'DIB', qty: 60_000, value: 447_000, plPct: -3.1 },
      { symbol: 'SALIK', qty: 80_000, value: 372_200, plPct: 8.7 },
    ],
  },
  {
    id: '5521', name: 'Al Futtaim Trading', phone: '+971 50 555 2211', email: 'desk@alfuttaim.ae', casa: '1011 5521 3307', casaBalance: 6_000_000,
    cash: 1_200_000, holdingsValue: 8_640_000, positions: 14, since: 2012, risk: 'Aggressive', status: 'Active',
    kyc: 'Valid', dayPnlPct: 1.4, workingOrders: 3,
    lastBuy: { side: 'Buy', symbol: 'EMIRATESNBD', qty: 90_000, price: 28.9, date: '24 Jun 2026' },
    lastSell: { side: 'Sell', symbol: 'DAMAC', qty: 50_000, price: 1.52, date: '20 Jun 2026' },
    holdings: [
      { symbol: 'EMIRATESNBD', qty: 200_000, value: 5_912_000, plPct: 12.6 },
      { symbol: 'EMAAR', qty: 180_000, value: 1_501_200, plPct: 19.0 },
      { symbol: 'TABREED', qty: 120_000, value: 439_200, plPct: 4.2 },
    ],
  },
  {
    id: '6610', name: 'Mahlya Holdings', phone: '+971 52 661 0099', email: 'ops@mahlya.ae', casa: '1011 6610 0902', casaBalance: 900_000,
    cash: 85_000, holdingsValue: 540_000, positions: 4, since: 2021, risk: 'Conservative', status: 'Active',
    kyc: 'Valid', dayPnlPct: -0.6, workingOrders: 0, flag: 'Cash account, no margin · 65% concentration in SALIK',
    lastBuy: { side: 'Buy', symbol: 'SALIK', qty: 20_000, price: 5.6, date: '09 Jun 2026' },
    lastSell: { side: 'Sell', symbol: 'PARKIN', qty: 8_000, price: 6.15, date: '02 Jun 2026' },
    holdings: [
      { symbol: 'SALIK', qty: 60_000, value: 352_800, plPct: 5.0 },
      { symbol: 'PARKIN', qty: 30_000, value: 186_000, plPct: -1.8 },
    ],
  },
  {
    id: '7782', name: 'ADNOC Treasury', phone: '+971 2 778 2000', email: 'treasury@adnoc.ae', casa: '1011 7782 4410', casaBalance: 20_000_000,
    cash: 5_000_000, holdingsValue: 22_300_000, positions: 21, since: 2009, risk: 'Institutional', status: 'Active',
    kyc: 'Valid', dayPnlPct: 0.5, workingOrders: 5,
    lastBuy: { side: 'Buy', symbol: 'EMAAR', qty: 500_000, price: 8.05, date: '26 Jun 2026' },
    lastSell: { side: 'Sell', symbol: 'GFH', qty: 300_000, price: 3.38, date: '23 Jun 2026' },
    holdings: [
      { symbol: 'EMAAR', qty: 1_200_000, value: 10_008_000, plPct: 16.2 },
      { symbol: 'EMIRATESNBD', qty: 300_000, value: 8_868_000, plPct: 9.4 },
      { symbol: 'DIB', qty: 450_000, value: 3_352_500, plPct: 2.1 },
    ],
  },
]

// A caller (phone/email) is a contact who may be authorised to trade for one
// OR several company accounts. Verification matches the caller here; step 2 then
// scopes the company selector to just their linked accounts.
interface Contact { name: string; phone: string; email: string; accountIds: string[] }
const CONTACTS: Contact[] = [
  { name: 'Mahlya Holdings, Ops desk', phone: '+971 52 661 0099', email: 'ops@mahlya.ae', accountIds: ['6610'] },
  { name: 'FQA, First Last', phone: '+971 50 123 4567', email: 'fqa@firstlast.ae', accountIds: ['4447'] },
  // Authorised signatory who trades for several group companies:
  { name: 'Al Futtaim Group, Treasury', phone: '+971 50 555 2211', email: 'desk@alfuttaim.ae', accountIds: ['5521', '7782', '4447'] },
]

const digitsOf = (s: string) => s.replace(/\D/g, '')
const aed = (n: number) => `${n.toLocaleString('en-US', { maximumFractionDigits: 0 })} AED`

/** DFM trading session, approximated from the local clock for the prototype. */
function marketSession(): { label: string; tone: 'up' | 'warn' | 'neutral'; note: string } {
  const h = new Date().getHours()
  if (h < 9) return { label: 'Pre-open', tone: 'warn', note: 'Order will queue until the open' }
  if (h < 15) return { label: 'Open', tone: 'up', note: 'Executes during the session' }
  return { label: 'Closed', tone: 'neutral', note: 'Order will queue for the next session' }
}

const RAIL: { key: Stage; n: string; t: string }[] = [
  { key: 'contact', n: '1', t: 'Contact & verify' },
  { key: 'lookup', n: '2', t: 'Look up the client' },
  { key: 'intent', n: '3', t: 'Intent & funds' },
  { key: 'place', n: '4', t: 'Review & confirm' },
  { key: 'system', n: '5', t: 'System takes over' },
]
const railIndex = (s: Stage) => RAIL.findIndex((r) => r.key === s)

// Tradable list — skip suspended names.
const TRADABLE = FULL_MARKET.filter((s) => s.remarks !== 'suspended')

function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-medium text-content-muted">{label}</span>
      {children}
      {hint && <span className="text-[11px] text-content-subtle">{hint}</span>}
    </label>
  )
}

const inputCls =
  'h-9 w-full rounded-md border border-border-dark bg-[#15171a] px-3 text-[13px] text-content outline-none transition-colors placeholder:text-content-subtle hover:border-[#3a3d42] focus:border-action'

interface PickOption { id: string; symbolShortName: string; symbolName: string }

/** Searchable symbol combobox — type to filter by ticker or company name. */
function SymbolPicker({ value, options, onChange }: { value: string; options: PickOption[]; onChange: (v: string) => void }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const selected = options.find((o) => o.symbolShortName === value)
  const q = query.trim().toLowerCase()
  const matches = q ? options.filter((o) => `${o.symbolShortName} ${o.symbolName}`.toLowerCase().includes(q)) : options

  return (
    <div className="relative">
      <svg className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-content-subtle" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
      <input
        className={`${inputCls} pl-8`}
        value={open ? query : selected ? `${selected.symbolShortName} · ${selected.symbolName}` : ''}
        placeholder="Search ticker or company…"
        onFocus={() => { setOpen(true); setQuery('') }}
        onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') { setOpen(false); (e.target as HTMLInputElement).blur() }
          else if (e.key === 'Enter' && matches[0]) { onChange(matches[0].symbolShortName); setOpen(false); (e.target as HTMLInputElement).blur() }
        }}
      />
      {open && (
        <ul className="absolute left-0 top-full z-30 mt-1 max-h-64 w-full overflow-auto rounded-md border border-border-dark bg-surface shadow-xl">
          {matches.length === 0 && <li className="px-3 py-2 text-[12px] text-content-muted">No matching symbol</li>}
          {matches.map((o) => (
            <li
              key={o.id}
              onMouseDown={(e) => { e.preventDefault(); onChange(o.symbolShortName); setQuery(''); setOpen(false) }}
              className={`flex cursor-pointer items-center gap-2 px-3 py-1.5 text-[12px] hover:bg-[rgba(0,98,255,0.12)] ${o.symbolShortName === value ? 'bg-[rgba(0,98,255,0.1)]' : ''}`}
            >
              <span className="w-20 shrink-0 font-medium text-content">{o.symbolShortName}</span>
              <span className="flex-1 truncate text-content-muted">{o.symbolName}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function BrokerFlow({ onPopOut }: { onPopOut?: () => void } = {}) {
  const [stage, setStage] = useState<Stage>('contact')
  const [channel, setChannel] = useState<Channel>('Phone')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [clientId, setClientId] = useState('6610')
  const [side, setSide] = useState<Side>('Buy')
  const [symbolShort, setSymbolShort] = useState('EMAAR')
  const [qty, setQty] = useState(50_000) // canonical order size in shares
  const [qtyMode, setQtyMode] = useState<'shares' | 'amount'>('shares')
  const [amount, setAmount] = useState(0) // AED amount when ordering by value
  const [orderType, setOrderType] = useState<'Market' | 'Limit'>('Market')
  const [limitPrice, setLimitPrice] = useState(0)
  const [addedFunds, setAddedFunds] = useState(0)
  const [stoppedAt, setStoppedAt] = useState(0)
  const [stopReason, setStopReason] = useState('')
  const [orderRef, setOrderRef] = useState('')

  const client = CLIENTS.find((c) => c.id === clientId)!
  const symbol = TRADABLE.find((s) => s.symbolShortName === symbolShort) ?? TRADABLE[0]
  const { quotes } = useLiveData()
  const live = quotes.get(symbol.symbolShortName)
  const price = live ? live.last : symbol.lastPrice
  // Price the order executes at: live market price, or the broker's limit price.
  const execPrice = orderType === 'Limit' && limitPrice > 0 ? limitPrice : price
  const cost = execPrice * qty
  const availableCash = client.cash + addedFunds
  const shortfall = Math.max(0, Math.ceil((cost - availableCash) / 1000) * 1000)
  const fundsOk = side === 'Sell' || cost <= availableCash
  // The client's existing position in the symbol being traded (if any).
  const heldPosition = client.holdings.find((h) => h.symbol === symbol.symbolShortName)
  const sellInvalid = side === 'Sell' && (!heldPosition || qty > heldPosition.qty)
  const session = marketSession()

  // Buy can pick any tradable symbol; Sell is limited to what the client holds.
  const symbolOptions =
    side === 'Buy'
      ? TRADABLE
      : client.holdings
          .map((h) => TRADABLE.find((s) => s.symbolShortName === h.symbol))
          .filter((s): s is (typeof TRADABLE)[number] => Boolean(s))

  // When switching to Sell (or changing client), snap the symbol to one held.
  useEffect(() => {
    if (side === 'Sell' && !client.holdings.some((h) => h.symbol === symbolShort)) {
      setSymbolShort(client.holdings[0]?.symbol ?? symbolShort)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [side, clientId])

  // When ordering by AED, derive the share quantity from the amount at the
  // execution price (recomputes as the price ticks or the limit changes).
  useEffect(() => {
    if (qtyMode === 'amount') setQty(execPrice > 0 ? Math.floor(amount / execPrice) : 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qtyMode, amount, execPrice])

  // Caller verification — the broker checks the phone/email against the FAB
  // client database. Auto-checked as they type (no button, no code): if a record
  // matches, the caller is verified and that client is pre-selected.
  const identifier = channel === 'Phone' ? phone.trim() : email.trim()
  const idValid = channel === 'Phone' ? digitsOf(identifier).length >= 7 : /\S+@\S+\.\S+/.test(identifier)
  const matchedContact = !idValid
    ? undefined
    : channel === 'Phone'
      ? CONTACTS.find((c) => digitsOf(c.phone).endsWith(digitsOf(identifier)))
      : CONTACTS.find((c) => c.email.toLowerCase() === identifier.toLowerCase())
  const verified = !!matchedContact
  // The company accounts this verified caller may trade for.
  const linkedIds = matchedContact?.accountIds ?? []

  const reset = () => {
    setStage('contact'); setPhone(''); setEmail(''); setQtyMode('shares'); setAmount(0)
    setOrderType('Market'); setLimitPrice(0); setAddedFunds(0); setStopReason(''); setOrderRef('')
  }
  const stop = (reason: string) => { setStoppedAt(railIndex(stage === 'movefunds' ? 'intent' : stage)); setStopReason(reason); setStage('stopped') }
  const placeOrder = () => {
    setOrderRef(`TN-${Date.now().toString().slice(-8)}`)
    setStage('system')
  }
  const settleDate = new Date(Date.now() + 2 * 86_400_000).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })

  const cur = stage === 'stopped' ? stoppedAt : stage === 'movefunds' ? railIndex('intent') : railIndex(stage)

  return (
    <div className="flex h-full min-h-0 bg-page">
      {/* ── Step rail ─────────────────────────────────────────────── */}
      <aside className="hidden w-64 shrink-0 flex-col gap-1 overflow-y-auto border-r border-border-dark bg-[#141619] p-3 md:flex">
        <div className="mb-2 px-1">
          <div className="text-[13px] font-semibold text-content">Place a trade for a client</div>
          <div className="text-[11px] text-content-muted">Broker workflow</div>
        </div>
        {RAIL.map((r, i) => {
          const done = i < cur
          const active = i === cur && stage !== 'stopped'
          const failed = i === cur && stage === 'stopped'
          return (
            <div key={r.key} className={`flex items-center gap-2.5 rounded-md px-2 py-1.5 ${active ? 'bg-[rgba(0,98,255,0.12)]' : ''}`}>
              <span
                className={`flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                  failed ? 'bg-offer-surface text-down'
                  : done ? 'bg-bid-surface text-up'
                  : active ? 'bg-action text-white'
                  : 'bg-[#1f2226] text-content-subtle'
                }`}
              >
                {done ? '✓' : failed ? '!' : r.n}
              </span>
              <span className={`text-[12.5px] ${active ? 'font-semibold text-content' : done ? 'text-content-muted' : 'text-content-subtle'}`}>{r.t}</span>
            </div>
          )
        })}
        {(stage === 'movefunds' || (stage === 'stopped' && stopReason.includes('funds'))) && (
          <div className="ml-8 mt-0.5 flex items-center gap-2 rounded-md px-2 py-1.5">
            <Badge tone="warn">A</Badge>
            <span className="text-[12px] text-content-muted">Short on cash branch</span>
          </div>
        )}
      </aside>

      {/* ── Step content ──────────────────────────────────────────── */}
      <div className="min-w-0 flex-1 overflow-y-auto p-5">
        <div className="mx-auto max-w-[640px]">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h1 className="text-[16px] font-semibold text-content">Broker flow, placing a trade for a client</h1>
              <p className="text-[12px] text-content-muted">Step {Math.min(cur + 1, RAIL.length)} of {RAIL.length}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={reset}>Reset</Button>
              {onPopOut && <PopOutButton onClick={onPopOut} title="Send to the board window (move to another monitor)" />}
            </div>
          </div>

          <Panel title={RAIL[cur]?.t ?? 'Trade'} className="min-h-[320px]">
            <div className="flex flex-col gap-4">
              {/* 1 — Contact & verify (against the FAB client database) */}
              {stage === 'contact' && (
                <>
                  <p className="text-[13px] text-content-muted">The client reaches out to place a trade. The broker checks their {channel === 'Phone' ? 'number' : 'email'} against the FAB client database to confirm they're an existing client.</p>
                  <Field label="Channel"><SegmentedTabs tabs={['Phone', 'Email'] as const} value={channel} onChange={setChannel} /></Field>
                  {channel === 'Phone' ? (
                    <Field label="Caller's phone number" hint="Auto-checked against FAB client records.">
                      <input className={inputCls} value={phone} placeholder="+971 5x xxx xxxx" onChange={(e) => setPhone(e.target.value)} />
                    </Field>
                  ) : (
                    <Field label="Sender's email address" hint="Auto-checked against FAB client records.">
                      <input className={inputCls} type="email" value={email} placeholder="name@company.com" onChange={(e) => setEmail(e.target.value)} />
                    </Field>
                  )}
                  {verified && matchedContact && (
                    <div className="rounded-lg border border-[rgba(47,208,122,0.4)] bg-bid-surface p-3">
                      <Badge tone="up">✓ Found in FAB database</Badge>
                      <div className="mt-1.5 text-[13px] font-semibold text-content">{matchedContact.name}</div>
                      <div className="text-[11px] text-content-muted">
                        {linkedIds.length === 1
                          ? `Authorised for account ${linkedIds[0]}`
                          : `Authorised for ${linkedIds.length} company accounts`}
                      </div>
                    </div>
                  )}
                  {idValid && !verified && <Badge tone="down">No matching caller in FAB records</Badge>}
                  {channel === 'Phone' && phone.trim().length > 0 && !idValid && <Badge tone="warn">Keep typing the full number…</Badge>}
                  {channel === 'Email' && email.trim().length > 0 && !idValid && <Badge tone="warn">Enter a full email address…</Badge>}
                  {!verified && (
                    <p className="text-[11px] text-content-subtle">On file (demo): {channel === 'Phone' ? '+971 52 661 0099 (Mahlya, 1 co.) · +971 50 555 2211 (Al Futtaim, 3 co.)' : 'ops@mahlya.ae · desk@alfuttaim.ae'}</p>
                  )}
                  <Footer onNext={() => { if (matchedContact) setClientId(matchedContact.accountIds[0]); setStage('lookup') }} nextDisabled={!verified} />
                </>
              )}

              {/* 2 — Look up client (full broker briefing) */}
              {stage === 'lookup' && (
                <>
                  <p className="text-[13px] text-content-muted">Open the client's profile &amp; portfolio before discussing the trade.</p>
                  {linkedIds.length > 1 && (
                    <Field label="Company account" hint={`${matchedContact?.name} is authorised to trade for ${linkedIds.length} companies. Pick which one.`}>
                      <Select value={clientId} onChange={(e) => setClientId(e.target.value)}>
                        {linkedIds.map((id) => {
                          const c = CLIENTS.find((x) => x.id === id)!
                          return <option key={id} value={id}>{id} · {c.name}</option>
                        })}
                      </Select>
                    </Field>
                  )}

                  {/* Profile header */}
                  <div className="rounded-lg border border-border-dark bg-[#15171a] p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-[15px] font-semibold text-content">{client.name}</div>
                        <div className="text-[11px] text-content-muted">Account {client.id} · Client since {client.since} · {client.positions} positions</div>
                      </div>
                      <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
                        <Badge tone="up">{client.status}</Badge>
                        <Badge tone="info">{client.risk}</Badge>
                        <Badge tone="neutral">KYC {client.kyc}</Badge>
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-0.5 text-[11px] text-content-muted">
                      <span>☎ {client.phone}</span>
                      <span>✉ {client.email}</span>
                    </div>
                  </div>

                  {/* Compliance / risk flag — broker must see this before trading */}
                  {client.flag && (
                    <div className="flex items-start gap-2 rounded-lg border border-[rgba(255,170,0,0.35)] bg-[rgba(255,170,0,0.1)] px-3 py-2 text-[12px] text-warning">
                      <span className="mt-px">⚠</span><span>{client.flag}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-4 gap-2">
                    <Stat label="Available cash" value={aed(client.cash)} />
                    <Stat label="Portfolio value" value={aed(client.holdingsValue)} />
                    <Stat label="Day P/L" value={`${client.dayPnlPct > 0 ? '+' : ''}${client.dayPnlPct.toFixed(1)}%`} tone={client.dayPnlPct > 0 ? 'up' : client.dayPnlPct < 0 ? 'down' : undefined} />
                    <Stat label="Working orders" value={String(client.workingOrders)} />
                  </div>

                  {/* Recent activity */}
                  <div>
                    <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-content-subtle">Recent activity</div>
                    <div className="grid grid-cols-2 gap-2">
                      <TradeCard t={client.lastBuy} />
                      <TradeCard t={client.lastSell} />
                    </div>
                  </div>

                  {/* Top holdings */}
                  <div>
                    <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-content-subtle">Top holdings</div>
                    <div className="overflow-hidden rounded-lg border border-border-dark">
                      <div className="flex items-center gap-2 border-b border-border-dark bg-[#15171a] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-content-subtle">
                        <span className="w-24">Symbol</span>
                        <span className="flex-1 text-right">Quantity</span>
                        <span className="flex-1 text-right">Market value</span>
                        <span className="w-16 text-right">P/L</span>
                      </div>
                      {client.holdings.map((h) => (
                        <div key={h.symbol} className="flex items-center gap-2 px-3 py-1.5 text-[12px]">
                          <span className="w-24 font-medium text-content">{h.symbol}</span>
                          <span className="flex-1 text-right tabular-nums text-content-muted">{h.qty.toLocaleString()}</span>
                          <span className="flex-1 text-right tabular-nums text-content">{aed(h.value)}</span>
                          <span className={`w-16 text-right tabular-nums ${h.plPct > 0 ? 'text-up' : h.plPct < 0 ? 'text-down' : 'text-flat'}`}>{h.plPct > 0 ? '+' : ''}{h.plPct.toFixed(1)}%</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Footer onBack={() => setStage('contact')} onNext={() => setStage('intent')} />
                </>
              )}

              {/* 4 — Intent */}
              {stage === 'intent' && (
                <>
                  <p className="text-[13px] text-content-muted">Capture why and what the client wants to trade.</p>
                  <div className="flex flex-wrap items-center gap-2 text-[12px]">
                    <span className="text-content-muted">DFM session</span>
                    <Badge tone={session.tone}>{session.label}</Badge>
                    <span className="text-[11px] text-content-subtle">{session.note}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Side"><SegmentedTabs tabs={['Buy', 'Sell'] as const} value={side} onChange={setSide} /></Field>
                    <Field label="Order type">
                      <SegmentedTabs tabs={['Market', 'Limit'] as const} value={orderType} onChange={(v) => { if (v === 'Limit') setLimitPrice(+price.toFixed(2)); setOrderType(v) }} />
                    </Field>
                  </div>
                  {orderType === 'Limit' && (
                    <Field label="Limit price (AED)" hint={`Market now: ${fmtPrice(price)} AED`}>
                      <input
                        type="text"
                        inputMode="decimal"
                        className={inputCls}
                        value={limitPrice === 0 ? '' : String(limitPrice)}
                        placeholder={fmtPrice(price)}
                        onChange={(e) => { const v = e.target.value.replace(/[^\d.]/g, ''); setLimitPrice(v === '' ? 0 : Number(v)) }}
                      />
                    </Field>
                  )}
                  <Field label={side === 'Buy' ? 'Symbol' : 'Symbol (held positions)'}>
                    <SymbolPicker value={symbolShort} options={symbolOptions} onChange={setSymbolShort} />
                  </Field>
                  <Field label={qtyMode === 'shares' ? 'Quantity (shares)' : 'Amount to invest (AED)'}>
                    <div className="flex gap-2">
                      {qtyMode === 'shares' ? (
                        <input
                          type="text"
                          inputMode="numeric"
                          className={inputCls}
                          value={qty === 0 ? '' : qty.toLocaleString()}
                          placeholder="e.g. 5,000"
                          onChange={(e) => { const d = e.target.value.replace(/\D/g, ''); setQty(d === '' ? 0 : Number(d)) }}
                        />
                      ) : (
                        <input
                          type="text"
                          inputMode="numeric"
                          className={inputCls}
                          value={amount === 0 ? '' : amount.toLocaleString()}
                          placeholder="e.g. 100,000"
                          onChange={(e) => { const d = e.target.value.replace(/\D/g, ''); setAmount(d === '' ? 0 : Number(d)) }}
                        />
                      )}
                      <SegmentedTabs
                        tabs={['Shares', 'AED'] as const}
                        value={qtyMode === 'shares' ? 'Shares' : 'AED'}
                        onChange={(v) => { if (v === 'AED') setAmount(Math.round(qty * price)); setQtyMode(v === 'Shares' ? 'shares' : 'amount') }}
                        className="shrink-0"
                      />
                    </div>
                    {qtyMode === 'amount' && (
                      <div className="mt-1 flex items-baseline gap-2 rounded-lg border border-action/40 bg-[rgba(0,98,255,0.08)] px-3 py-2.5">
                        <span className="text-[26px] font-bold leading-none tabular-nums text-content">{qty.toLocaleString()}</span>
                        <span className="text-[13px] font-medium text-content-muted">shares</span>
                        <span className="ml-auto self-center text-[11px] text-content-subtle">at {fmtPrice(execPrice)} AED</span>
                      </div>
                    )}
                  </Field>

                  {/* Current position in the chosen symbol */}
                  <div className="flex items-center justify-between rounded-lg border border-border-dark bg-[#15171a] px-3 py-2 text-[12px]">
                    <span className="text-content-muted">Current position in {symbol.symbolShortName}</span>
                    {heldPosition ? (
                      <span className="tabular-nums text-content">
                        {heldPosition.qty.toLocaleString()} shares · {aed(heldPosition.value)} ·{' '}
                        <span className={heldPosition.plPct > 0 ? 'text-up' : heldPosition.plPct < 0 ? 'text-down' : 'text-flat'}>
                          {heldPosition.plPct > 0 ? '+' : ''}{heldPosition.plPct.toFixed(1)}%
                        </span>
                      </span>
                    ) : (
                      <span className="text-content-subtle">No current holding</span>
                    )}
                  </div>
                  {sellInvalid && (
                    <Badge tone="down">
                      {heldPosition ? `Selling ${qty.toLocaleString()} exceeds the ${heldPosition.qty.toLocaleString()} held` : `Client holds no ${symbol.symbolShortName} to sell`}
                    </Badge>
                  )}

                  {/* Live order cost vs cash — recomputes as symbol / quantity change */}
                  <div className="rounded-xl border border-border-dark bg-[#15171a] p-4">
                    <div className="flex items-center justify-between text-[12px] text-content-muted">
                      <span className="flex items-center gap-1.5">
                        {orderType === 'Limit' ? 'Limit price' : 'Market price'}
                        {live && orderType === 'Market' && <span className="inline-flex items-center gap-1 text-[10px] font-medium text-up"><span className="inline-block size-1.5 rounded-full bg-up shadow-[0_0_5px_#2fd07a]" />LIVE</span>}
                      </span>
                      <span className="tabular-nums">{fmtPrice(execPrice)} AED × {qty.toLocaleString()} sh</span>
                    </div>

                    <div className="mt-2.5 flex items-end justify-between gap-4">
                      <div>
                        <div className="text-[11px] text-content-muted">{side === 'Buy' ? 'Order value' : 'Estimated proceeds'}</div>
                        <div className="text-[26px] font-semibold leading-none tabular-nums text-content">{aed(cost)}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[11px] text-content-muted">{side === 'Buy' ? 'Investment cash' : 'Cash balance'}</div>
                        <div className="text-[16px] font-semibold tabular-nums text-content">{aed(availableCash)}</div>
                      </div>
                    </div>

                    {/* Where the money moves — the trade settles from the investment account */}
                    <div className="mt-2 flex items-center justify-between rounded-md bg-[#0e0f11] px-2.5 py-1.5 text-[11px]">
                      <span className="text-content-muted">{side === 'Buy' ? 'Settles from investment account' : 'Proceeds to investment account'}</span>
                      <span className="tabular-nums text-content">{client.id} · {aed(availableCash)}</span>
                    </div>

                    {side === 'Buy' ? (
                      <>
                        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-[#0b0c0d]">
                          <div className={`h-full ${cost > availableCash ? 'bg-down' : 'bg-action'}`} style={{ width: `${Math.min(100, availableCash > 0 ? (cost / availableCash) * 100 : 100)}%` }} />
                        </div>
                        <div className="mt-1.5 flex items-center justify-between text-[11px]">
                          <span className="text-content-muted">{availableCash > 0 ? Math.round((cost / availableCash) * 100) : 0}% of cash used</span>
                          <span className={cost > availableCash ? 'text-down' : 'text-up'}>
                            {cost > availableCash ? `Short ${aed(cost - availableCash)}` : `${aed(availableCash - cost)} left after trade`}
                          </span>
                        </div>
                        {cost > availableCash && <div className="mt-1 text-[11px] text-down">Continue will route to the short on cash step.</div>}
                      </>
                    ) : heldPosition ? (
                      <>
                        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-[#0b0c0d]">
                          <div className={`h-full ${qty > heldPosition.qty ? 'bg-down' : 'bg-action'}`} style={{ width: `${Math.min(100, (qty / heldPosition.qty) * 100)}%` }} />
                        </div>
                        <div className="mt-1.5 flex items-center justify-between text-[11px]">
                          <span className="text-content-muted">Selling {Math.min(100, Math.round((qty / heldPosition.qty) * 100))}% of {heldPosition.qty.toLocaleString()} held</span>
                          <span className={qty > heldPosition.qty ? 'text-down' : 'text-content-muted'}>{Math.max(0, heldPosition.qty - qty).toLocaleString()} sh remaining</span>
                        </div>
                      </>
                    ) : null}
                  </div>

                  <Footer
                    onBack={() => setStage('lookup')}
                    onNext={() => setStage(fundsOk ? 'place' : 'movefunds')}
                    nextLabel={fundsOk ? 'Continue' : 'Handle short cash'}
                    nextDisabled={qty <= 0 || sellInvalid}
                  />
                </>
              )}

              {/* A — Short on cash branch (entered from step 3 when funds are short) */}
              {stage === 'movefunds' && (
                <>
                  <Badge tone="warn">Short on cash</Badge>
                  <p className="text-[13px] text-content-muted">
                    {client.name}'s investment account doesn't have enough cash to settle this {side.toLowerCase()} order. The broker can move money from the client's CASA account into the investment account to cover the shortfall.
                  </p>

                  {/* The CASA account the broker pulls funds from — name & balance visible */}
                  <div className="rounded-lg border border-border-dark bg-[#15171a] p-3">
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-content-subtle">CASA account to pull from</div>
                    <div className="mt-1.5 flex items-center justify-between gap-3">
                      <div>
                        <div className="text-[13px] font-semibold text-content">{client.name}</div>
                        <div className="text-[11px] tabular-nums text-content-muted">{client.casa}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] text-content-muted">CASA balance</div>
                        <div className="text-[15px] font-semibold tabular-nums text-content">{aed(client.casaBalance)}</div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-[rgba(255,170,0,0.35)] bg-[rgba(255,170,0,0.08)] p-4 text-[13px]">
                    <div className="flex items-center justify-between">
                      <span className="text-content-muted">Order value</span>
                      <span className="tabular-nums text-content">{aed(cost)}</span>
                    </div>
                    <div className="mt-1.5 flex items-center justify-between">
                      <span className="text-content-muted">Investment cash</span>
                      <span className="tabular-nums text-content">{aed(availableCash)}</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between border-t border-[rgba(255,170,0,0.3)] pt-2">
                      <span className="font-semibold text-warning">Move from CASA</span>
                      <span className="text-[16px] font-semibold tabular-nums text-warning">{aed(shortfall)}</span>
                    </div>
                  </div>
                  <p className="text-[12px] text-content-muted">Moving {aed(shortfall)} from CASA raises the investment account to {aed(availableCash + shortfall)}, enough to settle the {aed(cost)} order. CASA balance after: {aed(client.casaBalance - shortfall)}.</p>

                  <Footer
                    onBack={() => setStage('intent')}
                    onNext={() => { setAddedFunds((f) => f + shortfall); setStage('place') }}
                    nextLabel="Yes, move funds in"
                    secondary={<Button variant="sell" onClick={() => stop('Client would not add funds, so the trade ends.')}>No, stop</Button>}
                  />
                </>
              )}

              {/* 5 — Review & confirm — summary of everything the broker entered */}
              {stage === 'place' && (
                <>
                  <p className="text-[13px] text-content-muted">Review the full order, then place it and send the confirmation to the client.</p>
                  {addedFunds > 0 && <Badge tone="up">✓ {aed(addedFunds)} moved in, funds now cover the trade</Badge>}

                  <div className="divide-y divide-border-dark overflow-hidden rounded-xl border border-border-dark bg-[#15171a]">
                    <ReviewRow label="Caller" value={`${channel} · ${identifier}`} sub="Verified against FAB records" />
                    <ReviewRow label="Account" value={client.name} sub={`Account ${client.id} · ${client.risk}`} />
                    <div className="flex items-center justify-between px-3 py-2.5">
                      <span className="text-[11px] text-content-muted">Order</span>
                      <div className="text-right">
                        <div className={`text-[14px] font-semibold ${side === 'Buy' ? 'text-up' : 'text-down'}`}>{side} {symbol.symbolShortName}</div>
                        <div className="text-[10px] text-content-subtle">{symbol.symbolName}</div>
                      </div>
                    </div>
                    <ReviewRow label="Quantity" value={`${qty.toLocaleString()} shares`} />
                    <ReviewRow label="Order type" value={orderType} sub={orderType === 'Limit' ? 'Fills at the limit or better' : 'Fills at the best market price'} />
                    <ReviewRow label={orderType === 'Limit' ? 'Limit price' : 'Price'} value={`${fmtPrice(execPrice)} AED`} sub={orderType === 'Limit' ? undefined : live ? 'Live market price' : 'Last price'} />
                    <ReviewRow label={side === 'Buy' ? 'Order value' : 'Estimated proceeds'} value={aed(cost)} strong />
                    <ReviewRow label="Available cash" value={aed(availableCash)} />
                    {side === 'Buy' && <ReviewRow label="Cash after trade" value={aed(availableCash - cost)} tone={cost > availableCash ? 'down' : 'up'} />}
                    <ReviewRow label="Execution" value={session.label} sub={session.note} />
                    <ReviewRow label="Settlement" value={`T+2 · ${settleDate}`} />
                  </div>

                  <Footer onBack={() => setStage(fundsOk ? 'intent' : 'movefunds')} onNext={placeOrder} nextLabel="Place & confirm trade" />
                </>
              )}

              {/* 9 — System takes over */}
              {stage === 'system' && (
                <>
                  <div className="flex items-center gap-2"><Badge tone="up">✓ Trade confirmed</Badge><span className="text-[12px] text-content-muted">Ref {orderRef}</span></div>
                  <OrderSummary side={side} symbol={symbol.symbolShortName} qty={qty} price={execPrice} cost={cost} client={client.name} />
                  <div className="rounded-lg border border-dashed border-border-dark bg-[#15171a] p-4">
                    <div className="mb-1 text-[12px] font-semibold uppercase tracking-wide text-content-subtle">System takes over (same as in the app)</div>
                    <ul className="flex flex-col gap-1 text-[13px] text-content-muted">
                      <li>→ Order routed to the exchange</li>
                      <li>→ Money moves out of the investment account</li>
                      <li>→ Settles <span className="font-medium text-content">T+2 · {settleDate}</span></li>
                    </ul>
                  </div>
                  <Footer onNext={reset} nextLabel="Start a new trade" />
                </>
              )}

              {/* Stopped */}
              {stage === 'stopped' && (
                <>
                  <Badge tone="down">Trade stopped</Badge>
                  <p className="text-[13px] text-content-muted">{stopReason}</p>
                  <Footer onNext={reset} nextLabel="Start over" />
                </>
              )}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  )
}

function Footer({ onBack, onNext, nextLabel = 'Continue', nextDisabled, secondary }: { onBack?: () => void; onNext?: () => void; nextLabel?: string; nextDisabled?: boolean; secondary?: ReactNode }) {
  if (!onBack && !onNext && !secondary) return null
  return (
    <div className="mt-2 flex items-center justify-between gap-2">
      <div>{onBack && <Button variant="ghost" onClick={onBack}>Back</Button>}</div>
      <div className="flex items-center gap-2">
        {secondary}
        {onNext && <Button variant="primary" onClick={onNext} disabled={nextDisabled}>{nextLabel}</Button>}
      </div>
    </div>
  )
}

function TradeCard({ t }: { t: Trade }) {
  return (
    <div className="rounded-lg border border-border-dark bg-[#15171a] px-3 py-2">
      <div className="mb-0.5 flex items-center justify-between">
        <span className="text-[11px] text-content-muted">Last {t.side.toLowerCase()}</span>
        <span className="text-[10px] text-content-subtle">{t.date}</span>
      </div>
      <div className="flex items-baseline gap-1.5 text-[13px]">
        <span className={`font-semibold ${t.side === 'Buy' ? 'text-up' : 'text-down'}`}>{t.side}</span>
        <span className="font-medium text-content">{t.symbol}</span>
      </div>
      <div className="text-[11px] tabular-nums text-content-muted">{t.qty.toLocaleString()} @ {fmtPrice(t.price)}</div>
    </div>
  )
}

function ReviewRow({ label, value, sub, strong, tone }: { label: string; value: string; sub?: string; strong?: boolean; tone?: 'up' | 'down' }) {
  const color = tone === 'up' ? 'text-up' : tone === 'down' ? 'text-down' : 'text-content'
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2.5">
      <span className="shrink-0 text-[11px] text-content-muted">{label}</span>
      <div className="text-right">
        <div className={`tabular-nums ${strong ? 'text-[15px] font-semibold' : 'text-[13px]'} ${color}`}>{value}</div>
        {sub && <div className="text-[10px] text-content-subtle">{sub}</div>}
      </div>
    </div>
  )
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'up' | 'down' }) {
  const color = tone === 'up' ? 'text-up' : tone === 'down' ? 'text-down' : 'text-content'
  return (
    <div className="rounded-lg border border-border-dark bg-[#15171a] px-3 py-2">
      <div className="text-[11px] text-content-muted">{label}</div>
      <div className={`text-[14px] font-semibold tabular-nums ${color}`}>{value}</div>
    </div>
  )
}

function OrderSummary({ side, symbol, qty, price, cost, client }: { side: string; symbol: string; qty: number; price: number; cost: number; client: string }) {
  return (
    <div className="rounded-lg border border-border-dark bg-[#15171a] p-3 text-[13px]">
      <div className="flex items-center justify-between border-b border-border-dark pb-2">
        <span className={`font-semibold ${side === 'Buy' ? 'text-up' : 'text-down'}`}>{side} {symbol}</span>
        <span className="text-content-muted">{client}</span>
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 pt-2 text-content-muted">
        <div className="flex justify-between"><dt>Quantity</dt><dd className="tabular-nums text-content">{qty.toLocaleString()}</dd></div>
        <div className="flex justify-between"><dt>Price</dt><dd className="tabular-nums text-content">{fmtPrice(price)}</dd></div>
        <div className="col-span-2 flex justify-between border-t border-border-dark pt-1"><dt>Order value</dt><dd className="tabular-nums font-semibold text-content">{aed(cost)}</dd></div>
      </dl>
    </div>
  )
}
