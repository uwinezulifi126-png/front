import type { Stock } from '../types'

export function StrengthBar({ value }: { value: number }) {
  const color = value >= 80 ? 'var(--up-bright)' : value >= 50 ? 'var(--accent)' : 'var(--down-bright)'
  return (
    <div className="strength">
      <div className="strength-track">
        <div className="strength-fill" style={{ width: `${value}%`, backgroundColor: color }} />
      </div>
      <span className="mono strength-val" style={{ color }}>
        {value}
      </span>
    </div>
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
