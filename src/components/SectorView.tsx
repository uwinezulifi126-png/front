import { useState } from 'react'
import { SECTOR_DETAIL } from '../data/mock'
import type { Stock } from '../types'
import { OpensBadge, StatusBadge, StrengthBar } from './Badges'
import { IconPlaceholder } from './IconPlaceholder'

export function SectorView({ stocks }: { stocks: Stock[] }) {
  const [selected, setSelected] = useState<string | null>(null)
  const maxCount = Math.max(...SECTOR_DETAIL.map((s) => s.count))
  const detail = selected ? SECTOR_DETAIL.find((s) => s.name === selected) : undefined
  const sectorStocks = selected ? stocks.filter((s) => s.sector === selected) : []

  return (
    <div className="sector-view">
      <div className="sector-list">
        <div className="sector-list-head">板块排行 · 今日涨停</div>
        {SECTOR_DETAIL.map((s, i) => {
          const active = selected === s.name
          return (
            <button
              key={s.name}
              type="button"
              className={`sector-list-item${active ? ' active' : ''}`}
              onClick={() => setSelected(active ? null : s.name)}
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
                <div className="sector-list-meta">
                  <span>
                    封板 <span className="up-bright">{s.locked}</span> · 炸板{' '}
                    <span className="accent">{s.open}</span>
                  </span>
                  <span className="mono muted">{s.amount}亿</span>
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
                { label: '封板强度均值', val: detail.avgStrength, color: 'var(--accent)' },
                { label: '板块成交额', val: `${detail.amount}亿`, color: 'var(--foreground)' },
                { label: '龙头股', val: detail.topStock, color: 'var(--up-bright)' },
              ].map((m) => (
                <div key={m.label} className="sector-metric">
                  <div className="mono sector-metric-val" style={{ color: m.color }}>
                    {m.val}
                  </div>
                  <div className="muted">{m.label}</div>
                </div>
              ))}
            </div>

            <div className="avg-box">
              <div className="sentiment-head">
                <span className="muted">平均封板强度</span>
                <span
                  className="mono"
                  style={{ color: detail.avgStrength >= 80 ? 'var(--up-bright)' : 'var(--accent)' }}
                >
                  {detail.avgStrength} / 100
                </span>
              </div>
              <div className="meter-track thick">
                <div
                  className="meter-fill"
                  style={{
                    width: `${detail.avgStrength}%`,
                    backgroundColor: detail.avgStrength >= 80 ? 'var(--up-bright)' : 'var(--accent)',
                  }}
                />
              </div>
            </div>

            <div className="panel-title">板块涨停股票</div>
            {sectorStocks.length > 0 ? (
              <table className="data-table compact">
                <thead>
                  <tr>
                    {['代码', '名称', '价格', '涨幅', '封单(亿)', '强度', '板次', '状态'].map((h) => (
                      <th key={h} className={h === '代码' ? 'text-left' : 'text-right'}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sectorStocks.map((s) => (
                    <tr key={s.code}>
                      <td className="mono muted">{s.code}</td>
                      <td className="text-right name">{s.name}</td>
                      <td className="mono text-right up-bright">{s.price.toFixed(2)}</td>
                      <td className="mono text-right up">+{s.pct.toFixed(2)}%</td>
                      <td className="mono text-right accent">{s.bidAmount.toFixed(1)}</td>
                      <td>
                        <StrengthBar value={s.strength} />
                      </td>
                      <td className="text-center">
                        <OpensBadge opens={s.opens} />
                      </td>
                      <td className="text-center">
                        <StatusBadge status={s.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
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
