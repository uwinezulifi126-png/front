import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchCalendar, fetchLimitHistory, fetchReplayRank } from '../api/client'
import {
  adaptConceptCatalog,
  adaptHistoryLimitUps,
  adaptLadder,
  adaptMovers,
  adaptSectorDetail,
  adaptSectorHeat,
  adaptSentiment,
  adaptStats,
  adaptStocks,
  adaptStrong,
} from '../models/adapt'
import type { CalendarResponse, LimitHistoryItem, RankSnapshot } from '../models/apiTypes'
import { resolveYestLimitTradeDate } from '../utils/tradeDate'
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

  // 「昨日涨停」: today view uses backend 09:00 rollover date; replay stays relative.
  const prevTradeDate = useMemo(() => {
    if (!selectedDate) return null
    return resolveYestLimitTradeDate({
      selected: selectedDate,
      dates: calendar?.dates ?? [],
      today: calendar?.status.trade_date,
      yestLimitTradeDate:
        calendar?.status.yest_limit_trade_date ??
        snapshot?.meta.yest_limit_trade_date ??
        null,
      fallbackPrev:
        snapshot?.meta.prev_trade_date ?? calendar?.status.prev_trade_date ?? null,
    })
  }, [
    selectedDate,
    calendar?.dates,
    calendar?.status.trade_date,
    calendar?.status.yest_limit_trade_date,
    calendar?.status.prev_trade_date,
    snapshot?.meta.yest_limit_trade_date,
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

  // Poll calendar so yest_limit_trade_date flips at open-day 09:00 without reload
  useEffect(() => {
    if (!calendar) return
    const ac = new AbortController()
    const tick = () => {
      fetchCalendar(800, ac.signal)
        .then((cal) => setCalendar(cal))
        .catch(() => {
          /* keep last calendar */
        })
    }
    // ~60s near rollover window; otherwise every 5 min
    let ticks = 0
    const id = window.setInterval(() => {
      ticks += 1
      const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Shanghai',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).formatToParts(new Date())
      const hh = Number(parts.find((p) => p.type === 'hour')?.value ?? '0')
      const mm = Number(parts.find((p) => p.type === 'minute')?.value ?? '0')
      const mins = hh * 60 + mm
      // 08:50–09:15: every minute; else every 5th tick (~5 min)
      const nearRollover = mins >= 8 * 60 + 50 && mins <= 9 * 60 + 15
      if (nearRollover || ticks % 5 === 0) tick()
    }, 60_000)
    return () => {
      ac.abort()
      window.clearInterval(id)
    }
  }, [calendar?.status.trade_date])

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

  // Live mode: today's limit-history once per date (empty until EOD).
  // Do not refetch on every rank SSE tick — pct comes from the snapshot.
  useEffect(() => {
    if (viewKind !== 'live' || !selectedDate) return
    const ac = new AbortController()
    fetchLimitHistory(selectedDate, ac.signal)
      .then((h) => setHistory(h.items))
      .catch(() => setHistory([]))
    return () => ac.abort()
  }, [viewKind, selectedDate])

  // 「昨日涨停」Tab：U 类涨停历史（日期由 09:00 rollover / 复盘相对日决定）
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
      const cal = await fetchCalendar(800).catch(() => null)
      if (cal) setCalendar(cal)
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
      const yestDate = resolveYestLimitTradeDate({
        selected: selectedDate,
        dates: (cal ?? calendar)?.dates ?? [],
        today: (cal ?? calendar)?.status.trade_date,
        yestLimitTradeDate:
          (cal ?? calendar)?.status.yest_limit_trade_date ??
          snapshot?.meta.yest_limit_trade_date ??
          null,
        fallbackPrev:
          snapshot?.meta.prev_trade_date ??
          (cal ?? calendar)?.status.prev_trade_date ??
          null,
      })
      if (yestDate) {
        const prev = await fetchLimitHistory(yestDate).catch(() => null)
        if (prev) setPrevHistory(prev.items)
      }
    } catch (e) {
      setBootError((e as Error).message)
    } finally {
      setRefreshing(false)
    }
  }, [selectedDate, viewKind, refreshing, calendar, snapshot])

  const stocks = useMemo(() => adaptStocks(snapshot, history), [snapshot, history])
  /** 上一交易日 U 类涨停（「昨日涨停」Tab）；涨幅/现价叠加热快照 yest_limit_quotes */
  const yesterdayStocks = useMemo(
    () => adaptHistoryLimitUps(prevHistory, { onlyU: true, snapshot }),
    [prevHistory, snapshot],
  )
  const stats = useMemo(() => adaptStats(snapshot), [snapshot])
  const sectorHeat = useMemo(() => adaptSectorHeat(snapshot), [snapshot])
  const sectorDetail = useMemo(() => adaptSectorDetail(snapshot), [snapshot])
  const conceptCatalog = useMemo(() => adaptConceptCatalog(snapshot), [snapshot])
  // 盘中当日 limit-history 多半为空：用 live 封板 + 昨日 U 推算连板
  const ladder = useMemo(
    () => adaptLadder(history, { snapshot, prevHistory }),
    [history, snapshot, prevHistory],
  )
  const strong = useMemo(() => adaptStrong(snapshot), [snapshot])
  const movers = useMemo(() => adaptMovers(snapshot), [snapshot])
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
    movers,
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
    snapshot,
  }
}
