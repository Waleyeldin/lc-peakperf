import { useMemo, useState } from 'react'
import type { ColumnDef } from '../data'
import { FULL_MARKET_COLUMNS } from '../data'
import { Drawer, Button } from './ui'

/**
 * ColumnDrawer — the column-settings side drawer for the Full Market table.
 * Replaces the legacy column checklist + Save/Reset Settings menu with a
 * searchable, grouped toggle list in the dark FAB design language.
 */

interface ColumnDrawerProps {
  open: boolean
  onClose: () => void
  visible: string[]
  onChange: (cols: string[]) => void
}

// Group render order follows the registry's natural appearance.
const GROUP_ORDER: ColumnDef['group'][] = [
  'Identity',
  'Quote',
  'Trade',
  'Statistics',
  'Valuation',
  'Advanced',
]

function Check({ checked }: { checked: boolean }) {
  return (
    <span
      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
        checked ? 'border-action bg-action text-white' : 'border-border-dark bg-[#15171a]'
      }`}
    >
      {checked && (
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
          <path d="M20 6 9 17l-5-5" />
        </svg>
      )}
    </span>
  )
}

export default function ColumnDrawer({ open, onClose, visible, onChange }: ColumnDrawerProps) {
  const [search, setSearch] = useState('')

  const visibleSet = useMemo(() => new Set(visible), [visible])

  // Filter by label (case-insensitive), then bucket into groups in render order.
  const grouped = useMemo(() => {
    const term = search.trim().toLowerCase()
    return GROUP_ORDER.map((group) => ({
      group,
      cols: FULL_MARKET_COLUMNS.filter(
        (c) => c.group === group && (term === '' || c.label.toLowerCase().includes(term)),
      ),
    })).filter((g) => g.cols.length > 0)
  }, [search])

  const setAll = () => onChange(FULL_MARKET_COLUMNS.map((c) => c.key))
  const setNone = () => onChange([])
  const setDefault = () =>
    onChange(FULL_MARKET_COLUMNS.filter((c) => c.default).map((c) => c.key))

  const toggle = (toggledKey: string) => {
    const turningOn = !visibleSet.has(toggledKey)
    // Always rebuild in registry order so column order stays stable.
    onChange(
      FULL_MARKET_COLUMNS.map((c) => c.key).filter((k) =>
        k === toggledKey ? turningOn : visibleSet.has(k),
      ),
    )
  }

  return (
    <Drawer open={open} onClose={onClose} title="Columns">
      <div className="flex h-full flex-col">
        {/* Sticky toolbar */}
        <div className="sticky top-0 z-10 border-b border-border-dark bg-surface p-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search columns…"
            className="h-8 w-full rounded-md border border-border-dark bg-[#15171a] px-2.5 text-[13px] text-content outline-none transition-colors placeholder:text-content-muted hover:border-[#3a3d42] focus:border-action"
          />
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            <Button size="sm" variant="default" onClick={setAll}>
              Select all
            </Button>
            <Button size="sm" variant="default" onClick={setNone}>
              None
            </Button>
            <Button size="sm" variant="default" onClick={setDefault}>
              Reset to default
            </Button>
            <span className="ml-auto text-[11px] text-content-muted">
              {visible.length} of {FULL_MARKET_COLUMNS.length} shown
            </span>
          </div>
        </div>

        {/* Scrollable grouped list */}
        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {grouped.length === 0 ? (
            <p className="px-1 py-6 text-center text-[12px] text-content-muted">No matching columns.</p>
          ) : (
            grouped.map(({ group, cols }) => (
              <div key={group} className="mb-4 last:mb-0">
                <div className="px-1 pb-1.5 text-[11px] uppercase tracking-wide text-content-muted">
                  {group}
                </div>
                <div className="flex flex-col">
                  {cols.map((c) => {
                    const checked = visibleSet.has(c.key)
                    return (
                      <button
                        key={c.key}
                        type="button"
                        onClick={() => toggle(c.key)}
                        aria-pressed={checked}
                        className="flex cursor-pointer items-center justify-between gap-3 rounded-md px-2 py-2 text-left text-[13px] text-content transition-colors hover:bg-[rgba(255,255,255,0.06)]"
                      >
                        <span className="truncate">{c.label}</span>
                        <Check checked={checked} />
                      </button>
                    )
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </Drawer>
  )
}
