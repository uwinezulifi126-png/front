import { useMemo, useState } from 'react'
import { IconPlaceholder } from './IconPlaceholder'

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

type DatePickerProps = {
  selectedDate: string
  /** ISO dates from /api/calendar/recent (desc). Empty = no picker days. */
  tradeDates: string[]
  today: string
  onChange: (d: string) => void
}

export function DatePicker({ selectedDate, tradeDates, today, onChange }: DatePickerProps) {
  const [open, setOpen] = useState(false)
  const allowed = useMemo(() => new Set(tradeDates), [tradeDates])
  const sel = selectedDate ? new Date(`${selectedDate}T12:00:00`) : new Date()
  const [viewYear, setViewYear] = useState(sel.getFullYear())
  const [viewMonth, setViewMonth] = useState(sel.getMonth())

  const isToday = Boolean(today && selectedDate === today)
  const weekDay = WEEKDAYS[isNaN(sel.getTime()) ? 0 : sel.getDay()]
  const displayLabel = !selectedDate
    ? '选择日期'
    : isToday
      ? `今日 ${selectedDate}`
      : selectedDate

  const firstDay = new Date(viewYear, viewMonth, 1).getDay()
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  const toDateStr = (d: number) => {
    const mm = String(viewMonth + 1).padStart(2, '0')
    const dd = String(d).padStart(2, '0')
    return `${viewYear}-${mm}-${dd}`
  }

  return (
    <div className="date-picker">
      <button
        type="button"
        className={`date-picker-btn${isToday ? '' : ' accented'}`}
        onClick={() => setOpen((o) => !o)}
        disabled={tradeDates.length === 0}
      >
        <IconPlaceholder kind="calendar" size={12} />
        <span>
          {displayLabel}
          {selectedDate ? ` 周${weekDay}` : ''}
        </span>
        <span className="muted">▾</span>
      </button>
      {open && tradeDates.length > 0 && (
        <div className="date-picker-panel">
          <div className="date-picker-nav">
            <button
              type="button"
              onClick={() => {
                if (viewMonth === 0) {
                  setViewYear((y) => y - 1)
                  setViewMonth(11)
                } else setViewMonth((m) => m - 1)
              }}
            >
              ◀
            </button>
            <span className="mono">
              {viewYear}-{String(viewMonth + 1).padStart(2, '0')}
            </span>
            <button
              type="button"
              onClick={() => {
                if (viewMonth === 11) {
                  setViewYear((y) => y + 1)
                  setViewMonth(0)
                } else setViewMonth((m) => m + 1)
              }}
            >
              ▶
            </button>
          </div>
          <div className="date-picker-weekdays">
            {WEEKDAYS.map((w) => (
              <span key={w}>{w}</span>
            ))}
          </div>
          <div className="date-picker-grid">
            {cells.map((d, i) =>
              d === null ? (
                <span key={`e-${i}`} />
              ) : (
                <button
                  key={d}
                  type="button"
                  disabled={!allowed.has(toDateStr(d))}
                  className={toDateStr(d) === selectedDate ? 'selected' : ''}
                  onClick={() => {
                    onChange(toDateStr(d))
                    setOpen(false)
                  }}
                >
                  {d}
                </button>
              ),
            )}
          </div>
        </div>
      )}
    </div>
  )
}
