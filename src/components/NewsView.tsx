import { useEffect, useMemo, useRef, useState, type DragEvent } from 'react'
import {
  fetchClsDepth,
  fetchClsDepthArticle,
  fetchClsTelegraph,
  fetchCsArticle,
  fetchCsCjyw,
  fetchCsHeadlines,
  fetchEastmoneyArticle,
  fetchEastmoneyHeadlines,
  fetchEastmoneyYw,
  fetchJqkaArticle,
  fetchJqkaAstock,
  fetchJqkaHeadlines,
  fetchStcnArticle,
  fetchStcnHeadlines,
  fetchStcnYw,
  fetchTgbAll,
  fetchTgbJiahong,
} from '../api/client'
import { NEWS_DATA, NEWS_TAG_COLORS } from '../data/mock'
import type { NewsCategory, NewsItem } from '../types'
import {
  getDefaultNewsTags,
  loadNewsTagOrder,
  NEWS_TAG_ALL,
  reorderNewsTags,
  saveNewsTagOrder,
} from '../utils/newsTagOrder'

const NEWS_SECTIONS: { category: NewsCategory; label: string }[] = [
  { category: 'yesterday', label: '昨日新闻头条' },
  { category: 'realtime', label: '实时新闻' },
]

type ListRow =
  | { kind: 'header'; key: string; label: string }
  | { kind: 'item'; key: string; item: NewsItem; index: number }

/** 昨日头条：财联社深度 / 证券时报 / 东方财富；实时：财联社加红 / 证券时报要闻 / 东方财富焦点。 */
function mergeTagOrder(prev: string[], available: string[]): string[] {
  const avail = new Set(available)
  const seen = new Set<string>()
  const out: string[] = []
  for (const label of prev) {
    if (!avail.has(label) || seen.has(label)) continue
    seen.add(label)
    out.push(label)
  }
  for (const label of available) {
    if (seen.has(label)) continue
    out.push(label)
    seen.add(label)
  }
  return out
}

export function NewsView() {
  const defaultTags = useMemo(() => getDefaultNewsTags(), [])
  const defaultTagsKey = defaultTags.join('|')

  const [tagOrder, setTagOrder] = useState<string[]>(() => loadNewsTagOrder(defaultTags))
  const [dragOverLabel, setDragOverLabel] = useState<string | null>(null)
  const dragTagRef = useRef<string | null>(null)
  const suppressClickRef = useRef(false)

  useEffect(() => {
    setTagOrder((prev) => {
      const merged = mergeTagOrder(prev.length ? prev : loadNewsTagOrder(defaultTags), defaultTags)
      if (merged.join('|') !== prev.join('|')) saveNewsTagOrder(merged)
      return merged
    })
  }, [defaultTagsKey, defaultTags])

  const tags = tagOrder

  const [tag, setTag] = useState(NEWS_TAG_ALL)
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

  const [stcnHeadlineItems, setStcnHeadlineItems] = useState<NewsItem[]>([])
  const [stcnHeadlineLoading, setStcnHeadlineLoading] = useState(false)
  const [stcnHeadlineError, setStcnHeadlineError] = useState<string | null>(null)
  const [stcnHeadlineFetchedAt, setStcnHeadlineFetchedAt] = useState<string | null>(null)

  const [stcnYwItems, setStcnYwItems] = useState<NewsItem[]>([])
  const [stcnYwLoading, setStcnYwLoading] = useState(false)
  const [stcnYwError, setStcnYwError] = useState<string | null>(null)
  const [stcnYwFetchedAt, setStcnYwFetchedAt] = useState<string | null>(null)

  const [emHeadlineItems, setEmHeadlineItems] = useState<NewsItem[]>([])
  const [emHeadlineLoading, setEmHeadlineLoading] = useState(false)
  const [emHeadlineError, setEmHeadlineError] = useState<string | null>(null)
  const [emHeadlineFetchedAt, setEmHeadlineFetchedAt] = useState<string | null>(null)

  const [csHeadlineItems, setCsHeadlineItems] = useState<NewsItem[]>([])
  const [csHeadlineLoading, setCsHeadlineLoading] = useState(false)
  const [csHeadlineError, setCsHeadlineError] = useState<string | null>(null)
  const [csHeadlineFetchedAt, setCsHeadlineFetchedAt] = useState<string | null>(null)

  const [csCjywItems, setCsCjywItems] = useState<NewsItem[]>([])
  const [csCjywLoading, setCsCjywLoading] = useState(false)
  const [csCjywError, setCsCjywError] = useState<string | null>(null)
  const [csCjywFetchedAt, setCsCjywFetchedAt] = useState<string | null>(null)

  const [jqkaHeadlineItems, setJqkaHeadlineItems] = useState<NewsItem[]>([])
  const [jqkaHeadlineLoading, setJqkaHeadlineLoading] = useState(false)
  const [jqkaHeadlineError, setJqkaHeadlineError] = useState<string | null>(null)
  const [jqkaHeadlineFetchedAt, setJqkaHeadlineFetchedAt] = useState<string | null>(null)

  const [jqkaAstockItems, setJqkaAstockItems] = useState<NewsItem[]>([])
  const [jqkaAstockLoading, setJqkaAstockLoading] = useState(false)
  const [jqkaAstockError, setJqkaAstockError] = useState<string | null>(null)
  const [jqkaAstockFetchedAt, setJqkaAstockFetchedAt] = useState<string | null>(null)

  const [emYwItems, setEmYwItems] = useState<NewsItem[]>([])
  const [emYwLoading, setEmYwLoading] = useState(false)
  const [emYwError, setEmYwError] = useState<string | null>(null)
  const [emYwFetchedAt, setEmYwFetchedAt] = useState<string | null>(null)

  const [tgbQuanbuItems, setTgbQuanbuItems] = useState<NewsItem[]>([])
  const [tgbQuanbuLoading, setTgbQuanbuLoading] = useState(false)
  const [tgbQuanbuError, setTgbQuanbuError] = useState<string | null>(null)
  const [tgbQuanbuFetchedAt, setTgbQuanbuFetchedAt] = useState<string | null>(null)

  const [tgbJiahongItems, setTgbJiahongItems] = useState<NewsItem[]>([])
  const [tgbJiahongLoading, setTgbJiahongLoading] = useState(false)
  const [tgbJiahongError, setTgbJiahongError] = useState<string | null>(null)
  const [tgbJiahongFetchedAt, setTgbJiahongFetchedAt] = useState<string | null>(null)

  const useClsRealtime =
    section === 'realtime' && (tag === '全部' || tag === '财联社')
  const useClsDepth =
    section === 'yesterday' && (tag === '全部' || tag === '财联社')
  const useStcnHeadlines =
    section === 'yesterday' && (tag === '全部' || tag === '证券时报')
  const useStcnYw = section === 'realtime' && (tag === '全部' || tag === '证券时报')
  const useEastmoneyHeadlines =
    section === 'yesterday' && (tag === '全部' || tag === '东方财富')
  const useEastmoneyYw =
    section === 'realtime' && (tag === '全部' || tag === '东方财富')
  const useCsHeadlines =
    section === 'yesterday' && (tag === '全部' || tag === '中国证券报')
  const useCsCjyw = section === 'realtime' && (tag === '全部' || tag === '中国证券报')
  const useJqkaHeadlines =
    section === 'yesterday' && (tag === '全部' || tag === '同花顺财经')
  const useJqkaAstock =
    section === 'realtime' && (tag === '全部' || tag === '同花顺财经')
  const useTgbQuanbu = section === 'realtime' && (tag === '全部' || tag === '淘股吧')
  const useTgbJiahong = section === 'yesterday' && (tag === '全部' || tag === '淘股吧')

  const liveTags = new Set(['财联社', '证券时报', '东方财富', '中国证券报', '同花顺财经', '淘股吧'])

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

  useEffect(() => {
    if (!useStcnHeadlines) return
    const ac = new AbortController()
    setStcnHeadlineLoading(true)
    setStcnHeadlineError(null)
    fetchStcnHeadlines({ days: 7, limit: 50, signal: ac.signal })
      .then((res) => {
        setStcnHeadlineItems(res.items)
        setStcnHeadlineFetchedAt(res.latestFetchedAt)
        if (res.error && res.items.length === 0) {
          setStcnHeadlineError(res.error)
        } else if (res.items.length === 0) {
          setStcnHeadlineError('暂无证券时报头条缓存，请先在后端执行同步任务')
        } else {
          setStcnHeadlineError(null)
        }
        setActiveIdx(0)
      })
      .catch((err: unknown) => {
        if (ac.signal.aborted) return
        setStcnHeadlineItems([])
        setStcnHeadlineError(err instanceof Error ? err.message : '加载证券时报头条失败')
      })
      .finally(() => {
        if (!ac.signal.aborted) setStcnHeadlineLoading(false)
      })
    return () => ac.abort()
  }, [useStcnHeadlines])

  useEffect(() => {
    if (!useStcnYw) return
    const ac = new AbortController()
    setStcnYwLoading(true)
    setStcnYwError(null)
    fetchStcnYw({ days: 3, limit: 100, signal: ac.signal })
      .then((res) => {
        setStcnYwItems(res.items)
        setStcnYwFetchedAt(res.latestFetchedAt)
        if (res.error && res.items.length === 0) {
          setStcnYwError(res.error)
        } else if (res.items.length === 0) {
          setStcnYwError('暂无证券时报要闻缓存，请先在后端执行同步任务')
        } else {
          setStcnYwError(null)
        }
        setActiveIdx(0)
      })
      .catch((err: unknown) => {
        if (ac.signal.aborted) return
        setStcnYwItems([])
        setStcnYwError(err instanceof Error ? err.message : '加载证券时报要闻失败')
      })
      .finally(() => {
        if (!ac.signal.aborted) setStcnYwLoading(false)
      })
    return () => ac.abort()
  }, [useStcnYw])

  useEffect(() => {
    if (!useEastmoneyHeadlines) return
    const ac = new AbortController()
    setEmHeadlineLoading(true)
    setEmHeadlineError(null)
    fetchEastmoneyHeadlines({ days: 7, limit: 100, signal: ac.signal })
      .then((res) => {
        setEmHeadlineItems(res.items)
        setEmHeadlineFetchedAt(res.latestFetchedAt)
        if (res.error && res.items.length === 0) {
          setEmHeadlineError(res.error)
        } else if (res.items.length === 0) {
          setEmHeadlineError('暂无东方财富头条缓存，请先在后端执行同步任务')
        } else {
          setEmHeadlineError(null)
        }
        setActiveIdx(0)
      })
      .catch((err: unknown) => {
        if (ac.signal.aborted) return
        setEmHeadlineItems([])
        setEmHeadlineError(err instanceof Error ? err.message : '加载东方财富头条失败')
      })
      .finally(() => {
        if (!ac.signal.aborted) setEmHeadlineLoading(false)
      })
    return () => ac.abort()
  }, [useEastmoneyHeadlines])

  useEffect(() => {
    if (!useEastmoneyYw) return
    const ac = new AbortController()
    setEmYwLoading(true)
    setEmYwError(null)
    fetchEastmoneyYw({ days: 3, limit: 100, signal: ac.signal })
      .then((res) => {
        setEmYwItems(res.items)
        setEmYwFetchedAt(res.latestFetchedAt)
        if (res.error && res.items.length === 0) {
          setEmYwError(res.error)
        } else if (res.items.length === 0) {
          setEmYwError('暂无东方财富焦点缓存，请先在后端执行同步任务')
        } else {
          setEmYwError(null)
        }
        setActiveIdx(0)
      })
      .catch((err: unknown) => {
        if (ac.signal.aborted) return
        setEmYwItems([])
        setEmYwError(err instanceof Error ? err.message : '加载东方财富焦点失败')
      })
      .finally(() => {
        if (!ac.signal.aborted) setEmYwLoading(false)
      })
    return () => ac.abort()
  }, [useEastmoneyYw])

  useEffect(() => {
    if (!useCsHeadlines) return
    const ac = new AbortController()
    setCsHeadlineLoading(true)
    setCsHeadlineError(null)
    fetchCsHeadlines({ days: 7, limit: 50, signal: ac.signal })
      .then((res) => {
        setCsHeadlineItems(res.items)
        setCsHeadlineFetchedAt(res.latestFetchedAt)
        if (res.error && res.items.length === 0) {
          setCsHeadlineError(res.error)
        } else if (res.items.length === 0) {
          setCsHeadlineError('暂无中国证券报头条缓存，请先在后端执行同步任务')
        } else {
          setCsHeadlineError(null)
        }
        setActiveIdx(0)
      })
      .catch((err: unknown) => {
        if (ac.signal.aborted) return
        setCsHeadlineItems([])
        setCsHeadlineError(err instanceof Error ? err.message : '加载中国证券报头条失败')
      })
      .finally(() => {
        if (!ac.signal.aborted) setCsHeadlineLoading(false)
      })
    return () => ac.abort()
  }, [useCsHeadlines])

  useEffect(() => {
    if (!useCsCjyw) return
    const ac = new AbortController()
    setCsCjywLoading(true)
    setCsCjywError(null)
    fetchCsCjyw({ days: 3, limit: 100, signal: ac.signal })
      .then((res) => {
        setCsCjywItems(res.items)
        setCsCjywFetchedAt(res.latestFetchedAt)
        if (res.error && res.items.length === 0) {
          setCsCjywError(res.error)
        } else if (res.items.length === 0) {
          setCsCjywError('暂无中国证券报财经要闻缓存，请先在后端执行同步任务')
        } else {
          setCsCjywError(null)
        }
        setActiveIdx(0)
      })
      .catch((err: unknown) => {
        if (ac.signal.aborted) return
        setCsCjywItems([])
        setCsCjywError(err instanceof Error ? err.message : '加载中国证券报财经要闻失败')
      })
      .finally(() => {
        if (!ac.signal.aborted) setCsCjywLoading(false)
      })
    return () => ac.abort()
  }, [useCsCjyw])

  useEffect(() => {
    if (!useJqkaHeadlines) return
    const ac = new AbortController()
    setJqkaHeadlineLoading(true)
    setJqkaHeadlineError(null)
    fetchJqkaHeadlines({ days: 7, limit: 50, signal: ac.signal })
      .then((res) => {
        setJqkaHeadlineItems(res.items)
        setJqkaHeadlineFetchedAt(res.latestFetchedAt)
        if (res.error && res.items.length === 0) {
          setJqkaHeadlineError(res.error)
        } else if (res.items.length === 0) {
          setJqkaHeadlineError('暂无同花顺头条缓存，请先在后端执行同步任务')
        } else {
          setJqkaHeadlineError(null)
        }
        setActiveIdx(0)
      })
      .catch((err: unknown) => {
        if (ac.signal.aborted) return
        setJqkaHeadlineItems([])
        setJqkaHeadlineError(err instanceof Error ? err.message : '加载同花顺头条失败')
      })
      .finally(() => {
        if (!ac.signal.aborted) setJqkaHeadlineLoading(false)
      })
    return () => ac.abort()
  }, [useJqkaHeadlines])

  useEffect(() => {
    if (!useJqkaAstock) return
    const ac = new AbortController()
    setJqkaAstockLoading(true)
    setJqkaAstockError(null)
    fetchJqkaAstock({ days: 3, limit: 100, signal: ac.signal })
      .then((res) => {
        setJqkaAstockItems(res.items)
        setJqkaAstockFetchedAt(res.latestFetchedAt)
        if (res.error && res.items.length === 0) {
          setJqkaAstockError(res.error)
        } else if (res.items.length === 0) {
          setJqkaAstockError('暂无同花顺 A股快讯缓存，请先在后端执行同步任务')
        } else {
          setJqkaAstockError(null)
        }
        setActiveIdx(0)
      })
      .catch((err: unknown) => {
        if (ac.signal.aborted) return
        setJqkaAstockItems([])
        setJqkaAstockError(err instanceof Error ? err.message : '加载同花顺 A股快讯失败')
      })
      .finally(() => {
        if (!ac.signal.aborted) setJqkaAstockLoading(false)
      })
    return () => ac.abort()
  }, [useJqkaAstock])

  useEffect(() => {
    if (!useTgbQuanbu) return
    const ac = new AbortController()
    setTgbQuanbuLoading(true)
    setTgbQuanbuError(null)
    fetchTgbAll({ days: 3, limit: 100, signal: ac.signal })
      .then((res) => {
        setTgbQuanbuItems(res.items)
        setTgbQuanbuFetchedAt(res.latestFetchedAt)
        if (res.error && res.items.length === 0) {
          setTgbQuanbuError(res.error)
        } else if (res.items.length === 0) {
          setTgbQuanbuError('暂无淘股吧快讯（全部）缓存，请先在后端执行同步任务')
        } else {
          setTgbQuanbuError(null)
        }
        setActiveIdx(0)
      })
      .catch((err: unknown) => {
        if (ac.signal.aborted) return
        setTgbQuanbuItems([])
        setTgbQuanbuError(err instanceof Error ? err.message : '加载淘股吧快讯（全部）失败')
      })
      .finally(() => {
        if (!ac.signal.aborted) setTgbQuanbuLoading(false)
      })
    return () => ac.abort()
  }, [useTgbQuanbu])

  useEffect(() => {
    if (!useTgbJiahong) return
    const ac = new AbortController()
    setTgbJiahongLoading(true)
    setTgbJiahongError(null)
    fetchTgbJiahong({ days: 7, limit: 100, signal: ac.signal })
      .then((res) => {
        setTgbJiahongItems(res.items)
        setTgbJiahongFetchedAt(res.latestFetchedAt)
        if (res.error && res.items.length === 0) {
          setTgbJiahongError(res.error)
        } else if (res.items.length === 0) {
          setTgbJiahongError('暂无淘股吧快讯（加红）缓存，请先在后端执行同步任务')
        } else {
          setTgbJiahongError(null)
        }
        setActiveIdx(0)
      })
      .catch((err: unknown) => {
        if (ac.signal.aborted) return
        setTgbJiahongItems([])
        setTgbJiahongError(err instanceof Error ? err.message : '加载淘股吧快讯（加红）失败')
      })
      .finally(() => {
        if (!ac.signal.aborted) setTgbJiahongLoading(false)
      })
    return () => ac.abort()
  }, [useTgbJiahong])

  const filtered = useMemo(() => {
    if (useClsDepth) {
      if (tag === '财联社') return depthItems
      const others = NEWS_DATA.filter(
        (n) => n.category === 'yesterday' && !liveTags.has(n.tag),
      )
      const stcn = useStcnHeadlines ? stcnHeadlineItems : []
      const em = useEastmoneyHeadlines ? emHeadlineItems : []
      const cs = useCsHeadlines ? csHeadlineItems : []
      const jqka = useJqkaHeadlines ? jqkaHeadlineItems : []
      const tgb = useTgbJiahong ? tgbJiahongItems : []
      return [...depthItems, ...stcn, ...em, ...cs, ...jqka, ...tgb, ...others]
    }
    if (useStcnHeadlines) {
      if (tag === '证券时报') return stcnHeadlineItems
      const others = NEWS_DATA.filter(
        (n) => n.category === 'yesterday' && !liveTags.has(n.tag),
      )
      const em = useEastmoneyHeadlines ? emHeadlineItems : []
      const cs = useCsHeadlines ? csHeadlineItems : []
      const jqka = useJqkaHeadlines ? jqkaHeadlineItems : []
      const tgb = useTgbJiahong ? tgbJiahongItems : []
      return [...stcnHeadlineItems, ...em, ...cs, ...jqka, ...tgb, ...others]
    }
    if (useEastmoneyHeadlines) {
      if (tag === '东方财富') return emHeadlineItems
      const others = NEWS_DATA.filter(
        (n) => n.category === 'yesterday' && !liveTags.has(n.tag),
      )
      const cs = useCsHeadlines ? csHeadlineItems : []
      const jqka = useJqkaHeadlines ? jqkaHeadlineItems : []
      const tgb = useTgbJiahong ? tgbJiahongItems : []
      return [...emHeadlineItems, ...cs, ...jqka, ...tgb, ...others]
    }
    if (useCsHeadlines) {
      if (tag === '中国证券报') return csHeadlineItems
      const others = NEWS_DATA.filter(
        (n) => n.category === 'yesterday' && !liveTags.has(n.tag),
      )
      const jqka = useJqkaHeadlines ? jqkaHeadlineItems : []
      const tgb = useTgbJiahong ? tgbJiahongItems : []
      return [...csHeadlineItems, ...jqka, ...tgb, ...others]
    }
    if (useJqkaHeadlines) {
      if (tag === '同花顺财经') return jqkaHeadlineItems
      const others = NEWS_DATA.filter(
        (n) => n.category === 'yesterday' && !liveTags.has(n.tag),
      )
      const tgb = useTgbJiahong ? tgbJiahongItems : []
      return [...jqkaHeadlineItems, ...tgb, ...others]
    }
    if (useTgbJiahong) {
      if (tag === '淘股吧') return tgbJiahongItems
      const others = NEWS_DATA.filter(
        (n) => n.category === 'yesterday' && !liveTags.has(n.tag),
      )
      return [...tgbJiahongItems, ...others]
    }
    if (useClsRealtime) {
      if (tag === '财联社') return clsItems
      const others = NEWS_DATA.filter(
        (n) => n.category === 'realtime' && !liveTags.has(n.tag),
      )
      const stcn = useStcnYw ? stcnYwItems : []
      const em = useEastmoneyYw ? emYwItems : []
      const cs = useCsCjyw ? csCjywItems : []
      const jqka = useJqkaAstock ? jqkaAstockItems : []
      const tgb = useTgbQuanbu ? tgbQuanbuItems : []
      return [...clsItems, ...stcn, ...em, ...cs, ...jqka, ...tgb, ...others]
    }
    if (useStcnYw) {
      if (tag === '证券时报') return stcnYwItems
      const others = NEWS_DATA.filter(
        (n) => n.category === 'realtime' && !liveTags.has(n.tag),
      )
      const em = useEastmoneyYw ? emYwItems : []
      const cs = useCsCjyw ? csCjywItems : []
      const jqka = useJqkaAstock ? jqkaAstockItems : []
      const tgb = useTgbQuanbu ? tgbQuanbuItems : []
      return [...stcnYwItems, ...em, ...cs, ...jqka, ...tgb, ...others]
    }
    if (useEastmoneyYw) {
      if (tag === '东方财富') return emYwItems
      const others = NEWS_DATA.filter(
        (n) => n.category === 'realtime' && !liveTags.has(n.tag),
      )
      const cs = useCsCjyw ? csCjywItems : []
      const jqka = useJqkaAstock ? jqkaAstockItems : []
      const tgb = useTgbQuanbu ? tgbQuanbuItems : []
      return [...emYwItems, ...cs, ...jqka, ...tgb, ...others]
    }
    if (useCsCjyw) {
      if (tag === '中国证券报') return csCjywItems
      const others = NEWS_DATA.filter(
        (n) => n.category === 'realtime' && !liveTags.has(n.tag),
      )
      const jqka = useJqkaAstock ? jqkaAstockItems : []
      const tgb = useTgbQuanbu ? tgbQuanbuItems : []
      return [...csCjywItems, ...jqka, ...tgb, ...others]
    }
    if (useJqkaAstock) {
      if (tag === '同花顺财经') return jqkaAstockItems
      const others = NEWS_DATA.filter(
        (n) => n.category === 'realtime' && !liveTags.has(n.tag),
      )
      const tgb = useTgbQuanbu ? tgbQuanbuItems : []
      return [...jqkaAstockItems, ...tgb, ...others]
    }
    if (useTgbQuanbu) {
      if (tag === '淘股吧') return tgbQuanbuItems
      const others = NEWS_DATA.filter(
        (n) => n.category === 'realtime' && !liveTags.has(n.tag),
      )
      return [...tgbQuanbuItems, ...others]
    }
    const byTag = tag === '全部' ? NEWS_DATA : NEWS_DATA.filter((n) => n.tag === tag)
    return byTag.filter((n) => n.category === section)
  }, [
    tag,
    section,
    useClsRealtime,
    useClsDepth,
    useStcnHeadlines,
    useStcnYw,
    useEastmoneyHeadlines,
    useEastmoneyYw,
    useCsHeadlines,
    useCsCjyw,
    useJqkaHeadlines,
    useJqkaAstock,
    useTgbQuanbu,
    useTgbJiahong,
    clsItems,
    depthItems,
    stcnHeadlineItems,
    stcnYwItems,
    emHeadlineItems,
    emYwItems,
    csHeadlineItems,
    csCjywItems,
    jqkaHeadlineItems,
    jqkaAstockItems,
    tgbQuanbuItems,
    tgbJiahongItems,
  ])

  const useLiveGrouping =
    useClsRealtime ||
    useClsDepth ||
    useStcnHeadlines ||
    useStcnYw ||
    useEastmoneyHeadlines ||
    useEastmoneyYw ||
    useCsHeadlines ||
    useCsCjyw ||
    useJqkaHeadlines ||
    useJqkaAstock ||
    useTgbQuanbu ||
    useTgbJiahong

  const listRows = useMemo(
    () => (useLiveGrouping ? buildDateGroupedRows(filtered) : flatRows(filtered)),
    [filtered, useLiveGrouping],
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

  useEffect(() => {
    if (!useStcnHeadlines && !useStcnYw) return
    if (!active?.id || active.tag !== '证券时报') return
    const articleId = active.id
    const category = section === 'yesterday' ? 'headline' : 'yw'
    const ac = new AbortController()
    fetchStcnArticle(articleId, { category, ensureFull: true, signal: ac.signal })
      .then((full) => {
        if (ac.signal.aborted) return
        const updater = (prev: NewsItem[]) =>
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
          )
        if (section === 'yesterday') setStcnHeadlineItems(updater)
        else setStcnYwItems(updater)
      })
      .catch(() => {
        /* 保留列表摘要 */
      })
    return () => ac.abort()
  }, [useStcnHeadlines, useStcnYw, section, active?.id, active?.tag])

  useEffect(() => {
    if (!useEastmoneyHeadlines && !useEastmoneyYw) return
    if (!active?.id || active.tag !== '东方财富') return
    const articleId = active.id
    const category = active.sourceCategory ?? (section === 'realtime' ? 'yw' : 'focus')
    const ac = new AbortController()
    fetchEastmoneyArticle(articleId, { category, ensureFull: true, signal: ac.signal })
      .then((full) => {
        if (ac.signal.aborted) return
        const updater = (prev: NewsItem[]) =>
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
          )
        if (section === 'realtime') setEmYwItems(updater)
        else setEmHeadlineItems(updater)
      })
      .catch(() => {
        /* 保留列表摘要 */
      })
    return () => ac.abort()
  }, [useEastmoneyHeadlines, useEastmoneyYw, section, active?.id, active?.tag, active?.sourceCategory])

  useEffect(() => {
    if (!useCsHeadlines && !useCsCjyw) return
    if (!active?.id || active.tag !== '中国证券报') return
    const articleId = active.id
    const category = section === 'yesterday' ? 'homepage' : 'cjyw'
    const ac = new AbortController()
    fetchCsArticle(articleId, { category, ensureFull: true, signal: ac.signal })
      .then((full) => {
        if (ac.signal.aborted) return
        const updater = (prev: NewsItem[]) =>
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
          )
        if (section === 'yesterday') setCsHeadlineItems(updater)
        else setCsCjywItems(updater)
      })
      .catch(() => {
        /* 保留列表摘要 */
      })
    return () => ac.abort()
  }, [useCsHeadlines, useCsCjyw, section, active?.id, active?.tag])

  useEffect(() => {
    if (!useJqkaHeadlines && !useJqkaAstock) return
    if (!active?.id || active.tag !== '同花顺财经') return
    const articleId = active.id
    const category = section === 'yesterday' ? 'headline' : 'astock'
    const ac = new AbortController()
    fetchJqkaArticle(articleId, { category, ensureFull: true, signal: ac.signal })
      .then((full) => {
        if (ac.signal.aborted) return
        const updater = (prev: NewsItem[]) =>
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
          )
        if (section === 'yesterday') setJqkaHeadlineItems(updater)
        else setJqkaAstockItems(updater)
      })
      .catch(() => {
        /* 保留列表摘要 */
      })
    return () => ac.abort()
  }, [useJqkaHeadlines, useJqkaAstock, section, active?.id, active?.tag])

  const bannerText = (() => {
    if (useClsDepth) {
      if (depthLoading) return '财联社深度头条 · 近3个月 · 加载中…'
      if (depthError && depthItems.length === 0) return `财联社深度头条 · ${depthError}`
      if (depthError) return `财联社深度头条 · 部分可用 · ${depthError}`
      const ts = depthFetchedAt ? `缓存 ${formatFetchedHint(depthFetchedAt)}` : '已缓存'
      return `财联社深度头条 · 近3个月 · ${depthItems.length} 条 · ${ts}`
    }
    if (useStcnHeadlines) {
      if (stcnHeadlineLoading) return '证券时报首页头条 · 近7天 · 加载中…'
      if (stcnHeadlineError && stcnHeadlineItems.length === 0) {
        return `证券时报首页头条 · ${stcnHeadlineError}`
      }
      if (stcnHeadlineError) return `证券时报首页头条 · 部分可用 · ${stcnHeadlineError}`
      const ts = stcnHeadlineFetchedAt
        ? `缓存 ${formatFetchedHint(stcnHeadlineFetchedAt)}`
        : '已缓存'
      return `证券时报首页头条 · 近7天 · ${stcnHeadlineItems.length} 条 · ${ts}`
    }
    if (useEastmoneyHeadlines) {
      if (emHeadlineLoading) return '东方财富首页头条 · 近7天 · 加载中…'
      if (emHeadlineError && emHeadlineItems.length === 0) {
        return `东方财富首页头条 · ${emHeadlineError}`
      }
      if (emHeadlineError) return `东方财富首页头条 · 部分可用 · ${emHeadlineError}`
      const ts = emHeadlineFetchedAt
        ? `缓存 ${formatFetchedHint(emHeadlineFetchedAt)}`
        : '已缓存'
      return `东方财富首页头条 · 近7天 · ${emHeadlineItems.length} 条 · ${ts}`
    }
    if (useStcnYw) {
      if (stcnYwLoading) return '证券时报要闻 · 近3天 · 加载中…'
      if (stcnYwError && stcnYwItems.length === 0) return `证券时报要闻 · ${stcnYwError}`
      if (stcnYwError) return `证券时报要闻 · 部分可用 · ${stcnYwError}`
      const ts = stcnYwFetchedAt ? `缓存 ${formatFetchedHint(stcnYwFetchedAt)}` : '已缓存'
      return `证券时报要闻 · 近3天 · ${stcnYwItems.length} 条 · ${ts}`
    }
    if (useEastmoneyYw) {
      if (emYwLoading) return '东方财富快讯焦点 · 近3天 · 加载中…'
      if (emYwError && emYwItems.length === 0) return `东方财富快讯焦点 · ${emYwError}`
      if (emYwError) return `东方财富快讯焦点 · 部分可用 · ${emYwError}`
      const ts = emYwFetchedAt ? `缓存 ${formatFetchedHint(emYwFetchedAt)}` : '已缓存'
      return `东方财富快讯焦点 · 近3天 · ${emYwItems.length} 条 · ${ts}`
    }
    if (useCsHeadlines) {
      if (csHeadlineLoading) return '中国证券报首页头条 · 近7天 · 加载中…'
      if (csHeadlineError && csHeadlineItems.length === 0) {
        return `中国证券报首页头条 · ${csHeadlineError}`
      }
      if (csHeadlineError) return `中国证券报首页头条 · 部分可用 · ${csHeadlineError}`
      const ts = csHeadlineFetchedAt
        ? `缓存 ${formatFetchedHint(csHeadlineFetchedAt)}`
        : '已缓存'
      return `中国证券报首页头条 · 近7天 · ${csHeadlineItems.length} 条 · ${ts}`
    }
    if (useCsCjyw) {
      if (csCjywLoading) return '中国证券报财经要闻 · 近3天 · 加载中…'
      if (csCjywError && csCjywItems.length === 0) return `中国证券报财经要闻 · ${csCjywError}`
      if (csCjywError) return `中国证券报财经要闻 · 部分可用 · ${csCjywError}`
      const ts = csCjywFetchedAt ? `缓存 ${formatFetchedHint(csCjywFetchedAt)}` : '已缓存'
      return `中国证券报财经要闻 · 近3天 · ${csCjywItems.length} 条 · ${ts}`
    }
    if (useJqkaHeadlines) {
      if (jqkaHeadlineLoading) return '同花顺财经头条 · 近7天 · 加载中…'
      if (jqkaHeadlineError && jqkaHeadlineItems.length === 0) {
        return `同花顺财经头条 · ${jqkaHeadlineError}`
      }
      if (jqkaHeadlineError) return `同花顺财经头条 · 部分可用 · ${jqkaHeadlineError}`
      const ts = jqkaHeadlineFetchedAt
        ? `缓存 ${formatFetchedHint(jqkaHeadlineFetchedAt)}`
        : '已缓存'
      return `同花顺财经头条 · 近7天 · ${jqkaHeadlineItems.length} 条 · ${ts}`
    }
    if (useJqkaAstock) {
      if (jqkaAstockLoading) return '同花顺财经 A股快讯 · 近3天 · 加载中…'
      if (jqkaAstockError && jqkaAstockItems.length === 0) {
        return `同花顺财经 A股快讯 · ${jqkaAstockError}`
      }
      if (jqkaAstockError) return `同花顺财经 A股快讯 · 部分可用 · ${jqkaAstockError}`
      const ts = jqkaAstockFetchedAt
        ? `缓存 ${formatFetchedHint(jqkaAstockFetchedAt)}`
        : '已缓存'
      return `同花顺财经 A股快讯 · 近3天 · ${jqkaAstockItems.length} 条 · ${ts}`
    }
    if (useTgbJiahong) {
      if (tgbJiahongLoading) return '淘股吧快讯（加红） · 近7天 · 加载中…'
      if (tgbJiahongError && tgbJiahongItems.length === 0) {
        return `淘股吧快讯（加红） · ${tgbJiahongError}`
      }
      if (tgbJiahongError) return `淘股吧快讯（加红） · 部分可用 · ${tgbJiahongError}`
      const ts = tgbJiahongFetchedAt
        ? `缓存 ${formatFetchedHint(tgbJiahongFetchedAt)}`
        : '已缓存'
      return `淘股吧快讯（加红） · 近7天 · ${tgbJiahongItems.length} 条 · ${ts}`
    }
    if (useTgbQuanbu) {
      if (tgbQuanbuLoading) return '淘股吧快讯（全部） · 近3天 · 加载中…'
      if (tgbQuanbuError && tgbQuanbuItems.length === 0) {
        return `淘股吧快讯（全部） · ${tgbQuanbuError}`
      }
      if (tgbQuanbuError) return `淘股吧快讯（全部） · 部分可用 · ${tgbQuanbuError}`
      const ts = tgbQuanbuFetchedAt
        ? `缓存 ${formatFetchedHint(tgbQuanbuFetchedAt)}`
        : '已缓存'
      return `淘股吧快讯（全部） · 近3天 · ${tgbQuanbuItems.length} 条 · ${ts}`
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
    (useClsDepth && depthLoading && filtered.length === 0) ||
    (useStcnHeadlines && stcnHeadlineLoading && filtered.length === 0) ||
    (useStcnYw && stcnYwLoading && filtered.length === 0) ||
    (useEastmoneyHeadlines && emHeadlineLoading && filtered.length === 0) ||
    (useEastmoneyYw && emYwLoading && filtered.length === 0) ||
    (useCsHeadlines && csHeadlineLoading && filtered.length === 0) ||
    (useCsCjyw && csCjywLoading && filtered.length === 0) ||
    (useJqkaHeadlines && jqkaHeadlineLoading && filtered.length === 0) ||
    (useJqkaAstock && jqkaAstockLoading && filtered.length === 0) ||
    (useTgbQuanbu && tgbQuanbuLoading && filtered.length === 0) ||
    (useTgbJiahong && tgbJiahongLoading && filtered.length === 0)
  const emptyError = useClsDepth
    ? depthError
    : useStcnHeadlines
      ? stcnHeadlineError
      : useEastmoneyHeadlines
        ? emHeadlineError
        : useCsHeadlines
          ? csHeadlineError
          : useJqkaHeadlines
            ? jqkaHeadlineError
            : useTgbJiahong
              ? tgbJiahongError
              : useEastmoneyYw
                ? emYwError
                : useCsCjyw
                  ? csCjywError
                  : useJqkaAstock
                    ? jqkaAstockError
                    : useTgbQuanbu
                      ? tgbQuanbuError
                      : useStcnYw
                    ? stcnYwError
                    : useClsRealtime
                      ? clsError
                      : null

  const applyTagReorder = (fromLabel: string, toLabel: string) => {
    setTagOrder((prev) => {
      const next = reorderNewsTags(prev, fromLabel, toLabel)
      if (next.join('|') === prev.join('|')) return prev
      saveNewsTagOrder(next)
      return next
    })
  }

  const onTagDragStart = (e: DragEvent<HTMLButtonElement>, label: string) => {
    dragTagRef.current = label
    suppressClickRef.current = false
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', label)
    e.currentTarget.classList.add('dragging')
  }

  const onTagDragEnd = (e: DragEvent<HTMLButtonElement>) => {
    e.currentTarget.classList.remove('dragging')
    dragTagRef.current = null
    setDragOverLabel(null)
  }

  const onTagDragOver = (e: DragEvent<HTMLButtonElement>, label: string) => {
    if (!dragTagRef.current || label === NEWS_TAG_ALL) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragOverLabel !== label) setDragOverLabel(label)
  }

  const onTagDragLeave = (label: string) => {
    if (dragOverLabel === label) setDragOverLabel(null)
  }

  const onTagDrop = (e: DragEvent<HTMLButtonElement>, toLabel: string) => {
    e.preventDefault()
    const fromLabel = dragTagRef.current || e.dataTransfer.getData('text/plain')
    setDragOverLabel(null)
    if (!fromLabel || fromLabel === toLabel || fromLabel === NEWS_TAG_ALL || toLabel === NEWS_TAG_ALL) {
      return
    }
    suppressClickRef.current = true
    applyTagReorder(fromLabel, toLabel)
  }

  const onTagClick = (label: string) => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false
      return
    }
    setTag(label)
    setActiveIdx(0)
  }

  return (
    <div className="split-view">
      <aside className="split-side news-side">
        <div className="news-sample-banner mono">{bannerText}</div>
        <div className="news-tags">
          {tags.map((t) => {
            const isAll = t === NEWS_TAG_ALL
            return (
              <button
                key={t}
                type="button"
                className={[
                  'tag-chip',
                  isAll ? 'tag-chip-fixed' : 'tag-chip-draggable',
                  tag === t ? 'active' : '',
                  dragOverLabel === t ? 'drag-over' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                draggable={!isAll}
                title={isAll ? undefined : '拖拽调整顺序；点击筛选'}
                onDragStart={isAll ? undefined : (e) => onTagDragStart(e, t)}
                onDragEnd={isAll ? undefined : onTagDragEnd}
                onDragOver={isAll ? undefined : (e) => onTagDragOver(e, t)}
                onDragLeave={isAll ? undefined : () => onTagDragLeave(t)}
                onDrop={isAll ? undefined : (e) => onTagDrop(e, t)}
                onClick={() => onTagClick(t)}
              >
                {t}
              </button>
            )
          })}
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
                : useStcnHeadlines
                  ? '正在加载证券时报首页头条（近7天）…'
                  : useEastmoneyHeadlines
                    ? '正在加载东方财富首页头条（近7天）…'
                    : useCsHeadlines
                      ? '正在加载中国证券报首页头条（近7天）…'
                      : useJqkaHeadlines
                        ? '正在加载同花顺财经头条（近7天）…'
                        : useTgbJiahong
                          ? '正在加载淘股吧快讯（加红，近7天）…'
                          : useEastmoneyYw
                            ? '正在加载东方财富快讯焦点（近3天）…'
                            : useCsCjyw
                              ? '正在加载中国证券报财经要闻（近3天）…'
                              : useJqkaAstock
                                ? '正在加载同花顺 A股快讯（近3天）…'
                                : useTgbQuanbu
                                  ? '正在加载淘股吧快讯（全部，近3天）…'
                                  : useStcnYw
                                    ? '正在加载证券时报要闻（近3天）…'
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
