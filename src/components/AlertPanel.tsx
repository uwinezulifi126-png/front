import { AlertList } from './AlertList'
import { useAlerts } from '../hooks/useAlerts'

type AlertPanelProps = {
  /** 顶栏选中交易日 YYYY-MM-DD；可查近一年有数据日 */
  selectedDate?: string
  /** 是否当日实时（短轮询）；历史日只拉一次 */
  isLive?: boolean
  /** 紧凑模式：无说明文案，用于自选浮窗右侧栏 */
  compact?: boolean
  className?: string
}

export function AlertPanel({
  selectedDate = '',
  isLive = false,
  compact = false,
  className,
}: AlertPanelProps) {
  const { items, loading, error } = useAlerts(selectedDate, isLive)

  const rootClass = [
    compact ? 'alert-panel-compact' : 'panel-block',
    'alert-panel',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={rootClass}>
      <div className="panel-title">实时预警</div>
      {!compact && (
        <div className="mono muted alert-panel-hint">
          随交易日切换；急涨急跌自接入日起累积
        </div>
      )}
      <AlertList
        selectedDate={selectedDate}
        items={items}
        loading={loading}
        error={error}
      />
    </div>
  )
}
