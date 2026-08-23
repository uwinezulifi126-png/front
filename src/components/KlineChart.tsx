import { useEffect, useRef, useState } from 'react'
import {
  AreaSeries,
  CandlestickSeries,
  ColorType,
  createChart,
  HistogramSeries,
  type AreaData,
  type CandlestickData,
  type HistogramData,
  type IChartApi,
  type ISeriesApi,
  type MouseEventParams,
  type Time,
  type UTCTimestamp,
} from 'lightweight-charts'
import { fetchIntraday } from '../api/client'
import type { IntradayPoint, KlineBar } from '../types'
import { isLimitUpClose, resolvePreClose } from '../utils/limitUp'

const UP_COLOR = '#f85149'
const DOWN_COLOR = '#3fb950'
const LIMIT_UP_BORDER_COLOR = '#a855f7'
const HOLLOW_FILL = 'rgba(0,0,0,0)'
const INTRADAY_DEBOUNCE_MS = 400

type KlineChartProps = {
  bars: KlineBar[]
  tsCode: string
  /** Stock name for ST 5% limit-up rule */
  name?: string | null
  height?: number
}

type TooltipState = {
  left: number
  top: number
  bar: KlineBar
}

type IntradayPanelState = {
  left: number
  top: number
  tradeDate: string
  status: 'loading' | 'ready' | 'empty' | 'error'
  items: IntradayPoint[]
  message: string | null
}

/** Normalize trade date to YYYY-MM-DD for chart time keys. */
function toTimeKey(tradeDate: string): string {
  const digits = tradeDate.replace(/-/g, '').slice(0, 8)
  if (digits.length === 8 && /^\d{8}$/.test(digits)) {
    return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`
  }
  return tradeDate.slice(0, 10)
}

function toYmd(tradeDate: string): string {
  return tradeDate.replace(/-/g, '').slice(0, 8)
}

function toCandleData(
  bars: KlineBar[],
  tsCode: string,
  name?: string | null,
): CandlestickData<Time>[] {
  let prevClose: number | null = null
  const out: CandlestickData<Time>[] = []
  for (const b of bars) {
    const preClose = resolvePreClose(b, prevClose)
    const base: CandlestickData<Time> = {
      time: toTimeKey(b.tradeDate) as Time,
      open: b.open,
      high: b.high,
      low: b.low,
      close: b.close,
    }
    if (preClose != null && isLimitUpClose(tsCode, b.close, preClose, name)) {
      out.push({
        ...base,
        color: HOLLOW_FILL,
        borderColor: LIMIT_UP_BORDER_COLOR,
        wickColor: LIMIT_UP_BORDER_COLOR,
      })
    } else {
      out.push(base)
    }
    prevClose = b.close
  }
  return out
}

function toVolumeData(bars: KlineBar[]): HistogramData<Time>[] {
  return bars.map((b) => ({
    time: toTimeKey(b.tradeDate) as Time,
    value: b.volume ?? 0,
    color: b.close >= b.open ? UP_COLOR : DOWN_COLOR,
  }))
}

/** Parse "YYYY-MM-DD HH:mm:ss" as Asia/Shanghai wall time → UTCTimestamp. */
function tradeTimeToUtcTs(text: string): UTCTimestamp | null {
  const m = text
    .trim()
    .replace('T', ' ')
    .match(/^(\d{4})-(\d{2})-(\d{2})[ ](\d{2}):(\d{2})(?::(\d{2}))?/)
  if (!m) return null
  const y = Number(m[1])
  const mo = Number(m[2])
  const d = Number(m[3])
  const h = Number(m[4])
  const mi = Number(m[5])
  const s = Number(m[6] ?? '0')
  // Asia/Shanghai = UTC+8 (no DST)
  const ms = Date.UTC(y, mo - 1, d, h - 8, mi, s)
  if (!Number.isFinite(ms)) return null
  return Math.floor(ms / 1000) as UTCTimestamp
}

function toAreaData(items: IntradayPoint[]): AreaData<Time>[] {
  const out: AreaData<Time>[] = []
  for (const p of items) {
    const t = tradeTimeToUtcTs(p.time)
    if (t == null) continue
    out.push({ time: t, value: p.price })
  }
  return out
}

/** Tushare daily amount unit: 千元 → readable 亿 / 万 / 元. */
function formatAmount(amount: number | null): string {
  if (amount == null || !Number.isFinite(amount)) return '—'
  const yuan = amount * 1000
  if (Math.abs(yuan) >= 1e8) return `${(yuan / 1e8).toFixed(2)} 亿`
  if (Math.abs(yuan) >= 1e4) return `${(yuan / 1e4).toFixed(2)} 万`
  return `${yuan.toFixed(0)} 元`
}

/** Tushare daily vol unit: 手. */
function formatVolume(volume: number | null): string {
  if (volume == null || !Number.isFinite(volume)) return '—'
  if (Math.abs(volume) >= 1e4) return `${(volume / 1e4).toFixed(2)} 万手`
  return `${volume.toFixed(0)} 手`
}

function formatPct(pct: number | null): string {
  if (pct == null || !Number.isFinite(pct)) return '—'
  const sign = pct > 0 ? '+' : ''
  return `${sign}${pct.toFixed(2)}%`
}

function formatPrice(n: number): string {
  return n.toFixed(2)
}

function IntradayMiniChart({ items }: { items: IntradayPoint[] }) {
  const hostRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const el = hostRef.current
    if (!el || items.length === 0) return

    const chart = createChart(el, {
      height: 120,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#8b949e',
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: 'rgba(255,255,255,0.04)' },
        horzLines: { color: 'rgba(255,255,255,0.04)' },
      },
      rightPriceScale: {
        borderVisible: false,
        scaleMargins: { top: 0.08, bottom: 0.08 },
      },
      timeScale: {
        borderVisible: false,
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: {
        mode: 0,
        vertLine: { visible: false },
        horzLine: { visible: false },
      },
      handleScroll: false,
      handleScale: false,
    })

    const first = items[0]?.price
    const last = items[items.length - 1]?.price
    const up = first != null && last != null ? last >= first : true
    const lineColor = up ? UP_COLOR : DOWN_COLOR
    const series = chart.addSeries(AreaSeries, {
      lineColor,
      topColor: up ? 'rgba(248, 81, 73, 0.35)' : 'rgba(63, 185, 80, 0.35)',
      bottomColor: 'rgba(0,0,0,0)',
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
    })
    series.setData(toAreaData(items))
    chart.timeScale().fitContent()
    chart.applyOptions({ width: el.clientWidth })

    const ro = new ResizeObserver(() => {
      if (!hostRef.current) return
      chart.applyOptions({ width: hostRef.current.clientWidth })
    })
    ro.observe(el)

    return () => {
      ro.disconnect()
      chart.remove()
    }
  }, [items])

  return <div className="kline-intraday-chart" ref={hostRef} />
}

export function KlineChart({ bars, tsCode, name, height = 300 }: KlineChartProps) {
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const hostRef = useRef<HTMLDivElement | null>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const candleRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const volumeRef = useRef<ISeriesApi<'Histogram'> | null>(null)
  const barsByTimeRef = useRef<Map<string, KlineBar>>(new Map())
  const cacheRef = useRef<Map<string, IntradayPoint[]>>(new Map())
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const hoverKeyRef = useRef<string | null>(null)
  const fittedLenRef = useRef(0)
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)
  const [intraday, setIntraday] = useState<IntradayPanelState | null>(null)

  useEffect(() => {
    const map = new Map<string, KlineBar>()
    for (const b of bars) {
      map.set(toTimeKey(b.tradeDate), b)
    }
    barsByTimeRef.current = map
  }, [bars])

  useEffect(() => {
    cacheRef.current.clear()
    setIntraday(null)
    setTooltip(null)
    fittedLenRef.current = 0
  }, [tsCode])

  useEffect(() => {
    const el = hostRef.current
    if (!el) return

    const chart = createChart(el, {
      height,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#8b949e',
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: 'rgba(255,255,255,0.04)' },
        horzLines: { color: 'rgba(255,255,255,0.04)' },
      },
      rightPriceScale: {
        borderColor: 'rgba(255,255,255,0.08)',
      },
      timeScale: {
        borderColor: 'rgba(255,255,255,0.08)',
        timeVisible: false,
      },
      crosshair: {
        mode: 0,
      },
    })

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: UP_COLOR,
      downColor: DOWN_COLOR,
      borderUpColor: UP_COLOR,
      borderDownColor: DOWN_COLOR,
      wickUpColor: UP_COLOR,
      wickDownColor: DOWN_COLOR,
    })

    const volumeSeries = chart.addSeries(
      HistogramSeries,
      {
        priceFormat: { type: 'volume' },
        priceScaleId: 'volume',
      },
      1,
    )
    volumeSeries.priceScale().applyOptions({
      borderColor: 'rgba(255,255,255,0.08)',
      scaleMargins: { top: 0.1, bottom: 0 },
    })

    const panes = chart.panes()
    panes[0]?.setStretchFactor(0.7)
    panes[1]?.setStretchFactor(0.3)

    chartRef.current = chart
    candleRef.current = candleSeries
    volumeRef.current = volumeSeries

    const clearHoverUi = () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
        debounceRef.current = null
      }
      abortRef.current?.abort()
      abortRef.current = null
      hoverKeyRef.current = null
      setTooltip(null)
      setIntraday(null)
    }

    const scheduleIntraday = (bar: KlineBar, left: number, top: number) => {
      const ymd = toYmd(bar.tradeDate)
      const cacheKey = `${tsCode}|${ymd}`
      const dateLabel = toTimeKey(bar.tradeDate)

      if (debounceRef.current) clearTimeout(debounceRef.current)
      abortRef.current?.abort()
      abortRef.current = null
      hoverKeyRef.current = cacheKey

      setIntraday({
        left,
        top,
        tradeDate: dateLabel,
        status: 'loading',
        items: [],
        message: null,
      })

      debounceRef.current = setTimeout(() => {
        if (hoverKeyRef.current !== cacheKey) return
        const ac = new AbortController()
        abortRef.current = ac
        void fetchIntraday(tsCode, ymd, { signal: ac.signal })
          .then((res) => {
            if (hoverKeyRef.current !== cacheKey) return
            cacheRef.current.set(cacheKey, res.items)
            setIntraday((prev) =>
              prev && prev.tradeDate === dateLabel
                ? {
                    ...prev,
                    status: res.items.length > 0 ? 'ready' : 'empty',
                    items: res.items,
                    message: res.items.length > 0 ? null : res.message || '暂无分时数据',
                  }
                : prev,
            )
          })
          .catch((err: unknown) => {
            if (ac.signal.aborted) return
            if (hoverKeyRef.current !== cacheKey) return
            setIntraday((prev) =>
              prev && prev.tradeDate === dateLabel
                ? {
                    ...prev,
                    status: 'error',
                    items: [],
                    message: err instanceof Error ? err.message : '分时加载失败',
                  }
                : prev,
            )
          })
      }, INTRADAY_DEBOUNCE_MS)
    }

    const onCrosshairMove = (param: MouseEventParams<Time>) => {
      if (!param.point || param.time == null) {
        clearHoverUi()
        return
      }
      const timeKey = String(param.time)
      const bar = barsByTimeRef.current.get(timeKey)
      if (!bar || !param.seriesData.has(candleSeries)) {
        clearHoverUi()
        return
      }

      const wrap = wrapRef.current
      if (!wrap) return

      const tipW = 168
      const tipH = 168
      const panelW = 280
      const panelH = 168
      const pad = 10
      let left = param.point.x + 14
      let top = param.point.y + 14
      if (left + tipW > wrap.clientWidth - pad) left = param.point.x - tipW - 10
      if (top + tipH > wrap.clientHeight - pad) top = param.point.y - tipH - 10
      if (left < pad) left = pad
      if (top < pad) top = pad

      setTooltip({ left, top, bar })

      let pLeft = left + tipW + 8
      let pTop = top
      if (pLeft + panelW > wrap.clientWidth - pad) {
        pLeft = left - panelW - 8
      }
      if (pLeft < pad) pLeft = pad
      if (pTop + panelH > wrap.clientHeight - pad) {
        pTop = Math.max(pad, wrap.clientHeight - panelH - pad)
      }

      const ymd = toYmd(bar.tradeDate)
      const cacheKey = `${tsCode}|${ymd}`
      const dateLabel = toTimeKey(bar.tradeDate)
      const cached = cacheRef.current.get(cacheKey)

      if (cached) {
        hoverKeyRef.current = cacheKey
        setIntraday({
          left: pLeft,
          top: pTop,
          tradeDate: dateLabel,
          status: cached.length > 0 ? 'ready' : 'empty',
          items: cached,
          message: cached.length > 0 ? null : '暂无分时数据',
        })
        return
      }

      if (hoverKeyRef.current === cacheKey) {
        setIntraday((prev) =>
          prev
            ? { ...prev, left: pLeft, top: pTop, tradeDate: dateLabel }
            : {
                left: pLeft,
                top: pTop,
                tradeDate: dateLabel,
                status: 'loading',
                items: [],
                message: null,
              },
        )
        return
      }

      scheduleIntraday(bar, pLeft, pTop)
    }

    chart.subscribeCrosshairMove(onCrosshairMove)

    const ro = new ResizeObserver(() => {
      if (!hostRef.current || !chartRef.current) return
      chartRef.current.applyOptions({ width: hostRef.current.clientWidth })
    })
    ro.observe(el)
    chart.applyOptions({ width: el.clientWidth })

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      abortRef.current?.abort()
      chart.unsubscribeCrosshairMove(onCrosshairMove)
      ro.disconnect()
      chart.remove()
      chartRef.current = null
      candleRef.current = null
      volumeRef.current = null
      setTooltip(null)
      setIntraday(null)
    }
  }, [height, tsCode])

  useEffect(() => {
    const candle = candleRef.current
    const volume = volumeRef.current
    const chart = chartRef.current
    if (!candle || !volume || !chart) return
    candle.setData(toCandleData(bars, tsCode, name))
    volume.setData(toVolumeData(bars))
    // Only re-fit when bar count changes (avoid zoom reset on live OHLC poll).
    if (bars.length !== fittedLenRef.current) {
      chart.timeScale().fitContent()
      fittedLenRef.current = bars.length
    }
  }, [bars, tsCode, name])

  const tipBar = tooltip?.bar
  const tipUp = tipBar != null && tipBar.close >= tipBar.open
  const tipPctClass =
    tipBar?.pctChg == null ? '' : tipBar.pctChg >= 0 ? 'up' : 'down'

  return (
    <div className="kline-chart-wrap" ref={wrapRef} style={{ height }}>
      <div className="kline-chart" ref={hostRef} style={{ height }} />
      {tooltip && tipBar && (
        <div
          className="kline-tooltip mono"
          style={{ left: tooltip.left, top: tooltip.top }}
          aria-hidden
        >
          <div className="kline-tooltip-date">{toTimeKey(tipBar.tradeDate)}</div>
          <div className="kline-tooltip-row">
            <span className="muted">开</span>
            <span>{formatPrice(tipBar.open)}</span>
          </div>
          <div className="kline-tooltip-row">
            <span className="muted">高</span>
            <span className={tipUp ? 'up' : undefined}>{formatPrice(tipBar.high)}</span>
          </div>
          <div className="kline-tooltip-row">
            <span className="muted">低</span>
            <span className={!tipUp ? 'down' : undefined}>{formatPrice(tipBar.low)}</span>
          </div>
          <div className="kline-tooltip-row">
            <span className="muted">收</span>
            <span className={tipUp ? 'up' : 'down'}>{formatPrice(tipBar.close)}</span>
          </div>
          <div className="kline-tooltip-row">
            <span className="muted">涨跌幅</span>
            <span className={tipPctClass}>{formatPct(tipBar.pctChg)}</span>
          </div>
          <div className="kline-tooltip-row">
            <span className="muted">成交量</span>
            <span>{formatVolume(tipBar.volume)}</span>
          </div>
          <div className="kline-tooltip-row kline-tooltip-amount">
            <span className="muted">成交额</span>
            <span className="accent">{formatAmount(tipBar.amount)}</span>
          </div>
        </div>
      )}
      {intraday && (
        <div
          className="kline-intraday-panel mono"
          style={{ left: intraday.left, top: intraday.top }}
          aria-hidden
        >
          <div className="kline-intraday-head">
            <span className="accent">{intraday.tradeDate}</span>
            <span className="muted">分时</span>
          </div>
          {intraday.status === 'loading' && (
            <div className="kline-intraday-status muted">加载分时…</div>
          )}
          {intraday.status === 'error' && (
            <div className="kline-intraday-status">{intraday.message || '分时加载失败'}</div>
          )}
          {intraday.status === 'empty' && (
            <div className="kline-intraday-status muted">
              {intraday.message || '暂无分时数据'}
            </div>
          )}
          {intraday.status === 'ready' && intraday.items.length > 0 && (
            <IntradayMiniChart items={intraday.items} />
          )}
        </div>
      )}
    </div>
  )
}
