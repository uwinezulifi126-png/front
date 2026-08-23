import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react'
import type { Stock } from '../types'
import type { WatchlistApi } from '../hooks/useWatchlist'
import { useWatchlistAlert } from '../hooks/useWatchlistAlert'
import { AlertPanel } from './AlertPanel'
import { WatchToggle } from './WatchToggle'

const FLOAT_W = 320
const FLOAT_H = 380
const MARGIN = 12

type FloatTab = 'watch' | 'alert'

function defaultPos(): { x: number; y: number } {
  if (typeof window === 'undefined') return { x: MARGIN, y: MARGIN }
  return {
    x: Math.max(MARGIN, window.innerWidth - FLOAT_W - MARGIN),
    y: Math.max(MARGIN, window.innerHeight - FLOAT_H - 48),
  }
}

function clampPos(x: number, y: number): { x: number; y: number } {
  const maxX = Math.max(MARGIN, window.innerWidth - FLOAT_W - MARGIN)
  const maxY = Math.max(MARGIN, window.innerHeight - 80)
  return {
    x: Math.min(maxX, Math.max(MARGIN, x)),
    y: Math.min(maxY, Math.max(MARGIN, y)),
  }
}

type WatchlistFloatProps = {
  watchlist: WatchlistApi
  quoteStocks: Stock[]
  selectedDate: string
  isLive: boolean
}

export function WatchlistFloat({
  watchlist,
  quoteStocks,
  selectedDate,
  isLive,
}: WatchlistFloatProps) {
  const { floatState, updateFloat, closeFloat } = watchlist
  const { flashing: alertFlashing, dismissFlash } = useWatchlistAlert({
    enabled: floatState.open,
    items: watchlist.items,
    quoteStocks,
  })
  const dragRef = useRef<{ ox: number; oy: number; sx: number; sy: number } | null>(null)
  const [activeTab, setActiveTab] = useState<FloatTab>('watch')
  const [pos, setPos] = useState(() => {
    if (floatState.x >= 0 && floatState.y >= 0) return clampPos(floatState.x, floatState.y)
    return defaultPos()
  })

  useEffect(() => {
    if (floatState.x >= 0 && floatState.y >= 0) {
      setPos(clampPos(floatState.x, floatState.y))
    }
  }, [floatState.x, floatState.y])

  useEffect(() => {
    const onResize = () => setPos((p) => clampPos(p.x, p.y))
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  if (!floatState.open) return null

  const quoteByCode = new Map<string, Stock>()
  for (const s of quoteStocks) {
    quoteByCode.set(s.tsCode, s)
    quoteByCode.set(s.code, s)
  }

  const onFloatInteract = () => {
    if (alertFlashing) dismissFlash()
  }

  const onDragStart = (e: ReactMouseEvent) => {
    onFloatInteract()
    if ((e.target as HTMLElement).closest('button')) return
    e.preventDefault()
    dragRef.current = { ox: e.clientX, oy: e.clientY, sx: pos.x, sy: pos.y }

    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current) return
      const next = clampPos(
        dragRef.current.sx + (ev.clientX - dragRef.current.ox),
        dragRef.current.sy + (ev.clientY - dragRef.current.oy),
      )
      setPos(next)
    }
    const onUp = () => {
      dragRef.current = null
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      setPos((p) => {
        const c = clampPos(p.x, p.y)
        updateFloat({ x: c.x, y: c.y })
        return c
      })
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  const snapCorner = (corner: 'br' | 'tr') => {
    const x = Math.max(MARGIN, window.innerWidth - FLOAT_W - MARGIN)
    const y =
      corner === 'tr'
        ? MARGIN + 56
        : Math.max(MARGIN, window.innerHeight - FLOAT_H - 48)
    const next = clampPos(x, y)
    setPos(next)
    updateFloat({ x: next.x, y: next.y })
  }

  return (
    <div
      className={`watch-float${alertFlashing ? ' alert-flash' : ''}`}
      style={{ left: pos.x, top: pos.y, width: FLOAT_W }}
      tabIndex={-1}
      onClick={onFloatInteract}
      onFocus={onFloatInteract}
    >
      <div className="watch-float-head" onMouseDown={onDragStart}>
        <div className="watch-float-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'watch'}
            className={`watch-float-tab${activeTab === 'watch' ? ' active' : ''}`}
            onClick={() => setActiveTab('watch')}
          >
            自选 ({watchlist.count})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'alert'}
            className={`watch-float-tab${activeTab === 'alert' ? ' active' : ''}`}
            onClick={() => setActiveTab('alert')}
          >
            实时预警
          </button>
        </div>
        <div className="watch-float-actions">
          <button type="button" title="固定右上" onClick={() => snapCorner('tr')}>
            ↗
          </button>
          <button type="button" title="固定右下" onClick={() => snapCorner('br')}>
            ↘
          </button>
          <button type="button" title="关闭" onClick={closeFloat}>
            ✕
          </button>
        </div>
      </div>
      <div className="watch-float-body">
        {activeTab === 'watch' ? (
          <div className="watch-float-watch">
            {watchlist.items.length === 0 ? (
              <div className="watch-float-empty mono muted">暂无自选</div>
            ) : (
              <table className="data-table compact watch-float-table">
                <thead>
                  <tr>
                    <th className="text-left">名称</th>
                    <th className="text-right">现价</th>
                    <th className="text-right">涨幅</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {watchlist.items.map((item) => {
                    const q = quoteByCode.get(item.tsCode) ?? quoteByCode.get(item.code)
                    const pct = q?.pct
                    return (
                      <tr key={item.tsCode}>
                        <td className="text-left">
                          <div className="name">{item.name}</div>
                          <div className="mono muted" style={{ fontSize: 11 }}>
                            {item.code}
                          </div>
                        </td>
                        <td className="mono text-right up-bright">
                          {q?.price ? q.price.toFixed(2) : '—'}
                        </td>
                        <td
                          className={`mono text-right${
                            pct != null && pct !== 0 ? (pct > 0 ? ' up' : ' down') : ''
                          }`}
                        >
                          {pct != null
                            ? `${pct > 0 ? '+' : ''}${pct.toFixed(2)}%`
                            : '—'}
                        </td>
                        <td className="text-center">
                          <WatchToggle
                            variant="star"
                            stock={item}
                            watched
                            onToggle={() => watchlist.remove(item.tsCode)}
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        ) : (
          <AlertPanel
            compact
            className="watch-float-alerts"
            selectedDate={selectedDate}
            isLive={isLive}
          />
        )}
      </div>
    </div>
  )
}
