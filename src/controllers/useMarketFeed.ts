import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchCalendar, fetchLimitHistory, fetchReplayRank } from '../api/client'
import {
  adaptConceptCatalog,
  adaptHistoryLimitUps,
  adaptLadder,
  adaptSectorDetail,
  adaptSectorHeat,
  adaptSentiment,
  adaptStats,
  adaptStocks,
  adaptStrong,
} from '../models/adapt'
import type { CalendarResponse, LimitHistoryItem, RankSnapshot } from '../models/apiTypes'
import { resolvePrevTradeDate } from '../utils/tradeDate'
import { useRankStream } from './useRankStream'

export type ViewKind = 'live' | 'replay'

export function useMarketFeed() {
  const [calendar, setCalendar] = useState<CalendarResponse | null>(null)
  const [selectedDate, setSelectedDate] = useState('')
  const [viewKind, setViewKind] = useState<ViewKind>('replay')
  const [replaySnap, setReplaySnap] = useState<RankSnapshot | null>(null)
  const [history, setHistory] = useState<LimitHistoryItem[]>([])
  const [prevHistory, setPrevHistory] = useState<LimitHistoryItem[]>([])
  const [bootError, setBootError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const liveEnabled = viewKind === 'live'
  const live = useRankStream(liveEnabled)

  const snapshot = viewKind === 'live' ? live.snapshot : replaySnap

  const prevTradeDate = useMemo(() => {
    if (!selectedDate) return null
    return resolvePrevTradeDate(
      selectedDate,
      calendar?.dates ?? [],
      snapshot?.meta.prev_trade_date ?? calendar?.status.prev_trade_date ?? null,
    )
  }, [
    selectedDate,
    calendar?.dates,
    calendar?.status.prev_trade_date,
    snapshot?.meta.prev_trade_date,
  ])

  // Boot calendar → pick live or default replay date (no mock)
  useEffect(() => {
    const ac = new AbortController()
    ;(async () => {
      try {
        setLoading(true)
        const cal = await fetchCalendar(800, ac.signal)
        setCalendar(cal)
        const status = cal.status
        if (status.live_allowed) {
          setViewKind('live')
          setSelectedDate(status.trade_date || cal.dates[0] || '')
        } else {
          setViewKind('replay')
          const d =
            status.default_replay_date ||
            status.prev_trade_date ||
            cal.dates[0] ||
            ''
          setSelectedDate(d)
        }
        setBootError(null)
      } catch (e) {
        setBootError((e as Error).message || '无法连接后端')
        setCalendar(null)
      } finally {
        setLoading(false)
      }
    })()
    return () => ac.abort()
  }, [])

  // Replay / history load when date or view changes
  useEffect(() => {
    if (!selectedDate || viewKind === 'live') {
      if (viewKind === 'live') {
        setReplaySnap(null)
        setHistory([])
      }
      return
    }
    const ac = new AbortController()
    ;(async () => {
      try {
        setLoading(true)
        const [snap, hist] = await Promise.all([
          fetchReplayRank(selectedDate, { signal: ac.signal }),
          fetchLimitHistory(selectedDate, ac.signal).catch(() => ({
            trade_date: selectedDate,
            count: 0,
            items: [] as LimitHistoryItem[],
          })),
        ])
        setReplaySnap(snap)
        setHistory(hist.items)
        setBootError(null)
      } catch (e) {
        setReplaySnap(null)
        setHistory([])
        setBootError((e as Error).message || '复盘加载失败')
      } finally {
        setLoading(false)
      }
    })()
    return () => ac.abort()
  }, [selectedDate, viewKind])

  // Live mode: also try limit-history for today (may be empty pre-EOD)
  useEffect(() => {
    if (viewKind !== 'live' || !selectedDate) return
    const ac = new AbortController()
    fetchLimitHistory(selectedDate, ac.signal)
      .then((h) => setHistory(h.items))
      .catch(() => setHistory([]))
    return () => ac.abort()
  }, [viewKind, selectedDate, live.lastUpdatedAt])

  // 全部 Tab：相对选中日的上一交易日涨停历史（U）
  useEffect(() => {
    if (!prevTradeDate) {
      setPrevHistory([])
      return
    }
    const ac = new AbortController()
    fetchLimitHistory(prevTradeDate, ac.signal)
      .then((h) => setPrevHistory(h.items))
      .catch(() => setPrevHistory([]))
    return () => ac.abort()
  }, [prevTradeDate])

  const onDateChange = useCallback(
    (d: string) => {
      setSelectedDate(d)
      const today = calendar?.status.trade_date
      if (today && d === today && calendar.status.live_allowed) {
        setViewKind('live')
      } else {
        setViewKind('replay')
      }
    },
    [calendar],
  )

  const refresh = useCallback(async () => {
    if (!selectedDate || refreshing) return
    setRefreshing(true)
    try {
      if (viewKind === 'live') {
        // SSE/poll will refresh; optionally nudge latest via re-enable is enough
        const hist = await fetchLimitHistory(selectedDate).catch(() => null)
        if (hist) setHistory(hist.items)
      } else {
        const [snap, hist] = await Promise.all([
          fetchReplayRank(selectedDate, { refresh: true }),
          fetchLimitHistory(selectedDate).catch(() => ({
            trade_date: selectedDate,
            count: 0,
            items: [] as LimitHistoryItem[],
          })),
        ])
        setReplaySnap(snap)
        setHistory(hist.items)
      }
      if (prevTradeDate) {
        const prev = await fetchLimitHistory(prevTradeDate).catch(() => null)
        if (prev) setPrevHistory(prev.items)
      }
    } catch (e) {
      setBootError((e as Error).message)
    } finally {
      setRefreshing(false)
    }
  }, [selectedDate, viewKind, refreshing, prevTradeDate])

  const stocks = useMemo(() => adaptStocks(snapshot, history), [snapshot, history])
  /** 上一交易日 U 类涨停（「全部」Tab） */
  const yesterdayStocks = useMemo(
    () => adaptHistoryLimitUps(prevHistory, { onlyU: true, rank: snapshot?.rank }),
    [prevHistory, snapshot?.rank],
  )
  const stats = useMemo(() => adaptStats(snapshot), [snapshot])
  const sectorHeat = useMemo(() => adaptSectorHeat(snapshot), [snapshot])
  const sectorDetail = useMemo(() => adaptSectorDetail(snapshot), [snapshot])
  const conceptCatalog = useMemo(() => adaptConceptCatalog(snapshot), [snapshot])
  const ladder = useMemo(() => adaptLadder(history), [history])
  const strong = useMemo(() => adaptStrong(snapshot), [snapshot])
  const sentiment = useMemo(() => adaptSentiment(snapshot), [snapshot])

  const statusMessage =
    snapshot?.meta.message ||
    calendar?.status.message ||
    (viewKind === 'live' ? '交易中' : '历史回看')

  return {
    calendar,
    selectedDate,
    onDateChange,
    viewKind,
    setViewKind,
    stocks,
    yesterdayStocks,
    prevTradeDate,
    stats,
    sectorHeat,
    sectorDetail,
    conceptCatalog,
    ladder,
    strong,
    sentiment,
    history,
    loading,
    refreshing,
    refresh,
    bootError,
    feedError: live.error,
    connectionMode: viewKind === 'live' ? live.mode : 'replay',
    statusMessage,
    meta: snapshot?.meta ?? null,
  }
}
