import { useState } from 'react'
import { LADDER_DATA } from '../data/mock'
import { IconPlaceholder } from './IconPlaceholder'

const CHIP = '#e53935'

export function LadderView() {
  const [selected, setSelected] = useState<{ boards: number; idx: number } | null>(null)
  const [showZhaban, setShowZhaban] = useState(false)
  const [showKechuang, setShowKechuang] = useState(true)

  const filteredData = LADDER_DATA.map((row) => ({
    ...row,
    stocks: row.stocks.filter((s) => {
      if (!showZhaban && s.zhaban) return false
      if (!showKechuang && (s.code.startsWith('688') || s.code.startsWith('300'))) return false
      return true
    }),
  })).filter((row) => row.stocks.length > 0)

  const selectedStock =
    selected !== null
      ? filteredData.find((r) => r.boards === selected.boards)?.stocks[selected.idx]
      : null
  const selectedRow = selected !== null ? filteredData.find((r) => r.boards === selected.boards) : null
  const maxCount = Math.max(...filteredData.map((r) => r.stocks.length), 1)
  const total = filteredData.reduce((a, r) => a + r.stocks.length, 0)

  return (
    <div className="split-view">
      <div className="split-main ladder-main">
        <div className="ladder-summary">
          <div>
            <div className="muted">今日连板总数</div>
            <div className="mono up-bright big">{total}只</div>
          </div>
          <div>
            <div className="muted">最高板数</div>
            <div className="mono big" style={{ color: '#ff00ff' }}>10板</div>
          </div>
          <label className="ladder-toggle">
            <input type="checkbox" checked={showZhaban} onChange={(e) => { setShowZhaban(e.target.checked); setSelected(null) }} />
            含炸板
          </label>
          <label className="ladder-toggle">
            <input type="checkbox" checked={showKechuang} onChange={(e) => { setShowKechuang(e.target.checked); setSelected(null) }} />
            科创/创业
          </label>
        </div>
        <div className="ladder-rows">
          {filteredData.map((row) => (
            <div key={row.boards} className="ladder-row">
              <span className="mono ladder-label" style={{ color: row.color }}>{row.label}</span>
              <div className="ladder-chips">
                {row.stocks.map((s, i) => {
                  const active = selected?.boards === row.boards && selected.idx === i
                  return (
                    <button
                      key={s.code}
                      type="button"
                      className={`ladder-chip${active ? ' active' : ''}${s.zhaban ? ' zhaban' : ''}`}
                      style={{ borderColor: `${CHIP}66`, color: active ? '#fff' : CHIP, background: active ? CHIP : `${CHIP}22` }}
                      onClick={() => setSelected(active ? null : { boards: row.boards, idx: i })}
                    >
                      {s.name}{s.zhaban ? <small>炸</small> : null}
                    </button>
                  )
                })}
                <span className="ladder-bar-wrap">
                  <span className="ladder-bar" style={{ width: `${(row.stocks.length / maxCount) * 120}px` }} />
                  <span className="mono" style={{ color: row.color }}>{row.stocks.length}只</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="split-side ladder-detail">
        {selectedStock && selectedRow ? (
          <div>
            <div className="ladder-detail-head">
              <span className="sector-pill" style={{ color: selectedRow.color, background: `${selectedRow.color}22` }}>{selectedRow.label}龙头</span>
              <strong>{selectedStock.name}</strong>
              <span className="mono muted">{selectedStock.code}</span>
            </div>
            <div className="sector-metrics ladder-metrics">
              {[
                { label: '现价', val: selectedStock.price.toFixed(2), cls: 'up-bright' },
                { label: '涨停时间', val: selectedStock.limitTime },
                { label: '成交额', val: `${selectedStock.amount}亿` },
                { label: '板块', val: selectedStock.sector, cls: 'accent' },
              ].map((m) => (
                <div key={m.label} className="sector-metric">
                  <div className="muted">{m.label}</div>
                  <div className={`mono sector-metric-val ${m.cls || ''}`}>{m.val}</div>
                </div>
              ))}
            </div>
            <div className="avg-box">
              <div className="muted">封板强度</div>
              <div className="meter-track thick" style={{ marginTop: 8 }}>
                <div className="meter-fill" style={{ width: `${selectedStock.strength}%`, background: selectedRow.color }} />
              </div>
              <div className="mono" style={{ marginTop: 8, color: selectedRow.color }}>{selectedStock.strength}</div>
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
