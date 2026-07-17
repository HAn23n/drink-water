import { supabase } from './supabase'

export type DrinkType = 'beer' | 'wine' | 'spirit' | 'other'

export interface AlcoholLog {
  id: string
  drink_type: DrinkType
  amount_ml: number
  logged_at: string
  log_date: string
}

export const DRINK_TYPE_OPTIONS: { value: DrinkType; label: string; amount_ml: number }[] = [
  { value: 'beer', label: 'เบียร์ (1 กระป๋อง)', amount_ml: 330 },
  { value: 'wine', label: 'ไวน์ (1 แก้ว)', amount_ml: 150 },
  { value: 'spirit', label: 'สุรา (1 แชท)', amount_ml: 45 },
  { value: 'other', label: 'อื่นๆ', amount_ml: 250 },
]

/** Record-only — does not affect the water goal or totals. */
export async function addAlcoholLog(userId: string, drinkType: DrinkType, amountMl: number, logDate: string): Promise<void> {
  const { error } = await supabase.from('alcohol_logs').insert({
    user_id: userId,
    drink_type: drinkType,
    amount_ml: amountMl,
    log_date: logDate,
  })
  if (error) throw error
}

export async function fetchAlcoholLogsForDate(userId: string, logDate: string): Promise<AlcoholLog[]> {
  const { data, error } = await supabase
    .from('alcohol_logs')
    .select('id, drink_type, amount_ml, logged_at, log_date')
    .eq('user_id', userId)
    .eq('log_date', logDate)
    .order('logged_at', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function deleteAlcoholLog(id: string): Promise<void> {
  const { error } = await supabase.from('alcohol_logs').delete().eq('id', id)
  if (error) throw error
}
