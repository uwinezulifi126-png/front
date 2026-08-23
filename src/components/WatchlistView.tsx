import { Fragment, useMemo, useState } from 'react'
import type { Stock } from '../types'
import type { WatchlistApi } from '../hooks/useWatchlist'
import { StockDetail } from './StockDetail'
import { WatchToggle } from './WatchToggle'

const COL_COUNT = 8

type SortKey = 'price' | 'pct' | 'mktCap' | 'amount'

type WatchlistViewProps = {
  watchlist: WatchlistApi
  /** Unfiltered feed quotes for price/pct lookup */
  quoteStocks: Stock[]
  onOpenFloat?: () => void
}

export function WatchlistView({ watchlist, quoteStocks, onOpenFloat }: WatchlistViewProps) {
  const [selectedTs, setSelectedTs] = useState<string | null>(null)
  const [sortKey, setSortKey] = useState<SortKey>('pct')

  const quoteByCode = useMemo(() => {
    const map = new Map<string, Stock>()
    for (const s of quoteStocks) {
      map.set(s.tsCode, s)
      map.set(s.code, s)
    }
    return map
  }, [quoteStocks])

  const rows = useMemo(() => {
    const list = watchlist.items.map((item) => {
      const q = quoteByCode.get(item.tsCode) ?? quoteByCode.get(item.code)
      return { item, q }
    })
    const num = (v: number | null | undefined) =>
      v != null && Number.isFinite(v) ? v : Number.NEGATIVE_INFINITY
    return [...list].sort((a, b) => {
      if (sortKey === 'price') return num(b.q?.price) - num(a.q?.price)
      if (sortKey === 'mktCap') return num(b.q?.mktCap) - num(a.q?.mktCap)
      if (sortKey === 'amount') return num(b.q?.amount) - num(a.q?.amount)
      return num(b.q?.pct) - num(a.q?.pct)
    })
  }, [watchlist.items, quoteByCode, sortKey])

  if (watchlist.items.length === 0) {
    return (
      <div className="empty-state watchlist-empty">
        <span className="mono">暂无自选股票</span>
        <span className="muted">在涨停表、连板天梯、昨日涨停强势或板块个股列表中点击「添加自选」</span>
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
              {(
                [
                  ['price', '现价'],
                  ['pct', '涨幅%'],
                  ['mktCap', '流通市值（亿）'],
                  ['amount', '成交金额（亿）'],
                ] as const
              ).map(([key, label]) => (
                <th key={key} className="sortable" onClick={() => setSortKey(key)}>
                  {label}
                  {sortKey === key ? ' ▾' : ''}
                </th>
              ))}
              <th className="text-left">板块</th>
              <th className="text-left">全部概念</th>
              <th className="text-center">自选</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ item, q }) => {
              const price = q?.price
              const pct = q?.pct
              const mktCap = q?.mktCap
              const amount = q?.amount
              const concepts = q?.concepts ?? []
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
                      {pct != null
                        ? `${pct > 0 ? '+' : ''}${pct.toFixed(2)}%`
                        : '—'}
                    </td>
                    <td className="mono text-right">
                      {mktCap != null && mktCap > 0 ? mktCap.toFixed(1) : '—'}
                    </td>
                    <td className="mono text-right accent">
                      {amount != null && amount > 0 ? amount.toFixed(1) : '—'}
                    </td>
                    <td className="text-left">
                      {q?.sector ? (
                        <span className="sector-tag">{q.sector}</span>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td className="text-left">
                      {concepts.length > 0 ? (
                        <div className="concept-tags">
                          {concepts.map((name) => (
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
