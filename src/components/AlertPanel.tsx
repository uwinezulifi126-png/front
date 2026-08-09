import { ALERTS } from '../data/mock'

export function AlertPanel() {
  return (
    <div className="panel-block alert-panel">
      <div className="panel-title">实时预警</div>
      <div className="alert-list">
        {ALERTS.map((a) => (
          <div key={`${a.time}-${a.msg}`} className="alert-row">
            <span className="mono alert-time">{a.time}</span>
            <span className={`alert-msg level-${a.level}`}>{a.msg}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
