import { useEffect, useMemo, useState } from 'react'
import { fetchQuotes } from '../api/client'
import { POLL_INTERVAL_MS } from '../api/config'
import { amountYi, circMvYiOrNull, quotesFromSnapshot } from '../models/adapt'
import type { RankSnapshot } from '../models/apiTypes'
import type { Stock } from '../types'
import type { WatchlistItem } from '../utils/watchlist'

function emptyStock(item: WatchlistItem, quote: Partial<Stock>): Stock {
  return {
    code: item.code,
    tsCode: item.tsCode,
    name: quote.name || item.name,
    price: quote.price ?? 0,
    change: 0,
    pct: quote.pct ?? 0,
    volume: 0,
    amount: quote.amount ?? 0,
    limitTime: '—',
    opens: 0,
    sector: quote.sector || '',
    status: 'open',
    strength: null,
    bidAmount: null,
    riseSpeed: null,
    mktCap: quote.mktCap ?? null,
    concepts: quote.concepts ?? [],
  }
}

/**
 * Watchlist quotes: overlay snapshot pools immediately, then batch-fetch
 * remaining codes from `/api/quotes` (rt_k map / snapshot / daily + basics).
 */
export function useWatchlistQuotes(opts: {
  items: WatchlistItem[]
  snapshot: RankSnapshot | null
  enabled: boolean
}): Stock[] {
  const { items, snapshot, enabled } = opts
  const snapshotQuotes = useMemo(() => quotesFromSnapshot(snapshot), [snapshot])
  const tsKey = items.map((it) => it.tsCode).join(',')
  const [extra, setExtra] = useState<Stock[]>([])

  useEffect(() => {
    if (!enabled || !tsKey) {
      setExtra([])
      return
    }
    const codes = tsKey.split(',').filter(Boolean)
    const ac = new AbortController()
    const tick = () => {
      fetchQuotes(codes, { signal: ac.signal })
        .then((rows) => {
          const byCode = new Map<string, Stock>()
          for (const q of rows) {
            const price = q.close
            const pct = q.pctChg
            if (price == null && pct == null) continue
            const stock: Stock = {
              code: q.code,
              tsCode: q.tsCode,
              name: q.name || q.code,
              price: price ?? 0,
              change: 0,
              pct: pct ?? 0,
              volume: 0,
              amount: amountYi(q.amount),
              limitTime: '—',
              opens: 0,
              sector: '',
              status: 'open',
              strength: null,
              bidAmount: null,
              riseSpeed: null,
              mktCap: circMvYiOrNull(q.circMv),
              concepts: q.concepts ?? [],
            }
            byCode.set(q.tsCode, stock)
            byCode.set(q.code, stock)
          }
          const next: Stock[] = []
          const seen = new Set<string>()
          for (const stock of byCode.values()) {
            if (seen.has(stock.tsCode)) continue
            seen.add(stock.tsCode)
            next.push(stock)
          }
          setExtra(next)
        })
        .catch(() => {
          /* keep last extra quotes */
        })
    }
    tick()
    const id = window.setInterval(tick, POLL_INTERVAL_MS)
    return () => {
      ac.abort()
      window.clearInterval(id)
    }
  }, [enabled, tsKey])

  return useMemo(() => {
    const map = new Map<string, Stock>()
    const put = (s: Stock) => {
      const ts = s.tsCode?.toUpperCase()
      const code = s.code?.toUpperCase()
      const prev = (ts ? map.get(ts) : undefined) ?? (code ? map.get(code) : undefined)
      let merged = s
      if (prev) {
        const sector =
          (!s.sector || s.sector === '—') && prev.sector && prev.sector !== '—'
            ? prev.sector
            : s.sector
        const mktCap =
          s.mktCap != null && s.mktCap > 0 ? s.mktCap : (prev.mktCap ?? null)
        const amount = s.amount > 0 ? s.amount : (prev.amount ?? 0)
        const concepts =
          s.concepts && s.concepts.length > 0 ? s.concepts : (prev.concepts ?? [])
        merged = { ...s, sector, mktCap, amount, concepts }
      }
      if (ts) map.set(ts, merged)
      if (code) map.set(code, merged)
    }
    for (const s of snapshotQuotes) put(s)
    // `/api/quotes` is always today's session (rt_k / daily) — wins over replay snapshot
    for (const s of extra) put(s)

    const out: Stock[] = []
    const seen = new Set<string>()
    for (const item of items) {
      const q =
        map.get(item.tsCode.toUpperCase()) ?? map.get(item.code.toUpperCase())
      const key = item.tsCode.toUpperCase()
      if (seen.has(key)) continue
      seen.add(key)
      out.push(emptyStock(item, q ?? {}))
    }
    return out
  }, [items, extra, snapshotQuotes])
}
