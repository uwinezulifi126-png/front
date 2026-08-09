import { useEffect, useState } from 'react'
import { fetchAlerts, type AlertApiItem } from '../api/client'
import { POLL_INTERVAL_MS } from '../api/config'

type AlertPanelProps = {
  /** 顶栏选中交易日 YYYY-MM-DD；可查近一年有数据日 */
  selectedDate?: string
  /** 是否当日实时（短轮询）；历史日只拉一次 */
  isLive?: boolean
}

type Level = 'up' | 'warn' | 'down'

function levelOf(alertType: string | null | undefined, content: string): Level {
  const t = (alertType || '').toLowerCase()
  if (t === 'surge' || t === 'seal') return 'up'
  if (t === 'dive' || t === 'open') return 'warn'
  if (content.includes('拉升') || content.includes('封涨停')) return 'up'
  if (content.includes('跳水') || content.includes('打开')) return 'warn'
  return 'down'
}

function formatAlertTime(iso: string | null | undefined): string {
  if (!iso) return '--:--:--'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) {
    const m = String(iso).match(/(\d{2}:\d{2}:\d{2})/)
    return m ? m[1] : String(iso)
  }
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  const ss = String(d.getSeconds()).padStart(2, '0')
  return `${hh}:${mm}:${ss}`
}

function rowKey(item: AlertApiItem, idx: number): string {
  return item.id != null ? `a-${item.id}` : `${item.预警时间}-${item.股票代码}-${idx}`
}

export function AlertPanel({ selectedDate = '', isLive = false }: AlertPanelProps) {
  const [items, setItems] = useState<AlertApiItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!selectedDate) {
      setItems([])
      setError(null)
      setLoading(false)
      return
    }

    let cancelled = false
    const ac = new AbortController()

    const load = (showLoading: boolean) => {
      if (showLoading) setLoading(true)
      fetchAlerts({ tradeDate: selectedDate, limit: 100, signal: ac.signal })
        .then((res) => {
          if (cancelled) return
          setItems(res.items)
          setError(null)
        })
        .catch((err: unknown) => {
          if (cancelled || ac.signal.aborted) return
          setItems([])
          setError(err instanceof Error ? err.message : '预警加载失败')
        })
        .finally(() => {
          if (!cancelled) setLoading(false)
        })
    }

    load(true)

    let timer: number | undefined
    if (isLive) {
      timer = window.setInterval(() => load(false), Math.max(3000, POLL_INTERVAL_MS))
    }

    return () => {
      cancelled = true
      ac.abort()
      if (timer != null) window.clearInterval(timer)
    }
  }, [selectedDate, isLive])

  return (
    <div className="panel-block alert-panel">
      <div className="panel-title">实时预警</div>
      <div className="mono muted alert-panel-hint">
        随交易日切换；急涨急跌自接入日起累积
      </div>
      {!selectedDate ? (
        <div className="mono muted alert-list-empty">请选择交易日</div>
      ) : loading && items.length === 0 ? (
        <div className="mono muted alert-list-empty">加载中…</div>
      ) : error ? (
        <div className="mono muted alert-list-empty">{error}</div>
      ) : items.length === 0 ? (
        <div className="mono muted alert-list-empty">暂无预警数据</div>
      ) : (
        <div className="alert-list">
          {items.map((it, idx) => {
            const content = it.预警内容 || ''
            const name = it.股票名称 || it.股票代码 || ''
            const level = levelOf(it.预警类型, content)
            return (
              <div key={rowKey(it, idx)} className="alert-row">
                <span className="alert-time mono">{formatAlertTime(it.预警时间)}</span>
                <span className={`alert-msg level-${level}`}>
                  {name} {content}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
