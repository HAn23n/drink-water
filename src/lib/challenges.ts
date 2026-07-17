import { supabase } from './supabase'
import { fetchDailyTotals } from './history'
import { todayInTimeZone } from './water'

export interface Challenge {
  id: string
  target_days: number
  started_date: string
  status: 'active' | 'completed' | 'failed'
}

export async function fetchActiveChallenge(userId: string): Promise<Challenge | null> {
  const { data, error } = await supabase
    .from('challenges')
    .select('id, target_days, started_date, status')
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle()
  if (error) throw error
  return data
}

export async function startChallenge(userId: string, targetDays: number, startedDate: string): Promise<Challenge> {
  const { data, error } = await supabase
    .from('challenges')
    .insert({ user_id: userId, target_days: targetDays, started_date: startedDate })
    .select('id, target_days, started_date, status')
    .single()
  if (error) throw error
  return data
}

/**
 * Evaluates an active challenge: it fails as soon as any already-completed
 * day within the window missed the goal, and completes once the full
 * target_days window has elapsed without a miss. "Today" is never judged
 * since it isn't over yet. Persists a resolved status when it changes.
 */
export async function evaluateChallenge(
  userId: string,
  timezone: string,
  dailyGoalMl: number,
  challenge: Challenge,
): Promise<{ daysElapsed: number; daysMet: number; onTrack: boolean; status: Challenge['status'] }> {
  const today = todayInTimeZone(timezone)
  const startedAt = new Date(`${challenge.started_date}T00:00:00`)
  const daysSinceStart = Math.floor((Date.now() - startedAt.getTime()) / 86_400_000) + 1
  const daysElapsed = Math.min(daysSinceStart, challenge.target_days)

  const totals = await fetchDailyTotals(userId, timezone, dailyGoalMl, Math.max(daysSinceStart, 1))
  const relevant = totals.filter((d) => d.date >= challenge.started_date && d.date <= today)
  const pastDays = relevant.filter((d) => d.date < today)
  const daysMet = relevant.filter((d) => d.goalMet).length

  const failed = pastDays.some((d) => !d.goalMet)
  const windowElapsed = daysSinceStart > challenge.target_days

  const status: Challenge['status'] = failed ? 'failed' : windowElapsed ? 'completed' : 'active'

  if (status !== 'active' && challenge.status === 'active') {
    await supabase.from('challenges').update({ status }).eq('id', challenge.id)
  }

  return { daysElapsed, daysMet, onTrack: !failed, status }
}
