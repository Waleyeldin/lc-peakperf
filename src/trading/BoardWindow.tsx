import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { listen } from '@tauri-apps/api/event'
import MarketIndices from './components/MarketIndices'
import FullMarket from './components/FullMarket'
import RightPanel from './components/RightPanel'
import BrokerFlow from './components/BrokerFlow'
import BuySellDrawer from './components/BuySellDrawer'
import { FULL_MARKET_COLUMNS } from './data'
import type { Symbol } from './data'

/**
 * A detached "board" window that hosts multiple components as removable cards.
 * It opens seeded with one component (`/?board=<id>`) and appends more as the
 * main window sends them (Tauri event on desktop, BroadcastChannel on the web).
 */

const inTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
const defaultCols = FULL_MARKET_COLUMNS.filter((c) => c.default).map((c) => c.key)
const noop = () => {}

const TITLES: Record<string, string> = {
  'd-indices': 'Market Indices',
  'd-market': 'Market Table',
  'd-right': 'Watchlist',
  'broker-flow': 'Broker Trade Flow',
}

/** Wraps a trading panel so its Buy/Sell open a ticket inside this window. */
function TradeBody({ render }: { render: (onTrade: (s: Symbol, side: 'buy' | 'sell') => void) => ReactNode }) {
  const [trade, setTrade] = useState<{ open: boolean; side: 'buy' | 'sell'; symbol: Symbol | null }>({ open: false, side: 'buy', symbol: null })
  return (
    <>
      {render((symbol, side) => setTrade({ open: true, side, symbol }))}
      <BuySellDrawer open={trade.open} side={trade.side} symbol={trade.symbol} onSideChange={(side) => setTrade((t) => ({ ...t, side }))} onClose={() => setTrade((t) => ({ ...t, open: false }))} />
    </>
  )
}

function panelBody(id: string): ReactNode {
  switch (id) {
    case 'd-indices': return <MarketIndices />
    case 'd-market': return <TradeBody render={(onTrade) => <FullMarket visibleColumns={defaultCols} onOpenColumns={noop} onTrade={onTrade} />} />
    case 'd-right': return <TradeBody render={(onTrade) => <RightPanel onTrade={onTrade} />} />
    case 'broker-flow': return <BrokerFlow />
    default: return <div className="p-4 text-[13px] text-content-muted">Unknown component: {id}</div>
  }
}

export default function BoardWindow({ initial }: { initial: string[] }) {
  const [ids, setIds] = useState<string[]>(initial)

  useEffect(() => {
    const add = (id: string) => setIds((prev) => (prev.includes(id) ? prev : [...prev, id]))
    if (inTauri) {
      let un: (() => void) | undefined
      void listen<string>('board:add', (e) => add(e.payload)).then((f) => { un = f })
      return () => un?.()
    }
    const ch = new BroadcastChannel('board')
    ch.onmessage = (e) => add(String(e.data))
    return () => ch.close()
  }, [])

  const remove = (id: string) => setIds((prev) => prev.filter((x) => x !== id))

  return (
    <div className="min-h-screen w-screen bg-page p-3 text-content">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[12px] font-semibold text-content">Workspace board</span>
        <span className="text-[11px] text-content-muted">{ids.length} component{ids.length === 1 ? '' : 's'}</span>
      </div>
      <div className="flex flex-col gap-3">
        {ids.map((id) => (
          <section key={id} className="overflow-hidden rounded-xl border border-border-dark bg-surface">
            <header className="flex items-center justify-between border-b border-border-dark px-3 py-1.5">
              <span className="text-[12px] font-semibold text-content">{TITLES[id] ?? id}</span>
              <button onClick={() => remove(id)} title="Remove from board" aria-label="Remove from board" className="rounded p-1 text-content-muted hover:bg-[rgba(255,255,255,0.06)] hover:text-content">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 6l12 12M18 6L6 18" /></svg>
              </button>
            </header>
            <div className="h-[560px] overflow-auto">{panelBody(id)}</div>
          </section>
        ))}
        {ids.length === 0 && (
          <div className="rounded-xl border border-dashed border-border-dark p-10 text-center text-[13px] text-content-muted">
            Board is empty. Pop a component out from the main window to add it here.
          </div>
        )}
      </div>
    </div>
  )
}
