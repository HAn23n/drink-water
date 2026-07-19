export interface RankTier {
  tier: number
  name: string
  minPoints: number
  toneClass: string
  bgClass: string
}

/** All-time rank, 5 tiers by cumulative "goal met" days (fetchRankPoints in
 *  history.ts) — deliberately not streak-based, so one off day doesn't cost
 *  progress the way it would for a streak. */
export const RANK_TIERS: RankTier[] = [
  { tier: 1, name: 'มือใหม่หัดจิบ', minPoints: 0, toneClass: 'text-water-600', bgClass: 'bg-water-100' },
  { tier: 2, name: 'สายชิลจิบน้ำ', minPoints: 7, toneClass: 'text-water-700', bgClass: 'bg-water-100' },
  { tier: 3, name: 'ตัวแม่สายชุ่ม', minPoints: 30, toneClass: 'text-white', bgClass: 'bg-water-500' },
  { tier: 4, name: 'เทพสายน้ำ', minPoints: 100, toneClass: 'text-white', bgClass: 'bg-water-700' },
  { tier: 5, name: 'ตำนานสายชุ่ม', minPoints: 300, toneClass: 'text-white', bgClass: 'bg-gradient-to-br from-coral-500 to-sun-400' },
]

export interface Rank {
  tier: number
  name: string
  points: number
  toneClass: string
  bgClass: string
  /** Points needed for the next tier, or null once at the top tier. */
  nextTierPoints: number | null
  /** 0-1 progress toward the next tier; 1 (maxed) at the top tier. */
  progressRatio: number
}

export function getRank(points: number): Rank {
  let current = RANK_TIERS[0]
  for (const t of RANK_TIERS) {
    if (points >= t.minPoints) current = t
    else break
  }
  const next = RANK_TIERS[RANK_TIERS.indexOf(current) + 1] ?? null
  const progressRatio = next
    ? Math.min(1, Math.max(0, (points - current.minPoints) / (next.minPoints - current.minPoints)))
    : 1

  return {
    tier: current.tier,
    name: current.name,
    points,
    toneClass: current.toneClass,
    bgClass: current.bgClass,
    nextTierPoints: next ? next.minPoints : null,
    progressRatio,
  }
}
