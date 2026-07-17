import { describe, expect, it } from 'vitest'
import { calculateBmi, calculateDailyGoalMl, getBmiCategory, logDateInTimeZone } from '../water'

describe('calculateDailyGoalMl', () => {
  it('applies the normal activity multiplier (1.0)', () => {
    expect(calculateDailyGoalMl(60, 'normal')).toBe(2100) // 60 * 35 * 1.0
  })

  it('applies the sedentary activity multiplier (0.9)', () => {
    expect(calculateDailyGoalMl(60, 'sedentary')).toBe(1890) // 60 * 35 * 0.9
  })

  it('applies the active activity multiplier (1.15)', () => {
    expect(calculateDailyGoalMl(70, 'active')).toBe(2818) // round(70 * 35 * 1.15)
  })

  it('applies the very_active activity multiplier (1.3)', () => {
    expect(calculateDailyGoalMl(70, 'very_active')).toBe(3185) // round(70 * 35 * 1.3)
  })
})

describe('calculateBmi', () => {
  it('computes weight over height-in-meters squared', () => {
    expect(calculateBmi(70, 175)).toBe(22.9)
  })
})

describe('getBmiCategory', () => {
  it('flags below 18.5 as underweight', () => {
    expect(getBmiCategory(18.4).label).toBe('น้ำหนักน้อย')
  })

  it('flags 18.5-22.9 as normal', () => {
    expect(getBmiCategory(22.9).tone).toBe('good')
  })

  it('flags 23-24.9 as overweight (Asian BMI cutoff)', () => {
    expect(getBmiCategory(23).label).toBe('น้ำหนักเกิน')
  })

  it('flags 25 and above as obese', () => {
    expect(getBmiCategory(25).tone).toBe('alert')
  })
})

describe('logDateInTimeZone', () => {
  it('keeps a Bangkok evening on the same calendar day', () => {
    // 2026-07-17 20:00 UTC+7 == 2026-07-17 13:00 UTC
    const date = new Date('2026-07-17T13:00:00Z')
    expect(logDateInTimeZone(date, 'Asia/Bangkok')).toBe('2026-07-17')
  })

  it('rolls a late-night UTC moment into the next Bangkok day', () => {
    // 2026-07-17 23:30 UTC == 2026-07-18 06:30 Bangkok (UTC+7)
    const date = new Date('2026-07-17T23:30:00Z')
    expect(logDateInTimeZone(date, 'Asia/Bangkok')).toBe('2026-07-18')
  })
})
