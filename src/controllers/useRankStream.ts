import { useEffect, useRef, useState } from 'react'
import { fetchLatestRank } from '../api/client'
import { endpoints, POLL_INTERVAL_MS } from '../api/config'
import { parseSseData } from '../models/normalize'
import type { ConnectionMode, RankSnapshot } from '../models/apiTypes'

interface RankStreamState {
  snapshot: RankSnapshot | null
  mode: ConnectionMode
  error: string | null
  lastUpdatedAt: number | null
}

const INITIAL: RankStreamState = {
  snapshot: null,
  mode: 'idle',
  error: null,
  lastUpdatedAt: null,
}

/** Live SSE + poll fallback. Disabled for replay / closed. */
export function useRankStream(enabled: boolean): RankStreamState {
  const [state, setState] = useState<RankStreamState>(INITIAL)
  const versionRef = useRef<string | number | null>(null)

  useEffect(() => {
    if (!enabled) {
      versionRef.current = null
      setState((prev) => ({ ...prev, mode: 'idle', error: null }))
      return
    }

    let cancelled = false
    let es: EventSource | null = null
    let pollTimer: ReturnType<typeof setInterval> | null = null
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null
    let abort: AbortController | null = null

    const applySnapshot = (snapshot: RankSnapshot, mode: ConnectionMode) => {
      if (cancelled) return
      if (snapshot.meta.live_allowed === false || snapshot.meta.mode === 'closed') {
        versionRef.current = snapshot.meta.version ?? null
        setState({ snapshot, mode: 'closed', error: null, lastUpdatedAt: Date.now() })
        return
      }
      const v = snapshot.meta.version ?? null
      if (v != null && versionRef.current === v) {
        setState((prev) => ({ ...prev, mode, error: null }))
        return
      }
      versionRef.current = v
      setState({ snapshot, mode, error: null, lastUpdatedAt: Date.now() })
    }

    const stopPolling = () => {
      if (pollTimer) {
        clearInterval(pollTimer)
        pollTimer = null
      }
      abort?.abort()
      abort = null
    }

    const pollOnce = async (mode: ConnectionMode) => {
      abort?.abort()
      abort = new AbortController()
      try {
        const snap = await fetchLatestRank(abort.signal)
        applySnapshot(snap, mode)
      } catch (err) {
        if ((err as Error).name === 'AbortError') return
        if (!cancelled) {
          setState((prev) => ({
            ...prev,
            mode: 'error',
            error: (err as Error).message || '轮询失败',
          }))
        }
      }
    }

    const startPolling = () => {
      if (cancelled || pollTimer) return
      void pollOnce('polling')
      pollTimer = setInterval(() => void pollOnce('polling'), POLL_INTERVAL_MS)
    }

    const connectSse = () => {
      if (cancelled) return
      stopPolling()
      es?.close()
      es = new EventSource(endpoints.stream)

      es.onopen = () => {
        if (!cancelled) setState((prev) => ({ ...prev, mode: 'sse', error: null }))
      }

      const onPayload = (raw: string) => {
        const snap = parseSseData(raw)
        if (snap) applySnapshot(snap, 'sse')
      }

      es.onmessage = (ev) => onPayload(ev.data)
      es.addEventListener('rank', (ev) => onPayload((ev as MessageEvent).data))
      es.addEventListener('ping', () => {})

      es.onerror = () => {
        if (cancelled) return
        es?.close()
        es = null
        setState((prev) => ({
          ...prev,
          mode: 'polling',
          error: 'SSE 断开，已切换轮询',
        }))
        startPolling()
        if (reconnectTimer) clearTimeout(reconnectTimer)
        reconnectTimer = setTimeout(() => {
          if (cancelled) return
          stopPolling()
          connectSse()
        }, POLL_INTERVAL_MS)
      }
    }

    setState((prev) => ({ ...prev, mode: 'connecting', error: null }))
    void pollOnce('connecting').finally(() => {
      if (!cancelled) connectSse()
    })

    return () => {
      cancelled = true
      es?.close()
      stopPolling()
      if (reconnectTimer) clearTimeout(reconnectTimer)
    }
  }, [enabled])

  return state
}
