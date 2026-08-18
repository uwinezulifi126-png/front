import { Fragment, useRef, useState, type DragEvent, type ReactNode } from 'react'
import type { WatchInput } from '../hooks/useWatchlist'
import type { SectorDetail, Stock } from '../types'
import { stocksForSectorCodes } from '../utils/boardFilter'
import { guessTsCode } from '../utils/watchlist'
import { OpensBadge, RiseSpeedCell, StatusBadge } from './Badges'
import { IconPlaceholder } from './IconPlaceholder'
import { StockDetail } from './StockDetail'
import { WatchToggle } from './WatchToggle'

const STORAGE_KEY = 'front.sectorTable.columnOrder'

type ColId =
  | 'code'
  | 'price'
  | 'pct'
  | 'bidAmount'
  | 'limitTime'
  | 'riseSpeed'
  | 'opens'
  | 'status'
  | 'watch'

const DEFAULT_ORDER: ColId[] = [
  'code',
  'price',
  'pct',
  'bidAmount',
  'limitTime',
  'riseSpeed',
  'opens',
  'status',
  'watch',
]

const ALL_COLS = new Set<ColId>(DEFAULT_ORDER)

type ColDef = {
  id: ColId
  label: string
  /** Fixed leftmost — not draggable */
  fixed?: boolean
  thClass?: string
  tdClass?: string
  render: (s: Stock) => ReactNode
}

function buildColDefs(
  isWatched?: (codeOrTs: string) => boolean,
  onToggleWatch?: (stock: WatchInput) => void,
): Record<ColId, ColDef> {
  return {
    code: {
      id: 'code',
      label: '代码/名称',
      fixed: true,
      thClass: 'text-left th-fixed',
      render: (s) => (
        <>
          <div className="mono code">{s.code}</div>
          <div className="name">{s.name}</div>
        </>
      ),
    },
    price: {
      id: 'price',
      label: '价格',
      thClass: 'text-right',
      tdClass: 'mono text-right up-bright',
      render: (s) => (s.price ? s.price.toFixed(2) : '—'),
    },
    pct: {
      id: 'pct',
      label: '涨幅',
      thClass: 'text-right',
      tdClass: 'mono text-right up',
      render: (s) => (s.pct ? `+${s.pct.toFixed(2)}%` : '—'),
    },
    bidAmount: {
      id: 'bidAmount',
      label: '封单(亿)',
      thClass: 'text-right',
      tdClass: 'mono text-right accent',
      render: (s) => (s.bidAmount != null ? s.bidAmount.toFixed(1) : '—'),
    },
    limitTime: {
      id: 'limitTime',
      label: '涨停时间',
      thClass: 'text-right',
      tdClass: 'mono text-right',
      render: (s) => s.limitTime || '—',
    },
    riseSpeed: {
      id: 'riseSpeed',
      label: '涨速',
      thClass: 'text-right',
      tdClass: 'mono text-right',
      render: (s) => <RiseSpeedCell value={s.riseSpeed} />,
    },
    opens: {
      id: 'opens',
      label: '板次',
      thClass: 'text-center',
      tdClass: 'text-center',
      render: (s) => <OpensBadge opens={s.opens} />,
    },
    status: {
      id: 'status',
      label: '状态',
      thClass: 'text-center',
      tdClass: 'text-center',
      render: (s) => <StatusBadge status={s.status} />,
    },
    watch: {
      id: 'watch',
      label: '自选',
      thClass: 'text-center',
      tdClass: 'text-center',
      render: (s) => (
        <WatchToggle
          variant="star"
          stock={{ tsCode: s.tsCode, code: s.code, name: s.name }}
          watched={!!isWatched?.(s.tsCode || s.code)}
          onToggle={(stock) => onToggleWatch?.(stock)}
        />
      ),
    },
  }
}

function normalizeOrder(raw: unknown): ColId[] {
  if (!Array.isArray(raw)) return [...DEFAULT_ORDER]
  const seen = new Set<ColId>()
  const rest: ColId[] = []
  for (const item of raw) {
    if (typeof item !== 'string') continue
    if (!ALL_COLS.has(item as ColId) || item === 'code' || seen.has(item as ColId)) continue
    seen.add(item as ColId)
    rest.push(item as ColId)
  }
  for (const id of DEFAULT_ORDER) {
    if (id === 'code' || seen.has(id)) continue
    rest.push(id)
  }
  return ['code', ...rest]
}

function loadColumnOrder(): ColId[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return [...DEFAULT_ORDER]
    return normalizeOrder(JSON.parse(raw) as unknown)
  } catch {
    return [...DEFAULT_ORDER]
  }
}

function saveColumnOrder(order: ColId[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(order))
  } catch {
    /* ignore quota / private mode */
  }
}

export function SectorView({
  stocks,
  details,
  isWatched,
  onToggleWatch,
}: {
  stocks: Stock[]
  details: SectorDetail[]
  isWatched?: (codeOrTs: string) => boolean
  onToggleWatch?: (stock: WatchInput) => void
}) {
  const [selected, setSelected] = useState<string | null>(null)
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null)
  const [columnOrder, setColumnOrder] = useState<ColId[]>(loadColumnOrder)
  const [dragOverId, setDragOverId] = useState<ColId | null>(null)
  const dragColRef = useRef<ColId | null>(null)
  const COL_DEFS = buildColDefs(isWatched, onToggleWatch)
  const colCount = columnOrder.length

  // 与 SectorPanel / adaptSectorHeat 一致：仅展示涨停前十。
  // 家数按 stock_codes ∩ 可见涨停池重算（一股可属多概念；勿用 Stock.sector 主键）。
  const ranked = details.slice(0, 10).map((d) => {
    const matched = stocksForSectorCodes(stocks, d.stockCodes, d.name)
    return { ...d, count: matched.length, _matched: matched }
  })
  const activeName =
    selected && ranked.some((s) => s.name === selected) ? selected : null

  if (ranked.length === 0) {
    return (
      <div className="empty-state">
        <span className="mono">暂无板块数据</span>
      </div>
    )
  }

  const maxCount = Math.max(...ranked.map((s) => s.count), 1)
  const detail = activeName ? ranked.find((s) => s.name === activeName) : undefined
  const sectorStocks = detail?._matched ?? []

  const reorderColumns = (fromId: ColId, toId: ColId) => {
    if (fromId === toId || fromId === 'code' || toId === 'code') return
    setColumnOrder((prev) => {
      const next = [...prev]
      const fromIdx = next.indexOf(fromId)
      const toIdx = next.indexOf(toId)
      if (fromIdx < 0 || toIdx < 0) return prev
      next.splice(fromIdx, 1)
      next.splice(toIdx, 0, fromId)
      const normalized = normalizeOrder(next)
      saveColumnOrder(normalized)
      return normalized
    })
  }

  const onHeaderDragStart = (e: DragEvent<HTMLTableCellElement>, id: ColId) => {
    if (id === 'code') {
      e.preventDefault()
      return
    }
    dragColRef.current = id
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', id)
    e.currentTarget.classList.add('th-dragging')
  }

  const onHeaderDragEnd = (e: DragEvent<HTMLTableCellElement>) => {
    e.currentTarget.classList.remove('th-dragging')
    dragColRef.current = null
    setDragOverId(null)
  }

  const onHeaderDragOver = (e: DragEvent<HTMLTableCellElement>, id: ColId) => {
    if (id === 'code' || !dragColRef.current || dragColRef.current === 'code') return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragOverId !== id) setDragOverId(id)
  }

  const onHeaderDragLeave = (id: ColId) => {
    if (dragOverId === id) setDragOverId(null)
  }

  const onHeaderDrop = (e: DragEvent<HTMLTableCellElement>, toId: ColId) => {
    e.preventDefault()
    const fromId = (dragColRef.current || e.dataTransfer.getData('text/plain')) as ColId
    setDragOverId(null)
    if (!fromId || fromId === toId || fromId === 'code' || toId === 'code') return
    reorderColumns(fromId, toId)
  }

  return (
    <div className="sector-view">
      <div className="sector-list">
        <div className="sector-list-head">板块排行 · 涨停前十</div>
        {ranked.map((s, i) => {
          const active = activeName === s.name
          return (
            <button
              key={s.name}
              type="button"
              className={`sector-list-item${active ? ' active' : ''}`}
              onClick={() => {
                setSelected(active ? null : s.name)
                setSelectedStock(null)
              }}
            >
              <span className="mono sector-rank">{i + 1}</span>
              <div className="sector-list-body">
                <div className="sector-list-top">
                  <span className="sector-list-name">{s.name}</span>
                  <span className="mono up-bright">{s.count}只</span>
                </div>
                <div className="meter-track">
                  <div
                    className="meter-fill"
                    style={{
                      width: `${(s.count / maxCount) * 100}%`,
                      backgroundColor: active ? 'var(--up-bright)' : 'rgba(229,62,62,0.55)',
                    }}
                  />
                </div>
              </div>
            </button>
          )
        })}
      </div>

      <div className="sector-detail">
        {detail ? (
          <div>
            <div className="sector-detail-head">
              <h2>{detail.name}</h2>
              <span className="sector-pill">今日涨停 {detail.count} 只</span>
            </div>

            <div className="sector-metrics">
              {[
                { label: '涨停总数', val: `${detail.count}只`, color: 'var(--up-bright)' },
                { label: '龙头股', val: detail.topStock, color: 'var(--up-bright)' },
                {
                  label: '龙头涨幅',
                  val: detail.topPct ? `+${detail.topPct.toFixed(2)}%` : '—',
                  color: 'var(--accent)',
                },
              ].map((m) => (
                <div key={m.label} className="sector-metric">
                  <div className="mono sector-metric-val" style={{ color: m.color }}>
                    {m.val}
                  </div>
                  <div className="muted">{m.label}</div>
                </div>
              ))}
            </div>

            <div className="panel-title">板块涨停股票</div>
            {sectorStocks.length > 0 ? (
              <table className="data-table compact">
                <thead>
                  <tr>
                    {columnOrder.map((id) => {
                      const col = COL_DEFS[id]
                      const isFixed = !!col.fixed
                      const thClass = [
                        col.thClass,
                        !isFixed ? 'th-draggable' : '',
                        dragOverId === id ? 'th-drag-over' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')

                      return (
                        <th
                          key={id}
                          className={thClass}
                          draggable={!isFixed}
                          onDragStart={(e) => onHeaderDragStart(e, id)}
                          onDragEnd={onHeaderDragEnd}
                          onDragOver={(e) => onHeaderDragOver(e, id)}
                          onDragLeave={() => onHeaderDragLeave(id)}
                          onDrop={(e) => onHeaderDrop(e, id)}
                          title={isFixed ? undefined : '拖拽调整列顺序'}
                        >
                          {col.label}
                        </th>
                      )
                    })}
                  </tr>
                </thead>
                <tbody>
                  {sectorStocks.map((s) => {
                    const isSelected = selectedStock?.code === s.code
                    return (
                      <Fragment key={s.tsCode || s.code}>
                        <tr
                          className={isSelected ? 'selected' : undefined}
                          onClick={() => setSelectedStock(isSelected ? null : s)}
                        >
                          {columnOrder.map((id) => {
                            const col = COL_DEFS[id]
                            return (
                              <td
                                key={id}
                                className={col.tdClass}
                                onClick={id === 'watch' ? (e) => e.stopPropagation() : undefined}
                              >
                                {col.render(s)}
                              </td>
                            )
                          })}
                        </tr>
                        {isSelected && (
                          <tr className="stock-detail-row" onClick={(e) => e.stopPropagation()}>
                            <td colSpan={colCount}>
                              <StockDetail
                                stock={{
                                  tsCode: s.tsCode || guessTsCode(s.code),
                                  code: s.code,
                                  name: s.name,
                                }}
                                onClose={() => setSelectedStock(null)}
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
            ) : detail.leadingStocks.length > 0 ? (
              <div className="leading-wrap">
                <div className="panel-title">主要涨停个股</div>
                <div className="leading-chips">
                  {detail.leadingStocks.map((name) => (
                    <span key={name} className="leading-chip">
                      {name}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mono muted">该板块暂无个股明细</div>
            )}
          </div>
        ) : (
          <div className="sector-empty">
            <IconPlaceholder kind="chart" className="icon-placeholder large" />
            <div className="mono">点击左侧板块查看详情</div>
          </div>
        )}
      </div>
    </div>
  )
}
