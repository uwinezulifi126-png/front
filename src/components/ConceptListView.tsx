import { useEffect, useMemo, useState } from 'react'
import {
  fetchConceptMembers,
  fetchThsConcepts,
  searchStocks,
  type ConceptMemberItem,
  type StockSearchItem,
} from '../api/client'
import type { ConceptCatalogItem } from '../types'
import {
  applyMemberOverrides,
  overrideKey,
  type ConceptMemberOverride,
  type CustomConcept,
  type CustomConceptMember,
  type OverlayMember,
} from '../utils/conceptBlocklist'
type FilterMode = 'all' | 'ranked' | 'excluded' | 'custom'
type EditingTarget = {
  kind: 'custom' | 'official'
  name: string
  code: string
}
type ConceptListViewProps = {
  /** 当日/复盘 feed 概念（按名称叠加涨幅/涨停） */
  feedCatalog: ConceptCatalogItem[]
  custom: CustomConcept[]
  blockedSet: ReadonlySet<string>
  memberOverrides: ConceptMemberOverride[]
  syncError?: string | null
  onToggle: (name: string) => void
  onAddCustom: (name: string, note?: string) => boolean
  onRemoveCustom: (name: string) => void
  onRenameCustom: (oldName: string, newName: string) => boolean
  onAddCustomMember: (
    name: string,
    member: { tsCode?: string; code?: string; name?: string },
  ) => boolean
  onAddCustomMembers: (
    name: string,
    members: { tsCode?: string; code?: string; name?: string }[],
  ) => number
  onRemoveCustomMember: (name: string, tsCodeOrCode: string) => void
  onAddOfficialMember: (
    conceptCode: string,
    member: { tsCode?: string; code?: string; name?: string },
  ) => boolean
  onRemoveOfficialMember: (conceptCode: string, tsCodeOrCode: string) => void
}
type Row = ConceptCatalogItem & {
  blocked: boolean
  inRanking: boolean
  members: CustomConceptMember[]
}
type ImportCandidate = {
  key: string
  name: string
  code: string
  source: 'ths' | 'custom'
  memberCount: number | null
}
type ImportPreview = {
  candidate: ImportCandidate
  total: number
  newCount: number
  items: ConceptMemberItem[]
}
function isEditingRow(editing: EditingTarget | null, r: Row): boolean {
  if (!editing) return false
  if (r.custom) return editing.kind === 'custom' && editing.name === r.name
  return (
    editing.kind === 'official' &&
    ((editing.code && r.code && editing.code === r.code) || editing.name === r.name)
  )
}
export function ConceptListView({
  feedCatalog,
  custom,
  blockedSet,
  memberOverrides,
  syncError,
  onToggle,
  onAddCustom,
  onRemoveCustom,
  onRenameCustom,
  onAddCustomMember,
  onAddCustomMembers,
  onRemoveCustomMember,
  onAddOfficialMember,
  onRemoveOfficialMember,
}: ConceptListViewProps) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<FilterMode>('all')
  const [newName, setNewName] = useState('')
  const [newNote, setNewNote] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [thsItems, setThsItems] = useState<{ code: string; name: string }[]>([])
  const [thsLoading, setThsLoading] = useState(true)
  const [thsError, setThsError] = useState<string | null>(null)
  const [editing, setEditing] = useState<EditingTarget | null>(null)
  const [renameDraft, setRenameDraft] = useState('')
  const [memberQuery, setMemberQuery] = useState('')
  const [memberHits, setMemberHits] = useState<StockSearchItem[]>([])
  const [memberSearching, setMemberSearching] = useState(false)
  const [memberError, setMemberError] = useState<string | null>(null)
  const [memberFilter, setMemberFilter] = useState('')
  const [officialMembers, setOfficialMembers] = useState<ConceptMemberItem[]>([])
  const [officialLoading, setOfficialLoading] = useState(false)
  const [officialError, setOfficialError] = useState<string | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [importQuery, setImportQuery] = useState('')
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null)
  const [importLoading, setImportLoading] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const [importMessage, setImportMessage] = useState<string | null>(null)
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
  useEffect(() => {
    if (!editing) {
      setMemberQuery('')
      setMemberHits([])
      setMemberError(null)
      return
    }
    const q = memberQuery.trim()
    if (q.length < 1) {
      setMemberHits([])
      setMemberSearching(false)
      setMemberError(null)
      return
    }
    const ac = new AbortController()
    const timer = window.setTimeout(() => {
      setMemberSearching(true)
      setMemberError(null)
      void searchStocks(q, { limit: 12, signal: ac.signal })
        .then((items) => {
          if (!ac.signal.aborted) setMemberHits(items)
        })
        .catch((e: unknown) => {
          if (ac.signal.aborted) return
          setMemberHits([])
          setMemberError((e as Error).message || '搜索失败')
        })
        .finally(() => {
          if (!ac.signal.aborted) setMemberSearching(false)
        })
    }, 220)
    return () => {
      ac.abort()
      window.clearTimeout(timer)
    }
  }, [editing, memberQuery])
  useEffect(() => {
    if (!editing || editing.kind !== 'official') {
      setOfficialMembers([])
      setOfficialLoading(false)
      setOfficialError(null)
      return
    }
    const ac = new AbortController()
    setOfficialLoading(true)
    setOfficialError(null)
    void fetchConceptMembers({
      code: editing.code || undefined,
      name: editing.name,
      limit: 10000,
      signal: ac.signal,
    })
      .then((res) => {
        if (ac.signal.aborted) return
        setOfficialMembers(res.items)
      })
      .catch((e: unknown) => {
        if (ac.signal.aborted) return
        setOfficialMembers([])
        setOfficialError((e as Error).message || '成分加载失败')
      })
      .finally(() => {
        if (!ac.signal.aborted) setOfficialLoading(false)
      })
    return () => ac.abort()
  }, [editing])
  const feedByName = useMemo(() => {
    const map = new Map<string, ConceptCatalogItem>()
    for (const c of feedCatalog) {
      map.set(c.name, c)
    }
    return map
  }, [feedCatalog])
  const officialNames = useMemo(() => new Set(thsItems.map((c) => c.name)), [thsItems])
  const customByName = useMemo(() => {
    const map = new Map<string, CustomConcept>()
    for (const c of custom) map.set(c.name, c)
    return map
  }, [custom])
  const overrideByCode = useMemo(() => {
    const map = new Map<string, ConceptMemberOverride>()
    for (const o of memberOverrides) map.set(o.conceptCode, o)
    return map
  }, [memberOverrides])
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
        members: [],
      }
    })
    for (const c of custom) {
      if (officialNames.has(c.name)) continue
      list.push({
        name: c.name,
        code: '',
        count: c.members.length,
        pct: null,
        custom: true,
        note: c.note,
        blocked: true,
        inRanking: false,
        members: c.members,
      })
    }
    return list
  }, [blockedSet, catalog, custom, officialNames])
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return rows.filter((r) => {
      if (filter === 'ranked' && (r.custom || r.blocked)) return false
      if (filter === 'excluded' && (r.custom || !r.blocked)) return false
      if (filter === 'custom' && !r.custom) return false
      if (!q) return true
      return (
        r.name.toLowerCase().includes(q) ||
        r.code.toLowerCase().includes(q) ||
        (r.note?.toLowerCase().includes(q) ?? false)
      )
    })
  }, [filter, query, rows])
  const stats = useMemo(() => {
    const official = rows.filter((r) => !r.custom)
    const excluded = official.filter((r) => r.blocked).length
    const customCount = rows.filter((r) => r.custom).length
    return {
      total: rows.length,
      excluded,
      ranked: official.length - excluded,
      custom: customCount,
    }
  }, [rows])
  const editingConcept = editing?.kind === 'custom' ? customByName.get(editing.name) : undefined
  const editingOverride = useMemo(() => {
    if (!editing || editing.kind !== 'official') return undefined
    return overrideByCode.get(overrideKey(editing.code, editing.name))
  }, [editing, overrideByCode])
  const displayedMembers: OverlayMember[] = useMemo(() => {
    if (!editing) return []
    if (editing.kind === 'custom') {
      return (editingConcept?.members ?? []).map((m) => ({ ...m, source: 'extra' as const }))
    }
    return applyMemberOverrides(officialMembers, editingOverride)
  }, [editing, editingConcept, editingOverride, officialMembers])
  const visibleMembers = useMemo(() => {
    const q = memberFilter.trim().toLowerCase()
    if (!q) return displayedMembers
    return displayedMembers.filter(
      (m) => m.code.toLowerCase().includes(q) || m.name.toLowerCase().includes(q) || m.tsCode.toLowerCase().includes(q),
    )
  }, [displayedMembers, memberFilter])
  const importCandidates = useMemo((): ImportCandidate[] => {
    if (!editing || editing.kind !== 'custom') return []
    const q = importQuery.trim().toLowerCase()
    const out: ImportCandidate[] = []
    for (const c of thsItems) {
      if (q && !c.name.toLowerCase().includes(q) && !c.code.toLowerCase().includes(q)) continue
      out.push({
        key: `ths:${c.code || c.name}`,
        name: c.name,
        code: c.code,
        source: 'ths',
        memberCount: null,
      })
    }
    for (const c of custom) {
      if (c.name === editing.name) continue
      if (q && !c.name.toLowerCase().includes(q)) continue
      out.push({
        key: `custom:${c.name}`,
        name: c.name,
        code: '',
        source: 'custom',
        memberCount: c.members.length,
      })
    }
    return out.slice(0, 40)
  }, [custom, editing, importQuery, thsItems])
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
    setFilter('custom')
    setEditing({ kind: 'custom', name, code: '' })
    setRenameDraft(name)
  }
  const resetEditorFields = () => {
    setMemberQuery('')
    setMemberHits([])
    setMemberError(null)
    setMemberFilter('')
    setImportOpen(false)
    setImportQuery('')
    setImportPreview(null)
    setImportError(null)
    setImportMessage(null)
    setOfficialError(null)
  }
  const openEditor = (r: Row) => {
    setEditing(
      r.custom
        ? { kind: 'custom', name: r.name, code: '' }
        : { kind: 'official', name: r.name, code: overrideKey(r.code, r.name) },
    )
    setRenameDraft(r.name)
    resetEditorFields()
  }
  const closeEditor = () => {
    setEditing(null)
    setRenameDraft('')
    resetEditorFields()
    setOfficialMembers([])
  }
  const toggleEditor = (r: Row) => {
    if (isEditingRow(editing, r)) closeEditor()
    else openEditor(r)
  }
  const handleRename = () => {
    if (!editing || editing.kind !== 'custom') return
    const next = renameDraft.trim()
    if (!next) {
      setFormError('名称不能为空')
      return
    }
    if (next !== editing.name && (officialNames.has(next) || custom.some((c) => c.name === next))) {
      setFormError('该概念已存在')
      return
    }
    const ok = onRenameCustom(editing.name, next)
    if (!ok) {
      setFormError('重命名失败')
      return
    }
    setEditing({ kind: 'custom', name: next, code: '' })
    setRenameDraft(next)
    setFormError(null)
  }
  const handleAddMember = (hit: StockSearchItem) => {
    if (!editing) return
    if (editing.kind === 'custom') onAddCustomMember(editing.name, hit)
    else onAddOfficialMember(editing.code, hit)
    setMemberQuery('')
    setMemberHits([])
  }
  const handleRemoveMember = (m: OverlayMember) => {
    if (!editing) return
    if (editing.kind === 'custom') onRemoveCustomMember(editing.name, m.tsCode)
    else onRemoveOfficialMember(editing.code, m.tsCode)
  }
  const countNewMembers = (
    existing: CustomConceptMember[],
    incoming: ConceptMemberItem[],
  ) => {
    const seen = new Set(existing.map((x) => x.tsCode))
    const seenCode = new Set(existing.map((x) => x.code))
    let n = 0
    for (const m of incoming) {
      if (seen.has(m.tsCode) || seenCode.has(m.code)) continue
      n += 1
    }
    return n
  }
  const prepareImport = async (candidate: ImportCandidate) => {
    if (!editingConcept) return
    setImportLoading(true)
    setImportError(null)
    setImportMessage(null)
    setImportPreview(null)
    try {
      if (candidate.source === 'custom') {
        const src = customByName.get(candidate.name)
        const items: ConceptMemberItem[] = (src?.members ?? []).map((m) => ({
          tsCode: m.tsCode,
          code: m.code,
          name: m.name,
        }))
        setImportPreview({
          candidate,
          total: items.length,
          newCount: countNewMembers(editingConcept.members, items),
          items,
        })
        return
      }
      const res = await fetchConceptMembers({
        code: candidate.code || undefined,
        name: candidate.name,
        limit: 10000,
      })
      const items = res.items
      setImportPreview({
        candidate: {
          ...candidate,
          memberCount: res.total,
        },
        total: res.total,
        newCount: countNewMembers(editingConcept.members, items),
        items,
      })
    } catch (e: unknown) {
      setImportError((e as Error).message || '加载成分失败')
    } finally {
      setImportLoading(false)
    }
  }
  const confirmImport = () => {
    if (!editing || editing.kind !== 'custom' || !importPreview) return
    const added = onAddCustomMembers(editing.name, importPreview.items)
    setImportMessage(
      added > 0
        ? `已从「${importPreview.candidate.name}」合并导入 ${added} 只`
        : `「${importPreview.candidate.name}」成分均已存在，未新增`,
    )
    setImportPreview(null)
  }
  const showOfficialLoading = filter !== 'custom' && thsLoading
  const emptyOfficialOnly = filter !== 'custom' && thsError && rows.filter((r) => !r.custom).length === 0
  const editorOpen = editing != null && (editing.kind === 'official' || editingConcept != null)
  const extraCount = editingOverride?.extra.length ?? 0
  const blockedCount = editingOverride?.blocked.length ?? 0
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
                { key: 'custom', label: `自选概念 (${stats.custom})` },
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
          点击概念名查看全量成分 · 官方增删写入覆盖层（维度同步不覆盖） · 关闭计入排行仍写屏蔽
        </div>
      </div>
      {syncError ? <div className="concept-banner mono concept-form-error">{syncError}</div> : null}
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
      {editorOpen ? (
        <div className="concept-member-editor">
          <div className="concept-member-editor-head">
            <div className="concept-member-editor-title">
              <span className="mono">成分 ·</span>
              {editing?.kind === 'custom' ? (
                <>
                  <input
                    className="concept-search mono concept-rename-input"
                    type="text"
                    value={renameDraft}
                    onChange={(e) => {
                      setRenameDraft(e.target.value)
                      setFormError(null)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleRename()
                    }}
                  />
                  <button type="button" className="concept-add-btn" onClick={handleRename}>
                    重命名
                  </button>
                  <span className="mono muted">
                    {displayedMembers.length} 只 · 自建强制不进榜 · 服务端同步
                  </span>
                </>
              ) : (
                <>
                  <span className="accent">{editing?.name}</span>
                  {editing?.code ? <span className="mono muted">{editing.code}</span> : null}
                  <span className="mono muted">
                    {officialLoading
                      ? '加载全量成分…'
                      : `${displayedMembers.length} 只（官方 ${officialMembers.length}${
                          blockedCount ? ` · 已移除 ${blockedCount}` : ''
                        }${extraCount ? ` · 自加 ${extraCount}` : ''}）`}
                  </span>
                </>
              )}
            </div>
            <button type="button" className="concept-remove-btn mono" onClick={closeEditor}>
              收起
            </button>
          </div>
          <div className="concept-member-search-row">
            <input
              className="concept-search mono"
              type="search"
              placeholder="按代码 / 名称搜索添加成分股…"
              value={memberQuery}
              onChange={(e) => setMemberQuery(e.target.value)}
            />
            {editing?.kind === 'custom' ? (
              <button
                type="button"
                className={`concept-add-btn mono${importOpen ? ' active' : ''}`}
                onClick={() => {
                  setImportOpen((v) => !v)
                  setImportPreview(null)
                  setImportError(null)
                  setImportMessage(null)
                }}
              >
                从板块导入
              </button>
            ) : null}
            <input
              className="concept-search mono concept-member-filter"
              type="search"
              placeholder="筛选已有成分…"
              value={memberFilter}
              onChange={(e) => setMemberFilter(e.target.value)}
            />
            {memberSearching ? <span className="mono muted">搜索中…</span> : null}
            {memberError ? <span className="concept-form-error mono">{memberError}</span> : null}
            {officialError ? <span className="concept-form-error mono">{officialError}</span> : null}
          </div>
          {editing?.kind === 'custom' && importOpen ? (
            <div className="concept-import-panel">
              <div className="concept-member-search-row">
                <input
                  className="concept-search mono"
                  type="search"
                  placeholder="搜索同花顺 / 其它自建概念…"
                  value={importQuery}
                  onChange={(e) => setImportQuery(e.target.value)}
                />
                {importLoading ? <span className="mono muted">加载成分…</span> : null}
                {importError ? <span className="concept-form-error mono">{importError}</span> : null}
                {importMessage ? <span className="mono muted">{importMessage}</span> : null}
              </div>
              {importPreview ? (
                <div className="concept-import-confirm">
                  <span className="mono">
                    从「{importPreview.candidate.name}」导入约 {importPreview.total} 只
                    {importPreview.items.length < importPreview.total
                      ? `（本批 ${importPreview.items.length}）`
                      : ''}
                    ，其中新增约 {importPreview.newCount} 只（合并去重）
                  </span>
                  <div className="concept-row-actions">
                    <button
                      type="button"
                      className="concept-add-btn mono"
                      disabled={importPreview.total === 0 || importLoading}
                      onClick={confirmImport}
                    >
                      确认导入
                    </button>
                    <button
                      type="button"
                      className="concept-remove-btn mono"
                      onClick={() => setImportPreview(null)}
                    >
                      取消
                    </button>
                  </div>
                </div>
              ) : (
                <div className="concept-import-hits">
                  {importCandidates.length === 0 ? (
                    <div className="concept-member-empty mono muted">无匹配概念</div>
                  ) : (
                    importCandidates.map((c) => (
                      <button
                        key={c.key}
                        type="button"
                        className="concept-member-hit"
                        disabled={importLoading}
                        onClick={() => void prepareImport(c)}
                      >
                        <span className="mono">{c.source === 'custom' ? '自建' : c.code || '—'}</span>
                        <span>{c.name}</span>
                        <span className="mono muted">
                          {c.memberCount != null ? `${c.memberCount} 只` : '选中预览'}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          ) : null}
          {memberHits.length > 0 ? (
            <div className="concept-member-hits">
              {memberHits.map((hit) => {
                const exists = displayedMembers.some(
                  (m) => m.tsCode === hit.tsCode || m.code === hit.code,
                )
                return (
                  <button
                    key={hit.tsCode}
                    type="button"
                    className="concept-member-hit"
                    disabled={exists}
                    onClick={() => handleAddMember(hit)}
                  >
                    <span className="mono">{hit.code}</span>
                    <span>{hit.name}</span>
                    <span className="mono muted">{exists ? '已添加' : '添加'}</span>
                  </button>
                )
              })}
            </div>
          ) : null}
          {officialLoading && editing?.kind === 'official' ? (
            <div className="concept-member-empty mono muted">正在加载官方全量成分…</div>
          ) : displayedMembers.length === 0 ? (
            <div className="concept-member-empty mono muted">
              暂无成分股，可搜索添加{editing?.kind === 'custom' ? '或从板块导入' : ''}
            </div>
          ) : (
            <div className="concept-member-table-wrap">
              <table className="data-table compact concept-member-table">
                <thead>
                  <tr>
                    <th className="text-left">代码</th>
                    <th className="text-left">名称</th>
                    <th className="text-center">来源</th>
                    <th className="text-center">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleMembers.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="mono muted">
                        无匹配成分
                      </td>
                    </tr>
                  ) : (
                    visibleMembers.map((m) => (
                      <tr key={m.tsCode}>
                        <td className="mono">{m.code}</td>
                        <td>{m.name}</td>
                        <td className="text-center">
                          <span className={`concept-source${m.source === 'extra' ? ' custom' : ''}`}>
                            {editing?.kind === 'custom'
                              ? '自建'
                              : m.source === 'extra'
                                ? '自加'
                                : '官方'}
                          </span>
                        </td>
                        <td className="text-center">
                          <button
                            type="button"
                            className="concept-remove-btn mono"
                            onClick={() => handleRemoveMember(m)}
                          >
                            移除
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : null}
      {showOfficialLoading ? (
        <div className="empty-state">
          <span className="mono">加载同花顺概念…</span>
        </div>
      ) : emptyOfficialOnly ? (
        <div className="empty-state">
          <span className="mono">{thsError}</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <span className="mono">
            {filter === 'custom'
              ? custom.length === 0
                ? '暂无自选概念，上方可新建'
                : '无匹配自选概念'
              : rows.length === 0
                ? '暂无概念数据'
                : '无匹配概念'}
          </span>
        </div>
      ) : (
        <div className="concept-table-wrap">
          {thsError && filter !== 'custom' ? (
            <div className="concept-banner mono muted">{thsError} · 仅显示自建</div>
          ) : null}
          <table className="data-table compact concept-table">
            <thead>
              <tr>
                <th className="text-left">概念</th>
                <th className="text-right">涨幅</th>
                <th className="text-right">{filter === 'custom' ? '成分' : '涨停'}</th>
                <th className="text-center">来源</th>
                <th className="text-center" title="同花顺概念可开关；自建强制不进热力榜">
                  计入排行
                </th>
                <th className="text-center">操作</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr
                  key={`${r.custom ? 'c' : 'o'}:${r.code || r.name}`}
                  className={`${r.blocked ? 'blocked' : ''}${isEditingRow(editing, r) ? ' editing' : ''}`}
                >
                  <td className="text-left">
                    <div className="concept-name-cell">
                      <button
                        type="button"
                        className={`concept-name-btn${isEditingRow(editing, r) ? ' active' : ''}${r.blocked ? ' muted' : ''}`}
                        onClick={() => toggleEditor(r)}
                        title="查看 / 编辑成分股"
                      >
                        {r.name}
                      </button>
                      {r.code ? (
                        <span className="mono muted concept-note">{r.code}</span>
                      ) : null}
                      {r.note ? <span className="mono muted concept-note">{r.note}</span> : null}
                      {r.custom ? (
                        <span className="mono muted concept-note">{r.members.length} 只成分</span>
                      ) : null}
                    </div>
                  </td>
                  <td className="mono text-right">
                    {r.custom || r.pct == null ? (
                      <span className="muted">—</span>
                    ) : (
                      <span className={r.pct >= 0 ? 'up' : 'down'}>
                        {r.pct >= 0 ? '+' : ''}
                        {r.pct.toFixed(2)}%
                      </span>
                    )}
                  </td>
                  <td className="mono text-right">
                    {r.custom ? (
                      r.members.length
                    ) : !r.count && r.pct == null ? (
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
                    {r.custom ? (
                      <label
                        className="concept-switch is-disabled"
                        title="自建概念不进涨停前十 / 左侧热力榜"
                      >
                        <input type="checkbox" checked={false} disabled readOnly />
                        <span className="concept-switch-track" />
                        <span className="mono concept-switch-label">不进榜</span>
                      </label>
                    ) : (
                      <label
                        className="concept-switch"
                        title={r.inRanking ? '关闭后不进涨停前十 / 热力榜' : '打开后可进涨停前十 / 热力榜'}
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
                    )}
                  </td>
                  <td className="text-center">
                    <div className="concept-row-actions">
                      <button
                        type="button"
                        className="concept-add-btn mono"
                        onClick={() => toggleEditor(r)}
                      >
                        {isEditingRow(editing, r) ? '收起' : '成分'}
                      </button>
                      {r.custom ? (
                        <button
                          type="button"
                          className="concept-remove-btn mono"
                          onClick={() => {
                            if (isEditingRow(editing, r)) closeEditor()
                            onRemoveCustom(r.name)
                          }}
                        >
                          删除
                        </button>
                      ) : null}
                    </div>
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
