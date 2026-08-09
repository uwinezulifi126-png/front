import type { SectorHeatItem } from '../types'

type SectorPanelProps = {
  items: SectorHeatItem[]
  selected: string | null
  onSelect: (s: string | null) => void
}

export function SectorPanel({ items, selected, onSelect }: SectorPanelProps) {
  if (items.length === 0) {
    return (
      <div className="panel-block">
        <div className="panel-title">板块热度</div>
        <div className="mono muted">暂无板块数据</div>
      </div>
    )
  }

  const max = Math.max(...items.map((s) => s.count), 1)
  return (
    <div className="panel-block">
      <div className="panel-title">板块热度 · 涨停前十</div>
      <div className="sector-heat-list">
        {items.map((s) => {
          const active = selected === s.name
          return (
            <button
              key={s.name}
              type="button"
              className={`sector-heat-row${active ? ' active' : ''}`}
              onClick={() => onSelect(active ? null : s.name)}
            >
              <span className="sector-heat-name">{s.name}</span>
              <span className="sector-heat-track">
                <span className="sector-heat-fill" style={{ width: `${(s.count / max) * 100}%` }} />
              </span>
              <span className="mono sector-heat-count">{s.count}</span>
              {s.pct ? (
                <span className="mono sector-heat-pct">+{s.pct.toFixed(2)}%</span>
              ) : (
                <span className="mono sector-heat-pct muted">—</span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
