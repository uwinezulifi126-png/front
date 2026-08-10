import type { MarketPulse, MarketPulsePoint, RankItem, RankMeta, RankSnapshot, RankStock } from './apiTypes'
import { resolveStockName } from '../utils/stockName'

/** Concepts ranked by limit_up_count (backend CONCEPT_TOP_N default 30). */
const CONCEPT_TOP_DISPLAY = 30

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function pickString(obj: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const v = obj[key]
    if (typeof v === 'string' && v.trim()) return v.trim()
    if (typeof v === 'number' && Number.isFinite(v)) return String(v)
  }
  return undefined
}

function pickNumber(obj: Record<string, unknown>, keys: string[]): number | undefined {
  for (const key of keys) {
    const v = obj[key]
    if (typeof v === 'number' && Number.isFinite(v)) return v
    if (typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v))) {
      return Number(v)
    }
  }
  return undefined
}

function pickBoolean(obj: Record<string, unknown>, keys: string[]): boolean | undefined {
  for (const key of keys) {
    const v = obj[key]
    if (typeof v === 'boolean') return v
  }
  return undefined
}

const BOARD_LABEL: Record<string, string> = {
  main: '主板',
  chinext: '创业板',
  star: '科创板',
  bj: '北交所',
}

function normalizeStock(raw: unknown): RankStock | null {
  if (typeof raw === 'string' && raw.trim()) {
    return { stock_code: raw.trim() }
  }
  const obj = asRecord(raw)
  if (!obj) return null
  const stock_code = pickString(obj, [
    'stock_code',
    'ts_code',
    'code',
    'symbol',
  ])
  if (!stock_code) return null
  const board = pickString(obj, ['board', 'board_type', 'market_board']) ?? null
  const board_label =
    pickString(obj, ['board_label', 'board_name']) ??
    (board ? BOARD_LABEL[board] ?? null : null)
  const lu_time =
    pickString(obj, [
      'lu_time',
      'first_seen',
      'first_time',
      'trade_time',
      'limit_time',
    ]) ?? null
  const rawName =
    pickString(obj, ['stock_name', 'name', 'ts_name', '股票名称']) ?? null
  return {
    stock_code,
    // Drop ts_code-as-name so later enrichment can fill a real Chinese name
    stock_name: resolveStockName(rawName, stock_code),
    pct_chg: pickNumber(obj, ['pct_chg', 'pct_change', 'change_pct', 'pct']) ?? null,
    limit_times: pickNumber(obj, ['limit_times', 'limit_up_times', 'consecutive']) ?? null,
    board,
    board_label,
    is_limit_up: pickBoolean(obj, ['is_limit_up', 'limit_up', 'isLimitUp']) ?? null,
    close: pickNumber(obj, ['close', 'price', 'last_price', 'latest']) ?? null,
    lu_time,
    turnover_rate:
      pickNumber(obj, ['turnover_rate', 'turnover', 'turnover_ratio', '换手率']) ?? null,
    circ_mv: pickNumber(obj, ['circ_mv', 'float_mv', '流通市值']) ?? null,
    limit_stat: pickString(obj, ['limit_stat', 'up_stat', '涨停统计']) ?? null,
    theme: pickString(obj, ['theme', 'theme_raw', 'reason', '解读', 'note']) ?? null,
    industry: pickString(obj, ['industry', '所属行业']) ?? null,
    amount: pickNumber(obj, ['amount', '成交额']) ?? null,
    open_times: pickNumber(obj, ['open_times', 'opens', '打开次数']) ?? null,
    limit_type: pickString(obj, ['limit_type', 'limit', '涨停类型']) ?? null,
    rise_speed:
      pickNumber(obj, ['rise_speed', 'pct_1m', 'riseSpeed', '一分钟涨速']) ?? null,
  }
}

function sortByPctDesc(stocks: RankStock[]): RankStock[] {
  return [...stocks].sort((a, b) => {
    const pa = a.pct_chg ?? Number.NEGATIVE_INFINITY
    const pb = b.pct_chg ?? Number.NEGATIVE_INFINITY
    if (pb !== pa) return pb - pa
    return a.stock_code.localeCompare(b.stock_code)
  })
}

function mergeStock(base: RankStock, extra: RankStock): RankStock {
  return {
    ...base,
    stock_name:
      resolveStockName(base.stock_name, base.stock_code) ??
      resolveStockName(extra.stock_name, extra.stock_code) ??
      null,
    pct_chg: base.pct_chg ?? extra.pct_chg ?? null,
    limit_times: base.limit_times ?? extra.limit_times ?? null,
    board: base.board ?? extra.board ?? null,
    board_label: base.board_label ?? extra.board_label ?? null,
    is_limit_up: base.is_limit_up ?? extra.is_limit_up ?? null,
    close: base.close ?? extra.close ?? null,
    lu_time: base.lu_time ?? extra.lu_time ?? null,
    turnover_rate: base.turnover_rate ?? extra.turnover_rate ?? null,
    circ_mv: base.circ_mv ?? extra.circ_mv ?? null,
    limit_stat: base.limit_stat ?? extra.limit_stat ?? null,
    theme: base.theme ?? extra.theme ?? null,
    industry: base.industry ?? extra.industry ?? null,
    amount: base.amount ?? extra.amount ?? null,
    open_times: base.open_times ?? extra.open_times ?? null,
    limit_type: base.limit_type ?? extra.limit_type ?? null,
    rise_speed: base.rise_speed ?? extra.rise_speed ?? null,
  }
}

function normalizeItem(raw: unknown): RankItem | null {
  const obj = asRecord(raw)
  if (!obj) return null

  const concept_code = pickString(obj, ['concept_code', 'code', 'ths_code', 'id']) ?? ''
  const concept_name =
    pickString(obj, ['concept_name', 'name', 'ths_name']) ?? concept_code
  if (!concept_code && !concept_name) return null

  const limit_up_count =
    pickNumber(obj, ['limit_up_count', 'count', 'limit_count', 'num']) ?? 0

  // Prefer strong_stocks (board-threshold movers); fallback to leaders / members
  const strongRaw = obj.strong_stocks
  const hasStrong = Array.isArray(strongRaw)
  const stocksRaw = hasStrong
    ? strongRaw
    : (obj.stocks ?? obj.members ?? obj.constituents ?? obj.leaders)
  let stocks: RankStock[] = Array.isArray(stocksRaw)
    ? stocksRaw.map(normalizeStock).filter((s): s is RankStock => s !== null)
    : []

  // Harvest names from leaders even when the list itself comes from strong_stocks
  const leadersRaw = obj.leaders
  if (Array.isArray(leadersRaw) && stocks.length > 0) {
    const byLeader = new Map<string, RankStock>()
    for (const raw of leadersRaw) {
      const s = normalizeStock(raw)
      if (s) byLeader.set(s.stock_code, s)
    }
    if (byLeader.size > 0) {
      stocks = stocks.map((s) => {
        const leader = byLeader.get(s.stock_code)
        return leader ? mergeStock(s, leader) : s
      })
    }
  }

  const codesRaw = obj.stock_codes ?? obj.codes ?? obj.ts_codes
  let stock_codes: string[] = Array.isArray(codesRaw)
    ? codesRaw
        .map((c) => (typeof c === 'string' || typeof c === 'number' ? String(c) : ''))
        .filter(Boolean)
    : []

  if (stock_codes.length === 0 && stocks.length > 0) {
    stock_codes = stocks.map((s) => s.stock_code)
  }

  // When using strong_stocks, do not expand/replace with limit-up-only stock_codes
  if (!hasStrong && stock_codes.length > 0) {
    const byCode = new Map(stocks.map((s) => [s.stock_code, s]))
    const merged: RankStock[] = stock_codes.map(
      (code) => byCode.get(code) ?? { stock_code: code },
    )
    stocks = merged
  }

  stocks = sortByPctDesc(stocks)

  // 强势成分不计涨停股；服务端另要求昨日首板；strong_count 与列表口径一致
  if (hasStrong) {
    stocks = stocks.filter((s) => s.is_limit_up !== true)
  }

  const strong_count =
    pickNumber(obj, ['strong_count', 'strongCount']) ??
    (hasStrong ? stocks.length : null)

  return {
    concept_code: concept_code || concept_name,
    concept_name,
    limit_up_count,
    max_limit_times:
      pickNumber(obj, ['max_limit_times', 'max_consecutive', 'max_limit']) ?? null,
    strong_count: hasStrong ? stocks.length : strong_count,
    pct_chg: pickNumber(obj, ['pct_chg', 'pct_change', 'change_pct', 'avg_pct']) ?? null,
    theme: pickString(obj, ['theme', 'theme_raw', '题材']) ?? null,
    reason: pickString(obj, ['reason', '理由', 'summary', 'desc', 'description']) ?? null,
    stock_codes,
    stocks,
  }
}

function normalizePulsePoint(raw: unknown): MarketPulsePoint | null {
  const obj = asRecord(raw)
  if (!obj) return null
  return {
    up: pickNumber(obj, ['up', 'up_count']) ?? null,
    down: pickNumber(obj, ['down', 'down_count']) ?? null,
    limit_up: pickNumber(obj, ['limit_up', 'limit_up_count']) ?? null,
    limit_down: pickNumber(obj, ['limit_down', 'limit_down_count']) ?? null,
    broken: pickNumber(obj, ['broken', 'broken_count']) ?? null,
    broken_rate: pickNumber(obj, ['broken_rate', 'broken_rate_pct']) ?? null,
    yest_avg_pct: pickNumber(obj, ['yest_avg_pct', 'yest_limit_avg_pct']) ?? null,
    heat: pickNumber(obj, ['heat', 'heat_pct']) ?? null,
    t: pickNumber(obj, ['t', 'ts', 'version']) ?? null,
  }
}

function normalizeMarketPulse(raw: unknown): MarketPulse | null {
  const obj = asRecord(raw)
  if (!obj) return null
  const seriesRaw = obj.series
  const series = Array.isArray(seriesRaw)
    ? seriesRaw.map(normalizePulsePoint).filter((p): p is MarketPulsePoint => p !== null)
    : []
  return {
    up_count: pickNumber(obj, ['up_count', 'up']) ?? null,
    down_count: pickNumber(obj, ['down_count', 'down']) ?? null,
    flat_count: pickNumber(obj, ['flat_count', 'flat']) ?? null,
    limit_up_count: pickNumber(obj, ['limit_up_count', 'limit_up']) ?? null,
    limit_down_count: pickNumber(obj, ['limit_down_count', 'limit_down']) ?? null,
    broken_count: pickNumber(obj, ['broken_count', 'broken']) ?? null,
    broken_rate_pct: pickNumber(obj, ['broken_rate_pct', 'broken_rate']) ?? null,
    heat_pct: pickNumber(obj, ['heat_pct', 'heat']) ?? null,
    yest_limit_avg_pct: pickNumber(obj, ['yest_limit_avg_pct', 'yest_avg_pct']) ?? null,
    yest_limit_sample: pickNumber(obj, ['yest_limit_sample']) ?? null,
    series,
  }
}

function normalizeMeta(raw: unknown): RankMeta {
  const obj = asRecord(raw)
  if (!obj) return {}
  return {
    trade_date: pickString(obj, ['trade_date', 'tradeDate', 'date']) ?? null,
    snapshot_at: pickString(obj, ['snapshot_at', 'snapshotAt', 'updated_at', 'ts']) ?? null,
    version: (obj.version as number | string | null | undefined) ?? null,
    quote_count: pickNumber(obj, ['quote_count', 'quoteCount']) ?? null,
    limit_up_count: pickNumber(obj, ['limit_up_count', 'limitUpCount']) ?? null,
    is_trading: pickBoolean(obj, ['is_trading', 'isTrading', 'trading']) ?? null,
    is_open: pickBoolean(obj, ['is_open', 'isOpen']) ?? null,
    live_allowed: pickBoolean(obj, ['live_allowed', 'liveAllowed']) ?? null,
    mode: pickString(obj, ['mode', 'feed_mode']) ?? null,
    prev_trade_date:
      pickString(obj, ['prev_trade_date', 'prevTradeDate', 'previous_trade_date']) ?? null,
    default_replay_date:
      pickString(obj, ['default_replay_date', 'defaultReplayDate']) ?? null,
    strong_source: pickString(obj, ['strong_source', 'strongSource']) ?? null,
    message: pickString(obj, ['message', 'status_message', 'note']) ?? null,
    market_pulse: normalizeMarketPulse(obj.market_pulse ?? obj.marketPulse) ?? null,
  }
}

/** Build ts_code → quote map from limit_up_list for enriching concept members. */
function indexLimitUpList(raw: unknown): Map<string, RankStock> {
  const map = new Map<string, RankStock>()
  if (!Array.isArray(raw)) return map
  for (const item of raw) {
    const stock = normalizeStock(item)
    if (stock) {
      map.set(stock.stock_code, {
        ...stock,
        is_limit_up: stock.is_limit_up ?? true,
      })
    }
  }
  return map
}

function enrichRankWithQuotes(rank: RankItem[], quotes: Map<string, RankStock>): RankItem[] {
  if (quotes.size === 0) return rank
  return rank.map((item) => {
    const stocks = item.stocks.map((s) => {
      const q = quotes.get(s.stock_code)
      if (!q) return s
      return mergeStock(s, q)
    })
    return { ...item, stocks: sortByPctDesc(stocks) }
  })
}

/** Collect real Chinese names across the snapshot (limit_up + all concept stocks). */
function indexStockNames(
  rank: RankItem[],
  quotes: Map<string, RankStock>,
): Map<string, string> {
  const map = new Map<string, string>()
  const put = (code: string, name: string | null | undefined) => {
    if (map.has(code)) return
    const resolved = resolveStockName(name, code)
    if (resolved) map.set(code, resolved)
  }
  for (const q of quotes.values()) {
    put(q.stock_code, q.stock_name)
  }
  for (const item of rank) {
    for (const s of item.stocks) {
      put(s.stock_code, s.stock_name)
    }
  }
  return map
}

/** Fill missing stock_name from a shared name map (other concepts / limit_up). */
function fillMissingStockNames(
  rank: RankItem[],
  names: Map<string, string>,
): RankItem[] {
  if (names.size === 0) return rank
  return rank.map((item) => ({
    ...item,
    stocks: item.stocks.map((s) => {
      if (resolveStockName(s.stock_name, s.stock_code)) return s
      const filled = names.get(s.stock_code)
      return filled ? { ...s, stock_name: filled } : s
    }),
  }))
}

/** Normalize various backend payload shapes into RankSnapshot. */
export function normalizeSnapshot(payload: unknown): RankSnapshot {
  const root = asRecord(payload)
  if (!root) {
    return { meta: {}, rank: [], limit_up_list: [] }
  }

  // stock_data API: { meta, concept_top, limit_up_list }
  // Also tolerate { data: { meta, rank } } / { meta, rank } / { meta, data: [...] }
  const nested = asRecord(root.data)
  // Prefer explicit meta; do not fall back to root when meta is null (empty Redis)
  const metaSource =
    root.meta !== undefined
      ? root.meta
      : nested?.meta !== undefined
        ? nested.meta
        : root
  const rankSource =
    root.concept_top ??
    root.rank ??
    root.items ??
    root.concepts ??
    nested?.concept_top ??
    nested?.rank ??
    nested?.items ??
    (Array.isArray(root.data) ? root.data : null)

  let rank = Array.isArray(rankSource)
    ? rankSource.map(normalizeItem).filter((i): i is RankItem => i !== null)
    : []

  const quotes = indexLimitUpList(
    root.limit_up_list ?? nested?.limit_up_list ?? root.limit_ups,
  )
  rank = enrichRankWithQuotes(rank, quotes)
  // 二次剔除：即便旧快照把涨停股塞进 strong_stocks，也不计入强势口径
  rank = rank.map((item) => {
    if (item.strong_count == null) return item
    const stocks = item.stocks.filter(
      (s) => s.is_limit_up !== true && !quotes.has(s.stock_code),
    )
    if (stocks.length === item.stocks.length) return item
    return { ...item, stocks, strong_count: stocks.length }
  })
  rank = fillMissingStockNames(rank, indexStockNames(rank, quotes))

  return {
    meta: normalizeMeta(metaSource),
    rank: rank
      .sort((a, b) => b.limit_up_count - a.limit_up_count)
      .slice(0, CONCEPT_TOP_DISPLAY),
    limit_up_list: Array.from(quotes.values()),
  }
}

export function parseSseData(raw: string): RankSnapshot | null {
  const text = raw.trim()
  if (!text || text === 'ping' || text === ':') return null
  try {
    return normalizeSnapshot(JSON.parse(text))
  } catch {
    return null
  }
}
