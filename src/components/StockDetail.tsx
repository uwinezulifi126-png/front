import { useEffect, useState } from 'react'
import { fetchKline } from '../api/client'
import type { WatchInput } from '../hooks/useWatchlist'
import type { KlineBar, Stock } from '../types'
import { KlineChart } from './KlineChart'
import { WatchToggle } from './WatchToggle'

/** Refresh live today bar while detail stays open (backend overlays rt_k). */
const KLINE_LIVE_POLL_MS = 30_000

/** Minimal identity for K-line fetch; full Stock also works. */
export type StockDetailStock = Pick<Stock, 'tsCode' | 'code' | 'name'>

type StockDetailProps = {
  stock: StockDetailStock
  onClose: () => void
  chartHeight?: number
  showWatchIcon?: boolean
  watched?: boolean
  onToggleWatch?: (stock: WatchInput) => void
}

export function StockDetail({
  stock,
  onClose,
  chartHeight = 300,
  showWatchIcon = false,
  watched = false,
  onToggleWatch,
}: StockDetailProps) {
  const [bars, setBars] = useState<KlineBar[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [liveToday, setLiveToday] = useState(false)

  useEffect(() => {
    let cancelled = false
    let pollTimer: ReturnType<typeof setInterval> | null = null
    let ac: AbortController | null = null
    const liveRef = { current: false }

    const load = (opts?: { silent?: boolean }) => {
      ac?.abort()
      ac = new AbortController()
      const signal = ac.signal
      if (!opts?.silent) {
        setLoading(true)
        setError(null)
        setBars([])
        setLiveToday(false)
        liveRef.current = false
      }
      return fetchKline(stock.tsCode, { limit: 120, signal })
        .then((res) => {
          if (cancelled || signal.aborted) return
          setBars(res.items)
          liveRef.current = Boolean(res.liveToday)
          setLiveToday(liveRef.current)
          setLoading(false)
        })
        .catch((err: unknown) => {
          if (cancelled || signal.aborted) return
          if (opts?.silent) return
          setError(err instanceof Error ? err.message : 'K线加载失败')
          setLoading(false)
        })
    }

    void load().then(() => {
      if (cancelled) return
      pollTimer = setInterval(() => {
        if (!liveRef.current) return
        void load({ silent: true })
      }, KLINE_LIVE_POLL_MS)
    })

    return () => {
      cancelled = true
      ac?.abort()
      if (pollTimer) clearInterval(pollTimer)
    }
  }, [stock.tsCode])

  const last = bars.length > 0 ? bars[bars.length - 1] : null

  return (
    <div className="stock-detail">
      <div className="stock-detail-head">
        <div>
          <div className="stock-detail-title">
            <span className="mono">{stock.code}</span>
            <span>{stock.name}</span>
            {showWatchIcon && onToggleWatch ? (
              <WatchToggle
                variant="star"
                className="stock-detail-watch"
                stock={stock}
                watched={watched}
                onToggle={onToggleWatch}
              />
            ) : null}
            <span className="mono muted">{stock.tsCode}</span>
          </div>
          <div className="stock-detail-meta mono">
            {last ? (
              <>
                <span className={last.close >= last.open ? 'up' : 'down'}>
                  {last.close.toFixed(2)}
                </span>
                {last.pctChg != null && (
                  <span className={last.pctChg >= 0 ? 'up' : 'down'}>
                    {last.pctChg >= 0 ? '+' : ''}
                    {last.pctChg.toFixed(2)}%
                  </span>
                )}
                <span className="muted">
                  日线 · 未复权 · 近 {bars.length} 根
                  {liveToday ? ' · 今日实时（盘中）' : ''}
                </span>
              </>
            ) : (
              <span className="muted">日线 K 线</span>
            )}
          </div>
        </div>
        <button
          type="button"
          className="stock-detail-close"
          onClick={(e) => {
            e.stopPropagation()
            onClose()
          }}
        >
          关闭
        </button>
      </div>

      {loading ? (
        <div className="stock-detail-empty mono">加载 K 线…</div>
      ) : error ? (
        <div className="stock-detail-empty mono">{error}</div>
      ) : bars.length === 0 ? (
        <div className="stock-detail-empty mono">
          暂无日线数据，请先同步：python -m jobs.sync_daily_kline --days 60
        </div>
      ) : (
        <KlineChart bars={bars} tsCode={stock.tsCode} height={chartHeight} />
      )}
    </div>
  )
}
