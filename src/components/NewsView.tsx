import { useState } from 'react'
import { NEWS_DATA, NEWS_TAG_COLORS } from '../data/mock'
import { IconPlaceholder } from './IconPlaceholder'

export function NewsView() {
  const [selected, setSelected] = useState<number | null>(null)
  const [filterTag, setFilterTag] = useState<string | null>(null)
  const tags = Array.from(new Set(NEWS_DATA.map((n) => n.tag)))
  const filtered = filterTag ? NEWS_DATA.filter((n) => n.tag === filterTag) : NEWS_DATA

  return (
    <div className="split-view">
      <div className="split-side news-side">
        <div className="news-tags">
          <button
            type="button"
            className={`tag-chip${filterTag === null ? ' active' : ''}`}
            onClick={() => setFilterTag(null)}
          >
            全部
          </button>
          {tags.map((tag) => (
            <button
              key={tag}
              type="button"
              className={`tag-chip${filterTag === tag ? ' active' : ''}`}
              style={
                filterTag === tag
                  ? { color: NEWS_TAG_COLORS[tag], borderColor: NEWS_TAG_COLORS[tag], background: `${NEWS_TAG_COLORS[tag]}22` }
                  : undefined
              }
              onClick={() => setFilterTag(filterTag === tag ? null : tag)}
            >
              {tag}
            </button>
          ))}
        </div>
        <div className="news-list">
          {filtered.map((news) => {
            const idx = NEWS_DATA.indexOf(news)
            const active = selected === idx
            return (
              <button
                key={`${news.time}-${news.title}`}
                type="button"
                className={`news-item${active ? ' active' : ''}`}
                onClick={() => setSelected(active ? null : idx)}
              >
                <div className="news-meta">
                  <span className="mono muted">{news.time}</span>
                  <span className="news-tag" style={{ color: NEWS_TAG_COLORS[news.tag], background: `${NEWS_TAG_COLORS[news.tag]}22` }}>
                    {news.tag}
                  </span>
                  {news.urgent && <span className="news-urgent blink">重要</span>}
                </div>
                <div className="news-title">{news.title}</div>
              </button>
            )
          })}
        </div>
      </div>
      <div className="split-main">
        {selected !== null ? (
          <article className="news-article">
            <div className="news-meta">
              <span className="news-tag" style={{ color: NEWS_TAG_COLORS[NEWS_DATA[selected].tag], background: `${NEWS_TAG_COLORS[NEWS_DATA[selected].tag]}22` }}>
                {NEWS_DATA[selected].tag}
              </span>
              <span className="mono muted">今日 {NEWS_DATA[selected].time}</span>
            </div>
            <h2>{NEWS_DATA[selected].title}</h2>
            <p>{NEWS_DATA[selected].body}</p>
          </article>
        ) : (
          <div className="empty-state">
            <IconPlaceholder kind="empty" />
            <span className="mono">点击左侧新闻查看详情</span>
          </div>
        )}
      </div>
    </div>
  )
}
