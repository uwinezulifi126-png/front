import { useEffect, useMemo, useState } from 'react'
import { AlertPanel } from './components/AlertPanel'
import { ConceptListView } from './components/ConceptListView'
import { LadderView } from './components/LadderView'
import { LimitChain } from './components/LimitChain'
import { LimitUpTable } from './components/LimitUpTable'
import { NewsView } from './components/NewsView'
import { RightPanel } from './components/RightPanel'
import { SectorPanel } from './components/SectorPanel'
import { SectorView } from './components/SectorView'
import { StatBar } from './components/StatBar'
import { StrongStocksView } from './components/StrongStocksView'
import { TabBar } from './components/TabBar'
import { TopBar } from './components/TopBar'
import { WatchlistFloat } from './components/WatchlistFloat'
import { WatchlistView } from './components/WatchlistView'
import { useMarketFeed } from './controllers/useMarketFeed'
import { useConceptBlocklist } from './hooks/useConceptBlocklist'
import { useWatchlist } from './hooks/useWatchlist'
import type { ActiveTab, Stock } from './types'
import {
  filterByBoard,
  filterLadder,
  filterStrong,
  refineSectorDetail,
  refineSectorHeat,
  type BoardFilterOpts,
} from './utils/boardFilter'
import { filterBlockedConcepts, takeTopConcepts } from './utils/conceptBlocklist'

export default function App() {
  const feed = useMarketFeed()
  const blocklist = useConceptBlocklist()
  const watchlist = useWatchlist()
  const [selectedSector, setSelectedSector] = useState<string | null>(null)
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null)
  const [activeTab, setActiveTab] = useState<ActiveTab>('all')
  const [time, setTime] = useState('')
  const [includeChiNext, setIncludeChiNext] = useState(true)
  const [includeStar, setIncludeStar] = useState(true)

  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString('zh-CN', { hour12: false }))
    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [])

  const boardOpts: BoardFilterOpts = useMemo(
    () => ({ includeChiNext, includeStar }),
    [includeChiNext, includeStar],
  )

  const stocks = useMemo(
    () => filterByBoard(feed.stocks, boardOpts),
    [feed.stocks, boardOpts],
  )
  const ladder = useMemo(() => filterLadder(feed.ladder, boardOpts), [feed.ladder, boardOpts])
  const strong = useMemo(() => filterStrong(feed.strong, boardOpts), [feed.strong, boardOpts])

  // 板过滤 → 概念屏蔽 → 再取涨停前十
  const sectorHeat = useMemo(() => {
    const base =
      includeChiNext && includeStar
        ? feed.sectorHeat
        : refineSectorHeat(feed.sectorHeat, stocks)
    return takeTopConcepts(filterBlockedConcepts(base, blocklist.blockedSet), 10)
  }, [feed.sectorHeat, stocks, includeChiNext, includeStar, blocklist.blockedSet])

  const sectorDetail = useMemo(() => {
    const base =
      includeChiNext && includeStar
        ? feed.sectorDetail
        : refineSectorDetail(feed.sectorDetail, stocks)
    return takeTopConcepts(filterBlockedConcepts(base, blocklist.blockedSet), 10)
  }, [feed.sectorDetail, stocks, includeChiNext, includeStar, blocklist.blockedSet])

  useEffect(() => {
    if (selectedStock && !stocks.some((s) => s.code === selectedStock.code)) {
      setSelectedStock(null)
    }
  }, [stocks, selectedStock])

  useEffect(() => {
    if (selectedSector && !sectorHeat.some((s) => s.name === selectedSector)) {
      setSelectedSector(null)
    }
  }, [sectorHeat, selectedSector])

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
    { key: 'watchlist', label: `自选 (${watchlist.count})` },
    { key: 'sector', label: '板块' },
    { key: 'concepts', label: '概念列表' },
    { key: 'news', label: '财经新闻' },
    { key: 'ladder', label: '连板天梯' },
    { key: 'strong', label: '强势个股' },
  ]

  const todayCount =
    feed.meta?.market_pulse?.limit_up_count ?? feed.meta?.limit_up_count ?? (stocks.length || null)

  const emptyHint = feed.bootError
    ? feed.bootError
    : feed.loading
      ? '加载中…'
      : feed.statusMessage || '暂无涨停数据'

  return (
    <div className="app">
      <TopBar
        time={time}
        selectedDate={feed.selectedDate}
        tradeDates={feed.calendar?.dates ?? []}
        today={feed.calendar?.status.trade_date ?? ''}
        statusMessage={feed.statusMessage}
        isLive={feed.viewKind === 'live'}
        onDateChange={feed.onDateChange}
        refreshing={feed.refreshing}
        onRefresh={() => void feed.refresh()}
      />
      <StatBar stats={feed.stats} />

      <div className="app-body">
        <aside className="sidebar-left">
          <LimitChain todayCount={typeof todayCount === 'number' ? todayCount : null} />
          <SectorPanel
            items={sectorHeat}
            selected={selectedSector}
            onSelect={setSelectedSector}
          />
          <AlertPanel
            selectedDate={feed.selectedDate}
            isLive={feed.viewKind === 'live'}
          />
        </aside>

        <div className="main-area">
          <TabBar
            tabs={tabs}
            activeTab={activeTab}
            onChange={setActiveTab}
            trailing={
              <>
                <div className="board-filters">
                  <label className="board-filter">
                    <input
                      type="checkbox"
                      checked={includeStar}
                      onChange={(e) => setIncludeStar(e.target.checked)}
                    />
                    科创板
                  </label>
                  <label className="board-filter">
                    <input
                      type="checkbox"
                      checked={includeChiNext}
                      onChange={(e) => setIncludeChiNext(e.target.checked)}
                    />
                    创业板
                  </label>
                </div>
                {selectedSector && activeTab !== 'sector' && (
                  <button
                    type="button"
                    className="sector-chip"
                    onClick={() => setSelectedSector(null)}
                  >
                    板块: {selectedSector} ✕
                  </button>
                )}
              </>
            }
          />

          <div className="main-content">
            {activeTab === 'watchlist' ? (
              <WatchlistView
                watchlist={watchlist}
                quoteStocks={feed.stocks}
                onOpenFloat={watchlist.openFloat}
              />
            ) : activeTab === 'sector' ? (
              <SectorView
                stocks={stocks}
                details={sectorDetail}
                isWatched={watchlist.isWatched}
                onToggleWatch={watchlist.toggle}
              />
            ) : activeTab === 'concepts' ? (
              <ConceptListView
                feedCatalog={feed.conceptCatalog}
                custom={blocklist.custom}
                blockedSet={blocklist.blockedSet}
                onToggle={blocklist.toggle}
                onAddCustom={blocklist.addCustom}
                onRemoveCustom={blocklist.removeCustom}
              />
            ) : activeTab === 'news' ? (
              <NewsView />
            ) : activeTab === 'ladder' ? (
              <LadderView
                data={ladder}
                isWatched={watchlist.isWatched}
                onToggleWatch={watchlist.toggle}
              />
            ) : activeTab === 'strong' ? (
              <StrongStocksView
                data={strong}
                isWatched={watchlist.isWatched}
                onToggleWatch={watchlist.toggle}
              />
            ) : (
              <LimitUpTable
                stocks={displayStocks}
                selectedSector={selectedSector}
                emptyHint={emptyHint}
                selectedStock={selectedStock}
                onSelect={(stock) =>
                  setSelectedStock((prev) => (prev?.code === stock.code ? null : stock))
                }
                onCloseDetail={() => setSelectedStock(null)}
                isWatched={watchlist.isWatched}
                onToggleWatch={watchlist.toggle}
              />
            )}
          </div>
        </div>

        <RightPanel sentiment={feed.sentiment} selectedDate={feed.selectedDate} />
      </div>

      <WatchlistFloat watchlist={watchlist} quoteStocks={feed.stocks} />

      <footer className="footer">
        <span>数据仅供参考，不构成投资建议 · 交易有风险，投资须谨慎</span>
        <span>
          {feed.connectionMode} · {feed.viewKind === 'live' ? '实时' : '复盘'}
          {feed.feedError ? ` · ${feed.feedError}` : ''}
          {feed.selectedDate ? ` · ${feed.selectedDate}` : ''}
          {feed.history.length ? ` · 历史${feed.history.length}条` : ''}
        </span>
      </footer>
    </div>
  )
}
