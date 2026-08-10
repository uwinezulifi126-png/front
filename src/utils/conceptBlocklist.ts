/**
 * 概念「不计入排行」名单（按名称；默认全部计入）。
 *
 * 权威来源：服务端 `GET/PUT /api/concepts/blocked`（PostgreSQL「概念屏蔽」）。
 * localStorage key: `front.concepts.blocked` 仅作本地缓存 / 首次迁移上传。
 * 值：JSON string[]，元素为概念名称（与 adapt / 板块热度里的 `name` 对齐，即 rank.concept_name）。
 * 语义：名单内 = 关闭「计入排行」= 不进左侧热力 / 板块页涨停前十。
 *
 * 自建/自选概念权威来源：服务端 `GET/PUT /api/concepts/custom`（PostgreSQL「自选概念」）。
 * localStorage key: `front.concepts.custom` 仅作本地缓存 / 首次迁移上传。
 * 值：JSON { name; note?; members: { tsCode; code; name }[] }[]；
 * 仅出现在「概念列表 / 自选概念」，不进官方涨幅前十。
 */

export const BLOCKED_STORAGE_KEY = 'front.concepts.blocked'
export const CUSTOM_STORAGE_KEY = 'front.concepts.custom'

export type CustomConceptMember = {
  tsCode: string
  code: string
  name: string
}

export type CustomConcept = {
  name: string
  note?: string
  members: CustomConceptMember[]
}

function shortCode(tsCodeOrCode: string): string {
  return tsCodeOrCode.trim().toUpperCase().replace(/\.(SH|SZ|BJ)$/i, '')
}

function guessTsCode(codeOrTs: string): string {
  const raw = codeOrTs.trim().toUpperCase()
  if (/^\d{6}\.(SH|SZ|BJ)$/.test(raw)) return raw
  const code = raw.replace(/\.(SH|SZ|BJ)$/, '')
  if (!/^\d{6}$/.test(code)) return raw
  if (code.startsWith('4') || code.startsWith('8') || code.startsWith('920')) return `${code}.BJ`
  if (code.startsWith('6') || code.startsWith('5') || code.startsWith('9')) return `${code}.SH`
  return `${code}.SZ`
}

export function normalizeCustomMember(input: {
  tsCode?: string
  code?: string
  name?: string
}): CustomConceptMember | null {
  const raw = (input.tsCode || input.code || '').trim().toUpperCase()
  if (!raw) return null
  const tsCode = guessTsCode(raw)
  const code = shortCode(tsCode)
  const name = (input.name || '').trim() || code
  return { tsCode, code, name }
}

function normalizeCustomConcept(item: unknown): CustomConcept | null {
  if (!item || typeof item !== 'object') return null
  const rec = item as Record<string, unknown>
  const name = String(rec.name ?? '').trim()
  if (!name) return null
  const note = String(rec.note ?? '').trim()
  const membersRaw = rec.members
  const members: CustomConceptMember[] = []
  const seen = new Set<string>()
  if (Array.isArray(membersRaw)) {
    for (const m of membersRaw) {
      if (!m || typeof m !== 'object') continue
      const mr = m as Record<string, unknown>
      const normalized = normalizeCustomMember({
        tsCode: typeof mr.tsCode === 'string' ? mr.tsCode : typeof mr.ts_code === 'string' ? mr.ts_code : undefined,
        code: typeof mr.code === 'string' ? mr.code : typeof mr.symbol === 'string' ? mr.symbol : undefined,
        name: typeof mr.name === 'string' ? mr.name : undefined,
      })
      if (!normalized || seen.has(normalized.tsCode)) continue
      seen.add(normalized.tsCode)
      members.push(normalized)
    }
  }
  return note ? { name, note, members } : { name, members }
}

function safeParseJson(raw: string | null): unknown {
  if (!raw) return null
  try {
    return JSON.parse(raw) as unknown
  } catch {
    return null
  }
}

/** 本地缓存读取（迁移 / 离线回退）；权威名单以 API 为准。 */
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

/** 写入本地缓存（与服务端同步后的镜像，非唯一真相源）。 */
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
    const normalized = normalizeCustomConcept(item)
    if (!normalized || seen.has(normalized.name)) continue
    seen.add(normalized.name)
    out.push(normalized)
  }
  return out
}

export function saveCustomConcepts(items: CustomConcept[]): void {
  if (typeof window === 'undefined') return
  const cleaned: CustomConcept[] = []
  const seen = new Set<string>()
  for (const item of items) {
    const normalized = normalizeCustomConcept(item)
    if (!normalized || seen.has(normalized.name)) continue
    seen.add(normalized.name)
    cleaned.push(normalized)
  }
  window.localStorage.setItem(CUSTOM_STORAGE_KEY, JSON.stringify(cleaned))
}

/** Normalize API / local payloads into CustomConcept[]. */
export function normalizeCustomConcepts(items: unknown): CustomConcept[] {
  if (!Array.isArray(items)) return []
  const out: CustomConcept[] = []
  const seen = new Set<string>()
  for (const item of items) {
    const normalized = normalizeCustomConcept(item)
    if (!normalized || seen.has(normalized.name)) continue
    seen.add(normalized.name)
    out.push(normalized)
  }
  return out
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
