import { useEffect, useMemo, useState } from 'react'
import { AlertPanel } from './components/AlertPanel'
import { ConceptListView } from './components/ConceptListView'
import { LadderView } from './components/LadderView'
import { LimitChain } from './components/LimitChain'
import { LimitUpTable } from './components/LimitUpTable'
import { MoversView } from './components/MoversView'
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
import { useWatchlistQuotes } from './hooks/useWatchlistQuotes'
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
  const [includeBj, setIncludeBj] = useState(true)
  const watchQuotes = useWatchlistQuotes({
    items: watchlist.items,
    snapshot: feed.snapshot,
    // live/午休：拉今日 rt_k 成交额；复盘日仅用 snapshot 当日 amount
    enabled:
      feed.viewKind === 'live' &&
      (activeTab === 'watchlist' || watchlist.floatState.open),
  })

  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString('zh-CN', { hour12: false }))
    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [])

  const boardOpts: BoardFilterOpts = useMemo(
    () => ({ includeChiNext, includeStar, includeBj }),
    [includeChiNext, includeStar, includeBj],
  )

  // 选中日当日涨停池（limit_up_list + 当日炸板）；封板/炸板/板块用
  const stocks = useMemo(
    () => filterByBoard(feed.stocks, boardOpts),
    [feed.stocks, boardOpts],
  )
  // 昨日涨停 = 相对选中 trade_date 的上一交易日 U 类涨停
  const yesterdayStocks = useMemo(
    () => filterByBoard(feed.yesterdayStocks, boardOpts),
    [feed.yesterdayStocks, boardOpts],
  )
  // 封板 = 当日仍涨停（U / locked）；与「当日涨停家数」对齐
  const lockedStocks = useMemo(
    () => stocks.filter((s) => s.status === 'locked' || s.status === 'sealed'),
    [stocks],
  )
  // 炸板 = 当日曾涨停但当前未封住；membership 不看 pct（无 >7% 门槛）
  const openStocks = useMemo(() => stocks.filter((s) => s.status === 'open'), [stocks])
  const ladder = useMemo(() => filterLadder(feed.ladder, boardOpts), [feed.ladder, boardOpts])
  const strong = useMemo(() => filterStrong(feed.strong, boardOpts), [feed.strong, boardOpts])
  const movers = useMemo(() => filterByBoard(feed.movers, boardOpts), [feed.movers, boardOpts])

  // 板过滤后按 stock_codes ∩ 可见涨停池重算家数（一股可属多概念）→ 概念屏蔽 → 涨停前十
  const sectorHeat = useMemo(() => {
    const base = refineSectorHeat(feed.sectorHeat, stocks)
    return takeTopConcepts(filterBlockedConcepts(base, blocklist.blockedSet), 10)
  }, [feed.sectorHeat, stocks, blocklist.blockedSet])

  const sectorDetail = useMemo(() => {
    const base = refineSectorDetail(feed.sectorDetail, stocks)
    return takeTopConcepts(filterBlockedConcepts(base, blocklist.blockedSet), 10)
  }, [feed.sectorDetail, stocks, blocklist.blockedSet])

  useEffect(() => {
    const pool =
      activeTab === 'all'
        ? yesterdayStocks
        : activeTab === 'locked'
          ? lockedStocks
          : activeTab === 'open'
            ? openStocks
            : stocks
    if (selectedStock && !pool.some((s) => s.code === selectedStock.code)) {
      setSelectedStock(null)
    }
  }, [activeTab, stocks, yesterdayStocks, lockedStocks, openStocks, selectedStock])

  useEffect(() => {
    if (selectedSector && !sectorHeat.some((s) => s.name === selectedSector)) {
      setSelectedSector(null)
    }
  }, [sectorHeat, selectedSector])

  const displayStocks =
    activeTab === 'all'
      ? yesterdayStocks
      : activeTab === 'locked'
        ? lockedStocks
        : activeTab === 'open'
          ? openStocks
          : stocks

  const tabs: { key: ActiveTab; label: string }[] = [
    { key: 'all', label: `昨日涨停 (${yesterdayStocks.length})` },
    { key: 'locked', label: `封板 (${lockedStocks.length})` },
    { key: 'open', label: `炸板 (${openStocks.length})` },
    { key: 'watchlist', label: `自选 (${watchlist.count})` },
    { key: 'movers', label: `个股 (${movers.length})` },
    { key: 'sector', label: '板块' },
    { key: 'concepts', label: '概念列表' },
    { key: 'news', label: '财经新闻' },
    { key: 'ladder', label: '连板天梯' },
    { key: 'strong', label: '强势个股' },
  ]

  const todayCount =
    feed.meta?.market_pulse?.limit_up_count ??
    feed.meta?.limit_up_count ??
    (lockedStocks.length || null)

  const emptyHint = feed.bootError
    ? feed.bootError
    : feed.loading
      ? '加载中…'
      : activeTab === 'all'
        ? feed.prevTradeDate
          ? `暂无 ${feed.prevTradeDate} 涨停历史`
          : '暂无上一交易日涨停数据'
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
                      checked={includeBj}
                      onChange={(e) => setIncludeBj(e.target.checked)}
                    />
                    北交所
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
                quoteStocks={watchQuotes}
                onOpenFloat={watchlist.openFloat}
              />
            ) : activeTab === 'movers' ? (
              <MoversView
                data={movers}
                isWatched={watchlist.isWatched}
                onToggleWatch={watchlist.toggle}
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
                syncError={blocklist.syncError}
                onToggle={blocklist.toggle}
                onAddCustom={blocklist.addCustom}
                onRemoveCustom={blocklist.removeCustom}
                onRenameCustom={blocklist.renameCustom}
                onAddCustomMember={blocklist.addCustomMember}
                onAddCustomMembers={blocklist.addCustomMembers}
                onRemoveCustomMember={blocklist.removeCustomMember}
                memberOverrides={blocklist.memberOverrides}
                onAddOfficialMember={blocklist.addOfficialMember}
                onRemoveOfficialMember={blocklist.removeOfficialMember}
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

      <WatchlistFloat watchlist={watchlist} quoteStocks={watchQuotes} />

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
