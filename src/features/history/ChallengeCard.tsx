import { useEffect, useState } from 'react'
import { FlagIcon } from '@heroicons/react/24/outline'
import {
  evaluateChallenge,
  fetchActiveChallenge,
  startChallenge,
  type Challenge,
} from '../../lib/challenges'
import { todayInTimeZone } from '../../lib/water'

const CHALLENGE_OPTIONS = [7, 14, 30]

interface ChallengeCardProps {
  userId: string
  timezone: string
  dailyGoalMl: number
}

interface Progress {
  daysElapsed: number
  daysMet: number
  status: Challenge['status']
}

export function ChallengeCard({ userId, timezone, dailyGoalMl }: ChallengeCardProps) {
  const [challenge, setChallenge] = useState<Challenge | null>(null)
  const [progress, setProgress] = useState<Progress | null>(null)
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const active = await fetchActiveChallenge(userId)
        if (cancelled) return
        setChallenge(active)
        if (active) {
          const result = await evaluateChallenge(userId, timezone, dailyGoalMl, active)
          if (!cancelled) setProgress(result)
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'โหลดไม่สำเร็จ')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()

    return () => {
      cancelled = true
    }
  }, [userId, timezone, dailyGoalMl])

  async function handleStart(days: number) {
    setStarting(true)
    setError(null)
    try {
      const today = todayInTimeZone(timezone)
      const created = await startChallenge(userId, days, today)
      setChallenge(created)
      setProgress({ daysElapsed: 1, daysMet: 0, status: 'active' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เริ่ม Challenge ไม่สำเร็จ')
    } finally {
      setStarting(false)
    }
  }

  if (loading) {
    return (
      <div className="rounded-3xl bg-white p-4 text-sm text-slate-400 shadow-md shadow-water-100">
        กำลังโหลด Challenge...
      </div>
    )
  }

  if (!challenge || progress?.status !== 'active') {
    return (
      <div className="rounded-3xl bg-white p-4 shadow-md shadow-water-100">
        <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold text-slate-700">
          <FlagIcon className="h-4 w-4 text-coral-500" />
          Challenge
        </h2>
        {progress?.status === 'completed' && challenge && (
          <p className="mb-2 text-sm text-water-600">🎉 ทำ Challenge {challenge.target_days} วันสำเร็จแล้ว!</p>
        )}
        {progress?.status === 'failed' && challenge && (
          <p className="mb-2 text-sm text-coral-500">Challenge {challenge.target_days} วันที่แล้วไม่สำเร็จ ลองใหม่ได้เลย</p>
        )}
        <p className="mb-3 text-xs text-slate-400">เลือกจำนวนวันที่อยากท้าทายตัวเอง ดื่มน้ำให้ครบเป้าทุกวันติดต่อกัน</p>
        <div className="flex gap-2">
          {CHALLENGE_OPTIONS.map((days) => (
            <button
              key={days}
              disabled={starting}
              onClick={() => handleStart(days)}
              className="flex-1 rounded-full bg-water-50 py-2 text-sm font-medium text-water-700 transition hover:bg-water-100 disabled:opacity-50"
            >
              {days} วัน
            </button>
          ))}
        </div>
        {error && <p className="mt-2 text-xs text-coral-500">{error}</p>}
      </div>
    )
  }

  const progressPercent = Math.min((progress.daysMet / challenge.target_days) * 100, 100)

  return (
    <div className="rounded-3xl bg-white p-4 shadow-md shadow-water-100">
      <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
        <FlagIcon className="h-4 w-4 text-coral-500" />
        Challenge {challenge.target_days} วัน
      </h2>
      <div className="mb-1 h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-water-400 to-water-600 transition-all"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
      <p className="text-xs text-slate-400">
        ครบเป้าแล้ว {progress.daysMet}/{challenge.target_days} วัน · วันที่ {progress.daysElapsed}
      </p>
      {error && <p className="mt-2 text-xs text-coral-500">{error}</p>}
    </div>
  )
}
