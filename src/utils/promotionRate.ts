import type { LimitHistoryItem, PromotionRateItem } from '../models/apiTypes'
import { passesBoardFilter, type BoardFilterOpts } from './boardFilter'

const BOARD_LABELS: Record<number, string> = {
  2: '二板',
  3: '三板',
  4: '四板',
  5: '五板',
  6: '六板',
  7: '七板',
  8: '八板',
  9: '九板',
  10: '十板',
}

const MAX_BOARDS = 10

function boardLabel(n: number): string {
  return BOARD_LABELS[n] ?? `${n}板`
}

function boardCounts(items: LimitHistoryItem[], opts: BoardFilterOpts): Map<number, number> {
  const counts = new Map<number, number>()
  for (const it of items) {
    const code = (it.股票代码 || '').trim()
    if (!code || !passesBoardFilter(code, opts)) continue
    const boards = it.连板数
    if (boards == null || boards < 1) continue
    counts.set(boards, (counts.get(boards) ?? 0) + 1)
  }
  return counts
}

/** 晋级率_N = 今日N板 / 昨日(N-1)板；与后端 promotion_rate 聚合口径一致。 */
export function computePromotionRateFromHistory(
  todayItems: LimitHistoryItem[],
  prevItems: LimitHistoryItem[],
  boardOpts: BoardFilterOpts,
): PromotionRateItem[] {
  const todayCounts = boardCounts(todayItems, boardOpts)
  const prevCounts = boardCounts(prevItems, boardOpts)

  const relevant: number[] = []
  for (const [b, cnt] of todayCounts) {
    if (cnt > 0 && b >= 2 && b <= MAX_BOARDS) relevant.push(b)
  }
  for (const [b, cnt] of prevCounts) {
    const n = b + 1
    if (cnt > 0 && n >= 2 && n <= MAX_BOARDS) relevant.push(n)
  }
  const maxN = relevant.length > 0 ? Math.max(...relevant) : 2

  const items: PromotionRateItem[] = []
  for (let n = 2; n <= maxN; n++) {
    const base = prevCounts.get(n - 1) ?? 0
    const promoted = todayCounts.get(n) ?? 0
    const rate = base === 0 ? null : Math.round((promoted / base) * 10_000) / 10_000
    items.push({
      boards: n,
      label: boardLabel(n),
      base,
      promoted,
      rate,
    })
  }
  return items
}
