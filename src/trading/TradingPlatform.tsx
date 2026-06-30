import { useEffect, useState, type ReactNode } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import type { Symbol } from './data'
import { MARKET_OPTIONS, FULL_MARKET_COLUMNS, FULL_MARKET, fmtPrice, fmtPct } from './data'
import { Button } from './components/ui'
import MarketStrip from './components/MarketStrip'
import MarketIndices from './components/MarketIndices'
import FullMarket from './components/FullMarket'
import RightPanel from './components/RightPanel'
import BuySellDrawer from './components/BuySellDrawer'
import ColumnDrawer from './components/ColumnDrawer'
import OrderEntry from './components/OrderEntry'
import OrderMonitor from './components/OrderMonitor'
import BasketOrder from './components/BasketOrder'
import MarketDepthDetail from './components/MarketDepthDetail'
import PortfolioScreen from './components/PortfolioScreen'
import ChartsScreen from './components/ChartsScreen'
import Placeholder from './components/Placeholder'
import FabTerminal from './components/FabTerminal'
import BrokerFlow from './components/BrokerFlow'
import TabBar from './components/TabBar'
import { sendToBoard, closeBoard } from './popout'
import { useLiveData } from './liveData'
import FloatingToolbar from './components/FloatingToolbar'

type Section = 'Pricing' | 'Trading' | 'Management'
type Side = 'buy' | 'sell'
type ScreenKey = 'market-watch' | 'full-market' | 'market-depth' | 'charts' | 'order-entry' | 'order-monitor' | 'basket' | 'portfolio' | 'broker-flow' | 'placeholder'

interface NavLeaf { label: string; screen: ScreenKey }
interface NavGroup { group: string; items: NavLeaf[] }
interface NavSection { section: Section; icon: string; groups: NavGroup[] }

/**
 * Three-level navigation mirroring the legacy TRADENET X ribbon:
 * Section (Pricing/Trading/Management) → Group (ribbon group) → Item (ribbon button).
 * Pricing & Trading groups/items are taken from the reference ribbons; Management
 * is inferred (it wasn't shown in the reference screenshots).
 */
const NAV_TREE: NavSection[] = [
  {
    section: 'Pricing',
    icon: 'M3 3v18h18 M7 14l3-3 3 2 5-6',
    groups: [
      { group: 'Basic', items: [
        { label: 'Market Status', screen: 'placeholder' },
        { label: 'News & Announcements', screen: 'placeholder' },
        { label: 'Time & Sales', screen: 'market-depth' },
        { label: 'Price Spectrum', screen: 'placeholder' },
        { label: 'Market Map', screen: 'placeholder' },
        { label: 'Market Summary', screen: 'market-watch' },
        { label: 'Full Market', screen: 'full-market' },
        { label: 'Market Indices', screen: 'market-watch' },
      ] },
      { group: 'Market Depth', items: [
        { label: 'Market Depth By Order', screen: 'market-depth' },
        { label: 'Market Depth By Price', screen: 'market-depth' },
      ] },
      { group: 'Historical Information', items: [
        { label: 'Exporting History', screen: 'placeholder' },
      ] },
      { group: 'Top Symbols', items: [
        { label: 'Top Symbols', screen: 'market-watch' },
        { label: 'Historical Top Symbols', screen: 'placeholder' },
      ] },
      { group: 'Tickers', items: [
        { label: 'Pricing Ticker', screen: 'placeholder' },
        { label: 'Trading Ticker', screen: 'placeholder' },
        { label: 'Announcements Ticker', screen: 'placeholder' },
      ] },
      { group: 'Charts', items: [
        { label: 'Charts', screen: 'charts' },
      ] },
      { group: 'Watch List', items: [
        { label: 'Saved Watch List', screen: 'market-watch' },
      ] },
      { group: 'Market Performance', items: [
        { label: 'Market Performance Indices', screen: 'placeholder' },
        { label: 'Market Performance Security', screen: 'placeholder' },
      ] },
    ],
  },
  {
    section: 'Trading',
    icon: 'M4 17l6-6 4 4 6-7 M14 5h6v6',
    groups: [
      { group: 'Trading', items: [
        { label: 'Order Entry', screen: 'order-entry' },
        { label: 'Detailed Order Entry', screen: 'order-entry' },
        { label: 'Basket Order', screen: 'basket' },
        { label: 'Order Statistics', screen: 'order-monitor' },
        { label: 'Suspended Orders', screen: 'order-monitor' },
        { label: 'Portfolio Positioning', screen: 'portfolio' },
        { label: 'Order Monitor', screen: 'order-monitor' },
        { label: 'Transactions Ticker', screen: 'order-monitor' },
      ] },
      { group: 'Care Orders', items: [
        { label: 'Ticket Entry', screen: 'order-entry' },
        { label: 'Sales Ticket Monitoring', screen: 'order-monitor' },
      ] },
      { group: 'Process', items: [
        { label: 'Broker Trade Flow', screen: 'broker-flow' },
      ] },
    ],
  },
  {
    section: 'Management',
    icon: 'M3 7h18 M3 12h18 M3 17h12',
    groups: [
      { group: 'Portfolio', items: [
        { label: 'Portfolio Positioning', screen: 'portfolio' },
        { label: 'Holdings & Valuation', screen: 'portfolio' },
      ] },
      { group: 'Clients', items: [
        { label: 'Client Search', screen: 'placeholder' },
        { label: 'Client Accounts', screen: 'placeholder' },
      ] },
      { group: 'Cash & Settlement', items: [
        { label: 'Cash Movement', screen: 'placeholder' },
        { label: 'Settlements', screen: 'placeholder' },
        { label: 'Purchase Power', screen: 'portfolio' },
      ] },
      { group: 'Reports', items: [
        { label: 'Daily Reports', screen: 'placeholder' },
        { label: 'Statements', screen: 'placeholder' },
      ] },
    ],
  },
]

const DEFAULT_LEAF: ActiveLeaf = { section: 'Pricing', group: 'Basic', label: 'Market Summary', screen: 'market-watch' }
interface ActiveLeaf extends NavLeaf { section: Section; group: string }

/** Flattened list of every navigable page, used by the global search. */
const PAGE_INDEX: ActiveLeaf[] = NAV_TREE.flatMap((sec) =>
  sec.groups.flatMap((g) => g.items.map((leaf) => ({ ...leaf, section: sec.section, group: g.group }))),
)

/** Browser-style document tabs — the open "files" from the eAccess header. */
/** The merged workspace renders one of two "looks", switched by hotkey. */
type ViewMode = 'detailed' | 'graph'
/** One fixed document name across both looks — only the layout changes. */
const DOC_NAME = 'LC…PeakPerf'

interface Tab { id: string; title: string; kind: 'workspace' | 'placeholder'; pinned?: boolean }
const INITIAL_TABS: Tab[] = [
  { id: 'lc', title: 'LC…PeakPerf', kind: 'workspace' },
]

function NavIcon({ d }: { d: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {d.split(' M').map((seg, i) => (
        <path key={i} d={(i === 0 ? '' : 'M') + seg} />
      ))}
    </svg>
  )
}

/** Disclosure chevron that rotates when open. */
function Chevron({ open, small, className = '' }: { open: boolean; small?: boolean; className?: string }) {
  const s = small ? 11 : 13
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 transition-transform ${open ? 'rotate-90' : ''} ${className}`}
    >
      <path d="M9 6l6 6-6 6" />
    </svg>
  )
}

/** Workspace dropdown — replaces the legacy Workspace ▸ Windows Management menu. */
function WorkspaceMenu() {
  const [open, setOpen] = useState(false)
  const items = ['Create New Window', 'Windows Manager', '—', 'Save Workspace', 'Save Workspace As…', 'Restore to Default', 'Reset Workspace', '—', 'Saved Workspaces ▸']
  return (
    <div className="relative">
      <Button variant="default" size="sm" onClick={() => setOpen((o) => !o)} onBlur={() => setTimeout(() => setOpen(false), 150)}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>
        Workspace
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>
      </Button>
      {open && (
        <div className="absolute right-0 top-9 z-50 w-56 rounded-lg border border-border-dark bg-surface py-1 shadow-2xl">
          {items.map((it, i) =>
            it === '—' ? (
              <div key={i} className="my-1 h-px bg-border-dark" />
            ) : (
              <button key={i} className="block w-full px-3 py-1.5 text-left text-[13px] text-content hover:bg-[rgba(255,255,255,0.06)]">
                {it}
              </button>
            ),
          )}
        </div>
      )}
    </div>
  )
}

/** Segmented Detailed ⇄ Graph switch shown in the top bar (shortcut: F11). */
function ViewModeToggle({ mode, onChange }: { mode: ViewMode; onChange: (m: ViewMode) => void }) {
  return (
    <div
      className="ml-4 flex items-center gap-1.5 rounded-lg border border-[#5b9bff]/40 bg-[#5b9bff]/10 px-1.5 py-1"
      title="Switch the workspace look — shortcut: F11"
    >
      <div className="flex items-center gap-0.5">
        {(['detailed', 'graph'] as const).map((m) => (
          <button
            key={m}
            onClick={() => onChange(m)}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-[12px] font-semibold transition-colors ${
              mode === m ? 'bg-[#5b9bff] text-white shadow' : 'text-white/60 hover:bg-white/10 hover:text-white'
            }`}
          >
            {m === 'detailed' ? (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 5h18M3 12h18M3 19h12" /></svg>
            ) : (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18" /><path d="M7 14l3-3 3 3 4-5" /></svg>
            )}
            {m === 'detailed' ? 'Detailed' : 'Graph'}
          </button>
        ))}
      </div>
      <kbd className="rounded bg-black/40 px-1.5 py-0.5 font-mono text-[10px] font-semibold leading-none text-[#9cc0ff]">F11</kbd>
    </div>
  )
}

// ── Detailed-view shortcuts (parity with Graph's F-keys) ────────────────────
type DetailedAction =
  | { kind: 'help' }
  | { kind: 'buy' }
  | { kind: 'sell' }
  | { kind: 'search' }
  | { kind: 'broker' }
  | { kind: 'pop'; panel: string; title: string }
  | { kind: 'redock' }
  | { kind: 'look' }

const DETAILED_HOTKEYS: { key: string; label: string; hint: string; action: DetailedAction }[] = [
  { key: 'F1', label: 'Help', hint: 'Show / hide this shortcuts panel', action: { kind: 'help' } },
  { key: 'F2', label: 'Buy', hint: 'Open a buy ticket', action: { kind: 'buy' } },
  { key: 'F3', label: 'Sell', hint: 'Open a sell ticket', action: { kind: 'sell' } },
  { key: 'F4', label: 'Search', hint: 'Jump to the symbol search box', action: { kind: 'search' } },
  { key: 'F5', label: 'Broker Flow', hint: 'Open the Broker Trade Flow (most used)', action: { kind: 'broker' } },
  { key: 'F6', label: 'Market', hint: 'Send the market table to the board window', action: { kind: 'pop', panel: 'd-market', title: 'Market' } },
  { key: 'F7', label: 'Watchlist', hint: 'Send the watchlist to the board window', action: { kind: 'pop', panel: 'd-right', title: 'Watchlist' } },
  { key: 'F8', label: 'Indices', hint: 'Send the market indices to the board window', action: { kind: 'pop', panel: 'd-indices', title: 'Indices' } },
  { key: 'F10', label: 'Close board', hint: 'Close the pop-out board window', action: { kind: 'redock' } },
  { key: 'F11', label: 'Switch look', hint: 'Toggle Detailed ⇄ Graph', action: { kind: 'look' } },
]

function DetailedShortcutBar({ onTrigger }: { onTrigger: (a: DetailedAction) => void }) {
  return (
    <div className="flex shrink-0 items-center gap-1.5 overflow-x-auto whitespace-nowrap border-t border-border-dark bg-[#15171a] px-3 py-1.5">
      <span className="mr-1 text-[10px] font-semibold uppercase tracking-wide text-content-subtle">Shortcuts</span>
      {DETAILED_HOTKEYS.map((h) => (
        <button
          key={h.key}
          type="button"
          title={h.hint}
          onClick={() => onTrigger(h.action)}
          className="flex items-center gap-1.5 rounded border border-border-dark bg-[#1a1c1e] px-1.5 py-0.5 text-[11px] text-content-muted transition-colors hover:border-action/60 hover:text-content"
        >
          <kbd className="rounded bg-[#0b0c0d] px-1 py-px font-mono text-[10px] font-semibold text-action">{h.key}</kbd>
          {h.label}
        </button>
      ))}
    </div>
  )
}

function DetailedHelp({ open, onClose, onTrigger }: { open: boolean; onClose: () => void; onTrigger: (a: DetailedAction) => void }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="w-[460px] max-w-[90%] rounded-2xl border border-border-dark bg-surface p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-content">Keyboard shortcuts · Detailed</h2>
          <button type="button" onClick={onClose} className="rounded p-1 text-content-muted hover:bg-[rgba(255,255,255,0.06)] hover:text-content" aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
        <ul className="flex flex-col gap-1">
          {DETAILED_HOTKEYS.map((h) => (
            <li key={h.key}>
              <button type="button" onClick={() => onTrigger(h.action)} className="flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left hover:bg-[rgba(255,255,255,0.05)]">
                <kbd className="w-10 shrink-0 rounded bg-[#0b0c0d] py-0.5 text-center font-mono text-[11px] font-semibold text-action">{h.key}</kbd>
                <span className="w-24 shrink-0 text-[12px] font-medium text-content">{h.label}</span>
                <span className="flex-1 text-[12px] text-content-muted">{h.hint}</span>
              </button>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[11px] text-content-subtle">Press <kbd className="rounded bg-[#0b0c0d] px-1 font-mono text-action">F1</kbd> or <kbd className="rounded bg-[#0b0c0d] px-1 font-mono text-action">Esc</kbd> to close.</p>
      </div>
    </div>
  )
}

/**
 * Universal search in the top bar — finds navigable pages (the left-sidebar
 * items like "Portfolio Positioning") AND market symbols/companies, not just
 * symbol IDs. Selecting a page navigates to it; selecting a symbol opens a
 * Buy ticket for it.
 */
function GlobalSearch({
  onNavigate,
  onPickSymbol,
}: {
  onNavigate: (leaf: ActiveLeaf) => void
  onPickSymbol: (symbol: Symbol) => void
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const q = query.trim().toLowerCase()

  const pages = q
    ? PAGE_INDEX.filter((p) => `${p.label} ${p.group} ${p.section}`.toLowerCase().includes(q)).slice(0, 6)
    : []
  const symbols = q
    ? FULL_MARKET.filter((s) => `${s.symbolName} ${s.symbolShortName} ${s.id}`.toLowerCase().includes(q)).slice(0, 7)
    : []
  const hasResults = pages.length > 0 || symbols.length > 0

  const reset = () => { setQuery(''); setOpen(false) }
  const pickPage = (p: ActiveLeaf) => { onNavigate(p); reset() }
  const pickSymbol = (s: Symbol) => { onPickSymbol(s); reset() }

  return (
    <div className="relative ml-2 hidden flex-1 md:block">
      <svg className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/40" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
      <input
        id="detailed-search"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') { reset(); (e.target as HTMLInputElement).blur() }
          else if (e.key === 'Enter') { if (symbols[0]) pickSymbol(symbols[0]); else if (pages[0]) pickPage(pages[0]) }
        }}
        placeholder="Search pages, symbols, companies…"
        className="h-8 w-full max-w-[460px] rounded-md border border-white/10 bg-white/5 pl-9 pr-3 text-[13px] text-white placeholder:text-white/40 outline-none focus:border-[#5b9bff]"
      />
      {open && q && (
        <div className="absolute left-0 top-full z-40 mt-1 max-h-[440px] w-[460px] max-w-full overflow-auto rounded-lg border border-border-dark bg-surface text-content shadow-2xl">
          {!hasResults && <div className="px-3 py-4 text-center text-[12px] text-content-muted">No matches for “{query}”</div>}
          {symbols.length > 0 && (
            <div className="py-1">
              <div className="flex items-center gap-1.5 px-3 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-wide text-content-subtle">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M3 17l6-6 4 4 7-8" /></svg>
                Symbols
              </div>
              {symbols.map((s) => {
                const tone = s.changePct > 0 ? 'text-up' : s.changePct < 0 ? 'text-down' : 'text-flat'
                return (
                  <button
                    key={s.id}
                    onMouseDown={(e) => { e.preventDefault(); pickSymbol(s) }}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[12px] hover:bg-[rgba(0,98,255,0.12)]"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#1f2226] text-[10px] font-bold text-content-muted">{s.symbolShortName.slice(0, 2)}</span>
                    <span className="w-24 shrink-0 truncate font-semibold text-content">{s.symbolShortName}</span>
                    <span className="flex-1 truncate text-content-muted" title={s.symbolName}>{s.symbolName}</span>
                    <span className="shrink-0 tabular-nums text-content">{fmtPrice(s.lastPrice)}</span>
                    <span className={`w-14 shrink-0 text-right tabular-nums ${tone}`}>{fmtPct(s.changePct)}</span>
                  </button>
                )
              })}
            </div>
          )}
          {pages.length > 0 && (
            <div className={`py-1 ${symbols.length > 0 ? 'border-t border-border-dark' : ''}`}>
              <div className="flex items-center gap-1.5 px-3 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-wide text-content-subtle">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" /></svg>
                Pages
              </div>
              {pages.map((p) => (
                <button
                  key={`${p.section}/${p.group}/${p.label}`}
                  onMouseDown={(e) => { e.preventDefault(); pickPage(p) }}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[12px] hover:bg-[rgba(0,98,255,0.12)]"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#1f2226] text-content-subtle">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6h16M4 12h16M4 18h10" /></svg>
                  </span>
                  <span className="font-medium text-content">{p.label}</span>
                  <span className="ml-auto shrink-0 text-[11px] text-content-subtle">{p.section} › {p.group}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/** Top-bar indicator: green when DFM live data is flowing, else simulated. */
function LiveStatusPill() {
  const { status, lastUpdated, quotes } = useLiveData()
  const live = status === 'live' && quotes.size > 0
  const time = lastUpdated ? new Date(lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : ''
  return (
    <div
      className="flex items-center gap-1.5 text-[12px] text-white/70"
      title={live ? `DFM live via Yahoo Finance · updated ${time}. ADX has no free feed, so it stays simulated.` : 'No live feed reachable — showing simulated data.'}
    >
      <span className={`inline-block size-2 rounded-full ${live ? 'bg-up shadow-[0_0_6px_rgba(47,208,122,0.8)]' : status === 'connecting' ? 'bg-amber-400' : 'bg-white/40'}`} />
      {live ? `DFM live · ${time}` : status === 'connecting' ? 'Connecting…' : 'Simulated'}
    </div>
  )
}

export default function TradingPlatform() {
  const [openSection, setOpenSection] = useState<Section>('Pricing')
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set(['Pricing/Basic']))
  const [active, setActive] = useState<ActiveLeaf>(DEFAULT_LEAF)
  const [market, setMarket] = useState(MARKET_OPTIONS[1])
  const [columnsOpen, setColumnsOpen] = useState(false)
  const [visibleColumns, setVisibleColumns] = useState<string[]>(
    FULL_MARKET_COLUMNS.filter((c) => c.default).map((c) => c.key),
  )
  const [trade, setTrade] = useState<{ open: boolean; side: Side; symbol: Symbol | null }>({ open: false, side: 'buy', symbol: null })

  const openTrade = (symbol: Symbol, side: Side) => setTrade({ open: true, side, symbol })

  // ── Document tabs ──────────────────────────────────────────────
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [tabs, setTabs] = useState<Tab[]>(INITIAL_TABS)
  const [activeTab, setActiveTab] = useState(() => {
    const requested = searchParams.get('tab')
    return INITIAL_TABS.some((t) => t.id === requested) ? (requested as string) : 'lc'
  })
  const current = tabs.find((t) => t.id === activeTab) ?? tabs[0]

  // ── Workspace look (Detailed ⇄ Graph) ──────────────────────────
  // Both designs live in one document; the backtick key (or the top-bar
  // toggle) flips between them. Initial look can be seeded via ?mode=.
  const [viewMode, setViewMode] = useState<ViewMode>(() => (searchParams.get('mode') === 'detailed' ? 'detailed' : 'graph'))
  // One fixed document name across both looks.
  const displayTabs = tabs.map((t) => (t.kind === 'workspace' ? { ...t, title: DOC_NAME } : t))

  // Jump to the (most-used) Broker Trade Flow screen, switching to Detailed.
  const openBrokerFlow = () => {
    setViewMode('detailed')
    setOpenSection('Trading')
    setOpenGroups((g) => new Set(g).add('Trading/Process'))
    setActive({ section: 'Trading', group: 'Process', label: 'Broker Trade Flow', screen: 'broker-flow' })
  }

  // Global workspace shortcuts (both looks): F11 switches look, F5 opens the
  // Broker Trade Flow. Handled here once so neither look double-fires.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (current.kind !== 'workspace') return
      if (e.key === 'F11') { e.preventDefault(); setViewMode((m) => (m === 'detailed' ? 'graph' : 'detailed')) }
      else if (e.key === 'F5') { e.preventDefault(); openBrokerFlow() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current.kind])

  // ── Detailed-view chrome: pop-out to board + F-key shortcuts + help ────────
  const [dHelpOpen, setDHelpOpen] = useState(false)
  const detailedActive = current.kind === 'workspace' && viewMode === 'detailed'

  const runDetailed = (a: DetailedAction) => {
    switch (a.kind) {
      case 'help': setDHelpOpen((o) => !o); break
      case 'buy': setTrade({ open: true, side: 'buy', symbol: null }); break
      case 'sell': setTrade({ open: true, side: 'sell', symbol: null }); break
      case 'search': setDHelpOpen(false); document.getElementById('detailed-search')?.focus(); break
      case 'broker': setDHelpOpen(false); openBrokerFlow(); break
      case 'pop': setDHelpOpen(false); void sendToBoard(a.panel); break
      case 'redock': void closeBoard(); break
      case 'look': setViewMode((m) => (m === 'detailed' ? 'graph' : 'detailed')); break
    }
  }

  useEffect(() => {
    if (!detailedActive) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && dHelpOpen) { setDHelpOpen(false); return }
      if (e.key === 'F11' || e.key === 'F5') return // handled by the global workspace listener
      const hk = DETAILED_HOTKEYS.find((h) => h.key === e.key)
      if (!hk) return
      e.preventDefault()
      runDetailed(hk.action)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detailedActive, dHelpOpen])

  const closeTab = (id: string) => {
    const idx = tabs.findIndex((t) => t.id === id)
    const next = tabs.filter((t) => t.id !== id)
    if (next.length === 0) {
      navigate('/') // closing the last tab returns to FAB eAccess
      return
    }
    setTabs(next)
    if (id === activeTab) setActiveTab((next[idx] ?? next[idx - 1] ?? next[0]).id)
  }
  const newTab = () => {
    const id = `t${Date.now()}`
    setTabs((prev) => [...prev, { id, title: 'New Tab', kind: 'placeholder' }])
    setActiveTab(id)
  }
  const togglePin = (id: string) =>
    setTabs((prev) => prev.map((t) => (t.id === id ? { ...t, pinned: !t.pinned } : t)))
  const openInWindow = () => {
    // Pop the document into its own browser window — handy for a second monitor.
    window.open(`${window.location.origin}/trading?tab=lc`, '_blank', 'noopener,noreferrer,width=1360,height=880')
  }

  const toggleSection = (s: Section, firstGroup: string) => {
    setOpenSection(s)
    setOpenGroups((g) => new Set(g).add(`${s}/${firstGroup}`))
  }
  const toggleGroup = (key: string) =>
    setOpenGroups((g) => {
      const n = new Set(g)
      n.has(key) ? n.delete(key) : n.add(key)
      return n
    })

  /** Full-width screens get a scrolling container; Market Watch keeps the right panel. */
  function screenWrap(node: ReactNode) {
    return <div className="min-h-0 flex-1 overflow-y-auto p-3">{node}</div>
  }

  function renderScreen() {
    switch (active.screen) {
      case 'full-market':
        // Dedicated maximized Full Market page: filter bar + table fill the area.
        return (
          <div className="flex min-h-0 flex-1 flex-col p-3">
            <FullMarket visibleColumns={visibleColumns} onOpenColumns={() => setColumnsOpen(true)} onTrade={openTrade} />
          </div>
        )
      case 'market-depth':
        return screenWrap(<MarketDepthDetail onTrade={openTrade} />)
      case 'charts':
        return screenWrap(<ChartsScreen />)
      case 'order-entry':
        return screenWrap(<OrderEntry onTrade={openTrade} />)
      case 'basket':
        return screenWrap(<BasketOrder />)
      case 'order-monitor':
        return screenWrap(<OrderMonitor initialView={active.label} />)
      case 'portfolio':
        return screenWrap(<PortfolioScreen />)
      case 'broker-flow':
        return <div className="min-h-0 flex-1 overflow-hidden"><BrokerFlow onPopOut={() => void sendToBoard('broker-flow')} /></div>
      case 'placeholder':
        return screenWrap(<Placeholder title={active.label} group={active.group} />)
      default:
        // Market Watch dashboard: center tables + right panel
        return (
          <div className="flex min-h-0 flex-1">
            <div className="flex min-w-0 flex-1 flex-col gap-3 overflow-y-auto p-3">
              <MarketIndices onPopOut={() => void sendToBoard('d-indices')} />
              <FullMarket visibleColumns={visibleColumns} onOpenColumns={() => setColumnsOpen(true)} onTrade={openTrade} onPopOut={() => void sendToBoard('d-market')} />
            </div>
            <RightPanel onTrade={openTrade} onPopOut={() => void sendToBoard('d-right')} />
          </div>
        )
    }
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-page text-content">
      {/* ── Top bar ─────────────────────────────────────────────── */}
      <header className="flex h-12 shrink-0 items-center gap-4 border-b border-border-dark bg-[#0b1b4d] px-4">
        <Link to="/" className="flex items-center gap-2 text-white" title="Back to FAB eAccess">
          <span className="text-[15px] font-bold tracking-tight">TRADE<span className="text-[#5b9bff]">NET</span> X</span>
        </Link>
        <span className="text-white/30">/</span>
        <span className="text-[13px] font-medium text-white/80">{current.kind === 'workspace' ? DOC_NAME : current.title}</span>
        {current.kind === 'workspace' && <ViewModeToggle mode={viewMode} onChange={setViewMode} />}

        <GlobalSearch
          onNavigate={(leaf) => {
            setViewMode('detailed')
            setOpenSection(leaf.section)
            setOpenGroups((g) => new Set(g).add(`${leaf.section}/${leaf.group}`))
            setActive(leaf)
          }}
          onPickSymbol={(symbol) => setTrade({ open: true, side: 'buy', symbol })}
        />

        <div className="ml-auto flex items-center gap-3">
          <div className="relative">
            <select
              value={market}
              onChange={(e) => setMarket(e.target.value)}
              className="h-8 appearance-none rounded-md border border-white/10 bg-white/5 pl-2.5 pr-8 text-[13px] text-white outline-none focus:border-[#5b9bff]"
            >
              {MARKET_OPTIONS.map((m) => (
                <option key={m} className="bg-surface">{m}</option>
              ))}
            </select>
            <svg className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-white/60" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
          </div>
          <LiveStatusPill />
          <WorkspaceMenu />
          <div className="flex items-center gap-2 border-l border-white/10 pl-3">
            <span className="flex items-center gap-1.5 text-[12px] text-white/70">
              <span className="size-2 rounded-full bg-up shadow-[0_0_6px_rgba(47,208,122,0.8)]" /> Connected
            </span>
            <span className="hidden text-[12px] text-white/50 lg:inline">BANKFAB0335R1</span>
          </div>
          <div className="flex items-center gap-2 border-l border-white/10 pl-3">
            <div className="flex size-7 items-center justify-center rounded-full bg-[#5b9bff]/20 text-[11px] font-semibold text-[#9cc0ff]">MB</div>
            <div className="hidden leading-tight lg:block">
              <div className="text-[12px] font-medium text-white">MAHLYA</div>
              <div className="text-[10px] text-white/50">broker08</div>
            </div>
          </div>
        </div>
      </header>

      {/* ── Browser-style document tabs (pin / window / close) ──── */}
      <TabBar
        tabs={displayTabs}
        activeId={activeTab}
        onSelect={setActiveTab}
        onClose={closeTab}
        onTogglePin={togglePin}
        onOpenWindow={openInWindow}
        onNew={newTab}
      />

      {/* ── Body ────────────────────────────────────────────────── */}
      {detailedActive ? (
      <>
      <div className="flex min-h-0 flex-1">
        {/* Left navigation — 3 levels: Section → Group → Item */}
        <nav className="flex w-64 shrink-0 flex-col gap-0.5 overflow-y-auto border-r border-border-dark bg-[#141619] p-2">
          {NAV_TREE.map((sec) => {
            const sectionOpen = openSection === sec.section
            return (
              <div key={sec.section} className="mb-0.5">
                {/* Level 1 — Section */}
                <button
                  onClick={() => toggleSection(sec.section, sec.groups[0].group)}
                  className={`flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-[13px] font-semibold transition-colors ${
                    sectionOpen ? 'bg-[rgba(0,98,255,0.14)] text-content' : 'text-content-muted hover:bg-[rgba(255,255,255,0.05)] hover:text-content'
                  }`}
                >
                  <NavIcon d={sec.icon} />
                  {sec.section}
                  <Chevron open={sectionOpen} className="ml-auto" />
                </button>

                {sectionOpen && (
                  <div className="mt-0.5 flex flex-col gap-0.5">
                    {sec.groups.map((g) => {
                      const gkey = `${sec.section}/${g.group}`
                      const groupOpen = openGroups.has(gkey)
                      return (
                        <div key={gkey}>
                          {/* Level 2 — Group */}
                          <button
                            onClick={() => toggleGroup(gkey)}
                            className="flex w-full items-center gap-1.5 rounded-md px-2.5 py-1.5 text-left text-[11px] font-semibold uppercase tracking-wide text-content-subtle transition-colors hover:text-content"
                          >
                            <Chevron open={groupOpen} small />
                            <span className="truncate">{g.group}</span>
                          </button>
                          {/* Level 3 — Items */}
                          {groupOpen && (
                            <div className="ml-[14px] flex flex-col gap-0.5 border-l border-border-dark pl-2">
                              {g.items.map((leaf) => {
                                const isActive = active.section === sec.section && active.group === g.group && active.label === leaf.label
                                return (
                                  <button
                                    key={leaf.label}
                                    onClick={() => setActive({ ...leaf, section: sec.section, group: g.group })}
                                    className={`rounded-md px-2.5 py-1.5 text-left text-[12.5px] leading-tight transition-colors ${
                                      isActive ? 'bg-[rgba(0,98,255,0.16)] text-content' : 'text-content-muted hover:bg-[rgba(255,255,255,0.05)] hover:text-content'
                                    }`}
                                  >
                                    {leaf.label}
                                  </button>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </nav>

        {/* Main column */}
        <main className="flex min-w-0 flex-1 flex-col">
          {/* Task-grouped toolbar (replaces the ribbon) */}
          <div className="flex h-11 shrink-0 items-center gap-1 border-b border-border-dark bg-[#141619] px-3">
            <span className="mr-2 flex items-center gap-1.5 text-[12px]">
              <span className="text-content-subtle">{active.section}</span>
              <span className="text-content-subtle">›</span>
              <span className="text-content-subtle">{active.group}</span>
              <span className="text-content-subtle">›</span>
              <span className="font-semibold text-content">{active.label}</span>
            </span>
            <Toolbar onColumns={() => setColumnsOpen(true)} onTrade={(side) => setTrade({ open: true, side, symbol: null })} />
          </div>

          {/* Market summary strip */}
          <MarketStrip />

          {/* Active screen */}
          {renderScreen()}
        </main>
      </div>
      <DetailedShortcutBar onTrigger={runDetailed} />
      </>
      ) : current.kind === 'workspace' ? (
        <div className="min-h-0 flex-1 overflow-hidden bg-page">
          <FabTerminal onTrade={openTrade} onBrokerFlow={openBrokerFlow} />
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 items-center justify-center bg-page p-6">
          <Placeholder title={current.title} group="Open document" />
        </div>
      )}

      {/* ── Overlays ────────────────────────────────────────────── */}
      <DetailedHelp open={detailedActive && dHelpOpen} onClose={() => setDHelpOpen(false)} onTrigger={runDetailed} />
      <FloatingToolbar />
      <ColumnDrawer open={columnsOpen} onClose={() => setColumnsOpen(false)} visible={visibleColumns} onChange={setVisibleColumns} />
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

/** Task-grouped quick actions for the active screen (replaces the icon ribbon). */
function Toolbar({ onColumns, onTrade }: { onColumns: () => void; onTrade: (side: Side) => void }) {
  return (
    <div className="flex items-center gap-1.5">
      <Button size="sm" variant="buy" onClick={() => onTrade('buy')}>Buy</Button>
      <Button size="sm" variant="sell" onClick={() => onTrade('sell')}>Sell</Button>
      <div className="mx-1 h-5 w-px bg-border-dark" />
      <Button size="sm" variant="default">＋ New Window</Button>
      <Button size="sm" variant="default">Saved Views ▾</Button>
      <Button size="sm" variant="default" onClick={onColumns}>Columns</Button>
      <div className="mx-1 h-5 w-px bg-border-dark" />
      <Button size="sm" variant="ghost">Export</Button>
    </div>
  )
}
