import { supabase } from './supabase'
import { logDateInTimeZone } from './water'
import { otherDrinkGoalCompensation, otherDrinkWaterCredit } from './otherDrinks'

export interface DailyTotal {
  date: string
  /** Raw plain-water volume logged that day (what the charts plot). */
  totalMl: number
  /** totalMl plus water credit from that day's sweet/caffeinated drinks — this is
   *  what actually counts toward the goal. */
  effectiveMl: number
  /** The day's goal after compensation for sweet/caffeinated drinks logged. */
  effectiveGoalMl: number
  goalMet: boolean
}

function sumByDate(rows: { log_date: string; amount_ml: number }[]): Map<string, number> {
  const byDate = new Map<string, number>()
  for (const row of rows) {
    byDate.set(row.log_date, (byDate.get(row.log_date) ?? 0) + row.amount_ml)
  }
  return byDate
}

function toDailyTotal(date: string, waterMl: number, otherMl: number, dailyGoalMl: number): DailyTotal {
  const effectiveMl = waterMl + otherDrinkWaterCredit(otherMl)
  const effectiveGoalMl = dailyGoalMl + otherDrinkGoalCompensation(otherMl)
  return { date, totalMl: waterMl, effectiveMl, effectiveGoalMl, goalMet: effectiveMl >= effectiveGoalMl }
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

  const [{ data: waterRows, error: waterError }, { data: otherRows, error: otherError }] = await Promise.all([
    supabase
      .from('water_logs')
      .select('log_date, amount_ml')
      .eq('user_id', userId)
      .gte('log_date', dates[0])
      .lte('log_date', dates[dates.length - 1]),
    supabase
      .from('other_drink_logs')
      .select('log_date, amount_ml')
      .eq('user_id', userId)
      .gte('log_date', dates[0])
      .lte('log_date', dates[dates.length - 1]),
  ])
  if (waterError) throw waterError
  if (otherError) throw otherError

  const waterByDate = sumByDate(waterRows ?? [])
  const otherByDate = sumByDate(otherRows ?? [])

  return dates.map((date) => toDailyTotal(date, waterByDate.get(date) ?? 0, otherByDate.get(date) ?? 0, dailyGoalMl))
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

  const [{ data: waterRows, error: waterError }, { data: otherRows, error: otherError }] = await Promise.all([
    supabase
      .from('water_logs')
      .select('log_date, amount_ml')
      .eq('user_id', userId)
      .gte('log_date', startDate)
      .lte('log_date', endDate),
    supabase
      .from('other_drink_logs')
      .select('log_date, amount_ml')
      .eq('user_id', userId)
      .gte('log_date', startDate)
      .lte('log_date', endDate),
  ])
  if (waterError) throw waterError
  if (otherError) throw otherError

  const waterByDate = sumByDate(waterRows ?? [])
  const otherByDate = sumByDate(otherRows ?? [])

  const result = new Map<string, DailyTotal>()
  for (let day = 1; day <= daysInMonth; day++) {
    const date = `${year}-${pad(month + 1)}-${pad(day)}`
    result.set(date, toDailyTotal(date, waterByDate.get(date) ?? 0, otherByDate.get(date) ?? 0, dailyGoalMl))
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

/** Total count of every day (ever) whose goal was met — used for the all-time
 *  rank, so an off day doesn't cost progress the way a streak would. Retroactively
 *  applies today's goal/ratios to past days, same simplification the streak and
 *  badge tiers already make. */
export async function fetchRankPoints(userId: string, dailyGoalMl: number): Promise<number> {
  const [{ data: waterRows, error: waterError }, { data: otherRows, error: otherError }] = await Promise.all([
    supabase.from('water_logs').select('log_date, amount_ml').eq('user_id', userId),
    supabase.from('other_drink_logs').select('log_date, amount_ml').eq('user_id', userId),
  ])
  if (waterError) throw waterError
  if (otherError) throw otherError

  const waterByDate = sumByDate(waterRows ?? [])
  const otherByDate = sumByDate(otherRows ?? [])
  const allDates = new Set([...waterByDate.keys(), ...otherByDate.keys()])

  let points = 0
  for (const date of allDates) {
    if (toDailyTotal(date, waterByDate.get(date) ?? 0, otherByDate.get(date) ?? 0, dailyGoalMl).goalMet) points++
  }
  return points
}
