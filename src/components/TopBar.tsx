import { useState } from 'react'
import { DatePicker } from './DatePicker'
import { IconPlaceholder } from './IconPlaceholder'

type TopBarProps = {
  time: string
  selectedDate: string
  tradeDates: string[]
  today: string
  statusMessage: string
  isLive: boolean
  onDateChange: (d: string) => void
  refreshing: boolean
  onRefresh: () => void
}

export function TopBar({
  time,
  selectedDate,
  tradeDates,
  today,
  statusMessage,
  isLive,
  onDateChange,
  refreshing,
  onRefresh,
}: TopBarProps) {
  const [logoFlash, setLogoFlash] = useState(false)

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button
          type="button"
          className={`brand-btn${logoFlash ? ' flash' : ''}`}
          onClick={() => {
            setLogoFlash(true)
            window.scrollTo({ top: 0, behavior: 'smooth' })
            window.setTimeout(() => setLogoFlash(false), 1200)
          }}
          aria-label="涨停板盯盘系统"
        >
          <IconPlaceholder kind="logo" size={24} className="icon-placeholder brand-logo" />
          <span className="brand">涨停板盯盘系统</span>
        </button>
        {/* 指数行情接口暂无，不展示占位假数据 */}
      </div>
      <div className="topbar-right">
        <span className="mono live">
          <span className={`blink live-dot${isLive ? '' : ' muted-dot'}`}>●</span> {statusMessage}
        </span>
        <span className="clock">{time}</span>
        <DatePicker
          selectedDate={selectedDate}
          tradeDates={tradeDates}
          today={today}
          onChange={onDateChange}
        />
        <button type="button" className="refresh-btn" onClick={onRefresh} disabled={refreshing || !selectedDate}>
          <IconPlaceholder kind="refresh" />
          {refreshing ? '刷新中…' : '刷新'}
        </button>
      </div>
      {logoFlash && <div className="toast">已点击 Logo</div>}
    </header>
  )
}
