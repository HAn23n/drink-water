export type ActivityLevel = 'sedentary' | 'normal' | 'active' | 'very_active'

const ML_PER_KG = 35

const ACTIVITY_MULTIPLIER: Record<ActivityLevel, number> = {
  sedentary: 0.9,
  normal: 1.0,
  active: 1.15,
  very_active: 1.3,
}

export function calculateDailyGoalMl(weightKg: number, activityLevel: ActivityLevel): number {
  return Math.round(weightKg * ML_PER_KG * ACTIVITY_MULTIPLIER[activityLevel])
}

export function calculateBmi(weightKg: number, heightCm: number): number {
  const heightM = heightCm / 100
  return Math.round((weightKg / (heightM * heightM)) * 10) / 10
}

export function todayInTimeZone(timeZone: string): string {
  // en-CA formats as YYYY-MM-DD, matching Postgres `date`.
  return new Intl.DateTimeFormat('en-CA', { timeZone }).format(new Date())
}

export function logDateInTimeZone(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone }).format(date)
}
