import { Fragment, useRef, useState, type DragEvent, type ReactNode } from 'react'
import type { WatchInput } from '../hooks/useWatchlist'
import type { Stock } from '../types'
import { guessTsCode } from '../utils/watchlist'
import { OpensBadge, RiseSpeedCell, StatusBadge } from './Badges'
import { StockDetail } from './StockDetail'
import { WatchToggle } from './WatchToggle'

const STORAGE_KEY = 'front.limitUpTable.columnOrder'

type ColId =
  | 'code'
  | 'price'
  | 'pct'
  | 'amount'
  | 'bidAmount'
  | 'riseSpeed'
  | 'limitTime'
  | 'opens'
  | 'status'
  | 'sector'
  | 'watch'

const DEFAULT_ORDER: ColId[] = [
  'code',
  'price',
  'pct',
  'amount',
  'bidAmount',
  'riseSpeed',
  'limitTime',
  'opens',
  'status',
  'sector',
  'watch',
]

const ALL_COLS = new Set<ColId>(DEFAULT_ORDER)

type ColDef = {
  id: ColId
  label: string
  /** Fixed leftmost — not draggable */
  fixed?: boolean
  sortKey?: keyof Stock
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
      sortKey: 'price',
      thClass: 'sortable',
      tdClass: 'mono text-right up-bright',
      render: (s) => (s.price ? s.price.toFixed(2) : '—'),
    },
    pct: {
      id: 'pct',
      label: '涨幅%',
      sortKey: 'pct',
      thClass: 'sortable',
      tdClass: 'mono text-right up',
      render: (s) => (s.pct ? `+${s.pct.toFixed(2)}%` : '—'),
    },
    amount: {
      id: 'amount',
      label: '成交额(亿)',
      sortKey: 'amount',
      thClass: 'sortable',
      tdClass: 'mono text-right',
      render: (s) => (s.amount ? s.amount.toFixed(1) : '—'),
    },
    bidAmount: {
      id: 'bidAmount',
      label: '封单(亿)',
      sortKey: 'bidAmount',
      thClass: 'sortable',
      tdClass: 'mono text-right accent',
      render: (s) => (s.bidAmount != null ? s.bidAmount.toFixed(1) : '—'),
    },
    riseSpeed: {
      id: 'riseSpeed',
      label: '涨速',
      sortKey: 'riseSpeed',
      thClass: 'sortable',
      tdClass: 'mono text-right',
      render: (s) => <RiseSpeedCell value={s.riseSpeed} />,
    },
    limitTime: {
      id: 'limitTime',
      label: '涨停时间',
      sortKey: 'limitTime',
      thClass: 'sortable',
      tdClass: 'mono text-right',
      render: (s) => s.limitTime,
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
    sector: {
      id: 'sector',
      label: '板块',
      thClass: 'text-left',
      render: (s) => <span className="sector-tag">{s.sector}</span>,
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

/** Map legacy localStorage ids (e.g. strength → riseSpeed). */
function migrateColId(raw: string): ColId | null {
  if (raw === 'strength') return 'riseSpeed'
  if (ALL_COLS.has(raw as ColId)) return raw as ColId
  return null
}

function normalizeOrder(raw: unknown): ColId[] {
  if (!Array.isArray(raw)) return [...DEFAULT_ORDER]
  const seen = new Set<ColId>()
  const rest: ColId[] = []
  for (const item of raw) {
    if (typeof item !== 'string') continue
    const id = migrateColId(item)
    if (!id || id === 'code' || seen.has(id)) continue
    seen.add(id)
    rest.push(id)
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

type LimitUpTableProps = {
  stocks: Stock[]
  selectedSector: string | null
  emptyHint?: string
  selectedStock?: Stock | null
  onSelect?: (stock: Stock) => void
  onCloseDetail?: () => void
  isWatched?: (codeOrTs: string) => boolean
  onToggleWatch?: (stock: WatchInput) => void
}

export function LimitUpTable({
  stocks,
  selectedSector,
  emptyHint,
  selectedStock = null,
  onSelect,
  onCloseDetail,
  isWatched,
  onToggleWatch,
}: LimitUpTableProps) {
  const [sortKey, setSortKey] = useState<keyof Stock>('limitTime')
  const [sortDir, setSortDir] = useState<1 | -1>(1)
  const [hovered, setHovered] = useState<string | null>(null)
  const [columnOrder, setColumnOrder] = useState<ColId[]>(loadColumnOrder)
  const [dragOverId, setDragOverId] = useState<ColId | null>(null)
  const dragColRef = useRef<ColId | null>(null)
  /** Suppress header click-sort after a successful column drag */
  const suppressSortRef = useRef(false)
  const COL_DEFS = buildColDefs(isWatched, onToggleWatch)

  const filtered = selectedSector ? stocks.filter((s) => s.sector === selectedSector) : stocks

  const sorted = [...filtered].sort((a, b) => {
    const av = a[sortKey]
    const bv = b[sortKey]
    if (av == null && bv == null) return 0
    if (av == null) return 1
    if (bv == null) return -1
    if (typeof av === 'string' && typeof bv === 'string') return av.localeCompare(bv) * sortDir
    return ((av as number) - (bv as number)) * sortDir
  })

  const handleSort = (key: keyof Stock) => {
    if (suppressSortRef.current) {
      suppressSortRef.current = false
      return
    }
    if (sortKey === key) setSortDir((d) => (d === 1 ? -1 : 1))
    else {
      setSortKey(key)
      setSortDir(1)
    }
  }

  const sortMark = (key: keyof Stock) => {
    if (sortKey !== key) return ''
    return sortDir === 1 ? ' ↑' : ' ↓'
  }

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
    suppressSortRef.current = false
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
    suppressSortRef.current = true
    reorderColumns(fromId, toId)
  }

  const selectedCode = selectedStock?.code ?? null
  const colCount = columnOrder.length

  if (sorted.length === 0) {
    return (
      <div className="empty-state">
        <span className="mono">{emptyHint ?? '暂无涨停数据'}</span>
      </div>
    )
  }

  return (
    <div className="table-wrap">
      <table className="data-table">
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
                  onClick={col.sortKey ? () => handleSort(col.sortKey!) : undefined}
                  title={isFixed ? undefined : '拖拽调整列顺序；点击排序'}
                >
                  {col.label}
                  {col.sortKey ? sortMark(col.sortKey) : ''}
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {sorted.map((s) => {
            const isSelected = selectedCode === s.code
            return (
              <Fragment key={s.tsCode || s.code}>
                <tr
                  className={`${s.status === 'locked' ? 'flash-up' : ''}${hovered === s.code ? ' hovered' : ''}${isSelected ? ' selected' : ''}`}
                  onMouseEnter={() => setHovered(s.code)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => onSelect?.(s)}
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
                {isSelected && selectedStock && (
                  <tr className="stock-detail-row" onClick={(e) => e.stopPropagation()}>
                    <td colSpan={colCount}>
                      <StockDetail
                        stock={{
                          tsCode: selectedStock.tsCode || guessTsCode(selectedStock.code),
                          code: selectedStock.code,
                          name: selectedStock.name,
                        }}
                        onClose={() => onCloseDetail?.()}
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
