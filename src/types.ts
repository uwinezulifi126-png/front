export interface Stock {
  /** Short display code, e.g. 000001 */
  code: string
  /** Full Tushare code, e.g. 000001.SZ */
  tsCode: string
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
  /** null = API 无封板强度，勿编造 */
  strength: number | null
  /** null = API 无封单金额，勿编造 */
  bidAmount: number | null
  /** 近 1 分钟涨跌幅%；null = 无分钟缓冲（复盘/冷启动），勿编造 */
  riseSpeed: number | null
  /** 流通市值（亿元）；null = 无 daily_basic.circ_mv */
  mktCap?: number | null
  /** 所属全部概念名（噪声板块已过滤） */
  concepts?: string[]
}

export interface KlineBar {
  tradeDate: string
  open: number
  high: number
  low: number
  close: number
  /** 昨收价；null 时图表用前一根收盘价推算涨停价 */
  preClose: number | null
  volume: number | null
  amount: number | null
  pctChg: number | null
}

/** 单日 1 分钟分时点（后端 分时行情 / stk_mins） */
export interface IntradayPoint {
  time: string
  price: number
  open: number | null
  high: number | null
  low: number | null
  volume: number | null
  amount: number | null
}

export interface MarketStat {
  label: string
  value: string | number
  sub?: string
  highlight?: boolean
}

export type ActiveTab =
  | 'all'
  | 'locked'
  | 'open'
  | 'watchlist'
  | 'movers'
  | 'sector'
  | 'concepts'
  | 'news'
  | 'ladder'
  | 'strong'

/** 概念列表行：同花顺全量概念 + 当日 feed 涨幅/涨停叠加，或用户自建。 */
export interface ConceptCatalogItem {
  name: string
  code: string
  /** 当日涨停家数；无 feed 时为 0 */
  count: number
  /** null = 当日无涨幅数据，展示 — */
  pct: number | null
  custom?: boolean
  note?: string
}

export interface SectorHeatItem {
  name: string
  count: number
  pct: number
  /** 概念成分涨停代码（与后端 stock_codes 一致）；用于与表格/板过滤对齐 */
  stockCodes: string[]
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
  /** 概念成分涨停代码（与后端 stock_codes 一致）；表格按此集合解析，而非 Stock.sector */
  stockCodes: string[]
}

export interface AlertItem {
  time: string
  msg: string
  level: 'up' | 'warn' | 'down'
}

export type NewsCategory = 'yesterday' | 'realtime'

export interface NewsItem {
  time: string
  tag: string
  urgent: boolean
  title: string
  body: string
  /** yesterday = 昨日新闻头条；realtime = 实时新闻 */
  category: NewsCategory
  /** ISO publish time（财联社等 API）；用于跨天分组 */
  publishedAt?: string
  /** 上游文章 id（财联社深度等）；用于按需补全文 */
  id?: number
  /** 原文链接 */
  url?: string
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

/** 「个股」Tab：涨幅>7% 全市场，含全部概念标签 */
export interface MoverStock {
  code: string
  tsCode: string
  name: string
  price: number
  pct: number
  amount: number
  mktCap: number
  industry: string
  board: string
  isLimitUp: boolean
  concepts: string[]
  riseSpeed: number | null
}
