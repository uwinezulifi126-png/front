/** Normalize to YYYY-MM-DD. */
export function normalizeTradeDate(raw: string | null | undefined): string {
  const s = String(raw || '').trim()
  if (!s) return ''
  if (/^\d{8}$/.test(s)) return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`
  return s.slice(0, 10)
}

/**
 * Previous open trade day relative to `selected`, using calendar `dates` (newest-first).
 * Falls back to `fallback` (e.g. status.prev_trade_date) when calendar has no older day.
 */
export function resolvePrevTradeDate(
  selected: string,
  dates: string[],
  fallback?: string | null,
): string | null {
  const sel = normalizeTradeDate(selected)
  if (!sel) return normalizeTradeDate(fallback) || null

  const normalized = dates.map(normalizeTradeDate).filter(Boolean)
  const idx = normalized.findIndex((d) => d === sel)
  if (idx >= 0 && idx + 1 < normalized.length) return normalized[idx + 1]

  const older = normalized.find((d) => d < sel)
  if (older) return older

  return normalizeTradeDate(fallback) || null
}

/**
 * Trade date for「昨日涨停」tab.
 *
 * When viewing calendar today, prefer backend `yest_limit_trade_date` (flips at
 * open-day 09:00 Asia/Shanghai). Replay of older days stays relative to selected.
 */
export function resolveYestLimitTradeDate(opts: {
  selected: string
  dates: string[]
  today?: string | null
  yestLimitTradeDate?: string | null
  fallbackPrev?: string | null
}): string | null {
  const selected = normalizeTradeDate(opts.selected)
  const today = normalizeTradeDate(opts.today)
  const fromApi = normalizeTradeDate(opts.yestLimitTradeDate)
  if (selected && today && selected === today && fromApi) {
    return fromApi
  }
  return resolvePrevTradeDate(selected, opts.dates, opts.fallbackPrev)
}
