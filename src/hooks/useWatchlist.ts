import { useCallback, useMemo, useState } from 'react'
import {
  loadFloatState,
  loadWatchlist,
  normalizeWatchInput,
  saveFloatState,
  saveWatchlist,
  shortCode,
  type WatchlistFloatState,
  type WatchlistItem,
} from '../utils/watchlist'

export type WatchInput = {
  tsCode?: string
  code?: string
  name?: string
}

export function useWatchlist() {
  const [items, setItems] = useState<WatchlistItem[]>(() => loadWatchlist())
  const [floatState, setFloatState] = useState<WatchlistFloatState>(() => loadFloatState())

  const codeSet = useMemo(() => {
    const set = new Set<string>()
    for (const it of items) {
      set.add(it.tsCode)
      set.add(it.code)
    }
    return set
  }, [items])

  const persist = useCallback((next: WatchlistItem[]) => {
    saveWatchlist(next)
    setItems(next)
  }, [])

  const isWatched = useCallback(
    (codeOrTs: string) => {
      const raw = codeOrTs.trim().toUpperCase()
      if (!raw) return false
      return codeSet.has(raw) || codeSet.has(shortCode(raw))
    },
    [codeSet],
  )

  const add = useCallback(
    (input: WatchInput) => {
      const item = normalizeWatchInput(input)
      if (!item) return false
      let added = false
      setItems((prev) => {
        if (prev.some((x) => x.tsCode === item.tsCode || x.code === item.code)) return prev
        added = true
        const next = [...prev, item]
        saveWatchlist(next)
        return next
      })
      return added
    },
    [],
  )

  const remove = useCallback((codeOrTs: string) => {
    const raw = codeOrTs.trim().toUpperCase()
    const code = shortCode(raw)
    setItems((prev) => {
      const next = prev.filter((x) => x.tsCode !== raw && x.code !== raw && x.code !== code)
      if (next.length === prev.length) return prev
      saveWatchlist(next)
      return next
    })
  }, [])

  const toggle = useCallback(
    (input: WatchInput) => {
      const item = normalizeWatchInput(input)
      if (!item) return
      setItems((prev) => {
        const exists = prev.some((x) => x.tsCode === item.tsCode || x.code === item.code)
        const next = exists
          ? prev.filter((x) => x.tsCode !== item.tsCode && x.code !== item.code)
          : [...prev, item]
        saveWatchlist(next)
        return next
      })
    },
    [],
  )

  const updateFloat = useCallback((patch: Partial<WatchlistFloatState>) => {
    setFloatState((prev) => {
      const next = { ...prev, ...patch }
      saveFloatState(next)
      return next
    })
  }, [])

  const openFloat = useCallback(() => updateFloat({ open: true }), [updateFloat])
  const closeFloat = useCallback(() => updateFloat({ open: false }), [updateFloat])

  return {
    items,
    count: items.length,
    isWatched,
    add,
    remove,
    toggle,
    persist,
    floatState,
    updateFloat,
    openFloat,
    closeFloat,
  }
}

export type WatchlistApi = ReturnType<typeof useWatchlist>
