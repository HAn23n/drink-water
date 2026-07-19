import { describe, expect, it } from 'vitest'
import { getRank, RANK_TIERS } from '../rank'

describe('getRank', () => {
  it('starts at tier 1 with zero points', () => {
    const rank = getRank(0)
    expect(rank.tier).toBe(1)
    expect(rank.name).toBe(RANK_TIERS[0].name)
  })

  it('promotes exactly at a tier threshold', () => {
    expect(getRank(6).tier).toBe(1)
    expect(getRank(7).tier).toBe(2)
  })

  it('reports progress toward the next tier', () => {
    // tier 2 spans 7..29 (22 points wide); 7 + 11 = 18 is halfway
    const rank = getRank(18)
    expect(rank.tier).toBe(2)
    expect(rank.nextTierPoints).toBe(30)
    expect(rank.progressRatio).toBeCloseTo(0.5, 1)
  })

  it('maxes out at the top tier with no next threshold', () => {
    const rank = getRank(1000)
    expect(rank.tier).toBe(RANK_TIERS.length)
    expect(rank.nextTierPoints).toBeNull()
    expect(rank.progressRatio).toBe(1)
  })
})
