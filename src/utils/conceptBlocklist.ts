/**
 * 概念「不计入排行」名单（按名称；默认全部计入）。
 *
 * localStorage key: `front.concepts.blocked`
 * 值：JSON string[]，元素为概念名称（与 adapt / 板块热度里的 `name` 对齐，即 rank.concept_name）。
 * 语义：名单内 = 关闭「计入排行」= 不进左侧热力 / 板块页涨停前十。
 *
 * 自建概念 key: `front.concepts.custom`
 * 值：JSON { name: string; note?: string }[]；仅出现在「概念列表」，不进官方涨幅前十。
 */

export const BLOCKED_STORAGE_KEY = 'front.concepts.blocked'
export const CUSTOM_STORAGE_KEY = 'front.concepts.custom'

export type CustomConcept = {
  name: string
  note?: string
}

function safeParseJson(raw: string | null): unknown {
  if (!raw) return null
  try {
    return JSON.parse(raw) as unknown
  } catch {
    return null
  }
}

export function loadBlockedNames(): string[] {
  if (typeof window === 'undefined') return []
  const parsed = safeParseJson(window.localStorage.getItem(BLOCKED_STORAGE_KEY))
  if (!Array.isArray(parsed)) return []
  const names = parsed
    .filter((x): x is string => typeof x === 'string')
    .map((s) => s.trim())
    .filter(Boolean)
  return [...new Set(names)]
}

export function saveBlockedNames(names: string[]): void {
  if (typeof window === 'undefined') return
  const unique = [...new Set(names.map((s) => s.trim()).filter(Boolean))]
  window.localStorage.setItem(BLOCKED_STORAGE_KEY, JSON.stringify(unique))
}

export function loadCustomConcepts(): CustomConcept[] {
  if (typeof window === 'undefined') return []
  const parsed = safeParseJson(window.localStorage.getItem(CUSTOM_STORAGE_KEY))
  if (!Array.isArray(parsed)) return []
  const out: CustomConcept[] = []
  const seen = new Set<string>()
  for (const item of parsed) {
    if (!item || typeof item !== 'object') continue
    const name = String((item as CustomConcept).name ?? '').trim()
    if (!name || seen.has(name)) continue
    seen.add(name)
    const note = String((item as CustomConcept).note ?? '').trim()
    out.push(note ? { name, note } : { name })
  }
  return out
}

export function saveCustomConcepts(items: CustomConcept[]): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(CUSTOM_STORAGE_KEY, JSON.stringify(items))
}

/** 过滤被屏蔽概念；空名单时原样返回（与现网行为一致）。 */
export function filterBlockedConcepts<T extends { name: string }>(
  items: T[],
  blocked: ReadonlySet<string> | readonly string[],
): T[] {
  const set = blocked instanceof Set ? blocked : new Set(blocked)
  if (set.size === 0) return items
  return items.filter((item) => !set.has(item.name))
}

/** 概念涨停榜取前 N（默认 10）；调用方应先 filterBlockedConcepts 再调用。 */
export function takeTopConcepts<T>(items: T[], n = 10): T[] {
  return items.slice(0, n)
}
