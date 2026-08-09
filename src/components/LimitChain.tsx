import { LIMIT_CHAIN_DATA } from '../data/mock'

export function LimitChain() {
  const max = Math.max(...LIMIT_CHAIN_DATA.map((d) => d.count))
  return (
    <div className="panel-block">
      <div className="panel-title">涨停数量趋势</div>
      <div className="chain-bars">
        {LIMIT_CHAIN_DATA.map((d, i) => (
          <div key={d.date} className="chain-col">
            <span className={`mono chain-count${i === 0 ? ' today' : ''}`}>{d.count}</span>
            <div
              className={`chain-bar${i === 0 ? ' today' : ''}`}
              style={{ height: `${(d.count / max) * 40}px` }}
            />
            <span className="chain-date">{d.date}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
