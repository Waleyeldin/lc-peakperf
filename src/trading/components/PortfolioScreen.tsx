import { useState } from 'react'
import DataTable, { type Column } from './DataTable'
import { Panel, Select, Button, Badge } from './ui'
import {
  PORTFOLIO,
  PORTFOLIO_TOTALS,
  PURCHASE_POWER,
  CASH_MOVEMENTS,
  CLIENT_OPTIONS,
  fmtPrice,
  fmtInt,
  fmtMoney,
  fmtPct,
} from '../data'
import type { PortfolioPosition, CashMovement } from '../data'

/**
 * Portfolio Positioning screen for FAB Securities — a modern dark refresh of
 * the legacy Portfolio Positioning + Cash Position + Purchase Power views.
 * Holdings table, headline totals, and a paired cash-position / cash-movements
 * row. Selects and Refresh are local-only (no live wiring).
 */
export default function PortfolioScreen() {
  const [client, setClient] = useState(CLIENT_OPTIONS[0])
  const [portfolio, setPortfolio] = useState('Main Portfolio')
  const [currency, setCurrency] = useState('AED')

  const totalGain = PORTFOLIO_TOTALS.gainLoss
  const totalGainPct = PORTFOLIO_TOTALS.cost ? (totalGain / PORTFOLIO_TOTALS.cost) * 100 : 0

  // ─── Holdings columns ────────────────────────────────────────────────────
  const holdingsColumns: Column<PortfolioPosition>[] = [
    { key: 'xchng', header: 'Xchng', render: (r) => r.xchng },
    { key: 'symbol', header: 'Symbol', cellClassName: 'font-medium', render: (r) => r.symbol },
    { key: 'currency', header: 'Currency', render: (r) => r.currency },
    { key: 'avgCost', header: 'Avg Cost', align: 'right', render: (r) => fmtPrice(r.avgCost) },
    { key: 'evalPrice', header: 'Eval Price', align: 'right', render: (r) => fmtPrice(r.evalPrice) },
    { key: 'quantity', header: 'Quantity', align: 'right', render: (r) => fmtInt(r.quantity) },
    { key: 'pledged', header: 'Pledged', align: 'right', render: (r) => fmtInt(r.pledged) },
    { key: 'available', header: 'Available', align: 'right', render: (r) => fmtInt(r.available) },
    { key: 'marketValue', header: 'Market Value', align: 'right', render: (r) => fmtMoney(r.marketValue) },
    { key: 'cost', header: 'Cost', align: 'right', render: (r) => fmtMoney(r.cost) },
    {
      key: 'gainLoss',
      header: 'Gain/Loss',
      align: 'right',
      render: (r) => (
        <span className={r.gainLoss >= 0 ? 'text-up' : 'text-down'}>{fmtMoney(r.gainLoss)}</span>
      ),
    },
  ]

  // ─── Cash movements columns ──────────────────────────────────────────────
  const movementTone: Record<CashMovement['type'], 'up' | 'down' | 'neutral'> = {
    Deposit: 'up',
    Dividend: 'up',
    Withdrawal: 'down',
    Fee: 'down',
    Settlement: 'neutral',
  }

  const movementColumns: Column<CashMovement>[] = [
    { key: 'date', header: 'Date', render: (r) => r.date },
    {
      key: 'type',
      header: 'Type',
      render: (r) => <Badge tone={movementTone[r.type]}>{r.type}</Badge>,
    },
    { key: 'reference', header: 'Reference', render: (r) => r.reference },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      render: (r) => (
        <span className={r.amount >= 0 ? 'text-up' : 'text-down'}>
          {r.amount >= 0 ? '+' : '-'}
          {fmtMoney(Math.abs(r.amount))}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) => (
        <Badge tone={r.status === 'Pending' ? 'warn' : 'neutral'}>{r.status}</Badge>
      ),
    },
  ]

  // ─── Purchase-power cells ────────────────────────────────────────────────
  const powerCells: { label: string; value: string }[] = [
    { label: 'Cash Amount', value: fmtMoney(PURCHASE_POWER.cashAmount) },
    { label: 'Blocked', value: fmtMoney(PURCHASE_POWER.blocked) },
    { label: 'Coverage Ratio', value: `${PURCHASE_POWER.coverageRatio}x` },
    { label: 'Marginable Value', value: fmtMoney(PURCHASE_POWER.marginableValue) },
    { label: 'Account Limit', value: fmtMoney(PURCHASE_POWER.accountLimit) },
    { label: 'Outstanding Buy Orders', value: fmtMoney(PURCHASE_POWER.outstandingBuyOrders) },
    { label: 'LTV Ratio', value: `${(PURCHASE_POWER.ltvRatio * 100).toFixed(2)}%` },
    { label: 'Portfolio Value', value: fmtMoney(PURCHASE_POWER.portfolioValue) },
  ]

  return (
    <div className="flex flex-col gap-3 bg-page p-3 text-content">
      {/* 1. Header toolbar */}
      <div className="flex flex-wrap items-end gap-3">
        <Select
          label="Client"
          value={client}
          onChange={(e) => setClient(e.target.value)}
          className="w-[240px]"
        >
          {CLIENT_OPTIONS.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </Select>
        <Select
          label="Portfolio"
          value={portfolio}
          onChange={(e) => setPortfolio(e.target.value)}
        >
          {['Main Portfolio', 'Margin Portfolio'].map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </Select>
        <Select
          label="Currency"
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
        >
          {['AED', 'USD'].map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </Select>
        <Button variant="primary" className="ml-auto self-end">
          Refresh
        </Button>
      </div>

      {/* 2. Totals cards row */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-border-dark bg-surface p-4">
          <div className="text-[11px] text-content-muted">Portfolio Market Value</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums">
            {fmtMoney(PORTFOLIO_TOTALS.marketValue)}
          </div>
        </div>
        <div className="rounded-lg border border-border-dark bg-surface p-4">
          <div className="text-[11px] text-content-muted">Total Cost</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums">
            {fmtMoney(PORTFOLIO_TOTALS.cost)}
          </div>
        </div>
        <div className="rounded-lg border border-border-dark bg-surface p-4">
          <div className="text-[11px] text-content-muted">Total Gain/Loss</div>
          <div
            className={`mt-1 flex items-baseline gap-2 text-2xl font-semibold tabular-nums ${
              totalGain >= 0 ? 'text-up' : 'text-down'
            }`}
          >
            <span>{fmtMoney(totalGain)}</span>
            <span className="text-sm font-medium">{fmtPct(totalGainPct)}</span>
          </div>
        </div>
      </div>

      {/* 3. Holdings panel */}
      <Panel title="Holdings" noPadding>
        <div className="max-h-[420px] overflow-auto">
          <DataTable
            columns={holdingsColumns}
            rows={PORTFOLIO}
            rowKey={(r) => r.symbol}
            dense
            stickyHeader
          />
        </div>
      </Panel>

      {/* 4. Cash position + cash movements */}
      <div className="grid gap-3 lg:grid-cols-2">
        <Panel title="Cash Position & Purchase Power">
          <div className="grid grid-cols-2 gap-2">
            {powerCells.map((c) => (
              <div
                key={c.label}
                className="rounded-md border border-border-dark bg-page px-3 py-2.5"
              >
                <div className="text-[11px] text-content-muted">{c.label}</div>
                <div className="mt-0.5 font-semibold tabular-nums">{c.value}</div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Cash Movements" noPadding>
          <div className="max-h-[340px] overflow-auto">
            <DataTable
              columns={movementColumns}
              rows={CASH_MOVEMENTS}
              rowKey={(r) => r.reference}
              dense
              stickyHeader
            />
          </div>
        </Panel>
      </div>
    </div>
  )
}
