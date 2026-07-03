import { useEffect, useState } from 'react'

export interface TabItem {
  id: string
  title: string
  pinned?: boolean
}

interface TabBarProps {
  tabs: TabItem[]
  activeId: string
  onSelect: (id: string) => void
  onClose: (id: string) => void
  onTogglePin: (id: string) => void
  onOpenWindow: (id: string) => void
  onNew: () => void
  /** When provided, the "+" opens a picker of these options instead of onNew(). */
  newOptions?: { key: string; label: string; hint?: string }[]
  onNewOption?: (key: string) => void
}

/* ── Inline SVG icons ─────────────────────────────────────────── */

function FileIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M14 3v5h5" />
      <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    </svg>
  )
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

function PinIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M9 3h6l-1 6 3 3v2H7v-2l3-3-1-6z" />
      <path d="M12 16v5" />
    </svg>
  )
}

function DotsIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <circle cx="12" cy="6" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="12" cy="18" r="1.6" />
    </svg>
  )
}

function WindowIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M14 4h6v6" />
      <path d="M20 4l-7 7" />
      <path d="M18 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5" />
    </svg>
  )
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  )
}

/* ── Dropdown menu ────────────────────────────────────────────── */

function TabMenu({
  tab,
  x,
  y,
  onTogglePin,
  onOpenWindow,
  onClose,
  closeMenu,
}: {
  tab: TabItem
  x: number
  y: number
  onTogglePin: (id: string) => void
  onOpenWindow: (id: string) => void
  onClose: (id: string) => void
  closeMenu: () => void
}) {
  const run = (fn: () => void) => () => {
    fn()
    closeMenu()
  }

  return (
    <div
      className="fixed z-50 min-w-44 rounded-lg border border-border-dark bg-surface py-1 text-[13px] shadow-2xl"
      style={{ left: x, top: y }}
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
    >
      <button
        className="flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-content hover:bg-[rgba(255,255,255,0.06)]"
        onClick={run(() => onTogglePin(tab.id))}
      >
        <PinIcon className="size-4 text-content-muted" />
        {tab.pinned ? 'Unpin tab' : 'Pin tab'}
      </button>
      <button
        className="flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-content hover:bg-[rgba(255,255,255,0.06)]"
        onClick={run(() => onOpenWindow(tab.id))}
      >
        <WindowIcon className="size-4 text-content-muted" />
        Open in window
      </button>
      <div className="my-1 h-px bg-border-dark" />
      <button
        className="flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-down hover:bg-[rgba(255,255,255,0.06)]"
        onClick={run(() => onClose(tab.id))}
      >
        <XIcon className="size-4" />
        Close tab
      </button>
    </div>
  )
}

/* ── TabBar ───────────────────────────────────────────────────── */

export default function TabBar(props: TabBarProps) {
  const { tabs, activeId, onSelect, onClose, onTogglePin, onOpenWindow, onNew, newOptions, onNewOption } = props
  const [menuFor, setMenuFor] = useState<{ id: string; x: number; y: number } | null>(null)
  const [collapsed, setCollapsed] = useState(false)
  // New-tab picker uses fixed coords (like the tab context menu) so it escapes
  // the tab bar's overflow container instead of being clipped into a scroll strip.
  const [newMenu, setNewMenu] = useState<{ x: number; y: number } | null>(null)

  // Close any open menu on Escape
  useEffect(() => {
    if (!menuFor && !newMenu) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setMenuFor(null); setNewMenu(null) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [menuFor, newMenu])

  const pinned = tabs.filter((t) => t.pinned)
  const unpinned = tabs.filter((t) => !t.pinned)

  const openMenu = (e: React.MouseEvent, id: string) => {
    e.preventDefault()
    e.stopPropagation()
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const x = Math.min(rect.left, window.innerWidth - 200)
    const y = rect.bottom + 4
    setMenuFor((cur) => (cur?.id === id ? null : { id, x, y }))
  }

  const renderMenu = (tab: TabItem) =>
    menuFor?.id === tab.id ? (
      <TabMenu
        tab={tab}
        x={menuFor.x}
        y={menuFor.y}
        onTogglePin={onTogglePin}
        onOpenWindow={onOpenWindow}
        onClose={onClose}
        closeMenu={() => setMenuFor(null)}
      />
    ) : null

  return (
    <div className="relative flex h-9 shrink-0 items-end gap-1 overflow-x-auto border-b border-border-dark bg-[#0a1538] px-2 pt-1.5">
      {/* Outside-click backdrop while a menu is open */}
      {menuFor && (
        <div className="fixed inset-0 z-40" onClick={() => setMenuFor(null)} onContextMenu={(e) => { e.preventDefault(); setMenuFor(null) }} />
      )}

      {/* ── Pinned group (Chrome-style) ───────────────────────── */}
      {pinned.length > 0 && (
        <div className="mb-0.5 flex items-center gap-1 rounded-lg border border-[rgba(0,98,255,0.4)] bg-[rgba(0,98,255,0.12)] px-1 py-0.5">
          <button
            type="button"
            title={collapsed ? 'Expand pinned tabs' : 'Collapse pinned tabs'}
            onClick={() => setCollapsed((c) => !c)}
            className="flex h-7 items-center gap-1.5 rounded-md px-1.5 text-action hover:bg-white/10"
          >
            <PinIcon className="size-4" />
            {collapsed && (
              <span className="rounded-full bg-action px-1.5 text-[11px] font-semibold text-white">
                {pinned.length}
              </span>
            )}
          </button>

          {!collapsed &&
            pinned.map((t) => {
              const active = t.id === activeId
              return (
                <div key={t.id} className="relative">
                  <div
                    role="tab"
                    aria-selected={active}
                    title={t.title}
                    onClick={() => onSelect(t.id)}
                    onContextMenu={(e) => openMenu(e, t.id)}
                    className={`group flex h-7 max-w-[150px] cursor-pointer items-center gap-1.5 rounded-md px-2 text-[12px] ${
                      active
                        ? 'bg-page text-content ring-1 ring-action/50'
                        : 'text-content-muted hover:bg-white/10'
                    }`}
                  >
                    <FileIcon className="size-3.5 shrink-0" />
                    <span className="flex-1 truncate">{t.title}</span>
                    <button
                      type="button"
                      aria-label="Tab menu"
                      onClick={(e) => openMenu(e, t.id)}
                      className={`-mr-0.5 flex size-4 shrink-0 items-center justify-center rounded hover:bg-white/15 ${
                        active || menuFor?.id === t.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      }`}
                    >
                      <DotsIcon className="size-3" />
                    </button>
                  </div>
                  {renderMenu(t)}
                </div>
              )
            })}
        </div>
      )}

      {/* ── Normal (unpinned) tabs ────────────────────────────── */}
      {unpinned.map((t) => {
        const active = t.id === activeId
        return (
          <div key={t.id} className="relative">
            <div
              role="tab"
              aria-selected={active}
              onClick={() => onSelect(t.id)}
              onContextMenu={(e) => openMenu(e, t.id)}
              className={`group flex h-[30px] min-w-[130px] max-w-[210px] cursor-pointer items-center gap-2 rounded-t-lg border border-b-0 px-3 text-[12.5px] ${
                active
                  ? 'border-border-dark bg-page text-content'
                  : 'border-transparent bg-white/[0.04] text-content-muted hover:bg-white/[0.08]'
              }`}
            >
              <FileIcon className="size-4 shrink-0 opacity-80" />
              <span className="flex-1 truncate">{t.title}</span>
              <button
                type="button"
                aria-label="Tab menu"
                onClick={(e) => openMenu(e, t.id)}
                className={`-mr-1 flex size-5 shrink-0 items-center justify-center rounded transition-opacity hover:bg-white/15 ${
                  active || menuFor?.id === t.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                }`}
              >
                <DotsIcon className="size-3.5" />
              </button>
            </div>
            {renderMenu(t)}
          </div>
        )
      })}

      {/* ── New tab (optionally a market picker) ──────────────── */}
      <button
        type="button"
        aria-label="New tab"
        title={newOptions ? 'New market tab' : 'New tab'}
        onClick={(e) => {
          if (!newOptions) { onNew(); return }
          const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
          setNewMenu((cur) => (cur ? null : { x: Math.min(r.left, window.innerWidth - 240), y: r.bottom + 4 }))
        }}
        className="mb-0.5 flex size-7 shrink-0 items-center justify-center rounded-md text-content-muted hover:bg-white/10"
      >
        <PlusIcon className="size-4" />
      </button>

      {/* New-tab picker — fixed to the viewport so it isn't clipped by the bar. */}
      {newOptions && newMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setNewMenu(null)} />
          <div
            className="fixed z-50 min-w-56 rounded-lg border border-border-dark bg-surface py-1 shadow-2xl"
            style={{ left: newMenu.x, top: newMenu.y }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-content-subtle">Open market tab</div>
            {newOptions.map((o) => (
              <button
                key={o.key}
                onClick={() => { onNewOption?.(o.key); setNewMenu(null) }}
                className="flex w-full flex-col gap-0.5 px-3 py-1.5 text-left hover:bg-[rgba(255,255,255,0.06)]"
              >
                <span className="text-[13px] font-medium text-content">{o.label}</span>
                {o.hint && <span className="text-[11px] text-content-muted">{o.hint}</span>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
