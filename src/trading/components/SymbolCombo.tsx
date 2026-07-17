import { useMemo, useState } from 'react'
import { FULL_MARKET, fmtPrice } from '../data'
import { usePrices } from '../simData'

/**
 * Searchable symbol picker — type to filter (by code or name), ↑/↓ to move,
 * Enter/click to pick. Shows code · name · live price. Shared by the single
 * Order Placement ticket and the Basket Order "add symbol" field so both feel
 * identical.
 *
 * - `clearOnSelect` keeps the field empty after a pick (for an "add" action);
 *   otherwise the picked value stays shown (for a persistent selection).
 */
export default function SymbolCombo({
  value,
  onChange,
  placeholder = 'Type symbol…',
  className = '',
  clearOnSelect = false,
}: {
  value: string
  onChange: (symbol: string) => void
  placeholder?: string
  className?: string
  clearOnSelect?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [hi, setHi] = useState(0)
  const price = usePrices()
  const matches = useMemo(() => {
    const q = query.trim().toUpperCase()
    const pool = q
      ? FULL_MARKET.filter((s) => s.symbolShortName.toUpperCase().includes(q) || s.symbolName.toUpperCase().includes(q))
      : FULL_MARKET
    return pool.slice(0, 8)
  }, [query])
  const pick = (sym: string) => { onChange(sym); setQuery(''); setOpen(false) }
  return (
    <div className={`relative min-w-0 ${className || 'flex-1'}`}>
      <input
        value={open ? query : clearOnSelect ? '' : value}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); setHi(0) }}
        onFocus={() => { setQuery(''); setOpen(true); setHi(0) }}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); if (matches[hi]) pick(matches[hi].symbolShortName) }
          else if (e.key === 'ArrowDown') { e.preventDefault(); setHi((h) => Math.min(h + 1, matches.length - 1)) }
          else if (e.key === 'ArrowUp') { e.preventDefault(); setHi((h) => Math.max(h - 1, 0)) }
          else if (e.key === 'Escape') setOpen(false)
        }}
        placeholder={placeholder}
        spellCheck={false}
        className="h-8 w-full rounded border border-[rgba(0,98,255,0.22)] bg-[#0b0e15] px-2 text-[12px] font-medium uppercase text-content outline-none focus:border-[#5b9bff]"
      />
      {open && matches.length > 0 && (
        <ul className="absolute z-30 mt-1 max-h-56 w-full min-w-[200px] overflow-auto rounded-md border border-[rgba(0,98,255,0.3)] bg-[#0b0e15] shadow-[0_8px_30px_rgba(0,0,0,0.6)]">
          {matches.map((s, i) => (
            <li key={s.symbolShortName}>
              <button
                onMouseDown={(e) => { e.preventDefault(); pick(s.symbolShortName) }}
                onMouseEnter={() => setHi(i)}
                className={`flex w-full items-center justify-between gap-2 px-2.5 py-1.5 text-left transition-colors ${i === hi ? 'bg-[rgba(0,98,255,0.18)]' : 'hover:bg-[rgba(0,98,255,0.1)]'}`}
              >
                <span className="min-w-0 flex-1">
                  <span className="text-[12px] font-bold text-content">{s.symbolShortName}</span>
                  <span className="ml-2 truncate text-[10px] text-content-subtle">{s.symbolName}</span>
                </span>
                <span className="shrink-0 text-[11px] tabular-nums text-[#9cc0ff]">{fmtPrice(price(s.symbolShortName)?.last ?? s.lastPrice)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
