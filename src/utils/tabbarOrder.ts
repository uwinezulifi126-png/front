import type { ActiveTab } from '../types'

export const TABBAR_ORDER_KEY = 'front.tabbar.order'

/** Keep saved ids that still exist; append any new tab ids at the end (default order). */
export function normalizeTabOrder(saved: unknown, available: ActiveTab[]): ActiveTab[] {
  const avail = new Set(available)
  const seen = new Set<ActiveTab>()
  const result: ActiveTab[] = []

  if (Array.isArray(saved)) {
    for (const item of saved) {
      if (typeof item !== 'string') continue
      const id = item as ActiveTab
      if (!avail.has(id) || seen.has(id)) continue
      seen.add(id)
      result.push(id)
    }
  }

  for (const id of available) {
    if (!seen.has(id)) result.push(id)
  }
  return result
}

export function loadTabOrder(available: ActiveTab[]): ActiveTab[] {
  try {
    const raw = localStorage.getItem(TABBAR_ORDER_KEY)
    if (!raw) return [...available]
    return normalizeTabOrder(JSON.parse(raw) as unknown, available)
  } catch {
    return [...available]
  }
}

export function saveTabOrder(order: ActiveTab[]) {
  try {
    localStorage.setItem(TABBAR_ORDER_KEY, JSON.stringify(order))
  } catch {
    /* ignore quota / private mode */
  }
}

export function reorderTabs(order: ActiveTab[], fromId: ActiveTab, toId: ActiveTab): ActiveTab[] {
  if (fromId === toId) return order
  const next = [...order]
  const fromIdx = next.indexOf(fromId)
  const toIdx = next.indexOf(toId)
  if (fromIdx < 0 || toIdx < 0) return order
  next.splice(fromIdx, 1)
  next.splice(toIdx, 0, fromId)
  return next
}
