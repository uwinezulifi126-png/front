import { useState, type MouseEvent } from 'react'
import { STRONG_STOCKS, STRONG_TAG_BG, STRONG_TAG_CLR } from '../data/mock'
import type { StrongStock } from '../types'

type SortKey = 'price' | 'pct' | 'mktCap' | 'amount' | 'riseSpeed' | 'score'

export function StrongStocksView() {
  const [sortKey, setSortKey] = useState<SortKey>('score')
  const [filterTag, setFilterTag] = useState<string | null>(null)
  const [selected, setSelected] = useState<StrongStock | null>(null)
  const [watchlist, setWatchlist] = useState<Set<string>>(() => new Set())

  const tags = ['新能源', '人工智能', '半导体', '军工', '自选']
  const filtered = filterTag === '自选'
    ? STRONG_STOCKS.filter((s) => watchlist.has(s.code))
    : filterTag
      ? STRONG_STOCKS.filter((s) => s.tag === filterTag)
      : STRONG_STOCKS
  const sorted = [...filtered].sort((a, b) => b[sortKey] - a[sortKey])

  const toggleWatch = (code: string, e: MouseEvent) => {
    e.stopPropagation()
    setWatchlist((prev) => {
      const next = new Set(prev)
      if (next.has(code)) next.delete(code)
      else next.add(code)
      return next
    })
  }

  const scoreColor = (s: number) => (s >= 90 ? '#e53e3e' : s >= 80 ? '#f6ad55' : s >= 70 ? '#f6e05e' : '#718096')

  return (
    <div className="split-view">
      <div className="split-main">
        <div className="news-tags strong-tags">
          <button type="button" className={`tag-chip${filterTag === null ? ' active' : ''}`} onClick={() => setFilterTag(null)}>
            全部
          </button>
          {tags.map((tag) => (
            <button
              key={tag}
              type="button"
              className={`tag-chip${filterTag === tag ? ' active' : ''}`}
              style={
                filterTag === tag
                  ? { color: STRONG_TAG_CLR[tag], background: STRONG_TAG_BG[tag], borderColor: STRONG_TAG_CLR[tag] }
                  : undefined
              }
              onClick={() => setFilterTag(filterTag === tag ? null : tag)}
            >
              {tag}
            </button>
          ))}
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th className="text-left">代码/名称</th>
                {([
                  ['price', '现价'],
                  ['pct', '涨幅%'],
                  ['riseSpeed', '涨速'],
                  ['mktCap', '流通市值'],
                  ['amount', '成交额'],
                  ['score', '评分'],
                ] as const).map(([key, label]) => (
                  <th key={key} className="sortable" onClick={() => setSortKey(key)}>
                    {label}{sortKey === key ? ' ▾' : ''}
                  </th>
                ))}
                <th className="text-center">自选</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((s) => (
                <tr
                  key={s.code}
                  className={selected?.code === s.code ? 'hovered' : undefined}
                  onClick={() => setSelected(selected?.code === s.code ? null : s)}
                >
                  <td className="text-left">
                    <div className="code mono">{s.code}</div>
                    <div className="name">{s.name}</div>
                  </td>
                  <td className="text-right mono up">{s.price.toFixed(2)}</td>
                  <td className="text-right mono up">+{s.pct.toFixed(2)}%</td>
                  <td className="text-right mono">{s.riseSpeed.toFixed(2)}</td>
                  <td className="text-right mono">{s.mktCap.toFixed(1)}</td>
                  <td className="text-right mono accent">{s.amount.toFixed(1)}</td>
                  <td className="text-right mono" style={{ color: scoreColor(s.score) }}>{s.score}</td>
                  <td className="text-center">
                    <button type="button" className={`watch-btn${watchlist.has(s.code) ? ' on' : ''}`} onClick={(e) => toggleWatch(s.code, e)}>
                      {watchlist.has(s.code) ? '★' : '☆'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="split-side ladder-detail">
        {selected ? (
          <div>
            <div className="ladder-detail-head">
              <strong>{selected.name}</strong>
              <span className="mono muted">{selected.code}</span>
            </div>
            <p className="muted" style={{ lineHeight: 1.6 }}>{selected.reason}</p>
            <div className="sector-metrics ladder-metrics" style={{ marginTop: 16 }}>
              <div className="sector-metric">
                <div className="muted">评分</div>
                <div className="mono sector-metric-val" style={{ color: scoreColor(selected.score) }}>{selected.score}</div>
              </div>
              <div className="sector-metric">
                <div className="muted">行业</div>
                <div className="mono sector-metric-val">{selected.industry}</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="empty-state">
            <span className="mono muted">点击个股查看点评</span>
          </div>
        )}
      </div>
    </div>
  )
}
