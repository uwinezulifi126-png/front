export type BoardType = 'main' | 'chinext' | 'star' | 'bj'
export type FeedMode = 'live' | 'replay' | 'closed'

export interface MarketPulsePoint {
  up?: number | null
  down?: number | null
  limit_up?: number | null
  limit_down?: number | null
  broken?: number | null
  broken_rate?: number | null
  yest_avg_pct?: number | null
  heat?: number | null
  t?: number | null
}

export interface MarketPulse {
  up_count?: number | null
  down_count?: number | null
  flat_count?: number | null
  limit_up_count?: number | null
  limit_down_count?: number | null
  broken_count?: number | null
  broken_rate_pct?: number | null
  heat_pct?: number | null
  yest_limit_avg_pct?: number | null
  yest_limit_sample?: number | null
  series?: MarketPulsePoint[]
}

export interface RankMeta {
  trade_date?: string | null
  snapshot_at?: string | null
  version?: number | string | null
  quote_count?: number | null
  limit_up_count?: number | null
  is_trading?: boolean | null
  is_open?: boolean | null
  live_allowed?: boolean | null
  mode?: FeedMode | string | null
  prev_trade_date?: string | null
  yest_limit_trade_date?: string | null
  default_replay_date?: string | null
  strong_source?: string | null
  message?: string | null
  market_pulse?: MarketPulse | null
}

export interface RankStock {
  stock_code: string
  stock_name?: string | null
  pct_chg?: number | null
  limit_times?: number | null
  board?: BoardType | string | null
  board_label?: string | null
  is_limit_up?: boolean | null
  close?: number | null
  lu_time?: string | null
  turnover_rate?: number | null
  circ_mv?: number | null
  limit_stat?: string | null
  theme?: string | null
  industry?: string | null
  amount?: number | null
  open_times?: number | null
  /** Tushare limit_list_d：U=收盘仍涨停，Z=炸板 */
  limit_type?: string | null
  /** 涨速 %：live 近 1 分钟动量，不足则相对开盘 */
  rise_speed?: number | null
  /** 全部概念（「个股」movers 等） */
  concepts?: { concept_code?: string; concept_name?: string }[] | null
}

export interface RankItem {
  concept_code: string
  concept_name: string
  limit_up_count: number
  max_limit_times?: number | null
  strong_count?: number | null
  pct_chg?: number | null
  theme?: string | null
  reason?: string | null
  stock_codes: string[]
  stocks: RankStock[]
}

export interface RankSnapshot {
  meta: RankMeta
  rank: RankItem[]
  /** Flat limit-up list from API (may be empty). */
  limit_up_list: RankStock[]
  /**
   * Today's session quotes for previous-day limit-up codes (「全部」overlay).
   * Live: rt_k; replay: daily. Not limited to today's limit-up/strong pools.
   */
  yest_limit_quotes?: RankStock[]
  /** 全市场涨幅>7%（「个股」Tab） */
  movers_gt7?: RankStock[]
}

export interface MarketStatus {
  trade_date: string
  is_open: boolean
  live_allowed: boolean
  is_trading: boolean
  lunch_break?: boolean | null
  prev_trade_date?: string | null
  /** 「昨日涨停」as-of date; flips at open-day 09:00 Asia/Shanghai */
  yest_limit_trade_date?: string | null
  default_replay_date?: string | null
  message?: string | null
}

export interface CalendarResponse {
  dates: string[]
  status: MarketStatus
}

export interface LimitHistoryItem {
  交易日期?: string | null
  股票代码: string
  股票名称?: string | null
  首次涨停时间?: string | null
  最后涨停时间?: string | null
  收盘价?: number | null
  涨跌幅?: number | null
  换手率?: number | null
  流通市值?: number | null
  成交额?: number | null
  连板数?: number | null
  打开次数?: number | null
  涨停统计?: string | null
  所属行业?: string | null
  /** Tushare limit_list_d：U=收盘仍涨停，Z=炸板 */
  涨停类型?: string | null
}

export interface LimitHistoryResponse {
  trade_date: string
  count: number
  items: LimitHistoryItem[]
}

/** 连板晋级率单项：晋级率_N = 今日N板 / 昨日(N-1)板 */
export interface PromotionRateItem {
  boards: number
  label: string
  base: number
  promoted: number
  rate: number | null
}

export interface PromotionRateResponse {
  trade_date: string
  prev_trade_date: string | null
  items: PromotionRateItem[]
  message?: string | null
}

export type ConnectionMode =
  | 'connecting'
  | 'sse'
  | 'polling'
  | 'replay'
  | 'closed'
  | 'error'
  | 'idle'
