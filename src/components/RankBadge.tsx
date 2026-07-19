import { TrophyIcon } from '@heroicons/react/24/solid'
import { getRank } from '../lib/rank'

interface RankBadgeProps {
  points: number
  variant?: 'compact' | 'card'
}

export function RankBadge({ points, variant = 'compact' }: RankBadgeProps) {
  const rank = getRank(points)

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
