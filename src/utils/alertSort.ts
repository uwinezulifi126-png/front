import type { AlertApiItem } from '../api/client'

function coerceId(id: AlertApiItem['id']): number {
  if (typeof id === 'number' && Number.isFinite(id)) return id
  if (typeof id === 'string') {
    const n = Number.parseInt(id, 10)
    if (Number.isFinite(n)) return n
  }
  return 0
}

/** Comparable epoch ms for alert ordering. */
export function alertTimeMs(item: AlertApiItem): number {
  const iso = item.预警时间
  if (!iso) return 0

  const text = String(iso).trim()
  const normalized = text.includes(' ') && !text.includes('T') ? text.replace(' ', 'T') : text
  const d = new Date(normalized)
  if (!Number.isNaN(d.getTime())) return d.getTime()

  const tm = text.match(/(\d{2}):(\d{2}):(\d{2})/)
  if (!tm) return 0

  const tradeRaw = item.交易日期
  if (tradeRaw) {
    const datePart = String(tradeRaw).slice(0, 10).replace(/\//g, '-')
    const combined = new Date(`${datePart}T${tm[1]}:${tm[2]}:${tm[3]}`)
    if (!Number.isNaN(combined.getTime())) return combined.getTime()
  }

  return (
    (Number.parseInt(tm[1], 10) * 3600 +
      Number.parseInt(tm[2], 10) * 60 +
      Number.parseInt(tm[3], 10)) *
    1000
  )
}

/** Oldest alerts first (ascending by 预警时间, then id). */
export function sortAlertsAsc(items: AlertApiItem[]): AlertApiItem[] {
  return [...items].sort((a, b) => {
    const byTime = alertTimeMs(a) - alertTimeMs(b)
    if (byTime !== 0) return byTime
    return coerceId(a.id) - coerceId(b.id)
  })
}
