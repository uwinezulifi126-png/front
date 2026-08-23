import { useCallback, useEffect, useRef, useState } from 'react'
import type { Stock } from '../types'
import type { WatchlistItem } from '../utils/watchlist'

const THRESHOLD_PCT = 8
const COOLDOWN_MS = 3 * 60 * 1000
const FLASH_MS = 30_000

/**
 * Flash the watchlist float when a watched stock crosses above 8% gain
 * (prev <= 8%, now > 8%). Per-stock cooldown: 3 minutes between flashes.
 * Only active while `enabled` (float popup open).
 */
export function useWatchlistAlert(opts: {
  enabled: boolean
  items: WatchlistItem[]
  quoteStocks: Stock[]
}): { flashing: boolean; dismissFlash: () => void } {
  const { enabled, items, quoteStocks } = opts
  const [flashing, setFlashing] = useState(false)
  const prevPctRef = useRef<Map<string, number>>(new Map())
  const lastAlertAtRef = useRef<Map<string, number>>(new Map())
  const flashTimerRef = useRef<number | null>(null)

  const dismissFlash = useCallback(() => {
    if (flashTimerRef.current) {
      window.clearTimeout(flashTimerRef.current)
      flashTimerRef.current = null
    }
    setFlashing(false)
  }, [])

  useEffect(() => {
    if (!enabled) {
      prevPctRef.current.clear()
      return
    }

    const quoteByCode = new Map<string, number>()
    for (const s of quoteStocks) {
      if (s.pct != null && Number.isFinite(s.pct)) {
        quoteByCode.set(s.tsCode, s.pct)
        quoteByCode.set(s.code, s.pct)
      }
    }

    let triggered = false
    const now = Date.now()

    for (const item of items) {
      const pct = quoteByCode.get(item.tsCode) ?? quoteByCode.get(item.code)
      if (pct == null || !Number.isFinite(pct)) continue

      const prev = prevPctRef.current.get(item.tsCode)
      if (prev === undefined) {
        prevPctRef.current.set(item.tsCode, pct)
        continue
      }

      prevPctRef.current.set(item.tsCode, pct)

      const crossed = prev <= THRESHOLD_PCT && pct > THRESHOLD_PCT
      if (!crossed) continue

      const lastAlert = lastAlertAtRef.current.get(item.tsCode) ?? 0
      if (now - lastAlert < COOLDOWN_MS) continue

      lastAlertAtRef.current.set(item.tsCode, now)
      triggered = true
    }

    if (triggered) {
      setFlashing(true)
      if (flashTimerRef.current) window.clearTimeout(flashTimerRef.current)
      flashTimerRef.current = window.setTimeout(() => {
        setFlashing(false)
        flashTimerRef.current = null
      }, FLASH_MS)
    }
  }, [enabled, items, quoteStocks])

  useEffect(() => {
    return () => {
      if (flashTimerRef.current) window.clearTimeout(flashTimerRef.current)
    }
  }, [])

  return { flashing, dismissFlash }
}
