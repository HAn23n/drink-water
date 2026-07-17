import { useEffect, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useAuth } from '../../lib/AuthContext'
import { fetchProfile, type Profile } from '../../lib/profile'
import { calculateStreak, fetchDailyTotals, type DailyTotal } from '../../lib/history'

function formatShortDate(isoDate: string) {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })
}

export function HistoryPage() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [dailyTotals, setDailyTotals] = useState<DailyTotal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    let cancelled = false

    async function load() {
      try {
        const loadedProfile = await fetchProfile(user!.id)
        if (cancelled) return
        setProfile(loadedProfile)
        const totals = await fetchDailyTotals(user!.id, loadedProfile.timezone, loadedProfile.daily_goal_ml, 7)
        if (!cancelled) setDailyTotals(totals)
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

  if (loading || !profile) {
    return <div className="flex min-h-full items-center justify-center text-slate-400">กำลังโหลด...</div>
  }

  const streak = calculateStreak(dailyTotals)
  const daysMet = dailyTotals.filter((d) => d.goalMet).length
  const avgMl = dailyTotals.length
    ? Math.round(dailyTotals.reduce((sum, d) => sum + d.totalMl, 0) / dailyTotals.length)
    : 0

  const chartData = dailyTotals.map((d) => ({
    date: formatShortDate(d.date),
    ml: d.totalMl,
    goalMet: d.goalMet,
  }))

  return (
    <div className="flex min-h-full flex-col gap-6 bg-water-50 px-6 py-8">
      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-white p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-water-600">{streak}</p>
          <p className="text-xs text-slate-400">วันติดต่อกัน</p>
        </div>
        <div className="rounded-xl bg-white p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-water-600">{daysMet}/7</p>
          <p className="text-xs text-slate-400">วันที่ครบเป้า</p>
        </div>
        <div className="rounded-xl bg-white p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-water-600">{avgMl.toLocaleString()}</p>
          <p className="text-xs text-slate-400">เฉลี่ย ml/วัน</p>
        </div>
      </div>

      <div className="rounded-xl bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-medium text-slate-500">7 วันล่าสุด</h2>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e4e7" />
            <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
            <ReferenceLine y={profile.daily_goal_ml} stroke="#0369a1" strokeDasharray="4 4" />
            <Tooltip formatter={(value: number) => [`${value.toLocaleString()} ml`, 'ดื่มแล้ว']} />
            <Bar dataKey="ml" radius={[6, 6, 0, 0]}>
              {chartData.map((entry) => (
                <Cell key={entry.date} fill={entry.goalMet ? '#0ea5e9' : '#bae6fd'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
