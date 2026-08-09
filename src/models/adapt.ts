import { displayStockName } from '../utils/stockName'
import type {
  ConceptCatalogItem,
  LadderRow,
  MarketStat,
  SectorDetail,
  SectorHeatItem,
  Stock,
  StrongStock,
} from '../types'
import type { LimitHistoryItem, RankItem, RankSnapshot, RankStock } from './apiTypes'

function shortCode(tsCode: string): string {
  return tsCode.replace(/\.(SH|SZ|BJ)$/i, '')
}

function formatLimitTime(raw: string | null | undefined): string {
  if (!raw) return '—'
  const m = raw.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/)
  if (!m) return raw
  const hh = m[1].padStart(2, '0')
  const mm = m[2]
  const ss = m[3] ?? '00'
  return `${hh}:${mm}:${ss}`
}

function amountYi(raw: number | null | undefined): number {
  if (raw == null || !Number.isFinite(raw)) return 0
  // history 成交额 often in 元; live may already be smaller units — heuristic
  if (raw >= 1e6) return +(raw / 1e8).toFixed(2)
  if (raw >= 100) return +(raw / 1e4).toFixed(2)
  return +raw.toFixed(2)
}

function circMvYi(raw: number | null | undefined): number {
  if (raw == null || !Number.isFinite(raw)) return 0
  // 流通市值 DB: 万元
  return +(raw / 1e4).toFixed(1)
}

function conceptOf(code: string, rank: RankItem[]): string {
  for (const c of rank) {
    if (c.stock_codes.includes(code) || c.stocks.some((s) => s.stock_code === code)) {
      return c.concept_name
    }
  }
  return ''
}

function historyIndex(items: LimitHistoryItem[]): Map<string, LimitHistoryItem> {
  const map = new Map<string, LimitHistoryItem>()
  for (const it of items) {
    const code = String(it.股票代码 || '').trim()
    if (!code) continue
    const upper = code.toUpperCase()
    map.set(upper, it)
    map.set(shortCode(upper), it)
  }
  return map
}

function lookupHistory(
  map: Map<string, LimitHistoryItem>,
  code: string | null | undefined,
): LimitHistoryItem | undefined {
  const raw = String(code || '').trim()
  if (!raw) return undefined
  const upper = raw.toUpperCase()
  return map.get(upper) ?? map.get(shortCode(upper))
}

/**
 * 炸板口径：以「当前/最终是否仍封住涨停」为准，不是「曾经打开过」。
 * - 仍封板 / 涨停收盘（涨停类型=U）→ 不算炸板（即使打开次数>0）
 * - 炸板（涨停类型=Z）→ 炸板
 *
 * 涨停历史入库 limit_list_d 的 U + Z；优先读 涨停类型。
 */
function historyIsZhaban(h: LimitHistoryItem): boolean {
  const raw = h as LimitHistoryItem & {
    limit?: string | null
    limit_type?: string | null
  }
  const flag = String(raw.涨停类型 ?? raw.limit_type ?? raw.limit ?? '')
    .trim()
    .toUpperCase()
  if (flag === 'Z' || flag.includes('炸')) return true
  if (flag === 'U') return false
  return false
}

function rankStockFromHistory(h: LimitHistoryItem): RankStock {
  return {
    stock_code: h.股票代码,
    stock_name: h.股票名称,
    pct_chg: h.涨跌幅,
    close: h.收盘价,
    lu_time: h.首次涨停时间,
    limit_times: h.连板数,
    open_times: h.打开次数,
    // 涨停历史(U)：最终仍涨停；炸板由 historyIsZhaban / is_limit_up=false 判定
    is_limit_up: !historyIsZhaban(h),
    industry: h.所属行业,
    amount: h.成交额,
    circ_mv: h.流通市值,
    turnover_rate: h.换手率,
  }
}

/** open = 炸板；locked = 仍封板/涨停收盘。打开次数不参与判定。 */
function resolveStockStatus(
  s: RankStock,
  hist?: LimitHistoryItem | null,
): Stock['status'] {
  if (hist && historyIsZhaban(hist)) return 'open'
  if (s.is_limit_up === false) return 'open'
  // limit_up_list 成员或涨停历史(U)：当前/最终仍封板（即使打开次数>0）
  return 'locked'
}

function mapStock(s: RankStock, rank: RankItem[], hist?: LimitHistoryItem | null): Stock {
  const boards = hist?.连板数 ?? s.limit_times
  const status = resolveStockStatus(s, hist)
  const amountRaw = hist?.成交额 ?? s.amount
  return {
    code: shortCode(s.stock_code),
    tsCode: String(s.stock_code || '').trim().toUpperCase(),
    name: displayStockName(s.stock_name ?? hist?.股票名称, s.stock_code),
    price: hist?.收盘价 ?? s.close ?? 0,
    change: 0,
    pct: hist?.涨跌幅 ?? s.pct_chg ?? 0,
    volume: 0,
    amount: amountYi(amountRaw),
    limitTime: formatLimitTime(hist?.首次涨停时间 ?? s.lu_time),
    opens: boards != null && boards > 0 ? Math.max(0, Math.round(boards) - 1) : 0,
    sector: conceptOf(s.stock_code, rank) || hist?.所属行业 || s.industry || '—',
    status,
    strength: null,
    bidAmount: null,
    riseSpeed: s.rise_speed ?? null,
  }
}

/**
 * 涨停表 = limit_up_list（多为 U 封板）+ history 中 Z（炸板）。
 * 勿只拿 replay 的 limit_up_list，否则会丢掉 limit-history 里的炸板行。
 */
export function adaptStocks(
  snapshot: RankSnapshot | null,
  history: LimitHistoryItem[] = [],
): Stock[] {
  if (!snapshot) return []
  const histMap = historyIndex(history)
  const list = snapshot.limit_up_list

  if (list.length > 0) {
    const seen = new Set<string>()
    const out: Stock[] = []
    for (const s of list) {
      const code = String(s.stock_code || '').trim().toUpperCase()
      if (code) {
        seen.add(code)
        seen.add(shortCode(code))
      }
      out.push(mapStock(s, snapshot.rank, lookupHistory(histMap, s.stock_code)))
    }
    // replay limit_up_list 通常只有 U；把 history 中 Z 追加为 status=open
    for (const h of history) {
      if (!historyIsZhaban(h)) continue
      const code = String(h.股票代码 || '').trim().toUpperCase()
      if (!code || seen.has(code) || seen.has(shortCode(code))) continue
      seen.add(code)
      seen.add(shortCode(code))
      out.push(mapStock(rankStockFromHistory(h), snapshot.rank, h))
    }
    return out
  }

  if (history.length === 0) return []

  return history.map((h) => mapStock(rankStockFromHistory(h), snapshot.rank, h))
}

/** Only emit stats that have real pulse/meta values — no placeholders. */
export function adaptStats(snapshot: RankSnapshot | null): MarketStat[] {
  const pulse = snapshot?.meta.market_pulse
  if (!pulse && snapshot?.meta.limit_up_count == null) return []

  const stats: MarketStat[] = []
  const push = (label: string, value: string | number | null | undefined, highlight?: boolean) => {
    if (value == null || value === '') return
    stats.push({ label, value, highlight })
  }

  push('涨停数', pulse?.limit_up_count ?? snapshot?.meta.limit_up_count, true)
  push('跌停数', pulse?.limit_down_count)
  push('炸板数', pulse?.broken_count)
  if (pulse?.broken_rate_pct != null) {
    push('涨停封板率', `${(100 - pulse.broken_rate_pct).toFixed(1)}%`)
  }
  push('上涨家数', pulse?.up_count)
  push('下跌家数', pulse?.down_count)
  if (pulse?.heat_pct != null) push('市场热度', `${pulse.heat_pct.toFixed(1)}%`, true)
  if (pulse?.yest_limit_avg_pct != null) {
    push('昨涨停表现', `${pulse.yest_limit_avg_pct.toFixed(2)}%`)
  }
  return stats
}

/** 概念涨幅：优先用接口 pct_chg，否则用成分强势股平均涨幅。 */
function conceptGainPct(c: RankItem): number | null {
  if (c.pct_chg != null && Number.isFinite(c.pct_chg)) return c.pct_chg
  const pcts = c.stocks
    .map((s) => s.pct_chg)
    .filter((p): p is number => p != null && Number.isFinite(p))
  if (pcts.length === 0) return null
  return pcts.reduce((a, b) => a + b, 0) / pcts.length
}

/**
 * 板块热度：按涨停家数降序完整列表；并列时按涨幅、名称。
 * 调用方应先 filterBlockedConcepts，再 takeTopConcepts(..., 10)。
 */
export function adaptSectorHeat(snapshot: RankSnapshot | null): SectorHeatItem[] {
  if (!snapshot?.rank.length) return []
  const rows = snapshot.rank.map((c) => {
    const pct = conceptGainPct(c)
    return {
      name: c.concept_name,
      count: c.limit_up_count,
      pct: pct ?? 0,
    }
  })
  rows.sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count
    if (b.pct !== a.pct) return b.pct - a.pct
    return a.name.localeCompare(b.name)
  })
  return rows.map(({ name, count, pct }) => ({ name, count, pct }))
}

/**
 * 板块详情列表：与 adaptSectorHeat 一致，按涨停家数降序完整列表。
 * 调用方应先 filterBlockedConcepts，再 takeTopConcepts(..., 10)。
 */
export function adaptSectorDetail(snapshot: RankSnapshot | null): SectorDetail[] {
  if (!snapshot?.rank.length) return []
  const rows = snapshot.rank.map((c) => {
    const pct = conceptGainPct(c)
    const leading = c.stocks
      .map((s) => displayStockName(s.stock_name, s.stock_code))
      .filter((n) => n !== '—')
      .slice(0, 5)
    const top = c.stocks[0]
    return {
      name: c.concept_name,
      count: c.limit_up_count,
      locked: c.limit_up_count,
      open: 0,
      avgStrength: 0,
      topStock: top ? displayStockName(top.stock_name, top.stock_code) : '—',
      topPct: top?.pct_chg ?? 0,
      amount: 0,
      leadingStocks: leading,
      _pct: pct ?? 0,
    }
  })
  rows.sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count
    if (b._pct !== a._pct) return b._pct - a._pct
    return a.name.localeCompare(b.name)
  })
  return rows.map(({ _pct, ...detail }) => detail)
}

/**
 * 当日/复盘 feed 概念涨幅/涨停（按名称供同花顺全量列表叠加）。
 * 列表全集改由 /api/concepts/ths 提供，不再用 rank 当全集。
 */
export function adaptConceptCatalog(snapshot: RankSnapshot | null): ConceptCatalogItem[] {
  if (!snapshot?.rank.length) return []
  const rows = snapshot.rank.map((c) => {
    const pct = conceptGainPct(c)
    return {
      name: c.concept_name,
      code: c.concept_code || '',
      count: c.limit_up_count,
      pct,
      _sortPct: pct ?? Number.NEGATIVE_INFINITY,
    }
  })
  rows.sort((a, b) => {
    if (b._sortPct !== a._sortPct) return b._sortPct - a._sortPct
    if (b.count !== a.count) return b.count - a.count
    return a.name.localeCompare(b.name)
  })
  return rows.map(({ _sortPct, ...item }) => item)
}

const LADDER_COLORS = [
  '#ff00ff', '#e040fb', '#ef5350', '#f44336', '#ff7043',
  '#ff8a65', '#ffa726', '#ffca28', '#9e9e9e', '#78909c',
]

export function adaptLadder(history: LimitHistoryItem[]): LadderRow[] {
  if (!history.length) return []
  const byBoard = new Map<number, LimitHistoryItem[]>()
  for (const h of history) {
    const boards = Math.max(1, Math.round(h.连板数 ?? 1))
    const list = byBoard.get(boards) ?? []
    list.push(h)
    byBoard.set(boards, list)
  }
  return [...byBoard.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([boards, items], i) => ({
      boards,
      label: boards >= 10 ? `${boards}板` : ['', '首板', '二板', '三板', '四板', '五板', '六板', '七板', '八板', '九板'][boards] ?? `${boards}板`,
      color: LADDER_COLORS[Math.min(i, LADDER_COLORS.length - 1)],
      stocks: items.map((h) => ({
        code: shortCode(h.股票代码),
        name: displayStockName(h.股票名称, h.股票代码),
        price: h.收盘价 ?? 0,
        sector: h.所属行业 ?? '—',
        amount: amountYi(h.成交额),
        strength: 0,
        limitTime: formatLimitTime(h.首次涨停时间),
        // 打开次数>0 且最终仍涨停 ≠ 炸板；仅明确开板/Z 才标「炸」
        zhaban: historyIsZhaban(h),
      })),
    }))
}

export function adaptStrong(snapshot: RankSnapshot | null): StrongStock[] {
  if (!snapshot?.rank.length) return []
  const seen = new Set<string>()
  const out: StrongStock[] = []
  for (const c of snapshot.rank) {
    for (const s of c.stocks) {
      if (seen.has(s.stock_code)) continue
      seen.add(s.stock_code)
      const pct = s.pct_chg ?? 0
      out.push({
        code: shortCode(s.stock_code),
        name: displayStockName(s.stock_name, s.stock_code),
        price: s.close ?? 0,
        pct,
        amount: amountYi(s.amount),
        sector: c.concept_name,
        score: Math.round(Math.min(99, Math.max(1, pct * 8 + (s.is_limit_up ? 10 : 0)))),
        tag: c.concept_name,
        reason: s.theme ?? c.reason ?? c.theme ?? `${c.concept_name} · 涨幅 ${pct.toFixed(2)}%`,
        mktCap: circMvYi(s.circ_mv),
        industry: s.industry ?? c.concept_name,
        riseSpeed: s.rise_speed ?? 0,
      })
    }
  }
  return out.sort((a, b) => b.pct - a.pct)
}

export function adaptSentiment(snapshot: RankSnapshot | null): { label: string; val: number; color: string }[] {
  const heat = snapshot?.meta.market_pulse?.heat_pct
  if (heat == null) return []
  return [{ label: '市场热度', val: Math.round(heat), color: 'var(--up-bright)' }]
}
