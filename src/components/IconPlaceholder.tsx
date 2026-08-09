type IconPlaceholderProps = {
  kind?: 'refresh' | 'chart' | 'logo' | 'calendar' | 'empty' | 'generic'
  className?: string
  size?: number
}

/** 图标占位：待从 Figma 导出正式资源后替换 */
export function IconPlaceholder({
  kind = 'generic',
  className = 'icon-placeholder',
  size = 12,
}: IconPlaceholderProps) {
  if (kind === 'logo') {
    return (
      <span
        className={`${className} icon-logo`}
        data-asset="logo"
        style={{ width: size, height: size }}
        aria-hidden
        title="待导出资源: logo"
      >
        <svg viewBox="0 0 24 24" width={size} height={size} xmlns="http://www.w3.org/2000/svg">
          <rect width="24" height="24" rx="2" fill="#1a2030" stroke="#e53e3e" strokeWidth="1" />
          <text x="12" y="16" textAnchor="middle" fontSize="10" fontFamily="monospace" fill="#fc5252">
            L
          </text>
        </svg>
      </span>
    )
  }

  if (kind === 'calendar') {
    return (
      <span className={className} data-asset="calendar-icon" style={{ width: size, height: size }} aria-hidden title="待导出资源: calendar-icon">
        <svg viewBox="0 0 12 12" width={size} height={size} xmlns="http://www.w3.org/2000/svg">
          <rect x="1" y="2" width="10" height="9" rx="1" fill="none" stroke="#94a3b8" strokeWidth="1" />
          <path d="M1 5h10M4 1v2M8 1v2" stroke="#94a3b8" strokeWidth="1" fill="none" />
        </svg>
      </span>
    )
  }

  if (kind === 'empty') {
    return (
      <span className={`${className} large`} data-asset="empty-state-icon" aria-hidden title="待导出资源: empty-state-icon">
        <svg viewBox="0 0 28 28" width={28} height={28} xmlns="http://www.w3.org/2000/svg">
          <rect x="4" y="8" width="20" height="14" rx="2" fill="none" stroke="#64748b" strokeWidth="1.5" />
          <path d="M8 14h12M8 18h8" stroke="#64748b" strokeWidth="1.5" />
        </svg>
      </span>
    )
  }

  if (kind === 'refresh') {
    return (
      <span className={className} data-asset="refresh-icon" aria-hidden title="待导出资源: refresh-icon">
        <svg viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg">
          <path
            fill="#94a3b8"
            d="M10 6a4 4 0 0 1-6.9 2.8l.9-.9A2.8 2.8 0 1 0 3.2 5H1.5A4 4 0 1 1 10 6Zm0-1.5V1L8.2 2.8A4 4 0 0 0 2 5h1.7a2.8 2.8 0 0 1 4.6-1.7L10 4.5Z"
          />
        </svg>
      </span>
    )
  }

  if (kind === 'chart') {
    return (
      <span className={className} aria-hidden>
        <svg viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg">
          <rect x="4" y="14" width="4" height="10" fill="#64748b" />
          <rect x="12" y="8" width="4" height="16" fill="#64748b" />
          <rect x="20" y="4" width="4" height="20" fill="#64748b" />
        </svg>
      </span>
    )
  }

  return <span className={`${className} icon-block`} aria-hidden />
}
