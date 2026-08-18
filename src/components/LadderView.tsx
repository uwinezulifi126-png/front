import { useMemo, useState } from 'react'
import type { WatchInput } from '../hooks/useWatchlist'
import type { LadderRow } from '../types'
import { guessTsCode } from '../utils/watchlist'
import { IconPlaceholder } from './IconPlaceholder'
import { StockDetail } from './StockDetail'
import { WatchToggle } from './WatchToggle'

const CHIP = '#e53935'
const KLINE_CHART_HEIGHT = 220

type LadderViewProps = {
  data: LadderRow[]
  isWatched?: (codeOrTs: string) => boolean
  onToggleWatch?: (stock: WatchInput) => void
}

export function LadderView({ data, isWatched, onToggleWatch }: LadderViewProps) {
  const [selected, setSelected] = useState<{ boards: number; idx: number } | null>(null)
  const [showZhaban, setShowZhaban] = useState(true)

  const filteredData = useMemo(
    () =>
      data
        .map((row) => ({
          ...row,
          stocks: showZhaban ? row.stocks : row.stocks.filter((s) => !s.zhaban),
        }))
        .filter((row) => row.stocks.length > 0),
    [data, showZhaban],
  )

  if (data.length === 0) {
    return (
      <div className="empty-state">
        <span className="mono">暂无连板数据</span>
      </div>
    )
  }

  const selectedStock =
    selected !== null
      ? filteredData.find((r) => r.boards === selected.boards)?.stocks[selected.idx]
      : null
  const selectedRow = selected !== null ? filteredData.find((r) => r.boards === selected.boards) : null
  const maxCount = Math.max(...filteredData.map((r) => r.stocks.length), 1)
  const total = filteredData.reduce((a, r) => a + r.stocks.length, 0)

  const detailStock = selectedStock
    ? {
        code: selectedStock.code,
        name: selectedStock.name,
        tsCode: guessTsCode(selectedStock.code),
      }
    : null

  return (
    <div className="split-view">
      <div className="split-main ladder-main">
        <div className="ladder-body">
          <div className="ladder-summary">
            <div>
              <div className="muted">连板总数</div>
              <div className="mono up-bright big">{total}只</div>
            </div>
            <label className="ladder-toggle">
              <input
                type="checkbox"
                checked={showZhaban}
                onChange={(e) => {
                  setShowZhaban(e.target.checked)
                  setSelected(null)
                }}
              />
              含炸板
            </label>
          </div>
          <div className="ladder-rows">
            {filteredData.map((row) => (
              <div key={row.boards} className="ladder-row">
                <span className="mono ladder-label" style={{ color: row.color }}>
                  {row.label}
                </span>
                <div className="ladder-chips">
                  {row.stocks.map((s, i) => {
                    const active = selected?.boards === row.boards && selected.idx === i
                    return (
                      <button
                        key={s.code}
                        type="button"
                        className={`ladder-chip${active ? ' active' : ''}${s.zhaban ? ' zhaban' : ''}`}
                        style={{
                          borderColor: `${CHIP}66`,
                          color: active ? '#fff' : CHIP,
                          background: active ? CHIP : `${CHIP}22`,
                        }}
                        onClick={() => setSelected(active ? null : { boards: row.boards, idx: i })}
                      >
                        {s.name}
                        {s.zhaban ? <small>炸</small> : null}
                      </button>
                    )
                  })}
                  <span className="ladder-bar-wrap">
                    <span className="ladder-bar" style={{ width: `${(row.stocks.length / maxCount) * 120}px` }} />
                    <span className="mono" style={{ color: row.color }}>
                      {row.stocks.length}只
                    </span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
        {detailStock && (
          <div className="ladder-kline">
            <StockDetail
              stock={detailStock}
              onClose={() => setSelected(null)}
              chartHeight={KLINE_CHART_HEIGHT}
              showWatchIcon={!!onToggleWatch}
              watched={!!isWatched?.(detailStock.code)}
              onToggleWatch={onToggleWatch}
            />
          </div>
        )}
      </div>
      <div className="split-side ladder-detail">
        {selectedStock && selectedRow ? (
          <div>
            <div className="ladder-detail-head">
              <span
                className="sector-pill"
                style={{ color: selectedRow.color, background: `${selectedRow.color}22` }}
              >
                {selectedRow.label}
              </span>
              <strong>{selectedStock.name}</strong>
              <span className="mono muted">{detailStock?.tsCode ?? selectedStock.code}</span>
              {onToggleWatch && (
                <WatchToggle
                  variant="star"
                  stock={{
                    code: selectedStock.code,
                    name: selectedStock.name,
                    tsCode: detailStock?.tsCode,
                  }}
                  watched={!!isWatched?.(selectedStock.code)}
                  onToggle={(stock) => onToggleWatch(stock)}
                />
              )}
            </div>
            <div className="sector-metrics ladder-metrics">
              {[
                { label: '现价', val: selectedStock.price ? selectedStock.price.toFixed(2) : '—', cls: 'up-bright' },
                { label: '涨停时间', val: selectedStock.limitTime },
                { label: '成交额', val: selectedStock.amount ? `${selectedStock.amount}亿` : '—' },
                { label: '板块', val: selectedStock.sector, cls: 'accent' },
              ].map((m) => (
                <div key={m.label} className="sector-metric">
                  <div className="muted">{m.label}</div>
                  <div className={`mono sector-metric-val ${m.cls || ''}`}>{m.val}</div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="empty-state">
            <IconPlaceholder kind="empty" />
            <span className="mono">点击左侧个股查看详情</span>
          </div>
        )}
      </div>
    </div>
  )
}
