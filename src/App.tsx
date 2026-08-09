import { useEffect, useState } from 'react'
import { AlertPanel } from './components/AlertPanel'
import { LadderView } from './components/LadderView'
import { LimitChain } from './components/LimitChain'
import { LimitUpTable } from './components/LimitUpTable'
import { NewsView } from './components/NewsView'
import { RightPanel } from './components/RightPanel'
import { SectorPanel } from './components/SectorPanel'
import { SectorView } from './components/SectorView'
import { StatBar } from './components/StatBar'
import { StrongStocksView } from './components/StrongStocksView'
import { TopBar } from './components/TopBar'
import {
  TODAY,
  generateMarketStats,
  generateStocks,
  generateStocksForDate,
} from './data/mock'
import type { ActiveTab, MarketStat, Stock } from './types'

export default function App() {
  const [selectedDate, setSelectedDate] = useState(TODAY)
  const [stocks, setStocks] = useState<Stock[]>(() => generateStocks())
  const [stats, setStats] = useState<MarketStat[]>(() => generateMarketStats())
  const [selectedSector, setSelectedSector] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<ActiveTab>('all')
  const [time, setTime] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [refreshCount, setRefreshCount] = useState(0)

  useEffect(() => {
    const tick = () => {
      setTime(new Date().toLocaleTimeString('zh-CN', { hour12: false }))
    }
    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    setStocks(selectedDate === TODAY ? generateStocks() : generateStocksForDate(selectedDate))
    setStats(generateMarketStats())
    setSelectedSector(null)
  }, [selectedDate])

  const handleRefresh = () => {
    if (refreshing) return
    setRefreshing(true)
    window.setTimeout(() => {
      const base = selectedDate === TODAY ? generateStocks() : generateStocksForDate(selectedDate)
      setStocks(
        base.map((s) => ({
          ...s,
          strength: Math.min(99, Math.max(30, s.strength + (Math.random() > 0.5 ? 1 : -1) * Math.floor(Math.random() * 3))),
          bidAmount: Math.max(0.5, +(s.bidAmount + (Math.random() - 0.4) * 0.8).toFixed(1)),
        })),
      )
      setStats(generateMarketStats())
      setRefreshCount((c) => c + 1)
      setRefreshing(false)
    }, 450)
  }

  const displayStocks =
    activeTab === 'locked'
      ? stocks.filter((x) => x.status === 'locked')
      : activeTab === 'open'
        ? stocks.filter((x) => x.status === 'open')
        : stocks

  const tabs: { key: ActiveTab; label: string }[] = [
    { key: 'all', label: `全部 (${stocks.length})` },
    { key: 'locked', label: `封板 (${stocks.filter((s) => s.status === 'locked').length})` },
    { key: 'open', label: `炸板 (${stocks.filter((s) => s.status === 'open').length})` },
    { key: 'sector', label: '板块' },
    { key: 'news', label: '财经新闻' },
    { key: 'ladder', label: '连板天梯' },
    { key: 'strong', label: '强势个股' },
  ]

  return (
    <div className="app">
      <TopBar
        time={time}
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        refreshing={refreshing}
        onRefresh={handleRefresh}
      />
      <StatBar stats={stats} />

      <div className="app-body">
        <aside className="sidebar-left">
          <LimitChain />
          <SectorPanel selected={selectedSector} onSelect={setSelectedSector} />
          <AlertPanel />
        </aside>

        <div className="main-area">
          <div className="tabbar">
            {tabs.map((t) => (
              <button
                key={t.key}
                type="button"
                className={`tab${activeTab === t.key ? ' active' : ''}`}
                onClick={() => setActiveTab(t.key)}
              >
                {t.label}
              </button>
            ))}
            {selectedSector && activeTab !== 'sector' && (
              <button type="button" className="sector-chip" onClick={() => setSelectedSector(null)}>
                板块: {selectedSector} ✕
              </button>
            )}
          </div>

          <div className="main-content">
            {activeTab === 'sector' ? (
              <SectorView stocks={stocks} />
            ) : activeTab === 'news' ? (
              <NewsView />
            ) : activeTab === 'ladder' ? (
              <LadderView />
            ) : activeTab === 'strong' ? (
              <StrongStocksView />
            ) : (
              <LimitUpTable stocks={displayStocks} selectedSector={selectedSector} />
            )}
          </div>
        </div>

        <RightPanel />
      </div>

      <footer className="footer">
        <span>数据仅供参考，不构成投资建议 · 交易有风险，投资须谨慎</span>
        <span>
          延迟: <span className="latency">15ms</span> · 更新频率: 3s · 数据源: 模拟
          {refreshCount > 0 ? ` · 已刷新 ${refreshCount} 次` : ''}
        </span>
      </footer>
    </div>
  )
}
