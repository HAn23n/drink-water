import { describe, expect, it } from 'vitest'
import { buildPacingSlots, calculateExpectedProgress } from '../pacing'

describe('calculateExpectedProgress', () => {
  it('expects 0 before the window starts', () => {
    const now = 7 * 60 // 07:00
    expect(calculateExpectedProgress('08:00', '22:00', 2000, now)).toEqual({
      expectedMl: 0,
      progressRatio: 0,
    })
  })

  it('expects the full goal after the window ends', () => {
    const now = 23 * 60 // 23:00
    expect(calculateExpectedProgress('08:00', '22:00', 2000, now)).toEqual({
      expectedMl: 2000,
      progressRatio: 1,
    })
  })

  it('expects half the goal at the window midpoint', () => {
    const now = 15 * 60 // 15:00, midpoint of 08:00-22:00
    const result = calculateExpectedProgress('08:00', '22:00', 2000, now)
    expect(result.progressRatio).toBeCloseTo(0.5, 2)
    expect(result.expectedMl).toBe(1000)
  })

  it('handles a window that wraps past midnight', () => {
    // 22:00-06:00 window, checked at 02:00 (4 hours into an 8-hour window)
    const now = 2 * 60
    const result = calculateExpectedProgress('22:00', '06:00', 800, now)
    expect(result.progressRatio).toBeCloseTo(0.5, 2)
  })
})

describe('buildPacingSlots', () => {
  it('marks slots done once the logged total reaches their target', () => {
    const slots = buildPacingSlots('08:00', '22:00', 2000, 4, 1000)
    expect(slots).toHaveLength(4)
    expect(slots.map((s) => s.done)).toEqual([true, true, false, false])
    expect(slots[3].targetMl).toBe(2000)
  })

  it('marks no slots done when nothing has been logged', () => {
    const slots = buildPacingSlots('08:00', '22:00', 2000, 4, 0)
    expect(slots.every((s) => !s.done)).toBe(true)
  })

  it('raises remaining targets when behind the even pace', () => {
    // Even split would be 500/1000/1500/2000 — only 300ml logged, behind slot 1.
    const slots = buildPacingSlots('08:00', '22:00', 2000, 4, 300)
    expect(slots.every((s) => !s.done)).toBe(true)
    expect(slots.map((s) => s.targetMl)).toEqual([725, 1150, 1575, 2000])
  })

  it('lowers remaining targets when ahead of the even pace', () => {
    // 1200ml already logged clears slots 1-2 (500, 1000); remaining 800ml splits over slots 3-4.
    const slots = buildPacingSlots('08:00', '22:00', 2000, 4, 1200)
    expect(slots.map((s) => s.done)).toEqual([true, true, false, false])
    expect(slots.map((s) => s.targetMl)).toEqual([500, 1000, 1600, 2000])
  })

  it('the last slot always targets the full daily goal', () => {
    const slots = buildPacingSlots('08:00', '22:00', 2697, 4, 2150)
    expect(slots[3].targetMl).toBe(2697)
  })
})
