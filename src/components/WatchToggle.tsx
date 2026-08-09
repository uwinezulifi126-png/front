import type { MouseEvent } from 'react'
import type { WatchInput } from '../hooks/useWatchlist'

type WatchToggleProps = {
  stock: WatchInput
  watched: boolean
  onToggle: (stock: WatchInput) => void
  /** compact star button vs text label */
  variant?: 'star' | 'text'
  className?: string
}

export function WatchToggle({
  stock,
  watched,
  onToggle,
  variant = 'star',
  className = '',
}: WatchToggleProps) {
  const handle = (e: MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    onToggle(stock)
  }

  if (variant === 'star') {
    return (
      <button
        type="button"
        className={`watch-btn${watched ? ' on' : ''}${className ? ` ${className}` : ''}`}
        onClick={handle}
        title={watched ? '取消自选' : '添加自选'}
      >
        {watched ? '★' : '☆'}
      </button>
    )
  }

  return (
    <button
      type="button"
      className={`watch-text-btn${watched ? ' on' : ''}${className ? ` ${className}` : ''}`}
      onClick={handle}
      title={watched ? '取消自选' : '添加自选'}
    >
      {watched ? '已自选' : '添加自选'}
    </button>
  )
}
