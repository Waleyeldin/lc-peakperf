import DataTable, { type Column } from './DataTable'
import { Panel, Badge, DirArrow, PopOutButton } from './ui'
import { useLiveData } from '../liveData'
import {
  MARKET_INDICES,
  fmtPrice,
  fmtInt,
  fmtPct,
  fmtChange,
  directionColor,
} from '../data'
import type { MarketIndex } from '../data'

/**
 * Market Indices overview — a dense, sticky-header table of the exchange
 * indices with current value, net change, %, OHLC, volume and value.
 */
export default function MarketIndices({ onPopOut }: { onPopOut?: () => void } = {}) {
  const { quotes } = useLiveData()
  // Overlay the DFM General Index (shortName DFMGI) with live Yahoo data.
  const rows: MarketIndex[] = MARKET_INDICES.map((row) => {
    const q = row.shortName === 'DFMGI' ? quotes.get('DFMGI') : undefined
    if (!q) return row
    return {
      ...row,
      indexCurrent: q.last,
      netChange: q.change,
      changePct: q.changePct,
      prevClose: q.prevClose,
      direction: q.change > 0 ? 'up' : q.change < 0 ? 'down' : 'flat',
    }
  })
  const liveSet = new Set(rows.filter((r) => quotes.has(r.shortName)).map((r) => r.shortName))

  const columns: Column<MarketIndex>[] = [
    {
      key: 'name',
      header: 'Name',
      align: 'left',
      width: 'min-w-[180px]',
      render: (row) => (
        <div className="flex flex-col leading-tight">
          <span className="flex items-center gap-1.5 text-content">
            {liveSet.has(row.shortName) && <span className="inline-block h-1.5 w-1.5 rounded-full bg-up shadow-[0_0_5px_#2fd07a]" title="Live data" />}
            {row.name}
          </span>
          <span className="text-[11px] text-content-muted">{row.shortName}</span>
        </div>
      ),
    },
    {
      key: 'indexCurrent',
      header: 'Index Current',
      align: 'right',
      cellClassName: 'font-semibold',
      render: (row) => fmtPrice(row.indexCurrent),
    },
    {
      key: 'netChange',
      header: 'Net Change',
      align: 'right',
      render: (row) => (
        <span className={directionColor(row.direction)}>{fmtChange(row.netChange)}</span>
      ),
    },
    {
      key: 'changePct',
      header: 'Change %',
      align: 'right',
      render: (row) => (
        <span className={`inline-flex items-center justify-end gap-1 ${directionColor(row.direction)}`}>
          {fmtPct(row.changePct)}
          <DirArrow direction={row.direction} />
        </span>
      ),
    },
    {
      key: 'openValue',
      header: 'Open',
      align: 'right',
      render: (row) => fmtPrice(row.openValue),
    },
    {
      key: 'high',
      header: 'High',
      align: 'right',
      render: (row) => fmtPrice(row.high),
    },
    {
      key: 'low',
      header: 'Low',
      align: 'right',
      render: (row) => fmtPrice(row.low),
    },
    {
      key: 'totalVolume',
      header: 'Total Volume',
      align: 'right',
      render: (row) => fmtInt(row.totalVolume),
    },
    {
      key: 'totalValue',
      header: 'Total Value',
      align: 'right',
      render: (row) => fmtInt(row.totalValue),
    },
    {
      key: 'prevClose',
      header: 'Prev Close',
      align: 'right',
      render: (row) => fmtPrice(row.prevClose),
    },
  ]

  return (
    <Panel title="Market Indices" actions={<><Badge>{MARKET_INDICES.length}</Badge>{onPopOut && <PopOutButton onClick={onPopOut} />}</>} noPadding>
      <div className="max-h-[240px] overflow-auto">
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(row) => row.shortName}
          stickyHeader
        />
      </div>
    </Panel>
  )
}
