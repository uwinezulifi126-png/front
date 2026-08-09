import { useEffect, useMemo, useState } from 'react'
import { fetchThsConcepts } from '../api/client'
import type { ConceptCatalogItem } from '../types'
import type { CustomConcept } from '../utils/conceptBlocklist'

type FilterMode = 'all' | 'ranked' | 'excluded'

type ConceptListViewProps = {
  /** 当日/复盘 feed 概念（按名称叠加涨幅/涨停） */
  feedCatalog: ConceptCatalogItem[]
  custom: CustomConcept[]
  blockedSet: ReadonlySet<string>
  onToggle: (name: string) => void
  onAddCustom: (name: string, note?: string) => boolean
  onRemoveCustom: (name: string) => void
}

type Row = ConceptCatalogItem & { blocked: boolean; inRanking: boolean }

export function ConceptListView({
  feedCatalog,
  custom,
  blockedSet,
  onToggle,
  onAddCustom,
  onRemoveCustom,
}: ConceptListViewProps) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<FilterMode>('all')
  const [newName, setNewName] = useState('')
  const [newNote, setNewNote] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [thsItems, setThsItems] = useState<{ code: string; name: string }[]>([])
  const [thsLoading, setThsLoading] = useState(true)
  const [thsError, setThsError] = useState<string | null>(null)

  useEffect(() => {
    const ac = new AbortController()
    setThsLoading(true)
    setThsError(null)
    void fetchThsConcepts({ limit: 5000, signal: ac.signal })
      .then((res) => {
        setThsItems(res.items.map((c) => ({ code: c.code, name: c.name })))
      })
      .catch((e: unknown) => {
        if (ac.signal.aborted) return
        setThsError((e as Error).message || '同花顺概念加载失败')
        setThsItems([])
      })
      .finally(() => {
        if (!ac.signal.aborted) setThsLoading(false)
      })
    return () => ac.abort()
  }, [])

  const feedByName = useMemo(() => {
    const map = new Map<string, ConceptCatalogItem>()
    for (const c of feedCatalog) {
      map.set(c.name, c)
    }
    return map
  }, [feedCatalog])

  const officialNames = useMemo(() => new Set(thsItems.map((c) => c.name)), [thsItems])

  const catalog = useMemo((): ConceptCatalogItem[] => {
    return thsItems.map((c) => {
      const feed = feedByName.get(c.name)
      return {
        name: c.name,
        code: c.code,
        count: feed?.count ?? 0,
        pct: feed?.pct ?? null,
      }
    })
  }, [feedByName, thsItems])

  const rows = useMemo(() => {
    const list: Row[] = catalog.map((c) => {
      const blocked = blockedSet.has(c.name)
      return {
        ...c,
        blocked,
        inRanking: !blocked,
      }
    })
    for (const c of custom) {
      if (officialNames.has(c.name)) continue
      const blocked = blockedSet.has(c.name)
      list.push({
        name: c.name,
        code: '',
        count: 0,
        pct: null,
        custom: true,
        note: c.note,
        blocked,
        inRanking: !blocked,
      })
    }
    return list
  }, [blockedSet, catalog, custom, officialNames])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return rows.filter((r) => {
      if (filter === 'ranked' && r.blocked) return false
      if (filter === 'excluded' && !r.blocked) return false
      if (!q) return true
      return (
        r.name.toLowerCase().includes(q) ||
        r.code.toLowerCase().includes(q) ||
        (r.note?.toLowerCase().includes(q) ?? false)
      )
    })
  }, [filter, query, rows])

  const stats = useMemo(() => {
    const excluded = rows.filter((r) => r.blocked).length
    return {
      total: rows.length,
      excluded,
      ranked: rows.length - excluded,
      custom: rows.filter((r) => r.custom).length,
    }
  }, [rows])

  const handleAdd = () => {
    const name = newName.trim()
    if (!name) {
      setFormError('请输入概念名称')
      return
    }
    if (officialNames.has(name) || custom.some((c) => c.name === name)) {
      setFormError('该概念已存在')
      return
    }
    const ok = onAddCustom(name, newNote)
    if (!ok) {
      setFormError('添加失败')
      return
    }
    setNewName('')
    setNewNote('')
    setFormError(null)
  }

  return (
    <div className="concept-view">
      <div className="concept-toolbar">
        <div className="concept-toolbar-left">
          <input
            className="concept-search mono"
            type="search"
            placeholder="搜索概念名称 / 代码…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="concept-filters">
            {(
              [
                { key: 'all', label: `全部 (${stats.total})` },
                { key: 'ranked', label: `计入排行 (${stats.ranked})` },
                { key: 'excluded', label: `不计入 (${stats.excluded})` },
              ] as const
            ).map((f) => (
              <button
                key={f.key}
                type="button"
                className={`concept-filter-btn${filter === f.key ? ' active' : ''}`}
                onClick={() => setFilter(f.key)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
        <div className="concept-hint mono muted">
          同花顺全量 · 默认计入涨幅前十 · 关闭写入屏蔽名单 · 自建不进榜
        </div>
      </div>

      <div className="concept-add">
        <input
          className="concept-search mono"
          type="text"
          placeholder="自建概念名称"
          value={newName}
          onChange={(e) => {
            setNewName(e.target.value)
            setFormError(null)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleAdd()
          }}
        />
        <input
          className="concept-search mono concept-note-input"
          type="text"
          placeholder="备注（可选）"
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleAdd()
          }}
        />
        <button type="button" className="concept-add-btn" onClick={handleAdd}>
          添加自建
        </button>
        {formError && <span className="concept-form-error mono">{formError}</span>}
      </div>

      {thsLoading ? (
        <div className="empty-state">
          <span className="mono">加载同花顺概念…</span>
        </div>
      ) : thsError && rows.length === 0 ? (
        <div className="empty-state">
          <span className="mono">{thsError}</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <span className="mono">
            {rows.length === 0 ? '暂无概念数据' : '无匹配概念'}
          </span>
        </div>
      ) : (
        <div className="concept-table-wrap">
          {thsError ? (
            <div className="concept-banner mono muted">{thsError} · 仅显示自建</div>
          ) : null}
          <table className="data-table compact concept-table">
            <thead>
              <tr>
                <th className="text-left">概念</th>
                <th className="text-right">涨幅</th>
                <th className="text-right">涨停</th>
                <th className="text-center">来源</th>
                <th className="text-center">计入排行</th>
                <th className="text-center">操作</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr
                  key={`${r.custom ? 'c' : 'o'}:${r.code || r.name}`}
                  className={r.blocked ? 'blocked' : ''}
                >
                  <td className="text-left">
                    <div className="concept-name-cell">
                      <span className={r.blocked ? 'muted' : ''}>{r.name}</span>
                      {r.code ? (
                        <span className="mono muted concept-note">{r.code}</span>
                      ) : null}
                      {r.note ? <span className="mono muted concept-note">{r.note}</span> : null}
                    </div>
                  </td>
                  <td className="mono text-right">
                    {r.pct != null ? (
                      <span className={r.pct >= 0 ? 'up' : 'down'}>
                        {r.pct >= 0 ? '+' : ''}
                        {r.pct.toFixed(2)}%
                      </span>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                  <td className="mono text-right">
                    {r.custom || (!r.count && r.pct == null) ? (
                      <span className="muted">—</span>
                    ) : (
                      r.count
                    )}
                  </td>
                  <td className="text-center">
                    <span className={`concept-source${r.custom ? ' custom' : ''}`}>
                      {r.custom ? '自建' : '同花顺'}
                    </span>
                  </td>
                  <td className="text-center">
                    <label
                      className="concept-switch"
                      title={r.inRanking ? '关闭后不进涨幅前十' : '打开后可进涨幅前十'}
                    >
                      <input
                        type="checkbox"
                        checked={r.inRanking}
                        onChange={() => onToggle(r.name)}
                      />
                      <span className="concept-switch-track" />
                      <span className="mono concept-switch-label">
                        {r.inRanking ? '计入' : '不计入'}
                      </span>
                    </label>
                  </td>
                  <td className="text-center">
                    {r.custom ? (
                      <button
                        type="button"
                        className="concept-remove-btn mono"
                        onClick={() => onRemoveCustom(r.name)}
                      >
                        删除
                      </button>
                    ) : (
                      <span className="muted mono">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
