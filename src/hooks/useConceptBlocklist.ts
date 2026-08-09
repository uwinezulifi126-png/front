import { useCallback, useMemo, useState } from 'react'
import {
  loadBlockedNames,
  loadCustomConcepts,
  saveBlockedNames,
  saveCustomConcepts,
  type CustomConcept,
} from '../utils/conceptBlocklist'

export function useConceptBlocklist() {
  const [blocked, setBlocked] = useState<string[]>(() => loadBlockedNames())
  const [custom, setCustom] = useState<CustomConcept[]>(() => loadCustomConcepts())

  const blockedSet = useMemo(() => new Set(blocked), [blocked])

  const setBlockedPersist = useCallback((updater: string[] | ((prev: string[]) => string[])) => {
    setBlocked((prev) => {
      const nextRaw = typeof updater === 'function' ? updater(prev) : updater
      const unique = [...new Set(nextRaw.map((s) => s.trim()).filter(Boolean))]
      saveBlockedNames(unique)
      return unique
    })
  }, [])

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

  const addCustom = useCallback((name: string, note?: string) => {
    const n = name.trim()
    if (!n) return false
    let added = false
    setCustom((prev) => {
      if (prev.some((c) => c.name === n)) return prev
      added = true
      const next = [...prev, note?.trim() ? { name: n, note: note.trim() } : { name: n }]
      saveCustomConcepts(next)
      return next
    })
    return added
  }, [])

  const removeCustom = useCallback(
    (name: string) => {
      setCustom((prev) => {
        const next = prev.filter((c) => c.name !== name)
        saveCustomConcepts(next)
        return next
      })
      setBlockedPersist((prev) => prev.filter((x) => x !== name))
    },
    [setBlockedPersist],
  )

  return {
    blocked,
    blockedSet,
    block,
    unblock,
    toggle,
    isBlocked,
    custom,
    addCustom,
    removeCustom,
  }
}
