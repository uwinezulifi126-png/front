import { useState } from 'react'
import type { Stock } from '../types'
import { OpensBadge, StatusBadge, StrengthBar } from './Badges'

type LimitUpTableProps = {
  stocks: Stock[]
  selectedSector: string | null
}

export function LimitUpTable({ stocks, selectedSector }: LimitUpTableProps) {
  const [sortKey, setSortKey] = useState<keyof Stock>('limitTime')
  const [sortDir, setSortDir] = useState<1 | -1>(1)
  const [hovered, setHovered] = useState<string | null>(null)

  const filtered = selectedSector ? stocks.filter((s) => s.sector === selectedSector) : stocks

  const sorted = [...filtered].sort((a, b) => {
    const av = a[sortKey]
    const bv = b[sortKey]
    if (typeof av === 'string' && typeof bv === 'string') return av.localeCompare(bv) * sortDir
    return ((av as number) - (bv as number)) * sortDir
  })

  const handleSort = (key: keyof Stock) => {
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

  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th className="text-left">代码/名称</th>
            <th className="sortable" onClick={() => handleSort('price')}>
              涨停价{sortMark('price')}
            </th>
            <th className="sortable" onClick={() => handleSort('pct')}>
              涨幅%{sortMark('pct')}
            </th>
            <th className="sortable" onClick={() => handleSort('volume')}>
              成交量(万手){sortMark('volume')}
            </th>
            <th className="sortable" onClick={() => handleSort('amount')}>
              成交额(亿){sortMark('amount')}
            </th>
            <th className="sortable" onClick={() => handleSort('bidAmount')}>
              封单(亿){sortMark('bidAmount')}
            </th>
            <th className="sortable" onClick={() => handleSort('strength')}>
              封板强度{sortMark('strength')}
            </th>
            <th className="sortable" onClick={() => handleSort('limitTime')}>
              涨停时间{sortMark('limitTime')}
            </th>
            <th className="text-center">板次</th>
            <th className="text-center">状态</th>
            <th className="text-left">板块</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((s) => (
            <tr
              key={s.code}
              className={`${s.status === 'locked' ? 'flash-up' : ''}${hovered === s.code ? ' hovered' : ''}`}
              onMouseEnter={() => setHovered(s.code)}
              onMouseLeave={() => setHovered(null)}
            >
              <td>
                <div className="mono code">{s.code}</div>
                <div className="name">{s.name}</div>
              </td>
              <td className="mono text-right up-bright">{s.price.toFixed(2)}</td>
              <td className="mono text-right up">+{s.pct.toFixed(2)}%</td>
              <td className="mono text-right">{s.volume.toFixed(1)}</td>
              <td className="mono text-right">{s.amount.toFixed(1)}</td>
              <td className="mono text-right accent">{s.bidAmount.toFixed(1)}</td>
              <td>
                <StrengthBar value={s.strength} />
              </td>
              <td className="mono text-right">{s.limitTime}</td>
              <td className="text-center">
                <OpensBadge opens={s.opens} />
              </td>
              <td className="text-center">
                <StatusBadge status={s.status} />
              </td>
              <td>
                <span className="sector-tag">{s.sector}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
