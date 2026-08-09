type ChainPoint = { date: string; count: number }

type LimitChainProps = {
  /** 多日趋势暂无接口时传空，不展示假柱 */
  data?: ChainPoint[]
  /** 仅有当日涨停数时展示单点 */
  todayCount?: number | null
}

export function LimitChain({ data = [], todayCount }: LimitChainProps) {
  const points =
    data.length > 0
      ? data
      : todayCount != null
        ? [{ date: '今日', count: todayCount }]
        : []

  if (points.length === 0) {
    return (
      <div className="panel-block">
        <div className="panel-title">涨停数量趋势</div>
        <div className="mono muted">暂无趋势数据</div>
      </div>
    )
  }

  const max = Math.max(...points.map((d) => d.count), 1)
  return (
    <div className="panel-block">
      <div className="panel-title">涨停数量趋势</div>
      <div className="chain-bars">
        {points.map((d, i) => (
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
