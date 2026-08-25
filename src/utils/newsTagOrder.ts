import { NEWS_DATA, NEWS_TAG_COLORS } from '../data/mock'

export const NEWS_TAG_ORDER_KEY = 'front.news.tags.order'
export const NEWS_TAG_ALL = '全部'

/** Legacy label kept in older saved orders. */
const LEGACY_TAG_ALIASES: Record<string, string> = {
  热点: '淘股吧',
  北向: '东方财富',
  政策: '同花顺财经',
}

/** 标签注册表：含 API 源（可无 mock 条目）与 mock 示例源，保证标签栏始终展示 */
export const KNOWN_NEWS_TAGS: string[] = Object.keys(NEWS_TAG_COLORS)

export function getDefaultNewsTags(): string[] {
  const fromData = NEWS_DATA.map((n) => n.tag)
  const merged = [...KNOWN_NEWS_TAGS, ...fromData]
  return [NEWS_TAG_ALL, ...Array.from(new Set(merged))]
}

function resolveTagLabel(label: string, available: Set<string>): string | null {
  if (available.has(label)) return label
  const alias = LEGACY_TAG_ALIASES[label]
  if (alias && available.has(alias)) return alias
  return null
}

export function normalizeNewsTagOrder(saved: unknown, available: string[]): string[] {
  const avail = new Set(available)
  const seen = new Set<string>()
  const result: string[] = []

  if (avail.has(NEWS_TAG_ALL)) {
    result.push(NEWS_TAG_ALL)
    seen.add(NEWS_TAG_ALL)
  }

  if (Array.isArray(saved)) {
    for (const item of saved) {
      if (typeof item !== 'string' || item === NEWS_TAG_ALL) continue
      const label = resolveTagLabel(item, avail)
      if (!label || seen.has(label)) continue
      seen.add(label)
      result.push(label)
    }
  }

  for (const label of available) {
    if (seen.has(label)) continue
    result.push(label)
    seen.add(label)
  }

  return result
}

export function loadNewsTagOrder(available: string[]): string[] {
  try {
    const raw = localStorage.getItem(NEWS_TAG_ORDER_KEY)
    if (!raw) return normalizeNewsTagOrder(null, available)
    return normalizeNewsTagOrder(JSON.parse(raw) as unknown, available)
  } catch {
    return normalizeNewsTagOrder(null, available)
  }
}

export function saveNewsTagOrder(order: string[]) {
  try {
    localStorage.setItem(NEWS_TAG_ORDER_KEY, JSON.stringify(order))
  } catch {
    /* ignore quota / private mode */
  }
}

export function reorderNewsTags(order: string[], fromLabel: string, toLabel: string): string[] {
  if (fromLabel === toLabel || fromLabel === NEWS_TAG_ALL || toLabel === NEWS_TAG_ALL) {
    return order
  }
  const next = [...order]
  const fromIdx = next.indexOf(fromLabel)
  const toIdx = next.indexOf(toLabel)
  if (fromIdx < 0 || toIdx < 0) return order
  next.splice(fromIdx, 1)
  next.splice(toIdx, 0, fromLabel)
  return next
}

export function clearNewsTagOrder() {
  try {
    localStorage.removeItem(NEWS_TAG_ORDER_KEY)
  } catch {
    /* ignore */
  }
}
