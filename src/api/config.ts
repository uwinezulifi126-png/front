/**
 * API base URL.
 * - Set VITE_API_BASE_URL to force a host (e.g. production or http://10.x.x.x:8000).
 * - Leave unset in dev: use same-origin `/api/*` so Vite proxy works for LAN clients
 *   (browsers otherwise hit their own 127.0.0.1:8000).
 */
function resolveApiBaseUrl(): string {
  const fromEnv = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim()
  if (fromEnv) {
    return fromEnv.replace(/\/$/, '')
  }
  if (import.meta.env.DEV) {
    return ''
  }
  if (typeof window !== 'undefined') {
    const { protocol, hostname } = window.location
    if (hostname && hostname !== 'localhost' && hostname !== '127.0.0.1') {
      return `${protocol}//${hostname}:8000`
    }
  }
  return 'http://127.0.0.1:8000'
}

export const API_BASE_URL = resolveApiBaseUrl()

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
  /** Batch today's close/pct for arbitrary ts_codes (watchlist) */
  quotes: `${API_BASE_URL}/api/quotes`,
  /** 单票单日 1 分钟分时（悬停日 K） */
  intraday: (tsCode: string) =>
    `${API_BASE_URL}/api/intraday/${encodeURIComponent(tsCode)}`,
  /** 财联社电报加红（服务端缓存，非直连 cls.cn） */
  clsTelegraph: `${API_BASE_URL}/api/news/cls/telegraph`,
  /** 财联社深度头条（服务端缓存，非直连 cls.cn） */
  clsDepth: `${API_BASE_URL}/api/news/cls/depth`,
  clsDepthArticle: (id: number) => `${API_BASE_URL}/api/news/cls/depth/article/${id}`,
  /** 证券时报首页头条（服务端缓存） */
  stcnHeadlines: `${API_BASE_URL}/api/news/stcn/headlines`,
  /** 证券时报要闻（服务端缓存） */
  stcnYw: `${API_BASE_URL}/api/news/stcn/yw`,
  stcnArticle: (id: number) => `${API_BASE_URL}/api/news/stcn/article/${id}`,
  /** 东方财富快讯焦点（服务端缓存） */
  eastmoneyYw: `${API_BASE_URL}/api/news/eastmoney/yw`,
  /** 东方财富首页头条（服务端缓存） */
  eastmoneyHeadlines: `${API_BASE_URL}/api/news/eastmoney/headlines`,
  eastmoneyArticle: (id: number) => `${API_BASE_URL}/api/news/eastmoney/article/${id}`,
  /** 中国证券报首页头条（服务端缓存） */
  csHeadlines: `${API_BASE_URL}/api/news/cs/headlines`,
  /** 中国证券报财经要闻（服务端缓存） */
  csCjyw: `${API_BASE_URL}/api/news/cs/cjyw`,
  csArticle: (id: number) => `${API_BASE_URL}/api/news/cs/article/${id}`,
  /** 淘股吧极速快讯「全部」（服务端缓存） */
  tgbAll: `${API_BASE_URL}/api/news/tgb/all`,
  /** 淘股吧极速快讯「加红」（服务端缓存） */
  tgbJiahong: `${API_BASE_URL}/api/news/tgb/jiahong`,
  /** 同花顺财经首页头条（服务端缓存） */
  jqkaHeadlines: `${API_BASE_URL}/api/news/jqka/headlines`,
  /** 同花顺财经 A股 7x24（服务端缓存） */
  jqkaAstock: `${API_BASE_URL}/api/news/jqka/astock`,
  jqkaArticle: (id: number) => `${API_BASE_URL}/api/news/jqka/article/${id}`,
  /** 实时预警（盘中检测落库；可按交易日查近一年） */
  alerts: `${API_BASE_URL}/api/alerts`,
  /** 同花顺概念全量列表（DB 维度表） */
  conceptsThs: `${API_BASE_URL}/api/concepts/ths`,
  /** 同花顺概念成分股（从板块导入） */
  conceptsMembers: `${API_BASE_URL}/api/concepts/members`,
  /** 概念「不计入排行」屏蔽名单（服务端持久化，全端共享） */
  conceptsBlocked: `${API_BASE_URL}/api/concepts/blocked`,
  /** 用户自建「自选概念」及成分股（服务端持久化，全端共享） */
  conceptsCustom: `${API_BASE_URL}/api/concepts/custom`,
  /** 官方概念成分用户覆盖（block/extra，按 concept_code） */
  conceptsMemberOverrides: `${API_BASE_URL}/api/concepts/member-overrides`,
  /** 股票字典搜索（自选概念加成分） */
  stocksSearch: `${API_BASE_URL}/api/stocks/search`,
} as const
