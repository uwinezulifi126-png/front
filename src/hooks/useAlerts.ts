import { useEffect, useState } from 'react'
import { fetchAlerts, type AlertApiItem } from '../api/client'
import { POLL_INTERVAL_MS } from '../api/config'

export function useAlerts(selectedDate: string, isLive: boolean) {
  const [items, setItems] = useState<AlertApiItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!selectedDate) {
      setItems([])
      setError(null)
      setLoading(false)
      return
    }

    let cancelled = false
    const ac = new AbortController()

    const load = (showLoading: boolean) => {
      if (showLoading) setLoading(true)
      fetchAlerts({ tradeDate: selectedDate, limit: 100, signal: ac.signal })
        .then((res) => {
          if (cancelled) return
          setItems(res.items)
          setError(null)
        })
        .catch((err: unknown) => {
          if (cancelled || ac.signal.aborted) return
          setItems([])
          setError(err instanceof Error ? err.message : '预警加载失败')
        })
        .finally(() => {
          if (!cancelled) setLoading(false)
        })
    }

    load(true)

    let timer: number | undefined
    if (isLive) {
      timer = window.setInterval(() => load(false), Math.max(3000, POLL_INTERVAL_MS))
    }

    return () => {
      cancelled = true
      ac.abort()
      if (timer != null) window.clearInterval(timer)
    }
  }, [selectedDate, isLive])

  return { items, loading, error }
}
