import { Fragment, useState } from 'react'
import type { Stock } from '../types'
import type { WatchlistApi } from '../hooks/useWatchlist'
import { StockDetail } from './StockDetail'
import { WatchToggle } from './WatchToggle'

const COL_COUNT = 5

type WatchlistViewProps = {
  watchlist: WatchlistApi
  /** Unfiltered feed quotes for price/pct lookup */
  quoteStocks: Stock[]
  onOpenFloat?: () => void
}

export function WatchlistView({ watchlist, quoteStocks, onOpenFloat }: WatchlistViewProps) {
  const [selectedTs, setSelectedTs] = useState<string | null>(null)

  const quoteByCode = new Map<string, Stock>()
  for (const s of quoteStocks) {
    quoteByCode.set(s.tsCode, s)
    quoteByCode.set(s.code, s)
  }

  if (watchlist.items.length === 0) {
    return (
      <div className="empty-state watchlist-empty">
        <span className="mono">暂无自选股票</span>
        <span className="muted">在涨停表、连板天梯、强势个股或板块个股列表中点击「添加自选」</span>
        {onOpenFloat && (
          <button type="button" className="watch-float-launch" onClick={onOpenFloat}>
            弹出悬浮窗
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="watchlist-view">
      <div className="watchlist-toolbar">
        <span className="mono muted">共 {watchlist.count} 只 · 不受科创/北交所/创业板过滤隐藏</span>
        {onOpenFloat && (
          <button type="button" className="watch-float-launch" onClick={onOpenFloat}>
            弹出悬浮窗
          </button>
        )}
      </div>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th className="text-left">代码/名称</th>
              <th className="sortable">现价</th>
              <th className="sortable">涨幅%</th>
              <th className="text-left">板块</th>
              <th className="text-center">自选</th>
            </tr>
          </thead>
          <tbody>
            {watchlist.items.map((item) => {
              const q = quoteByCode.get(item.tsCode) ?? quoteByCode.get(item.code)
              const price = q?.price
              const pct = q?.pct
              const isSelected = selectedTs === item.tsCode
              return (
                <Fragment key={item.tsCode}>
                  <tr
                    className={isSelected ? 'selected' : undefined}
                    onClick={() => setSelectedTs(isSelected ? null : item.tsCode)}
                  >
                    <td className="text-left">
                      <div className="mono code">{item.code}</div>
                      <div className="name">{item.name}</div>
                    </td>
                    <td className="mono text-right up-bright">
                      {price != null && price > 0 ? price.toFixed(2) : '—'}
                    </td>
                    <td
                      className={`mono text-right${pct != null && pct !== 0 ? (pct > 0 ? ' up' : ' down') : ''}`}
                    >
                      {pct != null && pct !== 0
                        ? `${pct > 0 ? '+' : ''}${pct.toFixed(2)}%`
                        : '—'}
                    </td>
                    <td className="text-left">
                      {q?.sector ? (
                        <span className="sector-tag">{q.sector}</span>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td className="text-center" onClick={(e) => e.stopPropagation()}>
                      <WatchToggle
                        variant="star"
                        stock={item}
                        watched
                        onToggle={() => {
                          if (selectedTs === item.tsCode) setSelectedTs(null)
                          watchlist.remove(item.tsCode)
                        }}
                      />
                    </td>
                  </tr>
                  {isSelected && (
                    <tr className="stock-detail-row" onClick={(e) => e.stopPropagation()}>
                      <td colSpan={COL_COUNT}>
                        <StockDetail
                          stock={item}
                          onClose={() => setSelectedTs(null)}
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
  )
}
