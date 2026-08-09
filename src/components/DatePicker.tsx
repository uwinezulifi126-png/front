import { useState } from 'react'
import { TODAY } from '../data/mock'
import { IconPlaceholder } from './IconPlaceholder'

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

const CN_HOLIDAYS = new Set([
  '2025-01-01', '2025-01-28', '2025-01-29', '2025-01-30', '2025-01-31',
  '2025-02-03', '2025-02-04',
  '2025-04-04', '2025-04-05', '2025-04-06',
  '2025-05-01', '2025-05-02', '2025-05-05',
  '2025-05-31', '2025-06-02',
  '2025-10-01', '2025-10-02', '2025-10-03', '2025-10-06', '2025-10-07', '2025-10-08',
  '2026-01-01', '2026-01-02',
  '2026-02-17', '2026-02-18', '2026-02-19', '2026-02-20', '2026-02-23', '2026-02-24',
  '2026-04-04', '2026-04-05', '2026-04-06',
  '2026-05-01', '2026-05-04', '2026-05-05',
  '2026-06-19', '2026-06-22',
  '2026-10-01', '2026-10-02', '2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08',
])

const CN_MAKEUPS = new Set([
  '2025-01-26', '2025-02-08', '2025-04-27', '2025-09-28', '2025-10-11',
  '2026-02-15', '2026-02-28', '2026-04-12', '2026-09-27', '2026-10-10',
])

function isTradingDay(dateStr: string): boolean {
  if (CN_HOLIDAYS.has(dateStr)) return false
  const d = new Date(`${dateStr}T12:00:00`)
  const dow = d.getDay()
  if (dow === 0 || dow === 6) return CN_MAKEUPS.has(dateStr)
  return true
}

type DatePickerProps = {
  selectedDate: string
  onChange: (d: string) => void
}

export function DatePicker({ selectedDate, onChange }: DatePickerProps) {
  const [open, setOpen] = useState(false)
  const today = new Date(`${TODAY}T12:00:00`)
  const sel = new Date(`${selectedDate}T12:00:00`)
  const [viewYear, setViewYear] = useState(sel.getFullYear())
  const [viewMonth, setViewMonth] = useState(sel.getMonth())

  const isToday = selectedDate === TODAY
  const weekDay = WEEKDAYS[isNaN(sel.getTime()) ? 5 : sel.getDay()]
  const displayLabel = isToday ? `今日 ${selectedDate}` : selectedDate

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

  const isDisabled = (d: number) => {
    const ds = toDateStr(d)
    return new Date(`${ds}T12:00:00`) > today || !isTradingDay(ds)
  }

  return (
    <div className="date-picker">
      <button
        type="button"
        className={`date-picker-btn${isToday ? '' : ' accented'}`}
        onClick={() => setOpen((o) => !o)}
      >
        <IconPlaceholder kind="calendar" size={12} />
        <span>{displayLabel} 周{weekDay}</span>
        <span className="muted">▾</span>
      </button>
      {open && (
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
                  disabled={isDisabled(d)}
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
