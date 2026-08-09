import { useEffect, useRef, useState } from 'react'
import {
  CandlestickSeries,
  ColorType,
  createChart,
  HistogramSeries,
  type CandlestickData,
  type HistogramData,
  type IChartApi,
  type ISeriesApi,
  type MouseEventParams,
  type Time,
} from 'lightweight-charts'
import type { KlineBar } from '../types'

const UP_COLOR = '#f85149'
const DOWN_COLOR = '#3fb950'

type KlineChartProps = {
  bars: KlineBar[]
  height?: number
}

type TooltipState = {
  left: number
  top: number
  bar: KlineBar
}

/** Normalize trade date to YYYY-MM-DD for chart time keys. */
function toTimeKey(tradeDate: string): string {
  const digits = tradeDate.replace(/-/g, '').slice(0, 8)
  if (digits.length === 8 && /^\d{8}$/.test(digits)) {
    return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`
  }
  return tradeDate.slice(0, 10)
}

function toCandleData(bars: KlineBar[]): CandlestickData<Time>[] {
  return bars.map((b) => ({
    time: toTimeKey(b.tradeDate) as Time,
    open: b.open,
    high: b.high,
    low: b.low,
    close: b.close,
  }))
}

function toVolumeData(bars: KlineBar[]): HistogramData<Time>[] {
  return bars.map((b) => ({
    time: toTimeKey(b.tradeDate) as Time,
    value: b.volume ?? 0,
    color: b.close >= b.open ? UP_COLOR : DOWN_COLOR,
  }))
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

export function KlineChart({ bars, height = 300 }: KlineChartProps) {
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const hostRef = useRef<HTMLDivElement | null>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const candleRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const volumeRef = useRef<ISeriesApi<'Histogram'> | null>(null)
  const barsByTimeRef = useRef<Map<string, KlineBar>>(new Map())
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)

  useEffect(() => {
    const map = new Map<string, KlineBar>()
    for (const b of bars) {
      map.set(toTimeKey(b.tradeDate), b)
    }
    barsByTimeRef.current = map
  }, [bars])

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

    const onCrosshairMove = (param: MouseEventParams<Time>) => {
      if (!param.point || param.time == null) {
        setTooltip(null)
        return
      }
      const timeKey = String(param.time)
      const bar = barsByTimeRef.current.get(timeKey)
      if (!bar || !param.seriesData.has(candleSeries)) {
        setTooltip(null)
        return
      }

      const wrap = wrapRef.current
      if (!wrap) return

      const tipW = 168
      const tipH = 168
      const pad = 10
      let left = param.point.x + 14
      let top = param.point.y + 14
      if (left + tipW > wrap.clientWidth - pad) left = param.point.x - tipW - 10
      if (top + tipH > wrap.clientHeight - pad) top = param.point.y - tipH - 10
      if (left < pad) left = pad
      if (top < pad) top = pad

      setTooltip({ left, top, bar })
    }

    chart.subscribeCrosshairMove(onCrosshairMove)

    const ro = new ResizeObserver(() => {
      if (!hostRef.current || !chartRef.current) return
      chartRef.current.applyOptions({ width: hostRef.current.clientWidth })
    })
    ro.observe(el)
    chart.applyOptions({ width: el.clientWidth })

    return () => {
      chart.unsubscribeCrosshairMove(onCrosshairMove)
      ro.disconnect()
      chart.remove()
      chartRef.current = null
      candleRef.current = null
      volumeRef.current = null
      setTooltip(null)
    }
  }, [height])

  useEffect(() => {
    const candle = candleRef.current
    const volume = volumeRef.current
    const chart = chartRef.current
    if (!candle || !volume || !chart) return
    candle.setData(toCandleData(bars))
    volume.setData(toVolumeData(bars))
    chart.timeScale().fitContent()
  }, [bars])

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
    </div>
  )
}
