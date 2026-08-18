import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  fetchBlockedConcepts,
  fetchCustomConcepts,
  fetchMemberOverrides,
  putBlockedConcepts,
  putCustomConcepts,
  putMemberOverrides,
} from '../api/client'
import {
  loadBlockedNames,
  loadCustomConcepts,
  loadMemberOverrides,
  normalizeCustomConcepts,
  normalizeCustomMember,
  normalizeMemberOverrides,
  saveBlockedNames,
  saveCustomConcepts,
  saveMemberOverrides,
  type ConceptMemberOverride,
  type CustomConcept,
  type CustomConceptMember,
} from '../utils/conceptBlocklist'
function normalizeNames(names: string[]): string[] {
  return [...new Set(names.map((s) => s.trim()).filter(Boolean))]
}
export function useConceptBlocklist() {
  const [blocked, setBlocked] = useState<string[]>(() => loadBlockedNames())
  const [custom, setCustom] = useState<CustomConcept[]>(() => loadCustomConcepts())
  const [overrides, setOverrides] = useState<ConceptMemberOverride[]>(() => loadMemberOverrides())
  const [ready, setReady] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)
  const blockedRef = useRef(blocked)
  const customRef = useRef(custom)
  const overridesRef = useRef(overrides)
  const blockedWriteGen = useRef(0)
  const customWriteGen = useRef(0)
  const overrideWriteGen = useRef(0)
  useEffect(() => {
    blockedRef.current = blocked
  }, [blocked])
  useEffect(() => {
    customRef.current = custom
  }, [custom])
  useEffect(() => {
    overridesRef.current = overrides
  }, [overrides])
  const blockedSet = useMemo(() => new Set(blocked), [blocked])
  const applyBlocked = useCallback((names: string[]) => {
    const unique = normalizeNames(names)
    blockedRef.current = unique
    setBlocked(unique)
    saveBlockedNames(unique)
    return unique
  }, [])
  const applyCustom = useCallback((items: CustomConcept[]) => {
    const normalized = normalizeCustomConcepts(items)
    customRef.current = normalized
    setCustom(normalized)
    saveCustomConcepts(normalized)
    return normalized
  }, [])
  const persistBlocked = useCallback(
    (names: string[]) => {
      const unique = applyBlocked(names)
      const gen = ++blockedWriteGen.current
      setSyncError(null)
      void putBlockedConcepts(unique)
        .then((res) => {
          if (gen !== blockedWriteGen.current) return
          applyBlocked(res.items)
        })
        .catch((e: unknown) => {
          if (gen !== blockedWriteGen.current) return
          setSyncError((e as Error).message || '屏蔽名单保存失败')
        })
      return unique
    },
    [applyBlocked],
  )
  const persistCustom = useCallback(
    (items: CustomConcept[]) => {
      const unique = applyCustom(items)
      const gen = ++customWriteGen.current
      setSyncError(null)
      void putCustomConcepts(unique)
        .then((res) => {
          if (gen !== customWriteGen.current) return
          applyCustom(res.items)
        })
        .catch((e: unknown) => {
          if (gen !== customWriteGen.current) return
          setSyncError((e as Error).message || '自选概念保存失败')
        })
      return unique
    },
    [applyCustom],
  )
  const applyOverrides = useCallback((items: ConceptMemberOverride[]) => {
    const normalized = normalizeMemberOverrides(items)
    overridesRef.current = normalized
    setOverrides(normalized)
    saveMemberOverrides(normalized)
    return normalized
  }, [])
  const persistOverrides = useCallback(
    (items: ConceptMemberOverride[]) => {
      const unique = applyOverrides(items)
      const gen = ++overrideWriteGen.current
      setSyncError(null)
      void putMemberOverrides(unique)
        .then((res) => {
          if (gen !== overrideWriteGen.current) return
          applyOverrides(res.items)
        })
        .catch((e: unknown) => {
          if (gen !== overrideWriteGen.current) return
          setSyncError((e as Error).message || '概念成分覆盖保存失败')
        })
      return unique
    },
    [applyOverrides],
  )
  useEffect(() => {
    const ac = new AbortController()
    setSyncError(null)
    void (async () => {
      const errors: string[] = []
      try {
        const server = await fetchBlockedConcepts({ signal: ac.signal })
        if (ac.signal.aborted) return
        const local = loadBlockedNames()
        if (server.items.length === 0 && local.length > 0) {
          const migrated = await putBlockedConcepts(local, { signal: ac.signal })
          if (ac.signal.aborted) return
          applyBlocked(migrated.items)
        } else {
          applyBlocked(server.items)
        }
      } catch (e: unknown) {
        if (ac.signal.aborted) return
        applyBlocked(loadBlockedNames())
        errors.push((e as Error).message || '屏蔽名单加载失败')
      }
      try {
        const server = await fetchCustomConcepts({ signal: ac.signal })
        if (ac.signal.aborted) return
        const local = loadCustomConcepts()
        if (server.items.length === 0 && local.length > 0) {
          const migrated = await putCustomConcepts(local, { signal: ac.signal })
          if (ac.signal.aborted) return
          applyCustom(migrated.items)
        } else {
          applyCustom(server.items)
        }
      } catch (e: unknown) {
        if (ac.signal.aborted) return
        applyCustom(loadCustomConcepts())
        errors.push((e as Error).message || '自选概念加载失败')
      }
      try {
        const server = await fetchMemberOverrides({ signal: ac.signal })
        if (ac.signal.aborted) return
        const local = loadMemberOverrides()
        if (server.items.length === 0 && local.length > 0) {
          const migrated = await putMemberOverrides(local, { signal: ac.signal })
          if (ac.signal.aborted) return
          applyOverrides(migrated.items)
        } else {
          applyOverrides(server.items)
        }
      } catch (e: unknown) {
        if (ac.signal.aborted) return
        applyOverrides(loadMemberOverrides())
        errors.push((e as Error).message || '概念成分覆盖加载失败')
      }
      if (!ac.signal.aborted) {
        setSyncError(errors.length ? errors.join('；') : null)
        setReady(true)
      }
    })()
    return () => ac.abort()
  }, [applyBlocked, applyCustom, applyOverrides])
  const setBlockedPersist = useCallback(
    (updater: string[] | ((prev: string[]) => string[])) => {
      const prev = blockedRef.current
      const nextRaw = typeof updater === 'function' ? updater(prev) : updater
      persistBlocked(nextRaw)
    },
    [persistBlocked],
  )
  const setCustomPersist = useCallback(
    (updater: CustomConcept[] | ((prev: CustomConcept[]) => CustomConcept[])) => {
      const prev = customRef.current
      const nextRaw = typeof updater === 'function' ? updater(prev) : updater
      persistCustom(nextRaw)
    },
    [persistCustom],
  )
  const setOverridesPersist = useCallback(
    (
      updater:
        | ConceptMemberOverride[]
        | ((prev: ConceptMemberOverride[]) => ConceptMemberOverride[]),
    ) => {
      const prev = overridesRef.current
      const nextRaw = typeof updater === 'function' ? updater(prev) : updater
      persistOverrides(nextRaw)
    },
    [persistOverrides],
  )
  const block = useCallback(
    (name: string) => {
      const n = name.trim()
      if (!n) return
      setBlockedPersist((prev) => [...prev, n])
    },
    [setBlockedPersist],
  )
  const unblock = useCallback(
    (name: string) => {
      setBlockedPersist((prev) => prev.filter((x) => x !== name))
    },
    [setBlockedPersist],
  )
  const toggle = useCallback(
    (name: string) => {
      const n = name.trim()
      if (!n) return
      setBlockedPersist((prev) =>
        prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n],
      )
    },
    [setBlockedPersist],
  )
  const isBlocked = useCallback((name: string) => blockedSet.has(name), [blockedSet])
  const addCustom = useCallback(
    (name: string, note?: string) => {
      const n = name.trim()
      if (!n) return false
      if (customRef.current.some((c) => c.name === n)) return false
      setCustomPersist((prev) => [
        ...prev,
        note?.trim() ? { name: n, note: note.trim(), members: [] } : { name: n, members: [] },
      ])
      return true
    },
    [setCustomPersist],
  )
  const renameCustom = useCallback(
    (oldName: string, newName: string) => {
      const from = oldName.trim()
      const to = newName.trim()
      if (!from || !to) return false
      if (from === to) return true
      if (customRef.current.some((c) => c.name === to)) return false
      let ok = false
      setCustomPersist((prev) => {
        if (!prev.some((c) => c.name === from)) return prev
        if (prev.some((c) => c.name === to)) return prev
        ok = true
        return prev.map((c) => (c.name === from ? { ...c, name: to } : c))
      })
      if (ok) {
        setBlockedPersist((prev) =>
          prev.includes(from) ? [...prev.filter((x) => x !== from), to] : prev,
        )
      }
      return ok
    },
    [setBlockedPersist, setCustomPersist],
  )
  const removeCustom = useCallback(
    (name: string) => {
      setCustomPersist((prev) => prev.filter((c) => c.name !== name))
      setBlockedPersist((prev) => prev.filter((x) => x !== name))
    },
    [setBlockedPersist, setCustomPersist],
  )
  const setCustomMembers = useCallback(
    (name: string, members: CustomConceptMember[]) => {
      const n = name.trim()
      if (!n) return false
      const cleaned: CustomConceptMember[] = []
      const seen = new Set<string>()
      for (const m of members) {
        const normalized = normalizeCustomMember(m)
        if (!normalized || seen.has(normalized.tsCode)) continue
        seen.add(normalized.tsCode)
        cleaned.push(normalized)
      }
      let ok = false
      setCustomPersist((prev) => {
        if (!prev.some((c) => c.name === n)) return prev
        ok = true
        return prev.map((c) => (c.name === n ? { ...c, members: cleaned } : c))
      })
      return ok
    },
    [setCustomPersist],
  )
  const addCustomMember = useCallback(
    (name: string, member: { tsCode?: string; code?: string; name?: string }) => {
      const n = name.trim()
      const normalized = normalizeCustomMember(member)
      if (!n || !normalized) return false
      let ok = false
      setCustomPersist((prev) => {
        const idx = prev.findIndex((c) => c.name === n)
        if (idx < 0) return prev
        const cur = prev[idx]
        if (cur.members.some((m) => m.tsCode === normalized.tsCode || m.code === normalized.code)) {
          return prev
        }
        ok = true
        const next = [...prev]
        next[idx] = { ...cur, members: [...cur.members, normalized] }
        return next
      })
      return ok
    },
    [setCustomPersist],
  )
  /** 合并导入成分（去重）；返回新增条数。 */
  const addCustomMembers = useCallback(
    (name: string, members: { tsCode?: string; code?: string; name?: string }[]) => {
      const n = name.trim()
      if (!n || !members.length) return 0
      const prev = customRef.current
      const idx = prev.findIndex((c) => c.name === n)
      if (idx < 0) return 0
      const cur = prev[idx]
      const seen = new Set(cur.members.map((m) => m.tsCode))
      const seenCode = new Set(cur.members.map((m) => m.code))
      const nextMembers = [...cur.members]
      for (const m of members) {
        const normalized = normalizeCustomMember(m)
        if (!normalized) continue
        if (seen.has(normalized.tsCode) || seenCode.has(normalized.code)) continue
        seen.add(normalized.tsCode)
        seenCode.add(normalized.code)
        nextMembers.push(normalized)
      }
      const added = nextMembers.length - cur.members.length
      if (added === 0) return 0
      const next = [...prev]
      next[idx] = { ...cur, members: nextMembers }
      persistCustom(next)
      return added
    },
    [persistCustom],
  )
  const removeCustomMember = useCallback(
    (name: string, tsCodeOrCode: string) => {
      const n = name.trim()
      const raw = tsCodeOrCode.trim().toUpperCase()
      if (!n || !raw) return
      setCustomPersist((prev) =>
        prev.map((c) => {
          if (c.name !== n) return c
          return {
            ...c,
            members: c.members.filter(
              (m) => m.tsCode !== raw && m.code !== raw && m.code !== raw.replace(/\.(SH|SZ|BJ)$/i, ''),
            ),
          }
        }),
      )
    },
    [setCustomPersist],
  )
  const addOfficialMember = useCallback(
    (conceptCode: string, member: { tsCode?: string; code?: string; name?: string }) => {
      const code = conceptCode.trim().toUpperCase()
      const normalized = normalizeCustomMember(member)
      if (!code || !normalized) return false
      let ok = false
      setOverridesPersist((prev) => {
        const idx = prev.findIndex((o) => o.conceptCode === code)
        const cur =
          idx >= 0 ? prev[idx] : { conceptCode: code, blocked: [] as CustomConceptMember[], extra: [] as CustomConceptMember[] }
        const wasBlocked = cur.blocked.some(
          (m) => m.tsCode === normalized.tsCode || m.code === normalized.code,
        )
        const blocked = cur.blocked.filter(
          (m) => m.tsCode !== normalized.tsCode && m.code !== normalized.code,
        )
        const inExtra = cur.extra.some(
          (m) => m.tsCode === normalized.tsCode || m.code === normalized.code,
        )
        const extra = wasBlocked || inExtra ? cur.extra : [...cur.extra, normalized]
        if (!wasBlocked && inExtra) return prev
        ok = true
        const nextItem: ConceptMemberOverride = { conceptCode: code, blocked, extra }
        if (blocked.length === 0 && extra.length === 0) {
          return idx < 0 ? prev : prev.filter((o) => o.conceptCode !== code)
        }
        if (idx < 0) return [...prev, nextItem]
        const next = [...prev]
        next[idx] = nextItem
        return next
      })
      return ok
    },
    [setOverridesPersist],
  )
  const removeOfficialMember = useCallback(
    (conceptCode: string, tsCodeOrCode: string) => {
      const code = conceptCode.trim().toUpperCase()
      const raw = tsCodeOrCode.trim().toUpperCase()
      if (!code || !raw) return
      const short = raw.replace(/\.(SH|SZ|BJ)$/i, '')
      const matches = (m: CustomConceptMember) =>
        m.tsCode === raw || m.code === raw || m.code === short
      setOverridesPersist((prev) => {
        const idx = prev.findIndex((o) => o.conceptCode === code)
        const cur =
          idx >= 0
            ? prev[idx]
            : { conceptCode: code, blocked: [] as CustomConceptMember[], extra: [] as CustomConceptMember[] }
        const inExtra = cur.extra.some(matches)
        const extra = cur.extra.filter((m) => !matches(m))
        let blocked = cur.blocked
        if (!inExtra) {
          const snapshot =
            cur.blocked.find(matches) ??
            normalizeCustomMember({ tsCode: raw, code: short })
          if (snapshot && !cur.blocked.some((m) => m.tsCode === snapshot.tsCode || m.code === snapshot.code)) {
            blocked = [...cur.blocked, snapshot]
          }
        }
        const nextItem: ConceptMemberOverride = { conceptCode: code, blocked, extra }
        if (blocked.length === 0 && extra.length === 0) {
          return idx < 0 ? prev : prev.filter((o) => o.conceptCode !== code)
        }
        if (idx < 0) return [...prev, nextItem]
        const next = [...prev]
        next[idx] = nextItem
        return next
      })
    },
    [setOverridesPersist],
  )
  return {
    blocked,
    blockedSet,
    ready,
    syncError,
    block,
    unblock,
    toggle,
    isBlocked,
    custom,
    addCustom,
    renameCustom,
    removeCustom,
    setCustomMembers,
    addCustomMember,
    addCustomMembers,
    removeCustomMember,
    memberOverrides: overrides,
    addOfficialMember,
    removeOfficialMember,
  }
}
