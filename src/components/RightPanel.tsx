import { useEffect, useState } from 'react'
import { fetchPromotionRate } from '../api/client'
import type { PromotionRateItem } from '../models/apiTypes'

type Sentiment = { label: string; val: number; color: string }

type RightPanelProps = {
  sentiment?: Sentiment[]
  /** 顶栏/复盘选中的交易日 YYYY-MM-DD，晋级率随其切换 */
  selectedDate?: string
}

function formatRate(rate: number | null): string {
  if (rate == null || !Number.isFinite(rate)) return '—'
  return `${(rate * 100).toFixed(1)}%`
}

/** 0/0 无样本行不展示（如六板0/0、七板0/0） */
function shouldShowPromotionRow(it: PromotionRateItem): boolean {
  return !(it.base === 0 && it.promoted === 0)
}

export function RightPanel({ sentiment = [], selectedDate = '' }: RightPanelProps) {
  const [items, setItems] = useState<PromotionRateItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!selectedDate) {
      setItems([])
      setError(null)
      setMessage(null)
      setLoading(false)
      return
    }
    const ac = new AbortController()
    setLoading(true)
    setError(null)
    setMessage(null)
    fetchPromotionRate(selectedDate, ac.signal)
      .then((res) => {
        setItems(res.items)
        setMessage(res.message ?? null)
      })
      .catch((err: unknown) => {
        if (ac.signal.aborted) return
        setItems([])
        setError(err instanceof Error ? err.message : '连板晋级率加载失败')
      })
      .finally(() => {
        if (!ac.signal.aborted) setLoading(false)
      })
    return () => ac.abort()
  }, [selectedDate])

  const visiblePromotionItems = items.filter(shouldShowPromotionRow)

  return (
    <aside className="sidebar-right">
      <div className="panel-block">
        <div className="panel-title">市场情绪</div>
        {sentiment.length === 0 ? (
          <div className="mono muted">暂无情绪数据</div>
        ) : (
          <div className="sentiment-list">
            {sentiment.map((m) => (
              <div key={m.label} className="sentiment-item">
                <div className="sentiment-head">
                  <span>{m.label}</span>
                  <span className="mono" style={{ color: m.color }}>
                    {m.val}
                  </span>
                </div>
                <div className="meter-track">
                  <div className="meter-fill" style={{ width: `${m.val}%`, backgroundColor: m.color }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="panel-block">
        <div className="panel-title">龙虎榜主力</div>
        <div className="mono muted">暂无接口，不展示</div>
      </div>

      <div className="panel-block">
        <div className="panel-title">连板晋级率</div>
        <div className="mono muted" style={{ fontSize: 10, marginBottom: 8 }}>
          随交易日切换，可查近一年
        </div>
        {!selectedDate ? (
          <div className="mono muted">请选择交易日</div>
        ) : loading ? (
          <div className="mono muted">加载中…</div>
        ) : error ? (
          <div className="mono muted">{error}</div>
        ) : visiblePromotionItems.length === 0 ? (
          <div className="mono muted">{message || '暂无数据'}</div>
        ) : (
          <div className="rate-list">
            {visiblePromotionItems.map((it) => (
              <div key={it.boards} className="rate-row">
                <span>
                  {it.label}
                  <span className="mono muted" style={{ marginLeft: 6, fontSize: 10 }}>
                    {it.promoted}/{it.base}
                  </span>
                </span>
                <span className="mono rate-val">{formatRate(it.rate)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  )
}
