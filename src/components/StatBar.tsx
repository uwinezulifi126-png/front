import type { MarketStat } from '../types'

function parsePctValue(value: string | number): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  const n = parseFloat(String(value).replace(/%/g, '').trim())
  return Number.isFinite(n) ? n : null
}

function statValueColor(stat: MarketStat): string {
  if (stat.label === '上涨家数') return 'var(--up-bright)'
  if (stat.label === '下跌家数') return 'var(--down-bright)'
  if (stat.label === '跌停数') return 'var(--down-bright)'
  if (stat.label === '昨涨停表现') {
    const pct = parsePctValue(stat.value)
    if (pct == null || pct === 0) return 'var(--foreground)'
    return pct > 0 ? 'var(--up-bright)' : 'var(--down-bright)'
  }
  if (stat.label === '涨停封板率' || stat.label === '封板率') {
    const pct = parsePctValue(stat.value)
    if (pct == null) return 'var(--foreground)'
    if (pct >= 70) return 'var(--purple-bright)'
    if (pct >= 50) return 'var(--up-bright)'
    return 'var(--down-bright)'
  }
  if (stat.highlight) return 'var(--up-bright)'
  return 'var(--foreground)'
}

export function StatBar({ stats }: { stats: MarketStat[] }) {
  if (stats.length === 0) {
    return (
      <div className="statbar">
        <div className="stat-item" style={{ flex: 1 }}>
          <div className="stat-label">暂无市场统计</div>
        </div>
      </div>
    )
  }

  return (
    <div className="statbar">
      {stats.map((s) => (
        <div key={s.label} className="stat-item">
          <div
            className="mono stat-value"
            style={{ color: statValueColor(s) }}
          >
            {s.value}
          </div>
          <div className="stat-label">{s.label}</div>
        </div>
      ))}
    </div>
  )
}
