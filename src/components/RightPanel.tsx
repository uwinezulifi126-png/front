import { useEffect, useMemo, useState } from 'react'
import { fetchLimitHistory } from '../api/client'
import type { LimitHistoryItem } from '../models/apiTypes'
import { type BoardFilterOpts } from '../utils/boardFilter'
import { computePromotionRateFromHistory } from '../utils/promotionRate'
import { normalizeTradeDate, resolvePrevTradeDate } from '../utils/tradeDate'

type Sentiment = { label: string; val: number; color: string }

type RightPanelProps = {
  sentiment?: Sentiment[]
  /** 顶栏/复盘选中的交易日 YYYY-MM-DD，晋级率随其切换 */
  selectedDate?: string
  boardOpts: BoardFilterOpts
  /** 当日涨停历史（与连板天梯同源） */
  todayHistory?: LimitHistoryItem[]
  calendarDates?: string[]
  fallbackPrev?: string | null
}

function formatRate(rate: number | null): string {
  if (rate == null || !Number.isFinite(rate)) return '—'
  return `${(rate * 100).toFixed(1)}%`
}

/** 0/0 无样本行不展示（如六板0/0、七板0/0） */
function shouldShowPromotionRow(it: { base: number; promoted: number }): boolean {
  return !(it.base === 0 && it.promoted === 0)
}

export function RightPanel({
  sentiment = [],
  selectedDate = '',
  boardOpts,
  todayHistory = [],
  calendarDates = [],
  fallbackPrev = null,
}: RightPanelProps) {
  const [prevHistory, setPrevHistory] = useState<LimitHistoryItem[]>([])
  const [prevTradeDate, setPrevTradeDate] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!selectedDate) {
      setPrevHistory([])
      setPrevTradeDate(null)
      setError(null)
      setLoading(false)
      return
    }
    const prev = resolvePrevTradeDate(selectedDate, calendarDates, fallbackPrev)
    setPrevTradeDate(prev)
    if (!prev) {
      setPrevHistory([])
      setError(null)
      setLoading(false)
      return
    }
    const ac = new AbortController()
    setLoading(true)
    setError(null)
    fetchLimitHistory(prev, ac.signal)
      .then((res) => setPrevHistory(res.items))
      .catch((err: unknown) => {
        if (ac.signal.aborted) return
        setPrevHistory([])
        setError(err instanceof Error ? err.message : '上一交易日涨停历史加载失败')
      })
      .finally(() => {
        if (!ac.signal.aborted) setLoading(false)
      })
    return () => ac.abort()
  }, [selectedDate, calendarDates, fallbackPrev])

  const message = useMemo(() => {
    if (!selectedDate) return null
    if (!prevTradeDate) return '无法解析上一开市日'
    const todayHas = todayHistory.length > 0
    const prevHas = prevHistory.length > 0
    if (!todayHas && !prevHas) {
      return `涨停历史缺失（${normalizeTradeDate(selectedDate)} 与 ${prevTradeDate}）`
    }
    if (!todayHas) return `涨停历史缺失（${normalizeTradeDate(selectedDate)}）`
    if (!prevHas) return `涨停历史缺失（上一开市日 ${prevTradeDate}）`
    return null
  }, [selectedDate, prevTradeDate, todayHistory.length, prevHistory.length])

  const items = useMemo(
    () => computePromotionRateFromHistory(todayHistory, prevHistory, boardOpts),
    [todayHistory, prevHistory, boardOpts],
  )

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
