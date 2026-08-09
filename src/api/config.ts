/** Override with VITE_API_BASE_URL. Default: local stock_project FastAPI. */
export const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000').replace(/\/$/, '')

export const POLL_INTERVAL_MS = 3000

export const endpoints = {
  latest: `${API_BASE_URL}/api/rank/latest`,
  stream: `${API_BASE_URL}/api/rank/stream`,
  calendarRecent: `${API_BASE_URL}/api/calendar/recent`,
  replay: (tradeDate: string) =>
    `${API_BASE_URL}/api/replay/${encodeURIComponent(tradeDate)}`,
  limitHistory: `${API_BASE_URL}/api/limit-history`,
  /** 连板晋级率（涨停历史聚合） */
  promotionRate: `${API_BASE_URL}/api/promotion-rate`,
  kline: (tsCode: string) => `${API_BASE_URL}/api/kline/${encodeURIComponent(tsCode)}`,
  /** 财联社电报加红（服务端缓存，非直连 cls.cn） */
  clsTelegraph: `${API_BASE_URL}/api/news/cls/telegraph`,
  /** 财联社深度头条（服务端缓存，非直连 cls.cn） */
  clsDepth: `${API_BASE_URL}/api/news/cls/depth`,
  clsDepthArticle: (id: number) => `${API_BASE_URL}/api/news/cls/depth/article/${id}`,
  /** 实时预警（盘中检测落库；可按交易日查近一年） */
  alerts: `${API_BASE_URL}/api/alerts`,
  /** 同花顺概念全量列表（DB 维度表） */
  conceptsThs: `${API_BASE_URL}/api/concepts/ths`,
} as const
