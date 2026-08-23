import type { AlertApiItem } from '../api/client'

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

type AlertListProps = {
  selectedDate: string
  items: AlertApiItem[]
  loading: boolean
  error: string | null
}

export function AlertList({ selectedDate, items, loading, error }: AlertListProps) {
  if (!selectedDate) {
    return <div className="mono muted alert-list-empty">请选择交易日</div>
  }
  if (loading && items.length === 0) {
    return <div className="mono muted alert-list-empty">加载中…</div>
  }
  if (error) {
    return <div className="mono muted alert-list-empty">{error}</div>
  }
  if (items.length === 0) {
    return <div className="mono muted alert-list-empty">暂无预警数据</div>
  }

  return (
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
  )
}
