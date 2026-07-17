export type ActivityLevel = 'sedentary' | 'normal' | 'active' | 'very_active'

const ML_PER_KG = 35

const ACTIVITY_MULTIPLIER: Record<ActivityLevel, number> = {
  sedentary: 0.9,
  normal: 1.0,
  active: 1.15,
  very_active: 1.3,
}

export const ACTIVITY_OPTIONS: { value: ActivityLevel; label: string }[] = [
  { value: 'sedentary', label: 'ไม่ค่อยออกกำลังกาย (นั่งทำงานทั้งวัน)' },
  { value: 'normal', label: 'ขยับตัวทั่วไป (เดิน/ทำงานบ้านบ้าง)' },
  { value: 'active', label: 'ออกกำลังกาย 3-5 วัน/สัปดาห์' },
  { value: 'very_active', label: 'ออกกำลังกายหนักแทบทุกวัน/ใช้แรงงานหนัก' },
]

export type BmiTone = 'low' | 'good' | 'warn' | 'alert'

export function getBmiCategory(bmi: number): { label: string; tone: BmiTone } {
  if (bmi < 18.5) return { label: 'น้ำหนักน้อย', tone: 'low' }
  if (bmi < 23) return { label: 'น้ำหนักปกติ', tone: 'good' }
  if (bmi < 25) return { label: 'น้ำหนักเกิน', tone: 'warn' }
  if (bmi < 30) return { label: 'อ้วนระดับ 1', tone: 'alert' }
  return { label: 'อ้วนระดับ 2', tone: 'alert' }
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
