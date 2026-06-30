import type { ReactNode } from 'react'

export interface Column<T> {
  key: string
  header: ReactNode
  align?: 'left' | 'right' | 'center'
  /** Tailwind width class, e.g. "w-[120px]" or "min-w-[160px]". */
  width?: string
  headerClassName?: string
  cellClassName?: string
  render: (row: T, index: number) => ReactNode
}

interface DataTableProps<T> {
  columns: Column<T>[]
  rows: T[]
  rowKey: (row: T, index: number) => string
  /** Sticky header (default true). The parent should provide a scroll height. */
  stickyHeader?: boolean
  zebra?: boolean
  dense?: boolean
  onRowClick?: (row: T, index: number) => void
  selectedKey?: string
  /** Empty-state message. */
  emptyLabel?: string
  className?: string
}

const alignClass = { left: 'text-left', right: 'text-right', center: 'text-center' } as const

/**
 * Shared sticky-header data table for the trading dashboard.
 * Place inside a height-constrained, overflow-auto container for sticky headers
 * and vertical scroll. Designed for dense, readable financial tables.
 */
export default function DataTable<T>({
  columns,
  rows,
  rowKey,
  stickyHeader = true,
  zebra = true,
  dense = false,
  onRowClick,
  selectedKey,
  emptyLabel = 'No data',
  className = '',
}: DataTableProps<T>) {
  const pad = dense ? 'px-3 py-1.5' : 'px-3 py-2.5'
  return (
    <table className={`w-full border-collapse text-[13px] tabular-nums ${className}`}>
      <thead className={stickyHeader ? 'sticky top-0 z-10' : ''}>
        <tr className="bg-[#15171a] text-[11px] font-medium uppercase tracking-wide text-content-muted">
          {columns.map((c) => (
            <th
              key={c.key}
              className={`${pad} ${alignClass[c.align ?? 'left']} ${c.width ?? ''} whitespace-nowrap border-b border-border-dark font-medium ${c.headerClassName ?? ''}`}
            >
              {c.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 && (
          <tr>
            <td colSpan={columns.length} className="px-3 py-10 text-center text-content-muted">
              {emptyLabel}
            </td>
          </tr>
        )}
        {rows.map((row, i) => {
          const key = rowKey(row, i)
          const selected = selectedKey != null && key === selectedKey
          return (
            <tr
              key={key}
              onClick={onRowClick ? () => onRowClick(row, i) : undefined}
              className={[
                'border-b border-[#202327] transition-colors',
                zebra && i % 2 === 1 ? 'bg-[rgba(255,255,255,0.018)]' : '',
                selected ? 'bg-[rgba(0,98,255,0.14)]' : '',
                onRowClick ? 'cursor-pointer hover:bg-[rgba(255,255,255,0.05)]' : '',
              ].join(' ')}
            >
              {columns.map((c) => (
                <td
                  key={c.key}
                  className={`${pad} ${alignClass[c.align ?? 'left']} ${c.width ?? ''} whitespace-nowrap text-content ${c.cellClassName ?? ''}`}
                >
                  {c.render(row, i)}
                </td>
              ))}
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
