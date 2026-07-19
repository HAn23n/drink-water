import { describe, expect, it } from 'vitest'
import { calculateStreak, type DailyTotal } from '../history'

function day(totalMl: number, goalMet: boolean): DailyTotal {
  return {
    date: '2026-01-01',
    totalMl,
    effectiveMl: totalMl,
    effectiveGoalMl: goalMet ? totalMl : totalMl + 1,
    goalMet,
  }
}

describe('calculateStreak', () => {
  it('counts consecutive met days ending today', () => {
    const totals = [day(0, false), day(2000, true), day(2000, true), day(2000, true)]
    expect(calculateStreak(totals)).toBe(3)
  })

  it('does not let an unfinished today break the streak', () => {
    const totals = [day(0, false), day(2000, true), day(2000, true), day(500, false)]
    expect(calculateStreak(totals)).toBe(2)
  })

  it('breaks the streak on a missed earlier day', () => {
    const totals = [day(2000, true), day(0, false), day(2000, true), day(2000, true)]
    expect(calculateStreak(totals)).toBe(2)
  })

  it('is zero when nothing has ever been met', () => {
    const totals = [day(0, false), day(0, false), day(0, false)]
    expect(calculateStreak(totals)).toBe(0)
  })
})
