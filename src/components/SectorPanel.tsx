import { SECTOR_HEAT } from '../data/mock'

type SectorPanelProps = {
  selected: string | null
  onSelect: (s: string | null) => void
}

export function SectorPanel({ selected, onSelect }: SectorPanelProps) {
  const max = Math.max(...SECTOR_HEAT.map((s) => s.count))
  return (
    <div className="panel-block">
      <div className="panel-title">板块热度</div>
      <div className="sector-heat-list">
        {SECTOR_HEAT.map((s) => {
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
                <span
                  className="sector-heat-fill"
                  style={{ width: `${(s.count / max) * 100}%` }}
                />
              </span>
              <span className="mono sector-heat-count">{s.count}</span>
              <span className="mono sector-heat-pct">+{s.pct}%</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
