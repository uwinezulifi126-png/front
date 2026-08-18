import type { Stock } from '../types'

/** 涨速：近 1 分钟动量，不足则相对开盘；无数据时 —，涨红跌绿。 */
export function RiseSpeedCell({ value }: { value: number | null | undefined }) {
  if (value == null || !Number.isFinite(value)) {
    return <span className="mono muted">—</span>
  }
  const cls = value > 0 ? 'up' : value < 0 ? 'down' : 'muted'
  const sign = value > 0 ? '+' : ''
  return (
    <span className={`mono ${cls}`}>
      {sign}
      {value.toFixed(2)}%
    </span>
  )
}

export function StatusBadge({ status }: { status: Stock['status'] }) {
  const map = {
    locked: { label: '封板', className: 'badge badge-locked' },
    open: { label: '炸板', className: 'badge badge-open' },
    sealed: { label: '竞价', className: 'badge badge-sealed' },
  }
  const s = map[status]
  return <span className={s.className}>{s.label}</span>
}

export function OpensBadge({ opens }: { opens: number }) {
  if (opens === 0) return <span className="mono board board-1">首板</span>
  if (opens === 1) return <span className="mono board board-2">二板</span>
  if (opens === 2) return <span className="mono board board-3">三板</span>
  return (
    <span className="mono board board-n">
      {opens + 1}板
    </span>
  )
}
