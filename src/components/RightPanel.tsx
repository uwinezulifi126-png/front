import { BOARD_RATES, DRAGON_TIGER, SENTIMENT } from '../data/mock'

export function RightPanel() {
  return (
    <aside className="sidebar-right">
      <div className="panel-block">
        <div className="panel-title">市场情绪</div>
        <div className="sentiment-list">
          {SENTIMENT.map((m) => (
            <div key={m.label} className="sentiment-item">
              <div className="sentiment-head">
                <span>{m.label}</span>
                <span className="mono" style={{ color: m.color }}>
                  {m.val}
                </span>
              </div>
              <div className="meter-track">
                <div className="meter-fill" style={{ width: `${m.val}%`, backgroundColor: m.color }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="panel-block">
        <div className="panel-title">龙虎榜主力</div>
        <div className="dragon-list">
          {DRAGON_TIGER.map((r) => (
            <div key={r.name} className="dragon-row">
              <span className="dragon-name">{r.name}</span>
              <span className={`mono ${r.dir === 'up' ? 'up' : 'down'}`}>{r.net}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="panel-block">
        <div className="panel-title">连板晋级率</div>
        <div className="rate-list">
          {BOARD_RATES.map((r) => (
            <div key={r.label} className="rate-row">
              <span>{r.label}</span>
              <span className="mono rate-val">{r.rate}</span>
            </div>
          ))}
        </div>
      </div>
    </aside>
  )
}
