import { DirArrow } from './ui'
import { TICKERS, fmtPrice, fmtChange, fmtPct } from '../data'
import { useLiveData } from '../liveData'
import type { Direction } from '../data'

/**
 * Full-width horizontal market-summary strip (≈48px) for the FAB Securities
 * dark trading dashboard. Renders the index tickers in a dense, scrollable
 * row separated by thin vertical dividers, each colour-coded by direction.
 */
export default function MarketStrip() {
  const { quotes } = useLiveData()
  const dfmgi = quotes.get('DFMGI')

  return (
    <div className="flex h-12 w-full items-stretch overflow-x-auto border-b border-border-dark bg-[#141619]">
      {TICKERS.map((t) => {
        // Overlay the DFM General Index with real Yahoo data when available.
        const live = t.label === 'DFM General Index' && dfmgi ? dfmgi : null
        const value = live ? live.last : t.value
        const netChange = live ? live.change : t.netChange
        const changePct = live ? live.changePct : t.changePct
        const direction: Direction = live
          ? live.change > 0 ? 'up' : live.change < 0 ? 'down' : 'flat'
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
