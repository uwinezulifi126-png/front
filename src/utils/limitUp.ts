/**
 * Limit-up rules aligned with backend `app.models.limit_up` (close ≥ rounded limit price).
 */

export function isStName(name: string | null | undefined): boolean {
  if (!name) return false
  return name.toUpperCase().includes('ST')
}

/** Limit-up fraction (e.g. 0.10 = 10%). */
export function limitUpPct(tsCode: string, name?: string | null): number {
  const code = (tsCode || '').toUpperCase()
  if (isStName(name)) return 0.05

  const symbol = code.split('.')[0]
  if (code.endsWith('.BJ')) return 0.3
  if (code.endsWith('.SZ') && symbol.startsWith('3')) return 0.2
  if (code.endsWith('.SH') && symbol.startsWith('688')) return 0.2
  return 0.1
}

/** Round to 2 decimals, half-up (matches Python Decimal ROUND_HALF_UP for prices). */
export function roundPrice(value: number): number {
  const scaled = value * 100
  const floor = Math.floor(scaled)
  const frac = scaled - floor
  if (frac > 0.5) return (floor + 1) / 100
  if (frac === 0.5) return (floor + 1) / 100
  return floor / 100
}

export function limitUpPrice(preClose: number, pct: number): number {
  return roundPrice(preClose * (1 + pct))
}

/**
 * True when close is at or above the board limit price for this code.
 * Uses pre_close when provided; does not skip ST (chart should still highlight ST 涨停).
 */
export function isLimitUpClose(
  tsCode: string,
  close: number,
  preClose: number,
  name?: string | null,
): boolean {
  if (!Number.isFinite(close) || !Number.isFinite(preClose) || preClose <= 0 || close <= 0) {
    return false
  }
  const pct = limitUpPct(tsCode, name)
  const luPrice = limitUpPrice(preClose, pct)
  return close + 1e-9 >= luPrice
}

/** Derive昨收 for a K-line bar (API field → prior close → pct_chg back-calc). */
export function resolvePreClose(
  bar: { close: number; pctChg?: number | null; preClose?: number | null },
  prevClose: number | null,
): number | null {
  const apiPre = bar.preClose
  if (apiPre != null && Number.isFinite(apiPre) && apiPre > 0) {
    return apiPre
  }
  if (prevClose != null && Number.isFinite(prevClose) && prevClose > 0) {
    return prevClose
  }
  const pct = bar.pctChg
  if (pct != null && Number.isFinite(pct) && pct !== -100) {
    const derived = bar.close / (1 + pct / 100)
    if (Number.isFinite(derived) && derived > 0) return derived
  }
  return null
}
