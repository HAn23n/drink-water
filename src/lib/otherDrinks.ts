import { supabase } from './supabase'

export type OtherDrinkType = 'coffee' | 'tea' | 'milk_tea' | 'smoothie' | 'other'

export interface OtherDrinkLog {
  id: string
  drink_type: OtherDrinkType
  amount_ml: number
  logged_at: string
  log_date: string
}

export const OTHER_DRINK_OPTIONS: { value: OtherDrinkType; label: string; amount_ml: number }[] = [
  { value: 'coffee', label: 'กาแฟ', amount_ml: 250 },
  { value: 'tea', label: 'ชา', amount_ml: 250 },
  { value: 'milk_tea', label: 'ชานม', amount_ml: 350 },
  { value: 'smoothie', label: 'ปั่น', amount_ml: 400 },
  { value: 'other', label: 'อื่นๆ', amount_ml: 300 },
]

/** These are mostly water, but caffeine/sugar make them less hydrating than
 *  plain water — only half the volume counts toward the daily goal. */
export const OTHER_DRINK_WATER_CREDIT_RATIO = 0.5

/** Caffeine's mild diuretic effect and sugar both call for extra plain water,
 *  so each log nudges the day's effective goal up rather than just capping the
 *  credit. Tolerance varies by person, so this is a default — the real value
 *  users see comes from their own profile.caffeine_compensation_ratio. */
export const OTHER_DRINK_GOAL_COMPENSATION_RATIO = 0.3

/** Presets for the Profile picker — "how much extra water do I personally need
 *  per ml of coffee/tea/etc" (people who tolerate caffeine well can dial it down). */
export const COMPENSATION_RATIO_PRESETS = [
  { label: 'น้อย', ratio: 0.15 },
  { label: 'กลาง', ratio: 0.3 },
  { label: 'เยอะ', ratio: 0.45 },
] as const

export function otherDrinkWaterCredit(totalAmountMl: number): number {
  return Math.round(totalAmountMl * OTHER_DRINK_WATER_CREDIT_RATIO)
}

export function otherDrinkGoalCompensation(
  totalAmountMl: number,
  compensationRatio: number = OTHER_DRINK_GOAL_COMPENSATION_RATIO,
): number {
  return Math.round(totalAmountMl * compensationRatio)
}

export async function addOtherDrinkLog(
  userId: string,
  drinkType: OtherDrinkType,
  amountMl: number,
  logDate: string,
): Promise<void> {
  const { error } = await supabase.from('other_drink_logs').insert({
    user_id: userId,
    drink_type: drinkType,
    amount_ml: amountMl,
    log_date: logDate,
  })
  if (error) throw error
}

export async function fetchOtherDrinkLogsForDate(userId: string, logDate: string): Promise<OtherDrinkLog[]> {
  const { data, error } = await supabase
    .from('other_drink_logs')
    .select('id, drink_type, amount_ml, logged_at, log_date')
    .eq('user_id', userId)
    .eq('log_date', logDate)
    .order('logged_at', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function deleteOtherDrinkLog(id: string): Promise<void> {
  const { error } = await supabase.from('other_drink_logs').delete().eq('id', id)
  if (error) throw error
}
