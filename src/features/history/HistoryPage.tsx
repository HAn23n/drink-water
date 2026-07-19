import { useEffect, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { FireIcon, CheckCircleIcon, ArrowTrendingUpIcon, TrophyIcon, SparklesIcon, ShareIcon } from '@heroicons/react/24/solid'
import { LoadingScreen, ErrorScreen } from '../../components/LoadingScreen'
import { Calendar } from '../../components/Calendar'
import { ChallengeCard } from './ChallengeCard'
import { useAuth } from '../../lib/AuthContext'
import { fetchProfile, updateProfile, type Profile } from '../../lib/profile'
import { calculateStreak, fetchDailyTotals, fetchMonthlyAverages, type DailyTotal, type MonthlyAverage } from '../../lib/history'
import { fetchRecentStreakFreezes } from '../../lib/streakFreeze'
import { shareProgressCard } from '../../lib/shareCard'

const RANGE_OPTIONS = [7, 14, 30] as const
type RangeDays = (typeof RANGE_OPTIONS)[number]

const BADGE_TIERS = [
  { days: 7, label: '7 วัน', Icon: FireIcon, color: 'text-coral-500', bg: 'bg-coral-100' },
  { days: 30, label: '30 วัน', Icon: TrophyIcon, color: 'text-sun-400', bg: 'bg-sun-300/40' },
  { days: 100, label: '100 วัน', Icon: SparklesIcon, color: 'text-water-600', bg: 'bg-water-100' },
]

function formatShortDate(isoDate: string) {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })
}

export function HistoryPage() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [allTotals, setAllTotals] = useState<DailyTotal[]>([])
  const [frozenDates, setFrozenDates] = useState<Set<string>>(new Set())
  const [monthlyAverages, setMonthlyAverages] = useState<MonthlyAverage[]>([])
  const [rangeDays, setRangeDays] = useState<RangeDays>(7)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sharing, setSharing] = useState(false)

  useEffect(() => {
    if (!user) return
    let cancelled = false

    async function load() {
      try {
        const loadedProfile = await fetchProfile(user!.id)
        if (cancelled) return
        setProfile(loadedProfile)
        // Always fetch enough history to evaluate the longest badge tier,
        // then slice down to whatever range the user has selected to view.
        const totals = await fetchDailyTotals(
          user!.id,
          loadedProfile.timezone,
          loadedProfile.daily_goal_ml,
          100,
          loadedProfile.caffeine_compensation_ratio,
        )
        if (!cancelled) setAllTotals(totals)
        if (totals.length > 0) {
          const freezes = await fetchRecentStreakFreezes(user!.id, totals[0].date)
          if (!cancelled) setFrozenDates(new Set(freezes.map((f) => f.applied_date)))
        }
        const monthly = await fetchMonthlyAverages(
          user!.id,
          loadedProfile.timezone,
          loadedProfile.daily_goal_ml,
          6,
          loadedProfile.caffeine_compensation_ratio,
        )
        if (!cancelled) setMonthlyAverages(monthly)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'โหลดข้อมูลไม่สำเร็จ')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()

    return () => {
      cancelled = true
    }
  }, [user])

  const streak = calculateStreak(allTotals, frozenDates)

  // Persist a new personal-best streak so badges stay unlocked after it later breaks.
  useEffect(() => {
    if (!user || !profile) return
    if (streak > profile.longest_streak_days) {
      updateProfile(user.id, { longest_streak_days: streak }).then(setProfile).catch(() => {})
    }
  }, [user, profile, streak])

  if (loading) return <LoadingScreen />
  if (!profile) {
    return <ErrorScreen message={error ?? 'โหลดข้อมูลไม่สำเร็จ'} onRetry={() => window.location.reload()} />
  }

  const dailyTotals = allTotals.slice(-rangeDays)
  const daysMet = dailyTotals.filter((d) => d.goalMet).length
  const avgMl = dailyTotals.length
    ? Math.round(dailyTotals.reduce((sum, d) => sum + d.totalMl, 0) / dailyTotals.length)
    : 0
  const bestDay = dailyTotals.reduce<DailyTotal | null>(
    (best, d) => (!best || d.totalMl > best.totalMl ? d : best),
    null,
  )
  const longestStreak = Math.max(streak, profile.longest_streak_days)
  const todayTotal = allTotals[allTotals.length - 1]

  const chartData = dailyTotals.map((d) => ({
    date: formatShortDate(d.date),
    ml: d.totalMl,
    goalMet: d.goalMet,
  }))

  async function handleShare() {
    if (!profile || !todayTotal) return
    setSharing(true)
    try {
      await shareProgressCard({
        displayName: profile.display_name,
        totalMl: todayTotal.effectiveMl,
        goalMl: todayTotal.effectiveGoalMl,
        percent: todayTotal.effectiveGoalMl > 0 ? (todayTotal.effectiveMl / todayTotal.effectiveGoalMl) * 100 : 0,
        streak: longestStreak,
      })
    } catch {
      // User cancelling the native share sheet also rejects — not a real error, ignore.
    } finally {
      setSharing(false)
    }
  }

  return (
    <div className="flex min-h-full flex-col gap-6 bg-water-50 px-6 py-10">
      {error && <p className="text-sm text-coral-500">{error}</p>}

      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {RANGE_OPTIONS.map((d) => (
            <button
              key={d}
              onClick={() => setRangeDays(d)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                rangeDays === d ? 'bg-water-500 text-white shadow-md shadow-water-500/30' : 'bg-white text-slate-500 shadow-sm hover:bg-water-50'
              }`}
            >
              {d} วัน
            </button>
          ))}
        </div>
        <button
          onClick={handleShare}
          disabled={sharing}
          aria-label="แชร์ความคืบหน้า"
          className="rounded-full bg-white p-2.5 text-water-600 shadow-sm transition hover:bg-water-50 disabled:opacity-50"
        >
          <ShareIcon className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col items-center gap-1 rounded-3xl bg-white p-4 text-center shadow-md shadow-water-100">
          <FireIcon className="h-5 w-5 text-coral-500" />
          <p className="font-display text-2xl font-semibold text-water-700">{streak}</p>
          <p className="text-xs text-slate-400">วันติดต่อกัน</p>
        </div>
        <div className="flex flex-col items-center gap-1 rounded-3xl bg-white p-4 text-center shadow-md shadow-water-100">
          <CheckCircleIcon className="h-5 w-5 text-water-500" />
          <p className="font-display text-2xl font-semibold text-water-700">
            {daysMet}/{rangeDays}
          </p>
          <p className="text-xs text-slate-400">วันที่ครบเป้า</p>
        </div>
        <div className="flex flex-col items-center gap-1 rounded-3xl bg-white p-4 text-center shadow-md shadow-water-100">
          <ArrowTrendingUpIcon className="h-5 w-5 text-sun-400" />
          <p className="font-display text-2xl font-semibold text-water-700">{avgMl.toLocaleString()}</p>
          <p className="text-xs text-slate-400">เฉลี่ย ml/วัน</p>
        </div>
        <div className="flex flex-col items-center gap-1 rounded-3xl bg-white p-4 text-center shadow-md shadow-water-100">
          <TrophyIcon className="h-5 w-5 text-coral-400" />
          <p className="font-display text-2xl font-semibold text-water-700">{(bestDay?.totalMl ?? 0).toLocaleString()}</p>
          <p className="text-xs text-slate-400">วันที่ดื่มมากสุด</p>
        </div>
      </div>

      <div className="rounded-3xl bg-white p-4 shadow-md shadow-water-100">
        <h2 className="mb-3 text-sm font-medium text-slate-500">เหรียญสะสม</h2>
        <div className="flex gap-3">
          {BADGE_TIERS.map((tier) => {
            const unlocked = longestStreak >= tier.days
            return (
              <div
                key={tier.days}
                className={`flex flex-1 flex-col items-center gap-1 rounded-2xl py-3 ${unlocked ? tier.bg : 'bg-slate-50'}`}
              >
                <tier.Icon className={`h-6 w-6 ${unlocked ? tier.color : 'text-slate-300'}`} />
                <span className={`text-xs font-medium ${unlocked ? 'text-slate-700' : 'text-slate-300'}`}>{tier.label}</span>
              </div>
            )
          })}
        </div>
      </div>

      <ChallengeCard
        userId={user!.id}
        timezone={profile.timezone}
        dailyGoalMl={profile.daily_goal_ml}
        compensationRatio={profile.caffeine_compensation_ratio}
      />

      <div className="rounded-3xl bg-white p-4 shadow-md shadow-water-100">
        <Calendar
          userId={user!.id}
          timezone={profile.timezone}
          dailyGoalMl={profile.daily_goal_ml}
          compensationRatio={profile.caffeine_compensation_ratio}
        />

        <div className="my-4 border-t border-slate-100" />

        <h2 className="mb-3 text-sm font-medium text-slate-500">{rangeDays} วันล่าสุด</h2>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e4e7" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
            <ReferenceLine y={profile.daily_goal_ml} stroke="#0b4f73" strokeDasharray="4 4" />
            <Tooltip formatter={(value) => [`${Number(value).toLocaleString()} ml`, 'ดื่มแล้ว']} />
            <Bar dataKey="ml" radius={[8, 8, 0, 0]}>
              {chartData.map((entry) => (
                <Cell key={entry.date} fill={entry.goalMet ? '#17b4e0' : '#cfeef9'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {monthlyAverages.length > 0 && (
        <div className="rounded-3xl bg-white p-4 shadow-md shadow-water-100">
          <h2 className="mb-3 text-sm font-medium text-slate-500">ค่าเฉลี่ยรายเดือน (6 เดือนล่าสุด)</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthlyAverages} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e4e7" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <ReferenceLine y={profile.daily_goal_ml} stroke="#0b4f73" strokeDasharray="4 4" />
              <Tooltip formatter={(value) => [`${Number(value).toLocaleString()} ml/วัน`, 'เฉลี่ย']} />
              <Bar dataKey="avgMl" radius={[8, 8, 0, 0]}>
                {monthlyAverages.map((entry) => (
                  <Cell key={entry.month} fill={entry.avgMl >= entry.avgEffectiveGoalMl ? '#17b4e0' : '#cfeef9'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
