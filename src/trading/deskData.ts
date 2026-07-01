import { FULL_MARKET } from './data'
import type { PortfolioPosition } from './data'

/**
 * Demo customer book for the Broker Desk. A customer is looked up by their
 * MOBILE NUMBER (as the old step-1 caller check did) and drives every widget on
 * the right of the desk: briefing, portfolio, contact, Buy/Sell. Holdings
 * reference FULL_MARKET prices so numbers stay consistent. Prototype data only.
 */

export interface DeskTrade { side: 'Buy' | 'Sell'; symbol: string; qty: number; price: number; date: string }

export interface DeskCustomer {
  sif: string
  cif: string
  name: string
  phone: string
  email: string
  emailVerified: boolean
  vip: boolean
  cash: number // available investment-account cash to trade
  casa: string // linked CASA (current/savings) account — backup funding source
  casaBalance: number // money sitting in the CASA account
  // Step-2 briefing fields
  risk: string
  kyc: string
  dayPnlPct: number
  positions: number
  since: number
  flag?: string
  lastBuy: DeskTrade
  lastSell: DeskTrade
  holdings: PortfolioPosition[]
  /** Symbols this client usually trades — used to pre-fill the Buy panel. */
  usualStocks: string[]
}

function pos(symbol: string, quantity: number, avgCost: number, pledged = 0): PortfolioPosition {
  const s = FULL_MARKET.find((r) => r.symbolShortName === symbol)
  const evalPrice = s?.lastPrice || avgCost
  const marketValue = Math.round(evalPrice * quantity)
  const cost = Math.round(avgCost * quantity)
  return {
    xchng: s?.marketShortName ?? 'DFM',
    symbol,
    currency: 'AED',
    avgCost,
    evalPrice,
    quantity,
    pledged,
    available: quantity - pledged,
    marketValue,
    cost,
    gainLoss: marketValue - cost,
  }
}

export const DESK_CUSTOMERS: DeskCustomer[] = [
  {
    sif: 'AFG',
    cif: '5521',
    name: 'Al Futtaim Group',
    phone: '+971 50 123 4567',
    email: 'treasury@alfuttaim.ae',
    emailVerified: true,
    vip: true,
    cash: 3_250_000,
    casa: '1011 5521 3307',
    casaBalance: 6_000_000,
    risk: 'Aggressive',
    kyc: 'Valid',
    dayPnlPct: 1.4,
    positions: 14,
    since: 2012,
    lastBuy: { side: 'Buy', symbol: 'EMAAR', qty: 180_000, price: 8.12, date: '24 Jun 2026' },
    lastSell: { side: 'Sell', symbol: 'DAMAC', qty: 50_000, price: 1.52, date: '20 Jun 2026' },
    holdings: [pos('EMAAR', 120_000, 6.85), pos('EMIRATESNBD', 40_000, 18.4, 10_000), pos('DIB', 85_000, 7.2), pos('TALABAT', 200_000, 1.4)],
    usualStocks: ['TALABAT', 'EMAAR', 'SALIK'],
  },
  {
    sif: 'MAHIA',
    cif: '6610',
    name: 'Mahlya Holdings',
    phone: '+971 52 661 0099',
    email: 'ops@mahlya.com',
    emailVerified: false,
    vip: false,
    cash: 85_000,
    casa: '1011 6610 0902',
    casaBalance: 900_000,
    risk: 'Conservative',
    kyc: 'Valid',
    dayPnlPct: -0.6,
    positions: 4,
    since: 2021,
    flag: 'Cash account, no margin · 65% concentration in GFH',
    lastBuy: { side: 'Buy', symbol: 'SALIK', qty: 20_000, price: 3.9, date: '09 Jun 2026' },
    lastSell: { side: 'Sell', symbol: 'AMANAT', qty: 40_000, price: 1.78, date: '02 Jun 2026' },
    holdings: [pos('AMANAT', 300_000, 1.6), pos('GFH', 150_000, 3.1), pos('SALIK', 60_000, 3.9)],
    usualStocks: ['GFH', 'AMANAT'],
  },
  {
    sif: 'ADNOC',
    cif: '7782',
    name: 'ADNOC Treasury',
    phone: '+971 55 778 2000',
    email: 'invest@adnoc.ae',
    emailVerified: true,
    vip: true,
    cash: 9_400_000,
    casa: '1011 7782 4410',
    casaBalance: 20_000_000,
    risk: 'Institutional',
    kyc: 'Valid',
    dayPnlPct: 0.5,
    positions: 21,
    since: 2009,
    lastBuy: { side: 'Buy', symbol: 'PARKIN', qty: 500_000, price: 5.4, date: '26 Jun 2026' },
    lastSell: { side: 'Sell', symbol: 'DU', qty: 120_000, price: 7.0, date: '23 Jun 2026' },
    holdings: [pos('TABREED', 75_000, 3.9), pos('PARKIN', 120_000, 5.4), pos('DU', 90_000, 6.8)],
    usualStocks: ['PARKIN', 'DU', 'TABREED'],
  },
  {
    sif: 'ALRAMZ',
    cif: '4447',
    name: 'Al Ramz Capital',
    phone: '+971 56 321 0987',
    email: 'desk@alramz.ae',
    emailVerified: true,
    vip: false,
    cash: 460_000,
    casa: '1011 4447 8801',
    casaBalance: 1_500_000,
    risk: 'Balanced',
    kyc: 'Review due',
    dayPnlPct: 0.9,
    positions: 7,
    since: 2018,
    lastBuy: { side: 'Buy', symbol: 'DAMAC', qty: 100_000, price: 1.6, date: '19 Jun 2026' },
    lastSell: { side: 'Sell', symbol: 'DEYAAR', qty: 200_000, price: 0.72, date: '15 Jun 2026' },
    holdings: [pos('DAMAC', 100_000, 1.6), pos('DEYAAR', 400_000, 0.7)],
    usualStocks: ['DAMAC', 'DEYAAR', 'EMAARDEV'],
  },
]

const digits = (s: string) => s.replace(/\D/g, '')

/** Look up a customer by CIF number (primary), or by SIF / name as a
 *  convenience for the demo. */
export function findCustomer(input: string): DeskCustomer | undefined {
  const raw = input.trim()
  if (!raw) return undefined
  const d = digits(raw)
  if (d) {
    const byCif = DESK_CUSTOMERS.find((c) => c.cif === d)
    if (byCif) return byCif
  }
  const q = raw.toUpperCase()
  return DESK_CUSTOMERS.find((c) => c.sif.toUpperCase() === q || c.name.toUpperCase().includes(q))
}
