import { Fragment, useState } from 'react'
import type { WatchInput } from '../hooks/useWatchlist'
import type { StrongStock } from '../types'
import { guessTsCode } from '../utils/watchlist'
import { StockDetail } from './StockDetail'
import { WatchToggle } from './WatchToggle'

type SortKey = 'price' | 'pct' | 'mktCap' | 'amount' | 'score'

const COL_COUNT = 8

type StrongStocksViewProps = {
  data: StrongStock[]
  isWatched?: (codeOrTs: string) => boolean
  onToggleWatch?: (stock: WatchInput) => void
}

export function StrongStocksView({ data, isWatched, onToggleWatch }: StrongStocksViewProps) {
  const [sortKey, setSortKey] = useState<SortKey>('pct')
  const [selected, setSelected] = useState<StrongStock | null>(null)

  if (data.length === 0) {
    return (
      <div className="empty-state">
        <span className="mono">暂无昨日涨停强势数据</span>
      </div>
    )
  }

  const sorted = [...data].sort((a, b) => b[sortKey] - a[sortKey])
  const detailStock = selected
    ? {
        code: selected.code,
        name: selected.name,
        tsCode: guessTsCode(selected.code),
      }
    : null

  return (
    <div className="split-view">
      <div className="split-main">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th className="text-left">代码/名称</th>
                {(
                  [
                    ['price', '现价'],
                    ['pct', '涨幅%'],
                    ['mktCap', '流通市值'],
                    ['amount', '成交额'],
                    ['score', '评分'],
                  ] as const
                ).map(([key, label]) => (
                  <th key={key} className="sortable" onClick={() => setSortKey(key)}>
                    {label}
                    {sortKey === key ? ' ▾' : ''}
                  </th>
                ))}
                <th className="text-left">概念</th>
                <th className="text-center">自选</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((s) => {
                const isSelected = selected?.code === s.code
                const rowTs = guessTsCode(s.code)
                return (
                  <Fragment key={s.code}>
                    <tr
                      className={isSelected ? 'selected' : undefined}
                      onClick={() => setSelected(isSelected ? null : s)}
                    >
                      <td className="text-left">
                        <div className="code mono">{s.code}</div>
                        <div className="name">{s.name}</div>
                      </td>
                      <td className="text-right mono up">{s.price ? s.price.toFixed(2) : '—'}</td>
                      <td className="text-right mono up">{s.pct ? `+${s.pct.toFixed(2)}%` : '—'}</td>
                      <td className="text-right mono">{s.mktCap ? s.mktCap.toFixed(1) : '—'}</td>
                      <td className="text-right mono accent">{s.amount ? s.amount.toFixed(1) : '—'}</td>
                      <td className="text-right mono">{s.score || '—'}</td>
                      <td className="text-left">
                        <span className="sector-tag">{s.sector}</span>
                      </td>
                      <td className="text-center" onClick={(e) => e.stopPropagation()}>
                        <WatchToggle
                          variant="star"
                          stock={{ tsCode: rowTs, code: s.code, name: s.name }}
                          watched={!!isWatched?.(rowTs) || !!isWatched?.(s.code)}
                          onToggle={(stock) => onToggleWatch?.(stock)}
                        />
                      </td>
                    </tr>
                    {isSelected && detailStock && (
                      <tr className="stock-detail-row" onClick={(e) => e.stopPropagation()}>
                        <td colSpan={COL_COUNT}>
                          <StockDetail
                            stock={detailStock}
                            onClose={() => setSelected(null)}
                            chartHeight={300}
                          />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
      <div className="split-side ladder-detail">
        {selected ? (
          <div>
            <div className="ladder-detail-head">
              <strong>{selected.name}</strong>
              <span className="mono muted">{detailStock?.tsCode ?? selected.code}</span>
              {onToggleWatch && (
                <WatchToggle
                  variant="star"
                  stock={{
                    tsCode: detailStock?.tsCode,
                    code: selected.code,
                    name: selected.name,
                  }}
                  watched={
                    !!isWatched?.(detailStock?.tsCode ?? selected.code) ||
                    !!isWatched?.(selected.code)
                  }
                  onToggle={(stock) => onToggleWatch(stock)}
                />
              )}
            </div>
            <p className="muted" style={{ lineHeight: 1.6 }}>
              {selected.reason}
            </p>
            <div className="sector-metrics ladder-metrics" style={{ marginTop: 16 }}>
              <div className="sector-metric">
                <div className="muted">涨幅</div>
                <div className="mono sector-metric-val up">
                  {selected.pct ? `+${selected.pct.toFixed(2)}%` : '—'}
                </div>
              </div>
              <div className="sector-metric">
                <div className="muted">行业</div>
                <div className="mono sector-metric-val">{selected.industry || '—'}</div>
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
