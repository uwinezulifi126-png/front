import { useEffect, useMemo, useState } from 'react'
import { fetchClsDepth, fetchClsDepthArticle, fetchClsTelegraph } from '../api/client'
import { NEWS_DATA, NEWS_TAG_COLORS } from '../data/mock'
import type { NewsCategory, NewsItem } from '../types'

const NEWS_SECTIONS: { category: NewsCategory; label: string }[] = [
  { category: 'yesterday', label: '昨日新闻头条' },
  { category: 'realtime', label: '实时新闻' },
]

type ListRow =
  | { kind: 'header'; key: string; label: string }
  | { kind: 'item'; key: string; item: NewsItem; index: number }

/** 昨日头条：财联社深度 API（近 3 个月）；实时：财联社加红电报（近 5 天）。 */
export function NewsView() {
  const tags = useMemo(
    () => ['全部', ...Array.from(new Set(NEWS_DATA.map((n) => n.tag)))],
    [],
  )
  const [tag, setTag] = useState('全部')
  const [section, setSection] = useState<NewsCategory>('yesterday')
  const [activeIdx, setActiveIdx] = useState(0)

  const [clsItems, setClsItems] = useState<NewsItem[]>([])
  const [clsLoading, setClsLoading] = useState(false)
  const [clsError, setClsError] = useState<string | null>(null)
  const [clsFetchedAt, setClsFetchedAt] = useState<string | null>(null)

  const [depthItems, setDepthItems] = useState<NewsItem[]>([])
  const [depthLoading, setDepthLoading] = useState(false)
  const [depthError, setDepthError] = useState<string | null>(null)
  const [depthFetchedAt, setDepthFetchedAt] = useState<string | null>(null)

  const useClsRealtime =
    section === 'realtime' && (tag === '全部' || tag === '财联社')
  const useClsDepth =
    section === 'yesterday' && (tag === '全部' || tag === '财联社')

  useEffect(() => {
    if (!useClsRealtime) return
    const ac = new AbortController()
    setClsLoading(true)
    setClsError(null)
    fetchClsTelegraph({ level: 'red', days: 5, limit: 200, signal: ac.signal })
      .then((res) => {
        setClsItems(res.items)
        setClsFetchedAt(res.latestFetchedAt)
        if (res.error && res.items.length === 0) {
          setClsError(res.error)
        } else if (res.items.length === 0) {
          setClsError('暂无财联社加红缓存，请先在后端执行同步任务')
        } else {
          setClsError(null)
        }
        setActiveIdx(0)
      })
      .catch((err: unknown) => {
        if (ac.signal.aborted) return
        setClsItems([])
        setClsError(err instanceof Error ? err.message : '加载财联社电报失败')
      })
      .finally(() => {
        if (!ac.signal.aborted) setClsLoading(false)
      })
    return () => ac.abort()
  }, [useClsRealtime])

  useEffect(() => {
    if (!useClsDepth) return
    const ac = new AbortController()
    setDepthLoading(true)
    setDepthError(null)
    fetchClsDepth({ id: 1000, months: 3, limit: 500, signal: ac.signal })
      .then((res) => {
        setDepthItems(res.items)
        setDepthFetchedAt(res.latestFetchedAt)
        if (res.error && res.items.length === 0) {
          setDepthError(res.error)
        } else if (res.items.length === 0) {
          setDepthError('暂无财联社深度头条缓存，请先在后端执行同步任务')
        } else {
          setDepthError(null)
        }
        setActiveIdx(0)
      })
      .catch((err: unknown) => {
        if (ac.signal.aborted) return
        setDepthItems([])
        setDepthError(err instanceof Error ? err.message : '加载财联社深度头条失败')
      })
      .finally(() => {
        if (!ac.signal.aborted) setDepthLoading(false)
      })
    return () => ac.abort()
  }, [useClsDepth])

  const filtered = useMemo(() => {
    if (useClsDepth) {
      if (tag === '财联社') return depthItems
      const others = NEWS_DATA.filter(
        (n) => n.category === 'yesterday' && n.tag !== '财联社',
      )
      return [...depthItems, ...others]
    }
    if (useClsRealtime) {
      if (tag === '财联社') return clsItems
      const others = NEWS_DATA.filter(
        (n) => n.category === 'realtime' && n.tag !== '财联社',
      )
      return [...clsItems, ...others]
    }
    const byTag = tag === '全部' ? NEWS_DATA : NEWS_DATA.filter((n) => n.tag === tag)
    return byTag.filter((n) => n.category === section)
  }, [tag, section, useClsRealtime, useClsDepth, clsItems, depthItems])

  const listRows = useMemo(
    () =>
      useClsRealtime || useClsDepth
        ? buildDateGroupedRows(filtered)
        : flatRows(filtered),
    [filtered, useClsRealtime, useClsDepth],
  )

  const active: NewsItem | null =
    filtered[Math.min(activeIdx, Math.max(filtered.length - 1, 0))] ?? null

  // 深度列表可能仍是摘要：选中时按需补全文并写回列表缓存
  useEffect(() => {
    if (!useClsDepth || !active?.id) return
    const articleId = active.id
    const ac = new AbortController()
    fetchClsDepthArticle(articleId, { ensureFull: true, signal: ac.signal })
      .then((full) => {
        if (ac.signal.aborted) return
        setDepthItems((prev) =>
          prev.map((n) =>
            n.id === articleId
              ? {
                  ...n,
                  title: full.title || n.title,
                  body: full.body || n.body,
                  url: full.url || n.url,
                  publishedAt: full.publishedAt || n.publishedAt,
                }
              : n,
          ),
        )
      })
      .catch(() => {
        /* 保留列表摘要；原文链接仍可用 */
      })
    return () => ac.abort()
  }, [useClsDepth, active?.id])

  const bannerText = (() => {
    if (useClsDepth) {
      if (depthLoading) return '财联社深度头条 · 近3个月 · 加载中…'
      if (depthError && depthItems.length === 0) return `财联社深度头条 · ${depthError}`
      if (depthError) return `财联社深度头条 · 部分可用 · ${depthError}`
      const ts = depthFetchedAt ? `缓存 ${formatFetchedHint(depthFetchedAt)}` : '已缓存'
      return `财联社深度头条 · 近3个月 · ${depthItems.length} 条 · ${ts}`
    }
    if (section === 'yesterday') return '昨日头条 · 示例数据'
    if (!useClsRealtime) return '实时新闻 · 示例数据'
    if (clsLoading) return '财联社加红 · 近5天 · 加载中…'
    if (clsError && clsItems.length === 0) return `财联社加红 · ${clsError}`
    if (clsError) return `财联社加红 · 部分可用 · ${clsError}`
    const ts = clsFetchedAt ? `缓存 ${formatFetchedHint(clsFetchedAt)}` : '已缓存'
    return `财联社加红 · 近5天 · ${clsItems.length} 条 · ${ts}`
  })()

  const listLoading =
    (useClsRealtime && clsLoading && filtered.length === 0) ||
    (useClsDepth && depthLoading && filtered.length === 0)
  const emptyError = useClsDepth
    ? depthError
    : useClsRealtime
      ? clsError
      : null

  return (
    <div className="split-view">
      <aside className="split-side news-side">
        <div className="news-sample-banner mono">{bannerText}</div>
        <div className="news-tags">
          {tags.map((t) => (
            <button
              key={t}
              type="button"
              className={`tag-chip${tag === t ? ' active' : ''}`}
              onClick={() => {
                setTag(t)
                setActiveIdx(0)
              }}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="news-section-tabs" role="tablist" aria-label="新闻分组">
          {NEWS_SECTIONS.map(({ category, label }) => (
            <button
              key={category}
              type="button"
              role="tab"
              aria-selected={section === category}
              className={`news-section-tab mono${section === category ? ' active' : ''}`}
              onClick={() => {
                setSection(category)
                setActiveIdx(0)
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="news-list" role="tabpanel">
          {listLoading && (
            <div className="news-empty mono muted">
              {useClsDepth
                ? '正在加载财联社深度头条（近3个月）…'
                : '正在加载财联社加红电报（近5天）…'}
            </div>
          )}
          {listRows.map((row) => {
            if (row.kind === 'header') {
              return (
                <div key={row.key} className="news-date-group mono">
                  {row.label}
                </div>
              )
            }
            const n = row.item
            const i = row.index
            return (
              <button
                key={row.key}
                type="button"
                className={`news-item${activeIdx === i ? ' active' : ''}`}
                onClick={() => setActiveIdx(i)}
              >
                <div className="news-meta">
                  <span className="mono muted">
                    {n.publishedAt ? formatTimeOnly(n.publishedAt) : n.time}
                  </span>
                  <span
                    className="news-tag"
                    style={{ color: NEWS_TAG_COLORS[n.tag] ?? 'var(--accent)' }}
                  >
                    {n.tag}
                  </span>
                  {n.urgent && (
                    <span className="news-urgent">{useClsDepth ? '顶' : '急'}</span>
                  )}
                </div>
                <div className="news-title">{n.title}</div>
              </button>
            )
          })}
          {!listLoading && filtered.length === 0 && (
            <div className="news-empty mono muted">
              {emptyError ? emptyError : '该标签下暂无新闻'}
            </div>
          )}
        </div>
      </aside>

      <div className="split-main">
        {active ? (
          <article className="news-article">
            <div className="news-meta">
              <span className="mono muted">
                {active.publishedAt
                  ? formatFullDateTime(active.publishedAt)
                  : active.time}
              </span>
              <span
                className="news-tag"
                style={{ color: NEWS_TAG_COLORS[active.tag] ?? 'var(--accent)' }}
              >
                {active.tag}
              </span>
              {active.urgent && (
                <span className="news-urgent">{useClsDepth ? '顶' : '急'}</span>
              )}
            </div>
            <h2>{active.title}</h2>
            <div className="news-body">{active.body}</div>
            {active.url && (
              <p className="news-source-link">
                <a href={active.url} target="_blank" rel="noopener noreferrer">
                  查看原文
                </a>
              </p>
            )}
          </article>
        ) : (
          <div className="empty-state">
            <span className="mono">
              {listLoading ? '加载中…' : '暂无新闻'}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

function flatRows(items: NewsItem[]): ListRow[] {
  return items.map((item, index) => ({
    kind: 'item' as const,
    key: `item-${index}-${item.title}`,
    item,
    index,
  }))
}

/** 按本地日历日分组：今天 / 昨天 / MM-DD（跨年 YYYY-MM-DD） */
function buildDateGroupedRows(items: NewsItem[]): ListRow[] {
  const hasDates = items.some((n) => Boolean(n.publishedAt))
  if (!hasDates) return flatRows(items)

  const rows: ListRow[] = []
  let lastKey = ''
  items.forEach((item, index) => {
    const label = dateGroupLabel(item.publishedAt)
    const key = label
    if (key !== lastKey) {
      rows.push({ kind: 'header', key: `h-${key}-${index}`, label })
      lastKey = key
    }
    rows.push({
      kind: 'item',
      key: `item-${item.publishedAt ?? ''}-${index}`,
      item,
      index,
    })
  })
  return rows
}

function dateGroupLabel(iso: string | undefined): string {
  if (!iso) return '其它'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '其它'
  const today = startOfLocalDay(new Date())
  const day = startOfLocalDay(d)
  const diffDays = Math.round((today.getTime() - day.getTime()) / 86400000)
  if (diffDays === 0) return '今天'
  if (diffDays === 1) return '昨天'
  const y = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  if (y !== today.getFullYear()) return `${y}-${mm}-${dd}`
  return `${mm}-${dd}`
}

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function formatTimeOnly(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '--:--'
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${hh}:${mi}`
}

function formatFullDateTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const y = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${y}-${mm}-${dd} ${hh}:${mi}`
}

function formatFetchedHint(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}
