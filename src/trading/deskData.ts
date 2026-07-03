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
  {
    sif: 'MERAAS',
    cif: '3390',
    name: 'Meraas Capital',
    phone: '+971 50 339 0011',
    email: 'invest@meraas.ae',
    emailVerified: true,
    vip: false,
    cash: 720_000,
    casa: '1011 3390 2205',
    casaBalance: 1_800_000,
    risk: 'Balanced',
    kyc: 'Valid',
    dayPnlPct: 0.7,
    positions: 9,
    since: 2016,
    lastBuy: { side: 'Buy', symbol: 'EMAAR', qty: 60_000, price: 8.1, date: '25 Jun 2026' },
    lastSell: { side: 'Sell', symbol: 'PARKIN', qty: 30_000, price: 6.1, date: '18 Jun 2026' },
    holdings: [pos('EMAAR', 70_000, 6.9), pos('SALIK', 40_000, 4.1), pos('PARKIN', 25_000, 5.8)],
    usualStocks: ['EMAAR', 'SALIK', 'PARKIN'],
  },
  {
    sif: 'WAHA',
    cif: '8123',
    name: 'Waha Capital',
    phone: '+971 52 812 3400',
    email: 'desk@wahacapital.ae',
    emailVerified: true,
    vip: true,
    cash: 4_100_000,
    casa: '1011 8123 6604',
    casaBalance: 7_500_000,
    risk: 'Aggressive',
    kyc: 'Valid',
    dayPnlPct: 1.1,
    positions: 17,
    since: 2011,
    lastBuy: { side: 'Buy', symbol: 'ALDAR', qty: 90_000, price: 8.05, date: '26 Jun 2026' },
    lastSell: { side: 'Sell', symbol: 'ADCB', qty: 40_000, price: 9.9, date: '22 Jun 2026' },
    holdings: [pos('ALDAR', 120_000, 7.2), pos('ADCB', 60_000, 9.4), pos('IHC', 2_000, 380)],
    usualStocks: ['ALDAR', 'ADCB', 'IHC'],
  },
  {
    sif: 'NBAHMED',
    cif: '2214',
    name: 'Nasser Bin Ahmed',
    phone: '+971 55 221 4008',
    email: 'n.binahmed@gmail.com',
    emailVerified: false,
    vip: false,
    cash: 42_000,
    casa: '1011 2214 3390',
    casaBalance: 210_000,
    risk: 'Conservative',
    kyc: 'Review due',
    dayPnlPct: -1.2,
    positions: 3,
    since: 2022,
    flag: 'Retail account · KYC review due this month',
    lastBuy: { side: 'Buy', symbol: 'SALIK', qty: 5_000, price: 4.2, date: '10 Jun 2026' },
    lastSell: { side: 'Sell', symbol: 'DEYAAR', qty: 20_000, price: 0.74, date: '03 Jun 2026' },
    holdings: [pos('SALIK', 8_000, 3.9), pos('DEYAAR', 30_000, 0.68)],
    usualStocks: ['SALIK', 'DEYAAR'],
  },
  {
    sif: 'LULUFIN',
    cif: '9975',
    name: 'Lulu Financial',
    phone: '+971 56 997 5220',
    email: 'treasury@lulufin.ae',
    emailVerified: true,
    vip: false,
    cash: 1_350_000,
    casa: '1011 9975 1180',
    casaBalance: 3_200_000,
    risk: 'Balanced',
    kyc: 'Valid',
    dayPnlPct: 0.3,
    positions: 11,
    since: 2015,
    lastBuy: { side: 'Buy', symbol: 'TALABAT', qty: 150_000, price: 1.58, date: '24 Jun 2026' },
    lastSell: { side: 'Sell', symbol: 'DU', qty: 25_000, price: 7.1, date: '17 Jun 2026' },
    holdings: [pos('TALABAT', 220_000, 1.5), pos('DU', 45_000, 6.9), pos('AMANAT', 120_000, 1.7)],
    usualStocks: ['TALABAT', 'DU', 'AMANAT'],
  },
  {
    sif: 'ESTEEL',
    cif: '4560',
    name: 'Emirates Steel Fund',
    phone: '+971 50 456 0090',
    email: 'fund@emiratessteel.ae',
    emailVerified: true,
    vip: true,
    cash: 6_800_000,
    casa: '1011 4560 7701',
    casaBalance: 12_000_000,
    risk: 'Institutional',
    kyc: 'Valid',
    dayPnlPct: 0.8,
    positions: 19,
    since: 2010,
    lastBuy: { side: 'Buy', symbol: 'TAQA', qty: 300_000, price: 2.85, date: '26 Jun 2026' },
    lastSell: { side: 'Sell', symbol: 'BOROUGE', qty: 100_000, price: 2.55, date: '21 Jun 2026' },
    holdings: [pos('TAQA', 400_000, 2.7), pos('ADNOCGAS', 200_000, 3.2), pos('BOROUGE', 150_000, 2.6)],
    usualStocks: ['TAQA', 'ADNOCGAS', 'BOROUGE'],
  },
  {
    sif: 'FALZAABI',
    cif: '6701',
    name: 'Fatima Al Zaabi',
    phone: '+971 52 670 1099',
    email: 'f.alzaabi@outlook.com',
    emailVerified: true,
    vip: false,
    cash: 96_000,
    casa: '1011 6701 5540',
    casaBalance: 340_000,
    risk: 'Conservative',
    kyc: 'Valid',
    dayPnlPct: 0.4,
    positions: 5,
    since: 2020,
    lastBuy: { side: 'Buy', symbol: 'DIB', qty: 10_000, price: 6.9, date: '23 Jun 2026' },
    lastSell: { side: 'Sell', symbol: 'GFH', qty: 30_000, price: 3.35, date: '14 Jun 2026' },
    holdings: [pos('DIB', 15_000, 6.6), pos('GFH', 50_000, 3.0)],
    usualStocks: ['DIB', 'GFH'],
  },
  {
    sif: 'GPEARL',
    cif: '5088',
    name: 'Gulf Pearl Trading',
    phone: '+971 55 508 8004',
    email: 'ops@gulfpearl.ae',
    emailVerified: false,
    vip: false,
    cash: 280_000,
    casa: '1011 5088 2290',
    casaBalance: 640_000,
    risk: 'Aggressive',
    kyc: 'Valid',
    dayPnlPct: 2.1,
    positions: 8,
    since: 2019,
    flag: 'High turnover · concentrated in property',
    lastBuy: { side: 'Buy', symbol: 'DAMAC', qty: 80_000, price: 1.55, date: '25 Jun 2026' },
    lastSell: { side: 'Sell', symbol: 'EMAARDEV', qty: 40_000, price: 12.2, date: '19 Jun 2026' },
    holdings: [pos('DAMAC', 120_000, 1.5), pos('EMAARDEV', 30_000, 11.5), pos('DEYAAR', 200_000, 0.7)],
    usualStocks: ['DAMAC', 'EMAARDEV', 'DEYAAR'],
  },
  {
    sif: 'ADIBWD',
    cif: '7345',
    name: 'ADIB Wealth Desk',
    phone: '+971 50 734 5000',
    email: 'wealth@adib.ae',
    emailVerified: true,
    vip: true,
    cash: 8_900_000,
    casa: '1011 7345 3308',
    casaBalance: 15_000_000,
    risk: 'Institutional',
    kyc: 'Valid',
    dayPnlPct: 0.6,
    positions: 23,
    since: 2008,
    lastBuy: { side: 'Buy', symbol: 'ADIB', qty: 200_000, price: 12.4, date: '26 Jun 2026' },
    lastSell: { side: 'Sell', symbol: 'ETISALAT', qty: 80_000, price: 17.4, date: '20 Jun 2026' },
    holdings: [pos('ADIB', 250_000, 11.8), pos('FAB', 120_000, 13.5), pos('ETISALAT', 90_000, 17.0)],
    usualStocks: ['ADIB', 'FAB', 'ETISALAT'],
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
