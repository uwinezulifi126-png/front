import { Fragment, useState } from 'react'
import type { WatchInput } from '../hooks/useWatchlist'
import type { MoverStock } from '../types'
import { StockDetail } from './StockDetail'
import { WatchToggle } from './WatchToggle'

type SortKey = 'price' | 'pct' | 'mktCap' | 'amount'

const COL_COUNT = 8

type MoversViewProps = {
  data: MoverStock[]
  isWatched?: (codeOrTs: string) => boolean
  onToggleWatch?: (stock: WatchInput) => void
}

export function MoversView({ data, isWatched, onToggleWatch }: MoversViewProps) {
  const [sortKey, setSortKey] = useState<SortKey>('pct')
  const [selected, setSelected] = useState<MoverStock | null>(null)

  if (data.length === 0) {
    return (
      <div className="empty-state">
        <span className="mono">暂无涨幅超过 7% 的个股</span>
      </div>
    )
  }

  const sorted = [...data].sort((a, b) => b[sortKey] - a[sortKey])

  return (
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
              ] as const
            ).map(([key, label]) => (
              <th key={key} className="sortable" onClick={() => setSortKey(key)}>
                {label}
                {sortKey === key ? ' ▾' : ''}
              </th>
            ))}
            <th className="text-left">全部概念</th>
            <th className="text-center">自选</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((s) => {
            const isSelected = selected?.code === s.code
            const pctClass = s.pct > 0 ? 'up' : s.pct < 0 ? 'down' : ''
            return (
              <Fragment key={s.tsCode || s.code}>
                <tr
                  className={isSelected ? 'selected' : undefined}
                  onClick={() => setSelected(isSelected ? null : s)}
                >
                  <td className="text-left">
                    <div className="code mono">{s.code}</div>
                    <div className="name">
                      {s.name}
                      {s.isLimitUp ? (
                        <span className="badge badge-locked" style={{ marginLeft: 6 }}>
                          涨停
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className={`text-right mono ${pctClass}`}>
                    {s.price ? s.price.toFixed(2) : '—'}
                  </td>
                  <td className={`text-right mono ${pctClass}`}>
                    {s.pct ? `${s.pct > 0 ? '+' : ''}${s.pct.toFixed(2)}%` : '—'}
                  </td>
                  <td className="text-right mono">{s.mktCap ? s.mktCap.toFixed(1) : '—'}</td>
                  <td className="text-right mono accent">{s.amount ? s.amount.toFixed(1) : '—'}</td>
                  <td className="text-left">
                    {s.concepts.length > 0 ? (
                      <div className="concept-tags">
                        {s.concepts.map((name) => (
                          <span key={name} className="sector-tag">
                            {name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                  <td className="text-center" onClick={(e) => e.stopPropagation()}>
                    <WatchToggle
                      variant="star"
                      stock={{ tsCode: s.tsCode, code: s.code, name: s.name }}
                      watched={!!isWatched?.(s.tsCode) || !!isWatched?.(s.code)}
                      onToggle={(stock) => onToggleWatch?.(stock)}
                    />
                  </td>
                </tr>
                {isSelected && (
                  <tr className="stock-detail-row" onClick={(e) => e.stopPropagation()}>
                    <td colSpan={COL_COUNT}>
                      <StockDetail
                        stock={{ code: s.code, name: s.name, tsCode: s.tsCode }}
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
  )
}
