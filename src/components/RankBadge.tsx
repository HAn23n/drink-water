import { useState } from 'react'
import { TrophyIcon, ShareIcon } from '@heroicons/react/24/solid'
import { getRank, RANK_TIERS } from '../lib/rank'
import { shareRankCard } from '../lib/shareCard'

interface RankBadgeProps {
  points: number
  variant?: 'compact' | 'card'
  /** Only used by the 'card' variant's share button. */
  displayName?: string
}

export function RankBadge({ points, variant = 'compact', displayName }: RankBadgeProps) {
  const rank = getRank(points)
  const [sharing, setSharing] = useState(false)

  async function handleShare() {
    setSharing(true)
    try {
      await shareRankCard({
        displayName: displayName ?? '',
        rankName: rank.name,
        tier: rank.tier,
        totalTiers: RANK_TIERS.length,
        points: rank.points,
        nextTierPoints: rank.nextTierPoints,
        progressRatio: rank.progressRatio,
      })
    } catch {
      // User cancelling the native share sheet also rejects — not a real error, ignore.
    } finally {
      setSharing(false)
    }
  }

  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-1 rounded-full px-3 py-1.5 shadow-md shadow-water-100 ${rank.bgClass}`}>
        <TrophyIcon className={`h-4 w-4 ${rank.toneClass}`} />
        <span className={`font-display text-xs font-semibold ${rank.toneClass}`}>{rank.name}</span>
      </div>
    )
  }

  return (
    <div className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-md shadow-water-100">
      <div className="flex items-center gap-3">
        <div className={`flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl ${rank.bgClass}`}>
          <TrophyIcon className={`h-7 w-7 ${rank.toneClass}`} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-slate-400">แรงค์ของคุณ</p>
          <p className="font-display text-lg font-semibold text-water-700">{rank.name}</p>
          <p className="text-xs text-slate-400">{rank.points.toLocaleString()} คะแนนสะสม</p>
        </div>
        <button
          onClick={handleShare}
          disabled={sharing}
          aria-label="แชร์แรงค์"
          className="flex-shrink-0 rounded-full bg-water-50 p-2.5 text-water-600 transition hover:bg-water-100 disabled:opacity-50"
        >
          <ShareIcon className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-4">
        <div className="h-2 w-full overflow-hidden rounded-full bg-water-50">
          <div
            className="h-full rounded-full bg-gradient-to-r from-water-400 to-water-600 transition-all"
            style={{ width: `${rank.progressRatio * 100}%` }}
          />
        </div>
        <p className="mt-1.5 text-right text-[11px] text-slate-400">
          {rank.nextTierPoints !== null
            ? `อีก ${(rank.nextTierPoints - rank.points).toLocaleString()} คะแนนถึงแรงค์ถัดไป`
            : 'แรงค์สูงสุดแล้ว 🎉'}
        </p>
      </div>
    </div>
  )
}
