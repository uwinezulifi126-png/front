/** True when value looks like an A-share ts_code (e.g. 603459.SH). */
export function isTsCodeLike(value: string): boolean {
  return /^\d{6}\.(SH|SZ|BJ)$/i.test(value.trim())
}

/**
 * Return a usable Chinese stock name, or null when missing / equal to ts_code.
 * Backend often falls back to writing ts_code into `name` when the dim cache misses.
 */
export function resolveStockName(
  stockName: string | null | undefined,
  stockCode: string,
): string | null {
  const n = stockName?.trim()
  if (!n) return null
  const code = stockCode.trim()
  if (code && n === code) return null
  if (isTsCodeLike(n)) return null
  return n
}

/** UI label for the primary name row — never substitute ts_code. */
export function displayStockName(
  stockName: string | null | undefined,
  stockCode: string,
  missing = '—',
): string {
  return resolveStockName(stockName, stockCode) ?? missing
}
