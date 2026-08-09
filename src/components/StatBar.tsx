import type { MarketStat } from '../types'

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
      {stats.map((s, i) => (
        <div key={s.label} className="stat-item">
          <div
            className="mono stat-value"
            style={{
              color: s.highlight ? 'var(--up-bright)' : i === 1 ? 'var(--down-bright)' : 'var(--foreground)',
            }}
          >
            {s.value}
          </div>
          <div className="stat-label">{s.label}</div>
        </div>
      ))}
    </div>
  )
}
