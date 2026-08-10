export const WATCHLIST_KEY = 'front.watchlist'
export const WATCHLIST_FLOAT_KEY = 'front.watchlist.float'

export type WatchlistItem = {
  tsCode: string
  code: string
  name: string
  addedAt: number
}

export type WatchlistFloatState = {
  open: boolean
  x: number
  y: number
}

/** Infer full ts_code from a 6-digit A-share code when callers only have short code. */
export function guessTsCode(codeOrTs: string): string {
  const raw = codeOrTs.trim().toUpperCase()
  if (/^\d{6}\.(SH|SZ|BJ)$/.test(raw)) return raw
  const code = raw.replace(/\.(SH|SZ|BJ)$/, '')
  if (!/^\d{6}$/.test(code)) return raw
  if (code.startsWith('4') || code.startsWith('8') || code.startsWith('920')) return `${code}.BJ`
  if (code.startsWith('6') || code.startsWith('5') || code.startsWith('9')) return `${code}.SH`
  return `${code}.SZ`
}

export function shortCode(tsCodeOrCode: string): string {
  return tsCodeOrCode.trim().toUpperCase().replace(/\.(SH|SZ|BJ)$/i, '')
}

export function normalizeWatchInput(input: {
  tsCode?: string
  code?: string
  name?: string
}): WatchlistItem | null {
  const ts = (input.tsCode || input.code || '').trim().toUpperCase()
  if (!ts) return null
  const tsCode = guessTsCode(ts)
  const code = shortCode(tsCode)
  const name = (input.name || '').trim() || code
  return { tsCode, code, name, addedAt: Date.now() }
}

export function loadWatchlist(): WatchlistItem[] {
  try {
    const raw = localStorage.getItem(WATCHLIST_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    const out: WatchlistItem[] = []
    const seen = new Set<string>()
    for (const item of parsed) {
      if (!item || typeof item !== 'object') continue
      const rec = item as Record<string, unknown>
      const normalized = normalizeWatchInput({
        tsCode: typeof rec.tsCode === 'string' ? rec.tsCode : undefined,
        code: typeof rec.code === 'string' ? rec.code : undefined,
        name: typeof rec.name === 'string' ? rec.name : undefined,
      })
      if (!normalized || seen.has(normalized.tsCode)) continue
      seen.add(normalized.tsCode)
      out.push({
        ...normalized,
        addedAt: typeof rec.addedAt === 'number' ? rec.addedAt : normalized.addedAt,
      })
    }
    return out
  } catch {
    return []
  }
}

export function saveWatchlist(items: WatchlistItem[]) {
  try {
    localStorage.setItem(WATCHLIST_KEY, JSON.stringify(items))
  } catch {
    /* ignore quota / private mode */
  }
}

const DEFAULT_FLOAT: WatchlistFloatState = {
  open: false,
  x: -1,
  y: -1,
}

export function loadFloatState(): WatchlistFloatState {
  try {
    const raw = localStorage.getItem(WATCHLIST_FLOAT_KEY)
    if (!raw) return { ...DEFAULT_FLOAT }
    const parsed = JSON.parse(raw) as Partial<WatchlistFloatState>
    return {
      open: !!parsed.open,
      x: typeof parsed.x === 'number' ? parsed.x : DEFAULT_FLOAT.x,
      y: typeof parsed.y === 'number' ? parsed.y : DEFAULT_FLOAT.y,
    }
  } catch {
    return { ...DEFAULT_FLOAT }
  }
}

export function saveFloatState(state: WatchlistFloatState) {
  try {
    localStorage.setItem(WATCHLIST_FLOAT_KEY, JSON.stringify(state))
  } catch {
    /* ignore */
  }
}
