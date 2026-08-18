import { endpoints } from './config'
import { normalizeSnapshot } from '../models/normalize'
import type {
  CalendarResponse,
  LimitHistoryItem,
  LimitHistoryResponse,
  MarketStatus,
  PromotionRateItem,
  PromotionRateResponse,
  RankSnapshot,
} from '../models/apiTypes'
import type { IntradayPoint, KlineBar, NewsItem } from '../types'

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

/**
 * Build a URL from an endpoint that may be absolute (http://…) or same-origin
 * relative (/api/…). `new URL('/api/…')` throws without a base — that broke
 * calendar/date picker when API_BASE_URL is '' (Vite proxy mode).
 */
function toApiUrl(endpoint: string): URL {
  if (/^https?:\/\//i.test(endpoint)) {
    return new URL(endpoint)
  }
  const base =
    typeof window !== 'undefined' ? window.location.origin : 'http://127.0.0.1:5174'
  return new URL(endpoint, base)
}

export async function fetchLatestRank(signal?: AbortSignal): Promise<RankSnapshot> {
  const res = await fetch(endpoints.latest, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal,
  })
  if (!res.ok) throw new Error(`最新榜单请求失败 (${res.status})`)
  return normalizeSnapshot(await res.json())
}

export async function fetchReplayRank(
  tradeDate: string,
  opts?: { refresh?: boolean; signal?: AbortSignal },
): Promise<RankSnapshot> {
  const url = toApiUrl(endpoints.replay(tradeDate))
  if (opts?.refresh) url.searchParams.set('refresh', 'true')
  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal: opts?.signal,
  })
  if (!res.ok) throw new Error(`复盘数据请求失败 (${res.status})`)
  return normalizeSnapshot(await res.json())
}

export async function fetchCalendar(
  limit = 800,
  signal?: AbortSignal,
): Promise<CalendarResponse> {
  const url = toApiUrl(endpoints.calendarRecent)
  url.searchParams.set('limit', String(limit))
  url.searchParams.set('with_data', 'true')
  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal,
  })
  if (!res.ok) throw new Error(`交易日历请求失败 (${res.status})`)
  const json: unknown = await res.json()
  const root = asRecord(json) ?? {}
  const statusRaw = asRecord(root.status) ?? {}
  const datesRaw = root.dates
  const dates = Array.isArray(datesRaw) ? datesRaw.map((d) => String(d)).filter(Boolean) : []
  const status: MarketStatus = {
    trade_date: String(statusRaw.trade_date ?? ''),
    is_open: Boolean(statusRaw.is_open),
    live_allowed: Boolean(statusRaw.live_allowed ?? statusRaw.is_open),
    is_trading: Boolean(statusRaw.is_trading),
    lunch_break: Boolean(statusRaw.lunch_break),
    prev_trade_date:
      typeof statusRaw.prev_trade_date === 'string' ? statusRaw.prev_trade_date : null,
    yest_limit_trade_date:
      typeof statusRaw.yest_limit_trade_date === 'string'
        ? statusRaw.yest_limit_trade_date
        : null,
    default_replay_date:
      typeof statusRaw.default_replay_date === 'string' ? statusRaw.default_replay_date : null,
    message: typeof statusRaw.message === 'string' ? statusRaw.message : null,
  }
  return { dates, status }
}

export async function fetchLimitHistory(
  tradeDate: string,
  signal?: AbortSignal,
): Promise<LimitHistoryResponse> {
  const url = toApiUrl(endpoints.limitHistory)
  url.searchParams.set('trade_date', tradeDate.replace(/-/g, ''))
  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal,
  })
  if (!res.ok) throw new Error(`涨停历史请求失败 (${res.status})`)
  const json: unknown = await res.json()
  const root = asRecord(json) ?? {}
  const itemsRaw = root.items
  const pickStr = (r: Record<string, unknown>, keys: string[]): string | null => {
    for (const k of keys) {
      if (r[k] != null) return String(r[k])
    }
    return null
  }
  const pickNum = (r: Record<string, unknown>, keys: string[]): number | null => {
    for (const k of keys) {
      const v = r[k]
      if (typeof v === 'number' && Number.isFinite(v)) return v
      if (typeof v === 'string' && v.trim() !== '') {
        const n = Number(v)
        if (Number.isFinite(n)) return n
      }
    }
    return null
  }
  const items: LimitHistoryItem[] = Array.isArray(itemsRaw)
    ? itemsRaw.map((row) => {
        const r = asRecord(row) ?? {}
        return {
          交易日期: pickStr(r, ['交易日期', 'trade_date']),
          股票代码: pickStr(r, ['股票代码', 'ts_code']) ?? '',
          股票名称: pickStr(r, ['股票名称', 'name']),
          首次涨停时间: pickStr(r, ['首次涨停时间', 'first_limit_time']),
          最后涨停时间: pickStr(r, ['最后涨停时间', 'last_limit_time']),
          收盘价: pickNum(r, ['收盘价', 'close']),
          涨跌幅: pickNum(r, ['涨跌幅', 'pct_chg']),
          换手率: pickNum(r, ['换手率', 'turnover_rate']),
          流通市值: pickNum(r, ['流通市值', 'circ_mv']),
          成交额: pickNum(r, ['成交额', 'amount']),
          连板数: pickNum(r, ['连板数', 'limit_times']),
          打开次数: pickNum(r, ['打开次数', 'open_times']),
          涨停统计: pickStr(r, ['涨停统计', 'up_stat']),
          所属行业: pickStr(r, ['所属行业', 'industry']),
          涨停类型: pickStr(r, ['涨停类型', 'limit_type', 'limit']),
        }
      })
    : []
  return {
    trade_date: String(root.trade_date ?? tradeDate),
    count: typeof root.count === 'number' ? root.count : items.length,
    items,
  }
}

/** 连板晋级率（单日；随 TopBar 交易日切换可查近一年任意有数据日） */
export interface AlertApiItem {
  id?: number | null
  预警时间: string | null
  交易日期: string | null
  股票代码: string | null
  股票名称: string | null
  预警类型: string | null
  预警内容: string | null
}

export interface AlertsResponse {
  trade_date: string | null
  count: number
  retain_days: number | null
  items: AlertApiItem[]
  note: string | null
}

/** 实时预警列表（按交易日；近一年落库可查） */
export async function fetchAlerts(opts: {
  tradeDate?: string
  start?: string
  end?: string
  limit?: number
  signal?: AbortSignal
}): Promise<AlertsResponse> {
  const url = toApiUrl(endpoints.alerts)
  if (opts.tradeDate) {
    url.searchParams.set('trade_date', opts.tradeDate.replace(/-/g, ''))
  }
  if (opts.start) url.searchParams.set('start', opts.start.replace(/-/g, ''))
  if (opts.end) url.searchParams.set('end', opts.end.replace(/-/g, ''))
  if (opts.limit != null) url.searchParams.set('limit', String(opts.limit))
  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal: opts.signal,
  })
  if (!res.ok) throw new Error(`预警请求失败 (${res.status})`)
  const json: unknown = await res.json()
  const root = asRecord(json) ?? {}
  const itemsRaw = root.items
  const items: AlertApiItem[] = Array.isArray(itemsRaw)
    ? itemsRaw.map((row) => {
        const r = asRecord(row) ?? {}
        return {
          id: typeof r.id === 'number' ? r.id : null,
          预警时间:
            typeof r['预警时间'] === 'string'
              ? r['预警时间']
              : typeof r.alert_at === 'string'
                ? r.alert_at
                : null,
          交易日期:
            typeof r['交易日期'] === 'string'
              ? r['交易日期']
              : typeof r.trade_date === 'string'
                ? r.trade_date
                : null,
          股票代码:
            typeof r['股票代码'] === 'string'
              ? r['股票代码']
              : typeof r.ts_code === 'string'
                ? r.ts_code
                : null,
          股票名称:
            typeof r['股票名称'] === 'string'
              ? r['股票名称']
              : typeof r.name === 'string'
                ? r.name
                : null,
          预警类型:
            typeof r['预警类型'] === 'string'
              ? r['预警类型']
              : typeof r.alert_type === 'string'
                ? r.alert_type
                : null,
          预警内容:
            typeof r['预警内容'] === 'string'
              ? r['预警内容']
              : typeof r.content === 'string'
                ? r.content
                : null,
        }
      })
    : []
  return {
    trade_date: typeof root.trade_date === 'string' ? root.trade_date : null,
    count: typeof root.count === 'number' ? root.count : items.length,
    retain_days: typeof root.retain_days === 'number' ? root.retain_days : null,
    items,
    note:
      typeof root['说明'] === 'string'
        ? root['说明']
        : typeof root.note === 'string'
          ? root.note
          : null,
  }
}

export async function fetchPromotionRate(
  tradeDate: string,
  signal?: AbortSignal,
): Promise<PromotionRateResponse> {
  const url = toApiUrl(endpoints.promotionRate)
  url.searchParams.set('trade_date', tradeDate.replace(/-/g, ''))
  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal,
  })
  if (!res.ok) throw new Error(`连板晋级率请求失败 (${res.status})`)
  const json: unknown = await res.json()
  const root = asRecord(json) ?? {}
  const itemsRaw = root.items
  const items: PromotionRateItem[] = Array.isArray(itemsRaw)
    ? itemsRaw
        .map((row) => {
          const r = asRecord(row) ?? {}
          const boards = typeof r.boards === 'number' ? r.boards : Number(r.boards)
          if (!Number.isFinite(boards)) return null
          const base = typeof r.base === 'number' ? r.base : Number(r.base) || 0
          const promoted =
            typeof r.promoted === 'number' ? r.promoted : Number(r.promoted) || 0
          let rate: number | null = null
          if (typeof r.rate === 'number' && Number.isFinite(r.rate)) rate = r.rate
          else if (r.rate === null || r.rate === undefined) rate = null
          else {
            const n = Number(r.rate)
            rate = Number.isFinite(n) ? n : null
          }
          return {
            boards,
            label: String(r.label ?? `${boards}板`),
            base,
            promoted,
            rate,
          } satisfies PromotionRateItem
        })
        .filter((x): x is PromotionRateItem => x != null)
    : []
  return {
    trade_date: String(root.trade_date ?? tradeDate),
    prev_trade_date:
      typeof root.prev_trade_date === 'string' ? root.prev_trade_date : null,
    items,
    message: typeof root.message === 'string' ? root.message : null,
  }
}

export async function fetchKline(
  tsCode: string,
  opts?: { limit?: number; start?: string; end?: string; signal?: AbortSignal },
): Promise<{ tsCode: string; items: KlineBar[]; liveToday: boolean }> {
  const url = toApiUrl(endpoints.kline(tsCode))
  if (opts?.limit != null) url.searchParams.set('limit', String(opts.limit))
  if (opts?.start) url.searchParams.set('start', opts.start.replace(/-/g, ''))
  if (opts?.end) url.searchParams.set('end', opts.end.replace(/-/g, ''))
  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal: opts?.signal,
  })
  if (!res.ok) throw new Error(`K线请求失败 (${res.status})`)
  const json: unknown = await res.json()
  const root = asRecord(json) ?? {}
  const itemsRaw = root.items
  const pickNum = (r: Record<string, unknown>, keys: string[]): number | null => {
    for (const k of keys) {
      const v = r[k]
      if (typeof v === 'number' && Number.isFinite(v)) return v
      if (typeof v === 'string' && v.trim() !== '') {
        const n = Number(v)
        if (Number.isFinite(n)) return n
      }
    }
    return null
  }
  const items: KlineBar[] = Array.isArray(itemsRaw)
    ? itemsRaw
        .map((row) => {
          const r = asRecord(row) ?? {}
          const tradeDate = String(r['交易日期'] ?? r.trade_date ?? '')
          const open = pickNum(r, ['开盘价', 'open'])
          const high = pickNum(r, ['最高价', 'high'])
          const low = pickNum(r, ['最低价', 'low'])
          const close = pickNum(r, ['收盘价', 'close'])
          if (!tradeDate || open == null || high == null || low == null || close == null) {
            return null
          }
          return {
            tradeDate,
            open,
            high,
            low,
            close,
            volume: pickNum(r, ['成交量', 'vol', 'volume']),
            amount: pickNum(r, ['成交额', 'amount']),
            pctChg: pickNum(r, ['涨跌幅', 'pct_chg']),
          } satisfies KlineBar
        })
        .filter((x): x is KlineBar => x != null)
    : []
  const lastRaw =
    Array.isArray(itemsRaw) && itemsRaw.length > 0
      ? asRecord(itemsRaw[itemsRaw.length - 1])
      : null
  const liveToday = root.live_today === true || lastRaw?.source === 'rt_k'
  return {
    tsCode: String(root.ts_code ?? tsCode).toUpperCase(),
    items,
    liveToday,
  }
}

export type QuoteItem = {
  tsCode: string
  code: string
  name: string | null
  close: number | null
  pctChg: number | null
  source: string | null
  /** 成交额：rt_k 为元，日线为千元；前端 amountYi → 亿元 */
  amount: number | null
  /** 流通股本（万股，Tushare daily_basic.float_share） */
  floatShare: number | null
  /** 流通市值（万元，Tushare daily_basic.circ_mv）；展示时 /1e4 → 亿元 */
  circMv: number | null
  concepts: string[]
}

/** Batch today's session quotes for watchlist ts_codes. */
export async function fetchQuotes(
  tsCodes: string[],
  opts?: { signal?: AbortSignal },
): Promise<QuoteItem[]> {
  const codes = [...new Set(tsCodes.map((c) => c.trim().toUpperCase()).filter(Boolean))]
  if (!codes.length) return []
  const url = toApiUrl(endpoints.quotes)
  url.searchParams.set('ts_codes', codes.join(','))
  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal: opts?.signal,
  })
  if (!res.ok) throw new Error(`行情请求失败 (${res.status})`)
  const json: unknown = await res.json()
  const root = asRecord(json) ?? {}
  const itemsRaw = root.items
  if (!Array.isArray(itemsRaw)) return []
  const pickNum = (r: Record<string, unknown>, keys: string[]): number | null => {
    for (const k of keys) {
      const v = r[k]
      if (typeof v === 'number' && Number.isFinite(v)) return v
      if (typeof v === 'string' && v.trim() !== '') {
        const n = Number(v)
        if (Number.isFinite(n)) return n
      }
    }
    return null
  }
  const out: QuoteItem[] = []
  for (const row of itemsRaw) {
    const r = asRecord(row)
    if (!r) continue
    const tsCode = String(r.ts_code ?? r.tsCode ?? '').trim().toUpperCase()
    const code = String(r.code ?? r.symbol ?? '').trim().toUpperCase()
    if (!tsCode && !code) continue
    const conceptsRaw = r.concepts
    const concepts: string[] = []
    if (Array.isArray(conceptsRaw)) {
      for (const c of conceptsRaw) {
        if (typeof c === 'string' && c.trim()) {
          concepts.push(c.trim())
          continue
        }
        const rec = asRecord(c)
        if (!rec) continue
        const name = String(rec.concept_name ?? rec.conceptName ?? rec.name ?? '').trim()
        if (name) concepts.push(name)
      }
    }
    out.push({
      tsCode: tsCode || code,
      code: code || tsCode.split('.')[0] || '',
      name: typeof r.name === 'string' && r.name.trim() ? r.name.trim() : null,
      close: pickNum(r, ['close', '收盘价']),
      pctChg: pickNum(r, ['pct_chg', 'pctChg', '涨跌幅']),
      source: typeof r.source === 'string' ? r.source : null,
      amount: pickNum(r, ['amount', '成交额', '成交金额']),
      floatShare: pickNum(r, ['float_share', 'floatShare', '流通股本']),
      circMv: pickNum(r, ['circ_mv', 'circMv', '流通市值']),
      concepts,
    })
  }
  return out
}

export async function fetchIntraday(
  tsCode: string,
  tradeDate: string,
  opts?: { signal?: AbortSignal },
): Promise<{
  tsCode: string
  tradeDate: string
  items: IntradayPoint[]
  source: string | null
  message: string | null
}> {
  const url = toApiUrl(endpoints.intraday(tsCode))
  url.searchParams.set('trade_date', tradeDate.replace(/-/g, '').slice(0, 8))
  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal: opts?.signal,
  })
  if (!res.ok) throw new Error(`分时请求失败 (${res.status})`)
  const json: unknown = await res.json()
  const root = asRecord(json) ?? {}
  const pickNum = (r: Record<string, unknown>, keys: string[]): number | null => {
    for (const k of keys) {
      const v = r[k]
      if (typeof v === 'number' && Number.isFinite(v)) return v
      if (typeof v === 'string' && v.trim() !== '') {
        const n = Number(v)
        if (Number.isFinite(n)) return n
      }
    }
    return null
  }
  const itemsRaw = root.items
  const items: IntradayPoint[] = Array.isArray(itemsRaw)
    ? itemsRaw
        .map((row) => {
          const r = asRecord(row) ?? {}
          const time = String(r['交易时间'] ?? r.trade_time ?? r.time ?? '')
          const price = pickNum(r, ['收盘价', 'close', 'price'])
          if (!time || price == null) return null
          return {
            time,
            price,
            open: pickNum(r, ['开盘价', 'open']),
            high: pickNum(r, ['最高价', 'high']),
            low: pickNum(r, ['最低价', 'low']),
            volume: pickNum(r, ['成交量', 'vol', 'volume']),
            amount: pickNum(r, ['成交额', 'amount']),
          } satisfies IntradayPoint
        })
        .filter((x): x is IntradayPoint => x != null)
    : []
  return {
    tsCode: String(root.ts_code ?? tsCode).toUpperCase(),
    tradeDate: String(root.trade_date ?? tradeDate),
    items,
    source: typeof root.source === 'string' ? root.source : null,
    message: typeof root.message === 'string' ? root.message : null,
  }
}

export interface ClsTelegraphResponse {
  items: NewsItem[]
  count: number
  latestFetchedAt: string | null
  error: string | null
}

export interface ClsDepthResponse {
  items: NewsItem[]
  count: number
  latestFetchedAt: string | null
  error: string | null
  days: number | null
}

function formatClsTime(iso: string | null | undefined): string {
  if (!iso) return '--:--'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return String(iso)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  // 列表按日期分组时用 HH:mm；无分组场景仍带月日便于分辨跨天
  const today = new Date()
  const sameDay =
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate()
  if (sameDay) return `${hh}:${mm}`
  const md = `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  return `${md} ${hh}:${mm}`
}

/**
 * 财联社加红电报（读自家 API 缓存）。
 * 默认近 5 天；上游未必一次给出完整多日，库内靠同步 upsert 累积。
 */
export async function fetchClsTelegraph(
  opts?: {
    level?: 'red' | 'all'
    days?: number
    limit?: number
    signal?: AbortSignal
  },
): Promise<ClsTelegraphResponse> {
  const url = toApiUrl(endpoints.clsTelegraph)
  url.searchParams.set('level', opts?.level ?? 'red')
  url.searchParams.set('days', String(opts?.days ?? 5))
  url.searchParams.set('limit', String(opts?.limit ?? 200))
  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal: opts?.signal,
  })
  if (!res.ok) throw new Error(`财联社电报请求失败 (${res.status})`)
  const json: unknown = await res.json()
  const root = asRecord(json) ?? {}
  const itemsRaw = root.items
  const items: NewsItem[] = Array.isArray(itemsRaw)
    ? itemsRaw.map((row) => {
        const r = asRecord(row) ?? {}
        const title = String(r['标题'] ?? r.title ?? '')
        const body = String(r['正文'] ?? r.content ?? r['摘要'] ?? r.brief ?? '')
        const published = String(r['发布时间'] ?? r.published_at ?? '')
        const isRed = Boolean(r['是否加红'] ?? r.is_red ?? true)
        return {
          time: formatClsTime(published),
          tag: '财联社',
          urgent: isRed,
          title: title || body.slice(0, 80) || '（无标题）',
          body: body || title,
          category: 'realtime',
          publishedAt: published || undefined,
        }
      })
    : []
  return {
    items,
    count: typeof root.count === 'number' ? root.count : items.length,
    latestFetchedAt:
      typeof root['最新抓取时间'] === 'string'
        ? root['最新抓取时间']
        : typeof root.latest_fetched_at === 'string'
          ? root.latest_fetched_at
          : null,
    error: typeof root.error === 'string' ? root.error : null,
  }
}

/**
 * 财联社深度头条（读自家 API 缓存）。
 * 默认近 3 个月（days=90）；上游未必一次给出完整档案，库内靠同步 upsert 累积。
 */
export async function fetchClsDepth(
  opts?: {
    id?: number
    months?: number
    days?: number
    limit?: number
    signal?: AbortSignal
  },
): Promise<ClsDepthResponse> {
  const url = toApiUrl(endpoints.clsDepth)
  url.searchParams.set('id', String(opts?.id ?? 1000))
  if (opts?.days != null) {
    url.searchParams.set('days', String(opts.days))
  } else {
    url.searchParams.set('months', String(opts?.months ?? 3))
  }
  url.searchParams.set('limit', String(opts?.limit ?? 500))
  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal: opts?.signal,
  })
  if (!res.ok) throw new Error(`财联社深度头条请求失败 (${res.status})`)
  const json: unknown = await res.json()
  const root = asRecord(json) ?? {}
  const itemsRaw = root.items
  const items: NewsItem[] = Array.isArray(itemsRaw)
    ? itemsRaw.map((row) => mapClsDepthItem(row)).filter((x): x is NewsItem => x != null)
    : []
  return {
    items,
    count: typeof root.count === 'number' ? root.count : items.length,
    days: typeof root.days === 'number' ? root.days : null,
    latestFetchedAt:
      typeof root['最新抓取时间'] === 'string'
        ? root['最新抓取时间']
        : typeof root.latest_fetched_at === 'string'
          ? root.latest_fetched_at
          : null,
    error: typeof root.error === 'string' ? root.error : null,
  }
}

function mapClsDepthItem(row: unknown): NewsItem | null {
  const r = asRecord(row) ?? {}
  const title = String(r['标题'] ?? r.title ?? '')
  const content = String(r['正文'] ?? r.content ?? '')
  const brief = String(r['摘要'] ?? r.brief ?? '')
  const body = content || brief || title
  if (!title && !body) return null
  const published = String(r['发布时间'] ?? r.published_at ?? '')
  const isTop = Boolean(r['是否置顶'] ?? r.is_top ?? false)
  const rawId = r.id ?? r['文章id']
  const idNum =
    typeof rawId === 'number'
      ? rawId
      : typeof rawId === 'string' && rawId.trim()
        ? Number(rawId)
        : Number.NaN
  const hasId = Number.isFinite(idNum)
  const url = String(r['分享链接'] ?? r.share_url ?? '').trim()
  return {
    time: formatClsTime(published),
    tag: '财联社',
    urgent: isTop,
    title: title || body.slice(0, 80) || '（无标题）',
    body: body || title,
    category: 'yesterday',
    publishedAt: published || undefined,
    id: hasId ? idNum : undefined,
    url: url || (hasId ? `https://www.cls.cn/detail/${idNum}` : undefined),
  }
}

/**
 * 单篇深度详情：若缓存仍是列表摘要，后端会按需拉 /v3/article/detail 补全文。
 */
export async function fetchClsDepthArticle(
  articleId: number,
  opts?: { ensureFull?: boolean; signal?: AbortSignal },
): Promise<NewsItem> {
  const url = toApiUrl(endpoints.clsDepthArticle(articleId))
  if (opts?.ensureFull === false) {
    url.searchParams.set('ensure_full', 'false')
  }
  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal: opts?.signal,
  })
  if (!res.ok) throw new Error(`财联社深度详情请求失败 (${res.status})`)
  const json: unknown = await res.json()
  const root = asRecord(json) ?? {}
  const item = mapClsDepthItem(root.item)
  if (!item) throw new Error('财联社深度详情为空')
  return item
}

export type ThsConceptItem = {
  code: string
  name: string
  type: string | null
  source: string
}

export type ThsConceptsResponse = {
  total: number
  count: number
  items: ThsConceptItem[]
}

export type ConceptMemberItem = {
  tsCode: string
  code: string
  name: string
}

export type ConceptMembersResponse = {
  code: string
  name: string
  total: number
  count: number
  items: ConceptMemberItem[]
}

/** 同花顺概念成分股（股票概念映射）。limit=0 仅取总数。 */
export async function fetchConceptMembers(opts: {
  code?: string
  name?: string
  limit?: number
  offset?: number
  signal?: AbortSignal
}): Promise<ConceptMembersResponse> {
  const url = toApiUrl(endpoints.conceptsMembers)
  if (opts.code) url.searchParams.set('code', opts.code)
  if (opts.name) url.searchParams.set('name', opts.name)
  url.searchParams.set('limit', String(opts.limit ?? 10000))
  if (opts.offset != null) url.searchParams.set('offset', String(opts.offset))
  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal: opts.signal,
  })
  if (!res.ok) throw new Error(`概念成分请求失败 (${res.status})`)
  const root = asRecord(await res.json()) ?? {}
  const itemsRaw = root.items
  const items: ConceptMemberItem[] = []
  if (Array.isArray(itemsRaw)) {
    for (const row of itemsRaw) {
      const r = asRecord(row)
      if (!r) continue
      const tsCode = String(r.ts_code ?? r.tsCode ?? '').trim().toUpperCase()
      const code = String(r.code ?? r.symbol ?? '').trim().toUpperCase()
      const name = String(r.name ?? '').trim()
      if (!tsCode && !code) continue
      items.push({
        tsCode: tsCode || code,
        code: code || tsCode.split('.')[0] || '',
        name: name || code || tsCode,
      })
    }
  }
  return {
    code: String(root.code ?? opts.code ?? '').trim(),
    name: String(root.name ?? opts.name ?? '').trim(),
    total: typeof root.total === 'number' ? root.total : items.length,
    count: typeof root.count === 'number' ? root.count : items.length,
    items,
  }
}

/** 同花顺概念全量列表（默认 limit 足够一次拉全）。 */
export async function fetchThsConcepts(opts?: {
  q?: string
  limit?: number
  offset?: number
  signal?: AbortSignal
}): Promise<ThsConceptsResponse> {
  const url = toApiUrl(endpoints.conceptsThs)
  url.searchParams.set('limit', String(opts?.limit ?? 5000))
  if (opts?.offset != null) url.searchParams.set('offset', String(opts.offset))
  if (opts?.q) url.searchParams.set('q', opts.q)
  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal: opts?.signal,
  })
  if (!res.ok) throw new Error(`同花顺概念列表请求失败 (${res.status})`)
  const json: unknown = await res.json()
  const root = asRecord(json) ?? {}
  const itemsRaw = root.items
  const items: ThsConceptItem[] = Array.isArray(itemsRaw)
    ? itemsRaw
        .map((row) => {
          const r = asRecord(row) ?? {}
          const code = String(r.code ?? r.concept_code ?? '').trim()
          const name = String(r.name ?? '').trim()
          if (!code && !name) return null
          return {
            code,
            name: name || code,
            type: typeof r.type === 'string' ? r.type : null,
            source: typeof r.source === 'string' ? r.source : 'ths',
          }
        })
        .filter((x): x is ThsConceptItem => x != null)
    : []
  return {
    total: typeof root.total === 'number' ? root.total : items.length,
    count: typeof root.count === 'number' ? root.count : items.length,
    items,
  }
}

export type BlockedConceptsResponse = {
  items: string[]
  count: number
}

function parseBlockedItems(json: unknown): string[] {
  const root = asRecord(json) ?? {}
  const itemsRaw = root.items
  if (!Array.isArray(itemsRaw)) return []
  const names = itemsRaw
    .filter((x): x is string => typeof x === 'string')
    .map((s) => s.trim())
    .filter(Boolean)
  return [...new Set(names)]
}

/** 服务端概念屏蔽名单（全端共享）。 */
export async function fetchBlockedConcepts(opts?: {
  signal?: AbortSignal
}): Promise<BlockedConceptsResponse> {
  const url = toApiUrl(endpoints.conceptsBlocked)
  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal: opts?.signal,
  })
  if (!res.ok) throw new Error(`概念屏蔽名单请求失败 (${res.status})`)
  const items = parseBlockedItems(await res.json())
  return { items, count: items.length }
}

/** 全量替换服务端概念屏蔽名单。 */
export async function putBlockedConcepts(
  items: string[],
  opts?: { signal?: AbortSignal },
): Promise<BlockedConceptsResponse> {
  const url = toApiUrl(endpoints.conceptsBlocked)
  const unique = [...new Set(items.map((s) => s.trim()).filter(Boolean))]
  const res = await fetch(url.toString(), {
    method: 'PUT',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ items: unique }),
    signal: opts?.signal,
  })
  if (!res.ok) throw new Error(`概念屏蔽名单保存失败 (${res.status})`)
  const saved = parseBlockedItems(await res.json())
  return { items: saved, count: saved.length }
}

export type CustomConceptMemberDto = {
  tsCode: string
  code: string
  name: string
}

export type CustomConceptDto = {
  name: string
  note?: string
  members: CustomConceptMemberDto[]
}

export type CustomConceptsResponse = {
  items: CustomConceptDto[]
  count: number
}

export type StockSearchItem = {
  tsCode: string
  code: string
  name: string
}

function parseCustomConcepts(json: unknown): CustomConceptDto[] {
  const root = asRecord(json) ?? {}
  const itemsRaw = root.items
  if (!Array.isArray(itemsRaw)) return []
  const out: CustomConceptDto[] = []
  const seen = new Set<string>()
  for (const item of itemsRaw) {
    const rec = asRecord(item)
    if (!rec) continue
    const name = String(rec.name ?? '').trim()
    if (!name || seen.has(name)) continue
    seen.add(name)
    const note = String(rec.note ?? '').trim()
    const membersRaw = rec.members
    const members: CustomConceptMemberDto[] = []
    const seenTs = new Set<string>()
    if (Array.isArray(membersRaw)) {
      for (const m of membersRaw) {
        const mr = asRecord(m)
        if (!mr) continue
        const tsCode = String(mr.ts_code ?? mr.tsCode ?? mr.code ?? '')
          .trim()
          .toUpperCase()
        if (!tsCode || seenTs.has(tsCode)) continue
        seenTs.add(tsCode)
        const code = String(mr.code ?? mr.symbol ?? tsCode.split('.')[0] ?? '')
          .trim()
          .toUpperCase()
        const mname = String(mr.name ?? '').trim() || code
        members.push({ tsCode, code, name: mname })
      }
    }
    out.push(note ? { name, note, members } : { name, members })
  }
  return out
}

function toCustomApiPayload(items: CustomConceptDto[]) {
  return items.map((c) => ({
    name: c.name,
    note: c.note,
    members: c.members.map((m) => ({
      ts_code: m.tsCode,
      code: m.code,
      name: m.name,
    })),
  }))
}

/** 服务端自选概念列表（全端共享）。 */
export async function fetchCustomConcepts(opts?: {
  signal?: AbortSignal
}): Promise<CustomConceptsResponse> {
  const url = toApiUrl(endpoints.conceptsCustom)
  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal: opts?.signal,
  })
  if (!res.ok) throw new Error(`自选概念列表请求失败 (${res.status})`)
  const items = parseCustomConcepts(await res.json())
  return { items, count: items.length }
}

/** 全量替换服务端自选概念（含成分股）。 */
export async function putCustomConcepts(
  items: CustomConceptDto[],
  opts?: { signal?: AbortSignal },
): Promise<CustomConceptsResponse> {
  const url = toApiUrl(endpoints.conceptsCustom)
  const res = await fetch(url.toString(), {
    method: 'PUT',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ items: toCustomApiPayload(items) }),
    signal: opts?.signal,
  })
  if (!res.ok) throw new Error(`自选概念保存失败 (${res.status})`)
  const saved = parseCustomConcepts(await res.json())
  return { items: saved, count: saved.length }
}

export type MemberOverrideDto = {
  conceptCode: string
  blocked: CustomConceptMemberDto[]
  extra: CustomConceptMemberDto[]
}

export type MemberOverridesResponse = {
  items: MemberOverrideDto[]
  count: number
}

function parseOverrideMembers(raw: unknown): CustomConceptMemberDto[] {
  if (!Array.isArray(raw)) return []
  const out: CustomConceptMemberDto[] = []
  const seen = new Set<string>()
  for (const m of raw) {
    const mr = asRecord(m)
    if (!mr) continue
    const tsCode = String(mr.ts_code ?? mr.tsCode ?? mr.code ?? '')
      .trim()
      .toUpperCase()
    if (!tsCode || seen.has(tsCode)) continue
    seen.add(tsCode)
    const code = String(mr.code ?? mr.symbol ?? tsCode.split('.')[0] ?? '')
      .trim()
      .toUpperCase()
    const mname = String(mr.name ?? '').trim() || code
    out.push({ tsCode, code, name: mname })
  }
  return out
}

function parseMemberOverrides(json: unknown): MemberOverrideDto[] {
  const root = asRecord(json) ?? {}
  const itemsRaw = root.items
  if (!Array.isArray(itemsRaw)) return []
  const out: MemberOverrideDto[] = []
  const seen = new Set<string>()
  for (const item of itemsRaw) {
    const rec = asRecord(item)
    if (!rec) continue
    const conceptCode = String(rec.concept_code ?? rec.conceptCode ?? '')
      .trim()
      .toUpperCase()
    if (!conceptCode || seen.has(conceptCode)) continue
    seen.add(conceptCode)
    const extra = parseOverrideMembers(rec.extra)
    const extraTs = new Set(extra.map((m) => m.tsCode))
    const blocked = parseOverrideMembers(rec.blocked).filter((m) => !extraTs.has(m.tsCode))
    if (extra.length === 0 && blocked.length === 0) continue
    out.push({ conceptCode, blocked, extra })
  }
  return out
}

function toOverrideApiPayload(items: MemberOverrideDto[]) {
  return items.map((o) => ({
    concept_code: o.conceptCode,
    blocked: o.blocked.map((m) => ({ ts_code: m.tsCode, code: m.code, name: m.name })),
    extra: o.extra.map((m) => ({ ts_code: m.tsCode, code: m.code, name: m.name })),
  }))
}

/** 官方概念成分覆盖层（全端共享）。 */
export async function fetchMemberOverrides(opts?: {
  signal?: AbortSignal
}): Promise<MemberOverridesResponse> {
  const url = toApiUrl(endpoints.conceptsMemberOverrides)
  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal: opts?.signal,
  })
  if (!res.ok) throw new Error(`概念成分覆盖加载失败 (${res.status})`)
  const items = parseMemberOverrides(await res.json())
  return { items, count: items.length }
}

/** 全量替换官方概念成分覆盖层。 */
export async function putMemberOverrides(
  items: MemberOverrideDto[],
  opts?: { signal?: AbortSignal },
): Promise<MemberOverridesResponse> {
  const url = toApiUrl(endpoints.conceptsMemberOverrides)
  const res = await fetch(url.toString(), {
    method: 'PUT',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ items: toOverrideApiPayload(items) }),
    signal: opts?.signal,
  })
  if (!res.ok) throw new Error(`概念成分覆盖保存失败 (${res.status})`)
  const saved = parseMemberOverrides(await res.json())
  return { items: saved, count: saved.length }
}

/** 按代码/名称搜索股票字典。 */
export async function searchStocks(
  q: string,
  opts?: { limit?: number; signal?: AbortSignal },
): Promise<StockSearchItem[]> {
  const text = q.trim()
  if (!text) return []
  const url = toApiUrl(endpoints.stocksSearch)
  url.searchParams.set('q', text)
  url.searchParams.set('limit', String(opts?.limit ?? 20))
  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal: opts?.signal,
  })
  if (!res.ok) throw new Error(`股票搜索失败 (${res.status})`)
  const root = asRecord(await res.json()) ?? {}
  const itemsRaw = root.items
  if (!Array.isArray(itemsRaw)) return []
  const out: StockSearchItem[] = []
  for (const item of itemsRaw) {
    const rec = asRecord(item)
    if (!rec) continue
    const tsCode = String(rec.ts_code ?? rec.tsCode ?? '').trim().toUpperCase()
    const code = String(rec.code ?? rec.symbol ?? '').trim().toUpperCase()
    const name = String(rec.name ?? '').trim()
    if (!tsCode && !code) continue
    out.push({
      tsCode: tsCode || code,
      code: code || tsCode.split('.')[0] || '',
      name: name || code || tsCode,
    })
  }
  return out
}
