import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../lib/AuthContext'
import { fetchProfile, type Profile } from '../../lib/profile'
import { addWaterLog, deleteWaterLog, fetchLogsForDate, syncPendingLogs, type WaterLog } from '../../lib/waterLogs'
import { removeFromQueue } from '../../lib/offlineQueue'
import { todayInTimeZone } from '../../lib/water'
import { WaveCircle } from '../../components/WaveCircle'

export function HomePage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [logDate, setLogDate] = useState<string | null>(null)
  const [logs, setLogs] = useState<WaterLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [customAmount, setCustomAmount] = useState('')
  const [showCustom, setShowCustom] = useState(false)

  const reloadLogs = useCallback(async (userId: string, timezone: string) => {
    const today = todayInTimeZone(timezone)
    setLogDate(today)
    setLogs(await fetchLogsForDate(userId, today))
  }, [])

  useEffect(() => {
    if (!user) return
    let cancelled = false

    async function load() {
      try {
        const loadedProfile = await fetchProfile(user!.id)
        if (cancelled) return
        if (!loadedProfile.onboarded) {
          navigate('/onboarding', { replace: true })
          return
        }
        setProfile(loadedProfile)
        await syncPendingLogs(user!.id)
        await reloadLogs(user!.id, loadedProfile.timezone)
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
  }, [user, navigate, reloadLogs])

  // Keep the counter honest across a midnight rollover and reconnects.
  useEffect(() => {
    if (!user || !profile) return

    const onOnline = () => {
      syncPendingLogs(user.id).then(() => reloadLogs(user.id, profile.timezone))
    }
    window.addEventListener('online', onOnline)

    const dayCheck = setInterval(() => {
      const today = todayInTimeZone(profile.timezone)
      if (today !== logDate) reloadLogs(user.id, profile.timezone)
    }, 60_000)

    return () => {
      window.removeEventListener('online', onOnline)
      clearInterval(dayCheck)
    }
  }, [user, profile, logDate, reloadLogs])

  async function handleAdd(amountMl: number) {
    if (!user || !profile || amountMl <= 0) return
    await addWaterLog(user.id, amountMl, profile.timezone)
    await reloadLogs(user.id, profile.timezone)
    setCustomAmount('')
    setShowCustom(false)
  }

  async function handleDelete(log: WaterLog) {
    if (!user || !profile) return
    if (log.id) {
      await deleteWaterLog(log.id)
    } else {
      await removeFromQueue(log.client_id)
    }
    await reloadLogs(user.id, profile.timezone)
  }

  if (loading || !profile) {
    return <div className="flex min-h-full items-center justify-center text-slate-400">กำลังโหลด...</div>
  }

  const totalMl = logs.reduce((sum, log) => sum + log.amount_ml, 0)
  const percent = profile.daily_goal_ml > 0 ? (totalMl / profile.daily_goal_ml) * 100 : 0
  const goalReached = percent >= 100

  return (
    <div className="flex min-h-full flex-col items-center gap-6 bg-water-50 px-6 py-8">
      {error && <p className="text-sm text-red-500">{error}</p>}

      {goalReached && (
        <div className="w-full max-w-sm animate-pulse rounded-xl bg-water-500 px-4 py-2 text-center text-sm font-medium text-white">
          🎉 ครบเป้าหมายวันนี้แล้ว เก่งมาก!
        </div>
      )}

      <WaveCircle
        percent={percent}
        label={`${totalMl.toLocaleString()} / ${profile.daily_goal_ml.toLocaleString()} ml`}
        sublabel={goalReached ? 'ดื่มเกินเป้าหมายก็ได้ ดื่มต่อได้เลย' : `เหลืออีก ${Math.max(profile.daily_goal_ml - totalMl, 0)} ml`}
      />

      <div className="grid w-full max-w-sm grid-cols-3 gap-3">
        <button
          onClick={() => handleAdd(profile.glass_size_ml)}
          className="rounded-xl bg-white py-3 text-sm font-medium text-water-700 shadow shadow-water-100 hover:bg-water-100"
        >
          + แก้ว
          <div className="text-xs text-slate-400">{profile.glass_size_ml} ml</div>
        </button>
        <button
          onClick={() => handleAdd(profile.bottle_size_ml)}
          className="rounded-xl bg-white py-3 text-sm font-medium text-water-700 shadow shadow-water-100 hover:bg-water-100"
        >
          + ขวด
          <div className="text-xs text-slate-400">{profile.bottle_size_ml} ml</div>
        </button>
        <button
          onClick={() => setShowCustom((v) => !v)}
          className="rounded-xl bg-white py-3 text-sm font-medium text-water-700 shadow shadow-water-100 hover:bg-water-100"
        >
          + กำหนดเอง
        </button>
      </div>

      {showCustom && (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleAdd(Number(customAmount))
          }}
          className="flex w-full max-w-sm gap-2"
        >
          <input
            type="number"
            min={1}
            required
            autoFocus
            placeholder="ปริมาณ (ml)"
            value={customAmount}
            onChange={(e) => setCustomAmount(e.target.value)}
            className="flex-1 rounded-lg border border-slate-200 px-4 py-2 outline-none focus:border-water-500"
          />
          <button type="submit" className="rounded-lg bg-water-500 px-4 py-2 font-medium text-white hover:bg-water-600">
            เพิ่ม
          </button>
        </form>
      )}

      <div className="w-full max-w-sm">
        <h2 className="mb-2 text-sm font-medium text-slate-500">รายการวันนี้</h2>
        {logs.length === 0 ? (
          <p className="text-sm text-slate-400">ยังไม่มีการบันทึกวันนี้</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {logs.map((log) => (
              <li
                key={log.client_id}
                className="flex items-center justify-between rounded-lg bg-white px-4 py-2 shadow-sm"
              >
                <span className="text-sm text-slate-600">
                  {new Date(log.logged_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                  {' — '}
                  {log.amount_ml} ml
                  {!log.id && <span className="ml-2 text-xs text-amber-500">(รอซิงค์)</span>}
                </span>
                <button
                  onClick={() => handleDelete(log)}
                  className="text-xs text-red-400 hover:text-red-600"
                >
                  ลบ
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
