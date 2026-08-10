import type { LadderRow, SectorDetail, SectorHeatItem, Stock, StrongStock } from '../types'

export type BoardFilterOpts = {
  includeChiNext: boolean
  includeStar: boolean
  includeBj: boolean
}

function allBoardsIncluded(opts: BoardFilterOpts): boolean {
  return opts.includeChiNext && opts.includeStar && opts.includeBj
}

/** 创业板：300/301 开头，或 300*.SZ / 301*.SZ */
export function isChiNextCode(codeOrTs: string): boolean {
  const raw = codeOrTs.trim().toUpperCase()
  if (!raw) return false
  const code = raw.replace(/\.(SH|SZ|BJ)$/i, '')
  return code.startsWith('300') || code.startsWith('301')
}

/** 科创板：688/689 开头（上海） */
export function isStarCode(codeOrTs: string): boolean {
  const raw = codeOrTs.trim().toUpperCase()
  if (!raw) return false
  const code = raw.replace(/\.(SH|SZ|BJ)$/i, '')
  return code.startsWith('688') || code.startsWith('689')
}

/** 北交所：.BJ 后缀，或 4xxxxx / 8xxxxx / 920xxx（改革后新代码） */
export function isBjCode(codeOrTs: string): boolean {
  const raw = codeOrTs.trim().toUpperCase()
  if (!raw) return false
  if (raw.endsWith('.BJ')) return true
  const code = raw.replace(/\.(SH|SZ|BJ)$/i, '')
  return code.startsWith('4') || code.startsWith('8') || code.startsWith('920')
}

export function passesBoardFilter(codeOrTs: string, opts: BoardFilterOpts): boolean {
  if (!opts.includeChiNext && isChiNextCode(codeOrTs)) return false
  if (!opts.includeStar && isStarCode(codeOrTs)) return false
  if (!opts.includeBj && isBjCode(codeOrTs)) return false
  return true
}

function itemCode(item: { code?: string; tsCode?: string }): string {
  return (item.tsCode || item.code || '').trim()
}

/** Filter any list of items that carry `code` and/or `tsCode`. */
export function filterByBoard<T extends { code?: string; tsCode?: string }>(
  items: T[],
  opts: BoardFilterOpts,
): T[] {
  if (allBoardsIncluded(opts)) return items
  return items.filter((item) => passesBoardFilter(itemCode(item), opts))
}

export function filterLadder(rows: LadderRow[], opts: BoardFilterOpts): LadderRow[] {
  if (allBoardsIncluded(opts)) return rows
  return rows
    .map((row) => ({
      ...row,
      stocks: row.stocks.filter((s) => passesBoardFilter(s.code, opts)),
    }))
    .filter((row) => row.stocks.length > 0)
}

export function filterStrong(items: StrongStock[], opts: BoardFilterOpts): StrongStock[] {
  return filterByBoard(items, opts)
}

/** Recount sector heat from board-filtered stocks; re-sort by count desc. */
export function refineSectorHeat(
  heat: SectorHeatItem[],
  filteredStocks: Stock[],
): SectorHeatItem[] {
  if (heat.length === 0) return []
  const counts = new Map<string, number>()
  for (const s of filteredStocks) {
    if (!s.sector || s.sector === '—') continue
    counts.set(s.sector, (counts.get(s.sector) ?? 0) + 1)
  }
  return heat
    .map((h) => ({ ...h, count: counts.get(h.name) ?? 0 }))
    .filter((h) => h.count > 0)
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count
      if (b.pct !== a.pct) return b.pct - a.pct
      return a.name.localeCompare(b.name)
    })
}

/** Rebuild sector detail metrics / leading list from board-filtered stocks. */
export function refineSectorDetail(
  details: SectorDetail[],
  filteredStocks: Stock[],
): SectorDetail[] {
  if (details.length === 0) return []
  return details
    .map((d) => {
      const sectorStocks = filteredStocks.filter((s) => s.sector === d.name)
      if (sectorStocks.length === 0) return null
      const locked = sectorStocks.filter((s) => s.status === 'locked').length
      const open = sectorStocks.filter((s) => s.status === 'open').length
      const ranked = [...sectorStocks].sort((a, b) => b.pct - a.pct)
      const top = ranked[0]
      const strengths = sectorStocks
        .map((s) => s.strength)
        .filter((v): v is number => v != null && Number.isFinite(v))
      return {
        ...d,
        count: sectorStocks.length,
        locked,
        open,
        avgStrength:
          strengths.length > 0
            ? Math.round(strengths.reduce((a, b) => a + b, 0) / strengths.length)
            : d.avgStrength,
        topStock: top?.name ?? '—',
        topPct: top?.pct ?? 0,
        amount: +sectorStocks.reduce((a, s) => a + s.amount, 0).toFixed(2),
        leadingStocks: ranked.slice(0, 5).map((s) => s.name),
      } satisfies SectorDetail
    })
    .filter((d): d is SectorDetail => d != null)
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count
      if (b.topPct !== a.topPct) return b.topPct - a.topPct
      return a.name.localeCompare(b.name)
    })
}
