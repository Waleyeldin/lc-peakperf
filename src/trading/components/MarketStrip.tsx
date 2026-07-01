import { DirArrow } from './ui'
import { TICKERS, fmtPrice, fmtChange, fmtPct } from '../data'
import { useLiveData } from '../liveData'
import { useSimData } from '../simData'
import type { Direction } from '../data'

/**
 * Full-width horizontal market-summary strip (≈48px) for the FAB Securities
 * dark trading dashboard. Renders the index tickers in a dense, scrollable
 * row separated by thin vertical dividers, each colour-coded by direction.
 */
// Ticker label → index shortName so we can overlay live/simulated data.
const TICKER_SYMBOL: Record<string, string> = {
  'DFM General Index': 'DFMGI',
  'ADX General Index': 'ADI',
  'Nasdaq Dubai': 'NDUAE20',
  'FTSE ADX 15': 'FADX15',
}

export default function MarketStrip() {
  const { quotes } = useLiveData()
  const sim = useSimData()

  return (
    <div className="flex h-12 w-full items-stretch overflow-x-auto border-b border-border-dark bg-[#141619]">
      {TICKERS.map((t) => {
        // Live Yahoo where available (DFM index), simulated tick otherwise.
        const sym = TICKER_SYMBOL[t.label]
        const q = sym ? quotes.get(sym) : undefined
        const sm = sym && !q ? sim.get(sym) : undefined
        const src = q ?? sm ?? null
        const live = !!q
        const value = src ? src.last : t.value
        const netChange = src ? src.change : t.netChange
        const changePct = src ? src.changePct : t.changePct
        const direction: Direction = src
          ? src.change > 0 ? 'up' : src.change < 0 ? 'down' : 'flat'
          : t.direction
        const tone = direction === 'up' ? 'text-up' : direction === 'down' ? 'text-down' : 'text-flat'

        return (
          <div
            key={t.label}
            className="flex shrink-0 items-center gap-2.5 whitespace-nowrap border-r border-border-dark px-4"
          >
            <span className="flex max-w-[170px] items-center gap-1 truncate text-[11px] leading-3 text-content-muted">
              {live && <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-up shadow-[0_0_5px_#2fd07a]" title="Live data" />}
              {t.label}
            </span>
            <span className="text-[13px] font-semibold tabular-nums text-content">
              {fmtPrice(value)}
            </span>
            <span className={`flex items-center gap-1 text-[12px] font-medium tabular-nums ${tone}`}>
              <DirArrow direction={direction} />
              <span>{fmtChange(netChange)}</span>
              <span className="opacity-90">({fmtPct(changePct)})</span>
            </span>
          </div>
        )
      })}
    </div>
  )
}
