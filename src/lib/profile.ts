import { supabase } from './supabase'
import type { ActivityLevel } from './water'

export interface Profile {
  id: string
  display_name: string
  weight_kg: number | null
  height_cm: number | null
  activity_level: ActivityLevel
  daily_goal_ml: number
  glass_size_ml: number
  bottle_size_ml: number
  reminder_enabled: boolean
  reminder_interval_min: number
  reminder_start: string
  reminder_end: string
  timezone: string
  onboarded: boolean
}

export async function fetchProfile(userId: string): Promise<Profile> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single()
  if (error) throw error
  return data as Profile
}

export async function updateProfile(userId: string, patch: Partial<Profile>): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .update(patch)
    .eq('id', userId)
    .select('*')
    .single()
  if (error) throw error
  return data as Profile
}
