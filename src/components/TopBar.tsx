import { useState } from 'react'
import { INDEX_TICKERS, TODAY } from '../data/mock'
import { DatePicker } from './DatePicker'
import { IconPlaceholder } from './IconPlaceholder'

type TopBarProps = {
  time: string
  selectedDate: string
  onDateChange: (d: string) => void
  refreshing: boolean
  onRefresh: () => void
}

export function TopBar({ time, selectedDate, onDateChange, refreshing, onRefresh }: TopBarProps) {
  const [logoFlash, setLogoFlash] = useState(false)
  const isToday = selectedDate === TODAY

  const handleLogoClick = () => {
    setLogoFlash(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
    window.setTimeout(() => setLogoFlash(false), 1200)
  }

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button
          type="button"
          className={`brand-btn${logoFlash ? ' flash' : ''}`}
          onClick={handleLogoClick}
          aria-label="涨停板盯盘系统"
        >
          {/* 待导出资源: logo */}
          <IconPlaceholder kind="logo" size={24} className="icon-placeholder brand-logo" />
          <span className="brand">涨停板盯盘系统</span>
        </button>
        <div className="topbar-indices">
          {INDEX_TICKERS.map((idx) => (
            <span key={idx.label} className="index-item">
              <span className="index-label">{idx.label}</span>
              <span className="index-val">{idx.val}</span>
              <span className={idx.up ? 'up' : 'down'}>{idx.pct}</span>
            </span>
          ))}
        </div>
      </div>
      <div className="topbar-right">
        <span className="mono live">
          <span className={`blink live-dot${isToday ? '' : ' muted-dot'}`}>●</span>{' '}
          {isToday ? '交易中' : '历史回看'}
        </span>
        <span className="clock">{time}</span>
        <DatePicker selectedDate={selectedDate} onChange={onDateChange} />
        <button type="button" className="refresh-btn" onClick={onRefresh} disabled={refreshing}>
          <IconPlaceholder kind="refresh" />
          {refreshing ? '刷新中…' : '刷新'}
        </button>
      </div>
      {logoFlash && <div className="toast">已点击 Logo（占位）</div>}
    </header>
  )
}
