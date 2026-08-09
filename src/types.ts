export interface Stock {
  code: string
  name: string
  price: number
  change: number
  pct: number
  volume: number
  amount: number
  limitTime: string
  opens: number
  sector: string
  status: 'locked' | 'open' | 'sealed'
  strength: number
  bidAmount: number
  riseSpeed?: number
}

export interface MarketStat {
  label: string
  value: string | number
  sub?: string
  highlight?: boolean
}

export type ActiveTab = 'all' | 'locked' | 'open' | 'sector' | 'news' | 'ladder' | 'strong'

export interface SectorHeatItem {
  name: string
  count: number
  pct: number
}

export interface SectorDetail {
  name: string
  count: number
  locked: number
  open: number
  avgStrength: number
  topStock: string
  topPct: number
  amount: number
  leadingStocks: string[]
}

export interface AlertItem {
  time: string
  msg: string
  level: 'up' | 'warn' | 'down'
}

export interface NewsItem {
  time: string
  tag: string
  urgent: boolean
  title: string
  body: string
}

export interface LadderStock {
  code: string
  name: string
  price: number
  sector: string
  amount: number
  strength: number
  limitTime: string
  zhaban: boolean
}

export interface LadderRow {
  boards: number
  label: string
  color: string
  stocks: LadderStock[]
}

export interface StrongStock {
  code: string
  name: string
  price: number
  pct: number
  amount: number
  sector: string
  score: number
  tag: string
  reason: string
  mktCap: number
  industry: string
  riseSpeed: number
}
