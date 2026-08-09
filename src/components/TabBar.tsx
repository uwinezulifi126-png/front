import { useEffect, useMemo, useRef, useState, type DragEvent, type ReactNode } from 'react'
import type { ActiveTab } from '../types'
import { loadTabOrder, reorderTabs, saveTabOrder } from '../utils/tabbarOrder'

export type TabItem = { key: ActiveTab; label: string }

type TabBarProps = {
  tabs: TabItem[]
  activeTab: ActiveTab
  onChange: (tab: ActiveTab) => void
  /** Fixed right-side content (board filters, chips) — not draggable */
  trailing?: ReactNode
}

function mergeOrder(prev: ActiveTab[], available: ActiveTab[]): ActiveTab[] {
  const avail = new Set(available)
  const seen = new Set<ActiveTab>()
  const out: ActiveTab[] = []
  for (const id of prev) {
    if (!avail.has(id) || seen.has(id)) continue
    seen.add(id)
    out.push(id)
  }
  for (const id of available) {
    if (!seen.has(id)) out.push(id)
  }
  return out
}

export function TabBar({ tabs, activeTab, onChange, trailing }: TabBarProps) {
  const availableKey = tabs.map((t) => t.key).join('|')
  const availableKeys = useMemo(
    () => availableKey.split('|').filter(Boolean) as ActiveTab[],
    [availableKey],
  )

  const [order, setOrder] = useState<ActiveTab[]>(() => loadTabOrder(availableKeys))
  const [dragOverId, setDragOverId] = useState<ActiveTab | null>(null)
  const dragTabRef = useRef<ActiveTab | null>(null)
  /** Suppress tab click after a successful drag-reorder */
  const suppressClickRef = useRef(false)

  // Drop removed ids; append newly introduced tab ids at the end.
  useEffect(() => {
    setOrder((prev) => {
      const merged = mergeOrder(prev.length ? prev : loadTabOrder(availableKeys), availableKeys)
      if (merged.join('|') !== prev.join('|')) saveTabOrder(merged)
      return merged
    })
  }, [availableKey, availableKeys])

  const orderedTabs = useMemo(() => {
    const byKey = new Map(tabs.map((t) => [t.key, t]))
    const list: TabItem[] = []
    const used = new Set<ActiveTab>()
    for (const id of order) {
      const t = byKey.get(id)
      if (t) {
        list.push(t)
        used.add(id)
      }
    }
    for (const t of tabs) {
      if (!used.has(t.key)) list.push(t)
    }
    return list
  }, [tabs, order])

  const applyReorder = (fromId: ActiveTab, toId: ActiveTab) => {
    setOrder((prev) => {
      const next = reorderTabs(prev, fromId, toId)
      if (next.join('|') === prev.join('|')) return prev
      saveTabOrder(next)
      return next
    })
  }

  const onTabDragStart = (e: DragEvent<HTMLButtonElement>, id: ActiveTab) => {
    dragTabRef.current = id
    suppressClickRef.current = false
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', id)
    e.currentTarget.classList.add('tab-dragging')
  }

  const onTabDragEnd = (e: DragEvent<HTMLButtonElement>) => {
    e.currentTarget.classList.remove('tab-dragging')
    dragTabRef.current = null
    setDragOverId(null)
  }

  const onTabDragOver = (e: DragEvent<HTMLButtonElement>, id: ActiveTab) => {
    if (!dragTabRef.current) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragOverId !== id) setDragOverId(id)
  }

  const onTabDragLeave = (id: ActiveTab) => {
    if (dragOverId === id) setDragOverId(null)
  }

  const onTabDrop = (e: DragEvent<HTMLButtonElement>, toId: ActiveTab) => {
    e.preventDefault()
    const fromId = (dragTabRef.current || e.dataTransfer.getData('text/plain')) as ActiveTab
    setDragOverId(null)
    if (!fromId || fromId === toId) return
    suppressClickRef.current = true
    applyReorder(fromId, toId)
  }

  const onTabClick = (id: ActiveTab) => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false
      return
    }
    onChange(id)
  }

  return (
    <div className="tabbar">
      <div className="tabbar-tabs" role="tablist">
        {orderedTabs.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={activeTab === t.key}
            className={[
              'tab',
              'tab-draggable',
              activeTab === t.key ? 'active' : '',
              dragOverId === t.key ? 'tab-drag-over' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            draggable
            title="拖拽调整顺序；点击切换"
            onDragStart={(e) => onTabDragStart(e, t.key)}
            onDragEnd={onTabDragEnd}
            onDragOver={(e) => onTabDragOver(e, t.key)}
            onDragLeave={() => onTabDragLeave(t.key)}
            onDrop={(e) => onTabDrop(e, t.key)}
            onClick={() => onTabClick(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>
      {trailing}
    </div>
  )
}
