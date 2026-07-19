import { supabase } from './supabase'
import type { DailyTotal } from './history'

export interface StreakFreeze {
  id: string
  week_start: string
  applied_date: string
}

/** Monday of the calendar week containing `dateStr`, matching the app's
 *  Monday-start week convention (see Calendar.tsx's weekday labels). */
function getWeekStart(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  const dow = (date.getUTCDay() + 6) % 7 // Mon=0..Sun=6
  date.setUTCDate(date.getUTCDate() - dow)
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`
}

export async function fetchRecentStreakFreezes(userId: string, sinceDate: string): Promise<StreakFreeze[]> {
  const { data, error } = await supabase
    .from('streak_freezes')
    .select('id, week_start, applied_date')
    .eq('user_id', userId)
    .gte('applied_date', sinceDate)
  if (error) throw error
  return data ?? []
}

/** True if no freeze has been used yet for the calendar week containing `dateStr`. */
export async function hasFreezeAvailable(userId: string, dateStr: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('streak_freezes')
    .select('id')
    .eq('user_id', userId)
    .eq('week_start', getWeekStart(dateStr))
    .maybeSingle()
  if (error) throw error
  return !data
}

/** Protects `missedDate`'s streak continuity. The (user_id, week_start) unique
 *  constraint rejects a second attempt within the same calendar week. */
export async function useStreakFreeze(userId: string, missedDate: string): Promise<void> {
  const { error } = await supabase.from('streak_freezes').insert({
    user_id: userId,
    week_start: getWeekStart(missedDate),
    applied_date: missedDate,
  })
  if (error) throw error
}

/** The most recent day whose miss broke the streak — the one a freeze would
 *  protect — or null if the streak isn't currently broken by a recent miss.
 *  Mirrors calculateStreak's own backward walk so the two stay in sync. */
export function findBrokenStreakDay(dailyTotals: DailyTotal[], frozenDates: Set<string>): string | null {
  for (let i = dailyTotals.length - 1; i >= 0; i--) {
    const isToday = i === dailyTotals.length - 1
    const day = dailyTotals[i]
    if (day.goalMet || frozenDates.has(day.date) || isToday) continue
    return day.date
  }
  return null
}
