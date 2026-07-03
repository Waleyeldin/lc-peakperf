import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import RGL, { WidthProvider } from 'react-grid-layout/legacy'
import type { Layout, LayoutItem } from 'react-grid-layout/legacy'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'
import MarketIndices from './MarketIndices'
import FullMarket from './FullMarket'
import RightPanel from './RightPanel'
import BrokerDesk from './BrokerDesk'
import OrderPlacementAI from './OrderPlacementAI'
import BuySellDrawer from './BuySellDrawer'
import { GraphPanelBody, PANEL_TITLES } from './FabTerminal'
import { FULL_MARKET_COLUMNS } from '../data'
import type { Symbol } from '../data'

/**
 * A draggable, resizable dashboard of trading components. Cards snap to a grid,
 * auto-pack (no overlap) and can be placed side-by-side or stacked. Shared by
 * the detached board window and the docked-in-main board so both behave the
 * same. Drag a card by its header; resize from the bottom-right corner.
 */

const ResponsiveGrid = WidthProvider(RGL)

const defaultCols = FULL_MARKET_COLUMNS.filter((c) => c.default).map((c) => c.key)
const noop = () => {}

export const BOARD_TITLES: Record<string, string> = {
  'd-indices': 'Market Indices',
  'd-market': 'Market Table',
  'd-right': 'Watchlist',
  'broker-flow': 'Order Placement',
  'order-ai': 'Order Placement · AI',
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
    case 'broker-flow': return <BrokerDesk compact />
    case 'order-ai': return <OrderPlacementAI compact />

    // Any other id is a Graph-look panel (indices, movers, news, …); render it
    // with FabTerminal's standalone panel body so both looks share the board.
    default: return <GraphPanelBody id={id} />
  }
}

/** Human title for a board card — Detailed sections first, then Graph panels. */
function cardTitle(id: string): string {
  return BOARD_TITLES[id] ?? PANEL_TITLES[id as keyof typeof PANEL_TITLES] ?? id
}

// ── Grid geometry ──────────────────────────────────────────────────────────
const COLS = 12
const ROW_H = 30
// New cards drop in at FULL board width and a generous height so a rich panel
// (e.g. Quote — the hero chart + fields grid) has room instead of overflowing.
// Drag the right/bottom edges to shrink or place cards side-by-side.
const DEFAULT_W = 12
const DEFAULT_H = 22

/** Build a layout item for a card that has no saved position yet. Placing it at
 *  the far bottom lets the grid's vertical compaction pack it into the first
 *  free slot. */
function freshItem(id: string): LayoutItem {
  return {
    i: id,
    x: 0,
    y: Infinity, // drop at the bottom; compaction pulls it up
    w: DEFAULT_W,
    h: DEFAULT_H,
    minW: 3,
    minH: 6,
  }
}

export default function BoardGrid({ ids, onRemove }: { ids: string[]; onRemove: (id: string) => void }) {
  const [layout, setLayout] = useState<LayoutItem[]>(() => ids.map((id) => freshItem(id)))

  // Keep the layout in sync with the id list: add items for new ids, drop
  // items whose id was removed. Existing positions are preserved.
  const currentLayout = useMemo(() => {
    const byId = new Map(layout.map((l) => [l.i, l]))
    return ids.map((id) => byId.get(id) ?? freshItem(id))
  }, [ids, layout])

  return (
    <ResponsiveGrid
      className="layout"
      layout={currentLayout}
      cols={COLS}
      rowHeight={ROW_H}
      margin={[12, 12]}
      containerPadding={[0, 0]}
      draggableHandle=".board-card-handle"
      compactType="vertical"
      isDraggable
      isResizable
      resizeHandles={['se', 's', 'e']}
      isBounded
      onLayoutChange={(l: Layout) => setLayout([...l])}
    >
      {ids.map((id) => {
        // Graph panels already render their own titled Panel box. Wrapping them
        // in the card's header + border too would produce a "box inside a box"
        // (e.g. a "News" frame inside a "News" frame). For those, skip the card
        // chrome and use small floating drag/remove controls instead.
        const selfFramed = id in PANEL_TITLES
        if (selfFramed) {
          return (
            <div key={id} className="group relative h-full overflow-hidden rounded-xl">
              {panelBody(id)}
              <div className="pointer-events-none absolute right-2 top-2 z-30 flex items-center gap-0.5 rounded-md border border-border-dark bg-surface/95 px-0.5 py-0.5 opacity-0 shadow-sm transition-opacity group-hover:pointer-events-auto group-hover:opacity-100">
                <button
                  type="button"
                  title="Drag to move"
                  aria-label="Drag to move"
                  className="board-card-handle flex h-5 w-5 cursor-move items-center justify-center rounded text-[13px] leading-none text-content-muted hover:bg-[rgba(255,255,255,0.06)] hover:text-content"
                >
                  ⠿
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={() => onRemove(id)}
                  title="Remove from board"
                  aria-label="Remove from board"
                  className="flex h-5 w-5 items-center justify-center rounded text-content-muted hover:bg-[rgba(255,255,255,0.06)] hover:text-content"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 6l12 12M18 6L6 18" /></svg>
                </button>
              </div>
            </div>
          )
        }
        return (
          <div key={id} className="overflow-hidden rounded-xl border border-border-dark bg-surface">
            <header className="board-card-handle flex cursor-move items-center justify-between border-b border-border-dark px-3 py-1.5">
              <span className="flex items-center gap-1.5 text-[12px] font-semibold text-content">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="text-content-muted"><circle cx="9" cy="6" r="1.6"/><circle cx="15" cy="6" r="1.6"/><circle cx="9" cy="12" r="1.6"/><circle cx="15" cy="12" r="1.6"/><circle cx="9" cy="18" r="1.6"/><circle cx="15" cy="18" r="1.6"/></svg>
                {cardTitle(id)}
              </span>
              <button
                onMouseDown={(e) => e.stopPropagation()}
                onClick={() => onRemove(id)}
                title="Remove from board"
                aria-label="Remove from board"
                className="rounded p-1 text-content-muted hover:bg-[rgba(255,255,255,0.06)] hover:text-content"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 6l12 12M18 6L6 18" /></svg>
              </button>
            </header>
            {/* Stretch whatever panel this card holds to fill the card (width +
                height) and scroll if it overflows, so resizing actually resizes
                the content — not just the frame. */}
            <div className="h-[calc(100%-34px)] w-full overflow-auto [&>*]:min-h-full [&>*]:w-full">{panelBody(id)}</div>
          </div>
        )
      })}
    </ResponsiveGrid>
  )
}
