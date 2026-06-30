import { useRef, useState } from 'react'
import { SegmentedTabs, Select } from './ui'

/**
 * Draggable floating toolbar with quick trading tools.
 *
 * Mounts once at the app root. Collapsed it shows a round launcher in the
 * bottom-right; open it shows a draggable panel whose header is the drag handle.
 * Tools: a no-eval Calculator, an FX Converter, and a Trade Calc.
 */

// ─── Shared field style ─────────────────────────────────────────────────────
const fieldCls =
  'h-9 w-full rounded-md border border-border-dark bg-[#15171a] px-3 text-[14px] tabular-nums text-content outline-none transition-colors focus:border-action'
const labelCls = 'text-[11px] font-medium text-content-muted'

// ─── Icons ───────────────────────────────────────────────────────────────
function ToolsIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M8 7h8M8 11h3M14 11h2M8 15h3M14 15h2M8 19h3" />
    </svg>
  )
}

function GripIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="9" cy="6" r="1.6" />
      <circle cx="15" cy="6" r="1.6" />
      <circle cx="9" cy="12" r="1.6" />
      <circle cx="15" cy="12" r="1.6" />
      <circle cx="9" cy="18" r="1.6" />
      <circle cx="15" cy="18" r="1.6" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  )
}

function SwapIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 10l-3 3 3 3M4 13h12M17 14l3-3-3-3M20 11H8" />
    </svg>
  )
}

// ─── Calculator (no eval) ───────────────────────────────────────────────────
type Op = '+' | '−' | '×' | '÷'

function apply(a: number, b: number, op: Op): number {
  switch (op) {
    case '+':
      return a + b
    case '−':
      return a - b
    case '×':
      return a * b
    case '÷':
      return b === 0 ? NaN : a / b
  }
}

function Calculator() {
  const [entry, setEntry] = useState('0')
  const [stored, setStored] = useState<number | null>(null)
  const [pending, setPending] = useState<Op | null>(null)
  const [fresh, setFresh] = useState(false) // next digit starts a new entry

  function inputDigit(d: string) {
    if (fresh || entry === '0') {
      setEntry(d)
      setFresh(false)
    } else {
      setEntry(entry + d)
    }
  }

  function inputDot() {
    if (fresh) {
      setEntry('0.')
      setFresh(false)
      return
    }
    if (!entry.includes('.')) setEntry(entry + '.')
  }

  function clearAll() {
    setEntry('0')
    setStored(null)
    setPending(null)
    setFresh(false)
  }

  function backspace() {
    if (fresh) return
    setEntry((e) => (e.length <= 1 || (e.length === 2 && e.startsWith('-')) ? '0' : e.slice(0, -1)))
  }

  function percent() {
    setEntry((e) => String(parseFloat(e) / 100))
    setFresh(true)
  }

  function chooseOp(op: Op) {
    const current = parseFloat(entry)
    if (stored !== null && pending && !fresh) {
      const result = apply(stored, current, pending)
      setStored(result)
      setEntry(String(result))
    } else {
      setStored(current)
    }
    setPending(op)
    setFresh(true)
  }

  function equals() {
    if (stored === null || pending === null) return
    const result = apply(stored, parseFloat(entry), pending)
    setEntry(Number.isNaN(result) ? 'Error' : String(result))
    setStored(null)
    setPending(null)
    setFresh(true)
  }

  type Key = { label: string; kind: 'digit' | 'op' | 'eq' | 'fn'; on: () => void; span?: boolean }
  const keys: Key[] = [
    { label: 'C', kind: 'fn', on: clearAll },
    { label: '⌫', kind: 'fn', on: backspace },
    { label: '%', kind: 'fn', on: percent },
    { label: '÷', kind: 'op', on: () => chooseOp('÷') },
    { label: '7', kind: 'digit', on: () => inputDigit('7') },
    { label: '8', kind: 'digit', on: () => inputDigit('8') },
    { label: '9', kind: 'digit', on: () => inputDigit('9') },
    { label: '×', kind: 'op', on: () => chooseOp('×') },
    { label: '4', kind: 'digit', on: () => inputDigit('4') },
    { label: '5', kind: 'digit', on: () => inputDigit('5') },
    { label: '6', kind: 'digit', on: () => inputDigit('6') },
    { label: '−', kind: 'op', on: () => chooseOp('−') },
    { label: '1', kind: 'digit', on: () => inputDigit('1') },
    { label: '2', kind: 'digit', on: () => inputDigit('2') },
    { label: '3', kind: 'digit', on: () => inputDigit('3') },
    { label: '+', kind: 'op', on: () => chooseOp('+') },
    { label: '0', kind: 'digit', on: () => inputDigit('0'), span: true },
    { label: '.', kind: 'digit', on: inputDot },
    { label: '=', kind: 'eq', on: equals },
  ]

  const kindCls: Record<Key['kind'], string> = {
    digit: 'bg-[#1f2226] text-content hover:brightness-125',
    op: 'bg-action/20 text-[#5b9bff] hover:bg-action/30',
    eq: 'bg-action text-white hover:brightness-110',
    fn: 'bg-[#1f2226] text-content-muted hover:brightness-125',
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex min-h-9 items-center justify-end overflow-hidden rounded-md border border-border-dark bg-[#15171a] px-3">
        <span className="truncate text-[20px] font-semibold tabular-nums text-content">{entry}</span>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {keys.map((k) => (
          <button
            key={k.label}
            onClick={k.on}
            className={`h-10 rounded-md text-[15px] font-medium tabular-nums transition ${kindCls[k.kind]} ${
              k.span ? 'col-span-2' : ''
            }`}
          >
            {k.label}
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── FX Converter ────────────────────────────────────────────────────────
const CCY = ['AED', 'USD', 'EUR', 'GBP', 'SAR', 'INR'] as const
type Ccy = (typeof CCY)[number]

// AED per 1 unit of currency.
const AED_PER: Record<Ccy, number> = {
  AED: 1,
  USD: 3.6724,
  EUR: 3.9683,
  GBP: 4.6729,
  SAR: 0.9794,
  INR: 0.044,
}

function FxConverter() {
  const [amount, setAmount] = useState('1000')
  const [from, setFrom] = useState<Ccy>('AED')
  const [to, setTo] = useState<Ccy>('USD')

  const amt = parseFloat(amount) || 0
  const rate = AED_PER[from] / AED_PER[to] // 1 `from` = rate `to`
  const result = amt * rate

  function swap() {
    setFrom(to)
    setTo(from)
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="flex flex-col gap-1">
        <span className={labelCls}>Amount</span>
        <input
          type="number"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className={fieldCls}
        />
      </label>
      <div className="flex items-end gap-2">
        <Select label="From" className="flex-1" value={from} onChange={(e) => setFrom(e.target.value as Ccy)}>
          {CCY.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
        <button
          onClick={swap}
          aria-label="Swap currencies"
          className="mb-0.5 flex size-8 shrink-0 items-center justify-center rounded-md border border-border-dark bg-[#1f2226] text-content-muted transition hover:text-content"
        >
          <SwapIcon />
        </button>
        <Select label="To" className="flex-1" value={to} onChange={(e) => setTo(e.target.value as Ccy)}>
          {CCY.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
      </div>
      <div className="mt-1 rounded-md border border-border-dark bg-[#15171a] p-3">
        <div className="text-[22px] font-semibold tabular-nums text-content">
          {result.toLocaleString(undefined, { maximumFractionDigits: 2 })}{' '}
          <span className="text-[13px] font-medium text-content-muted">{to}</span>
        </div>
        <div className="mt-1 text-[11px] tabular-nums text-content-muted">
          1 {from} = {rate.toLocaleString(undefined, { maximumFractionDigits: 4 })} {to}
        </div>
      </div>
    </div>
  )
}

// ─── Trade Calc ──────────────────────────────────────────────────────────
function TradeCalc() {
  const [qty, setQty] = useState('100')
  const [price, setPrice] = useState('10.00')
  const [pct, setPct] = useState('0.20')

  const gross = (parseFloat(qty) || 0) * (parseFloat(price) || 0)
  const commission = (gross * (parseFloat(pct) || 0)) / 100
  const net = gross + commission

  const fmt = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <label className="flex flex-1 flex-col gap-1">
          <span className={labelCls}>Quantity</span>
          <input type="number" inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value)} className={fieldCls} />
        </label>
        <label className="flex flex-1 flex-col gap-1">
          <span className={labelCls}>Price</span>
          <input type="number" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} className={fieldCls} />
        </label>
      </div>
      <label className="flex flex-col gap-1">
        <span className={labelCls}>Brokerage %</span>
        <input type="number" inputMode="decimal" value={pct} onChange={(e) => setPct(e.target.value)} className={fieldCls} />
      </label>
      <div className="mt-1 flex flex-col gap-2 rounded-md border border-border-dark bg-[#15171a] p-3 text-[13px]">
        <div className="flex items-center justify-between">
          <span className="text-content-muted">Gross Value</span>
          <span className="font-semibold tabular-nums text-content">{fmt(gross)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-content-muted">Commission</span>
          <span className="font-semibold tabular-nums text-down">{fmt(commission)}</span>
        </div>
        <div className="flex items-center justify-between border-t border-border-dark pt-2">
          <span className="text-content-muted">Net Payable</span>
          <span className="font-semibold tabular-nums text-content">{fmt(net)}</span>
        </div>
      </div>
    </div>
  )
}

// ─── Main toolbar ────────────────────────────────────────────────────────
const TOOLS = ['Calc', 'FX', 'Trade'] as const
type Tool = (typeof TOOLS)[number]

const PANEL_W = 300

export default function FloatingToolbar() {
  const [open, setOpen] = useState(false)
  const [tool, setTool] = useState<Tool>('Calc')
  const [pos, setPos] = useState({
    x: typeof window !== 'undefined' ? window.innerWidth - PANEL_W - 24 : 24,
    y: typeof window !== 'undefined' ? window.innerHeight - 460 : 80,
  })

  const dragRef = useRef<{ dx: number; dy: number } | null>(null)

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y }
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current
    if (!drag) return
    const maxX = window.innerWidth - PANEL_W
    const maxY = window.innerHeight - 60
    const x = Math.min(Math.max(0, e.clientX - drag.dx), Math.max(0, maxX))
    const y = Math.min(Math.max(0, e.clientY - drag.dy), Math.max(0, maxY))
    setPos({ x, y })
  }

  function onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    dragRef.current = null
    e.currentTarget.releasePointerCapture(e.pointerId)
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        aria-label="Open quick tools"
        className="fixed bottom-6 right-6 z-40 flex size-12 items-center justify-center rounded-full bg-action text-white shadow-2xl transition hover:brightness-110"
      >
        <ToolsIcon />
      </button>
    )
  }

  return (
    <div
      className="fixed z-40 w-[300px] select-none rounded-xl border border-border-dark bg-surface shadow-2xl"
      style={{ left: pos.x, top: pos.y }}
    >
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        className="flex cursor-move items-center justify-between gap-2 rounded-t-xl border-b border-border-dark px-3 py-2.5"
      >
        <div className="flex items-center gap-2 text-content-muted">
          <GripIcon />
          <span className="text-[13px] font-semibold text-content">Tools</span>
        </div>
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => setOpen(false)}
          aria-label="Close tools"
          className="rounded p-1 text-content-muted transition hover:bg-[rgba(255,255,255,0.06)] hover:text-content"
        >
          <CloseIcon />
        </button>
      </div>

      <div className="flex flex-col gap-3 p-3">
        <SegmentedTabs tabs={TOOLS} value={tool} onChange={setTool} className="w-full" />
        {tool === 'Calc' && <Calculator />}
        {tool === 'FX' && <FxConverter />}
        {tool === 'Trade' && <TradeCalc />}
      </div>
    </div>
  )
}
