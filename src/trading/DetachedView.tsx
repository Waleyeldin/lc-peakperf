import { useState } from 'react'
import type { ReactNode } from 'react'
import { DetachedPanel } from './components/FabTerminal'
import MarketIndices from './components/MarketIndices'
import FullMarket from './components/FullMarket'
import RightPanel from './components/RightPanel'
import BrokerFlow from './components/BrokerFlow'
import BuySellDrawer from './components/BuySellDrawer'
import { FULL_MARKET_COLUMNS } from './data'
import type { Symbol } from './data'

type Side = 'buy' | 'sell'
const defaultCols = FULL_MARKET_COLUMNS.filter((c) => c.default).map((c) => c.key)

/**
 * Wraps a panel so its Buy/Sell buttons open a real order ticket *inside this
 * window*. The detached window has no parent TradingPlatform to host the
 * drawer, so each trading panel carries its own.
 */
function TradeHost({ render }: { render: (onTrade: (s: Symbol, side: Side) => void) => ReactNode }) {
  const [trade, setTrade] = useState<{ open: boolean; side: Side; symbol: Symbol | null }>({ open: false, side: 'buy', symbol: null })
  return (
    <div className="h-screen w-screen overflow-auto bg-page p-3 text-content">
      {render((symbol, side) => setTrade({ open: true, side, symbol }))}
      <BuySellDrawer
        open={trade.open}
        side={trade.side}
        symbol={trade.symbol}
        onSideChange={(side) => setTrade((t) => ({ ...t, side }))}
        onClose={() => setTrade((t) => ({ ...t, open: false }))}
      />
    </div>
  )
}

/**
 * Renders ONE panel filling its own window (the target of `/?detach=<id>`).
 * `d-*` ids are Detailed-view sections; everything else is a Graph panel and
 * is delegated to FabTerminal's standalone renderer.
 */
export default function DetachedView({ id }: { id: string }) {
  switch (id) {
    case 'd-indices':
      return <div className="h-screen w-screen overflow-auto bg-page p-3 text-content"><MarketIndices /></div>
    case 'd-market':
      return <TradeHost render={(onTrade) => <FullMarket visibleColumns={defaultCols} onOpenColumns={() => {}} onTrade={onTrade} />} />
    case 'd-right':
      return <TradeHost render={(onTrade) => <RightPanel onTrade={onTrade} />} />
    case 'broker-flow':
      return <div className="h-screen w-screen bg-page"><BrokerFlow /></div>
    default:
      return <DetachedPanel id={id} />
  }
}
