import { supabase } from './supabase'
import { logDateInTimeZone } from './water'

export interface DailyTotal {
  date: string
  totalMl: number
  goalMet: boolean
}

export async function fetchDailyTotals(
  userId: string,
  timezone: string,
  dailyGoalMl: number,
  days = 7,
): Promise<DailyTotal[]> {
  const today = new Date()
  const dates: string[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setUTCDate(d.getUTCDate() - i)
    dates.push(logDateInTimeZone(d, timezone))
  }

  const { data, error } = await supabase
    .from('water_logs')
    .select('log_date, amount_ml')
    .eq('user_id', userId)
    .gte('log_date', dates[0])
    .lte('log_date', dates[dates.length - 1])
  if (error) throw error

  const totalsByDate = new Map<string, number>()
  for (const row of data ?? []) {
    totalsByDate.set(row.log_date, (totalsByDate.get(row.log_date) ?? 0) + row.amount_ml)
  }

  return dates.map((date) => {
    const totalMl = totalsByDate.get(date) ?? 0
    return { date, totalMl, goalMet: totalMl >= dailyGoalMl }
  })
}

/** All days in a given calendar month (UTC-anchored, matching the `log_date` column). */
export async function fetchMonthTotals(
  userId: string,
  year: number,
  month: number, // 0-11
  dailyGoalMl: number,
): Promise<Map<string, DailyTotal>> {
  const lastDay = new Date(Date.UTC(year, month + 1, 0))
  const daysInMonth = lastDay.getUTCDate()
  const pad = (n: number) => String(n).padStart(2, '0')
  const startDate = `${year}-${pad(month + 1)}-01`
  const endDate = `${year}-${pad(month + 1)}-${pad(daysInMonth)}`

  const { data, error } = await supabase
    .from('water_logs')
    .select('log_date, amount_ml')
    .eq('user_id', userId)
    .gte('log_date', startDate)
    .lte('log_date', endDate)
  if (error) throw error

  const totalsByDate = new Map<string, number>()
  for (const row of data ?? []) {
    totalsByDate.set(row.log_date, (totalsByDate.get(row.log_date) ?? 0) + row.amount_ml)
  }

  const result = new Map<string, DailyTotal>()
  for (let day = 1; day <= daysInMonth; day++) {
    const date = `${year}-${pad(month + 1)}-${pad(day)}`
    const totalMl = totalsByDate.get(date) ?? 0
    result.set(date, { date, totalMl, goalMet: totalMl >= dailyGoalMl })
  }
  return result
}

/** Consecutive goal-met days counting back from today. Today doesn't break the
 *  streak while unmet, since the day isn't over yet. */
export function calculateStreak(dailyTotals: DailyTotal[]): number {
  let streak = 0
  for (let i = dailyTotals.length - 1; i >= 0; i--) {
    const isToday = i === dailyTotals.length - 1
    if (dailyTotals[i].goalMet) {
      streak++
    } else if (!isToday) {
      break
    }
  }
  return streak
}
