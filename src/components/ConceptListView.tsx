import { useEffect, useMemo, useState } from 'react'
import {
  fetchConceptMembers,
  fetchThsConcepts,
  searchStocks,
  type ConceptMemberItem,
  type StockSearchItem,
} from '../api/client'
import type { ConceptCatalogItem } from '../types'
import type { CustomConcept, CustomConceptMember } from '../utils/conceptBlocklist'
type FilterMode = 'all' | 'ranked' | 'excluded' | 'custom'
type ConceptListViewProps = {
  /** 当日/复盘 feed 概念（按名称叠加涨幅/涨停） */
  feedCatalog: ConceptCatalogItem[]
  custom: CustomConcept[]
  blockedSet: ReadonlySet<string>
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
export function ConceptListView({
  feedCatalog,
  custom,
  blockedSet,
  syncError,
  onToggle,
  onAddCustom,
  onRemoveCustom,
  onRenameCustom,
  onAddCustomMember,
  onAddCustomMembers,
  onRemoveCustomMember,
}: ConceptListViewProps) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<FilterMode>('all')
  const [newName, setNewName] = useState('')
  const [newNote, setNewNote] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [thsItems, setThsItems] = useState<{ code: string; name: string }[]>([])
  const [thsLoading, setThsLoading] = useState(true)
  const [thsError, setThsError] = useState<string | null>(null)
  const [editingName, setEditingName] = useState<string | null>(null)
  const [renameDraft, setRenameDraft] = useState('')
  const [memberQuery, setMemberQuery] = useState('')
  const [memberHits, setMemberHits] = useState<StockSearchItem[]>([])
  const [memberSearching, setMemberSearching] = useState(false)
  const [memberError, setMemberError] = useState<string | null>(null)
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
    if (!editingName) {
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
  }, [editingName, memberQuery])
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
  const editingConcept = editingName ? customByName.get(editingName) : undefined
  const importCandidates = useMemo((): ImportCandidate[] => {
    if (!editingName) return []
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
      if (c.name === editingName) continue
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
  }, [custom, editingName, importQuery, thsItems])
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
    setEditingName(name)
    setRenameDraft(name)
  }
  const openEditor = (name: string) => {
    setEditingName(name)
    setRenameDraft(name)
    setMemberQuery('')
    setMemberHits([])
    setMemberError(null)
    setImportOpen(false)
    setImportQuery('')
    setImportPreview(null)
    setImportError(null)
    setImportMessage(null)
  }
  const closeEditor = () => {
    setEditingName(null)
    setRenameDraft('')
    setMemberQuery('')
    setMemberHits([])
    setMemberError(null)
    setImportOpen(false)
    setImportQuery('')
    setImportPreview(null)
    setImportError(null)
    setImportMessage(null)
  }
  const handleRename = () => {
    if (!editingName) return
    const next = renameDraft.trim()
    if (!next) {
      setFormError('名称不能为空')
      return
    }
    if (next !== editingName && (officialNames.has(next) || custom.some((c) => c.name === next))) {
      setFormError('该概念已存在')
      return
    }
    const ok = onRenameCustom(editingName, next)
    if (!ok) {
      setFormError('重命名失败')
      return
    }
    setEditingName(next)
    setRenameDraft(next)
    setFormError(null)
  }
  const handleAddMember = (hit: StockSearchItem) => {
    if (!editingName) return
    onAddCustomMember(editingName, hit)
    setMemberQuery('')
    setMemberHits([])
  }
  const countNewMembers = (
    existing: CustomConceptMember[],
    incoming: ConceptMemberItem[],
  ) => {
    const seen = new Set(existing.map((m) => m.tsCode))
    const seenCode = new Set(existing.map((m) => m.code))
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
    if (!editingName || !importPreview) return
    const added = onAddCustomMembers(editingName, importPreview.items)
    setImportMessage(
      added > 0
        ? `已从「${importPreview.candidate.name}」合并导入 ${added} 只`
        : `「${importPreview.candidate.name}」成分均已存在，未新增`,
    )
    setImportPreview(null)
  }
  const showOfficialLoading = filter !== 'custom' && thsLoading
  const emptyOfficialOnly = filter !== 'custom' && thsError && rows.filter((r) => !r.custom).length === 0
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
          同花顺全量 · 官方可开关计入排行 · 关闭写入服务端屏蔽 · 自建强制不进榜
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
      {editingConcept ? (
        <div className="concept-member-editor">
          <div className="concept-member-editor-head">
            <div className="concept-member-editor-title">
              <span className="mono">编辑成分 ·</span>
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
                {editingConcept.members.length} 只 · 自建强制不进榜 · 服务端同步
              </span>
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
            {memberSearching ? <span className="mono muted">搜索中…</span> : null}
            {memberError ? <span className="concept-form-error mono">{memberError}</span> : null}
          </div>
          {importOpen ? (
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
                const exists = editingConcept.members.some(
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
          {editingConcept.members.length === 0 ? (
            <div className="concept-member-empty mono muted">
              暂无成分股，可搜索添加或从板块导入
            </div>
          ) : (
            <ul className="concept-member-list">
              {editingConcept.members.map((m) => (
                <li key={m.tsCode} className="concept-member-item">
                  <span className="mono">{m.code}</span>
                  <span>{m.name}</span>
                  <button
                    type="button"
                    className="concept-remove-btn mono"
                    onClick={() => onRemoveCustomMember(editingName!, m.tsCode)}
                  >
                    移除
                  </button>
                </li>
              ))}
            </ul>
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
                  className={`${r.blocked ? 'blocked' : ''}${editingName === r.name ? ' editing' : ''}`}
                >
                  <td className="text-left">
                    <div className="concept-name-cell">
                      <span className={r.blocked ? 'muted' : ''}>{r.name}</span>
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
                    {r.custom ? (
                      <div className="concept-row-actions">
                        <button
                          type="button"
                          className="concept-add-btn mono"
                          onClick={() =>
                            editingName === r.name ? closeEditor() : openEditor(r.name)
                          }
                        >
                          {editingName === r.name ? '收起' : '编辑成分'}
                        </button>
                        <button
                          type="button"
                          className="concept-remove-btn mono"
                          onClick={() => {
                            if (editingName === r.name) closeEditor()
                            onRemoveCustom(r.name)
                          }}
                        >
                          删除
                        </button>
                      </div>
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
