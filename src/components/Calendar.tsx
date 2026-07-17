import { useEffect, useState } from 'react'
import { ChevronLeftIcon, ChevronRightIcon, CheckIcon } from '@heroicons/react/24/outline'
import { fetchMonthTotals, type DailyTotal } from '../lib/history'
import { todayInTimeZone } from '../lib/water'

const WEEKDAY_LABELS = ['จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส', 'อา']

interface CalendarProps {
  userId: string
  timezone: string
  dailyGoalMl: number
}

export function Calendar({ userId, timezone, dailyGoalMl }: CalendarProps) {
  const [year, setYear] = useState(() => new Date().getFullYear())
  const [month, setMonth] = useState(() => new Date().getMonth())
  const [totals, setTotals] = useState<Map<string, DailyTotal>>(new Map())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchMonthTotals(userId, year, month, dailyGoalMl)
      .then((result) => {
        if (!cancelled) setTotals(result)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [userId, year, month, dailyGoalMl])

  function prevMonth() {
    if (month === 0) {
      setMonth(11)
      setYear((y) => y - 1)
    } else {
      setMonth((m) => m - 1)
    }
  }

  function nextMonth() {
    if (month === 11) {
      setMonth(0)
      setYear((y) => y + 1)
    } else {
      setMonth((m) => m + 1)
    }
  }

  const today = todayInTimeZone(timezone)
  const firstOfMonth = new Date(Date.UTC(year, month, 1))
  const startWeekday = (firstOfMonth.getUTCDay() + 6) % 7 // Mon=0..Sun=6
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  const pad = (n: number) => String(n).padStart(2, '0')

  const cells: (DailyTotal | null)[] = Array.from({ length: startWeekday }, () => null)
  for (let day = 1; day <= daysInMonth; day++) {
    const date = `${year}-${pad(month + 1)}-${pad(day)}`
    cells.push(totals.get(date) ?? { date, totalMl: 0, goalMet: false })
  }

  const monthLabel = firstOfMonth.toLocaleDateString('th-TH', { month: 'long', year: 'numeric', timeZone: 'UTC' })

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <button
          onClick={prevMonth}
          aria-label="เดือนก่อนหน้า"
          className="rounded-full p-1.5 text-slate-400 transition hover:bg-water-50 hover:text-water-600"
        >
          <ChevronLeftIcon className="h-5 w-5" />
        </button>
        <h2 className="font-display text-sm font-medium text-water-700">{monthLabel}</h2>
        <button
          onClick={nextMonth}
          aria-label="เดือนถัดไป"
          className="rounded-full p-1.5 text-slate-400 transition hover:bg-water-50 hover:text-water-600"
        >
          <ChevronRightIcon className="h-5 w-5" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs text-slate-400">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="py-1">
            {label}
          </div>
        ))}
      </div>

      <div className={`grid grid-cols-7 gap-1 transition-opacity ${loading ? 'opacity-40' : ''}`}>
        {cells.map((cell, i) => {
          if (!cell) return <div key={`empty-${i}`} />
          const isFuture = cell.date > today
          const isToday = cell.date === today
          const dayNum = Number(cell.date.slice(-2))
          return (
            <div key={cell.date} className="flex items-center justify-center py-0.5">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium ${
                  isFuture ? 'text-slate-300' : cell.goalMet ? 'bg-water-500 text-white' : 'bg-slate-100 text-slate-400'
                } ${isToday ? 'ring-2 ring-coral-400 ring-offset-1' : ''}`}
              >
                {cell.goalMet && !isFuture ? <CheckIcon className="h-3.5 w-3.5" /> : dayNum}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
