import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PlusIcon, TrashIcon, ClockIcon } from '@heroicons/react/24/outline'
import { CheckBadgeIcon } from '@heroicons/react/24/solid'
import { LoadingScreen, ErrorScreen } from '../../components/LoadingScreen'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { GlassIcon, BottleIcon } from '../../components/DrinkIcons'
import { useAuth } from '../../lib/AuthContext'
import { fetchProfile, type Profile } from '../../lib/profile'
import { addWaterLog, deleteWaterLog, fetchLogsForDate, syncPendingLogs, type WaterLog } from '../../lib/waterLogs'
import { removeFromQueue } from '../../lib/offlineQueue'
import { todayInTimeZone } from '../../lib/water'
import { playAddSound } from '../../lib/sound'
import { celebrateGoalReached } from '../../lib/celebrate'
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
  const [pendingDelete, setPendingDelete] = useState<WaterLog | null>(null)
  const celebratedRef = useRef(false)

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

  const totalMl = logs.reduce((sum, log) => sum + log.amount_ml, 0)
  const percent = profile && profile.daily_goal_ml > 0 ? (totalMl / profile.daily_goal_ml) * 100 : 0
  const goalReached = percent >= 100

  // Celebrate once per crossing — resets so a later dip-and-recross (e.g. after
  // undoing a log) can celebrate again, but a render while already over 100% won't.
  useEffect(() => {
    if (goalReached && !celebratedRef.current) {
      celebratedRef.current = true
      celebrateGoalReached()
    } else if (!goalReached) {
      celebratedRef.current = false
    }
  }, [goalReached])

  async function handleAdd(amountMl: number) {
    if (!user || !profile || amountMl <= 0) return
    try {
      await addWaterLog(user.id, amountMl, profile.timezone)
      playAddSound()
      await reloadLogs(user.id, profile.timezone)
      setCustomAmount('')
      setShowCustom(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'บันทึกไม่สำเร็จ')
    }
  }

  async function handleConfirmDelete() {
    if (!user || !profile || !pendingDelete) return
    const log = pendingDelete
    setPendingDelete(null)
    try {
      if (log.id) {
        await deleteWaterLog(log.id)
      } else {
        await removeFromQueue(log.client_id)
      }
      await reloadLogs(user.id, profile.timezone)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ลบไม่สำเร็จ')
    }
  }

  if (loading) return <LoadingScreen />
  if (!profile) {
    return <ErrorScreen message={error ?? 'โหลดข้อมูลไม่สำเร็จ'} onRetry={() => window.location.reload()} />
  }

  const quickAddOptions = [
    {
      key: 'half',
      label: 'ครึ่งแก้ว',
      amount: Math.round(profile.glass_size_ml / 2),
      icon: <GlassIcon className="h-8 w-8 text-water-400" fillPercent={30} />,
    },
    {
      key: 'glass',
      label: 'แก้ว',
      amount: profile.glass_size_ml,
      icon: <GlassIcon className="h-8 w-8 text-water-500" fillPercent={70} />,
    },
    {
      key: 'bottle',
      label: 'ขวด',
      amount: profile.bottle_size_ml,
      icon: <BottleIcon className="h-8 w-8 text-water-500" fillPercent={65} />,
    },
    {
      key: 'big-bottle',
      label: 'ขวดใหญ่',
      amount: 1400,
      icon: <BottleIcon className="h-8 w-8 text-water-600" fillPercent={90} />,
    },
  ]

  return (
    <div className="flex min-h-full flex-col items-center gap-8 bg-water-50 px-6 py-10">
      {error && <p className="text-sm text-coral-500">{error}</p>}

      {goalReached && (
        <div className="flex w-full max-w-sm items-center justify-center gap-2 rounded-full bg-gradient-to-r from-coral-400 to-coral-500 px-4 py-2.5 text-center text-sm font-medium text-white shadow-lg shadow-coral-500/30">
          <CheckBadgeIcon className="h-5 w-5" />
          ครบเป้าหมายวันนี้แล้ว เก่งมาก!
        </div>
      )}

      <WaveCircle
        percent={percent}
        label={`${totalMl.toLocaleString()} / ${profile.daily_goal_ml.toLocaleString()} ml`}
        sublabel={goalReached ? 'ดื่มเกินเป้าหมายก็ได้ ดื่มต่อได้เลย' : `เหลืออีก ${Math.max(profile.daily_goal_ml - totalMl, 0)} ml`}
      />

      <div className="grid w-full max-w-sm grid-cols-3 gap-3">
        {quickAddOptions.map((opt) => (
          <button
            key={opt.key}
            onClick={() => handleAdd(opt.amount)}
            className="flex flex-col items-center gap-1 rounded-3xl bg-white px-2 py-4 text-sm font-medium text-water-700 shadow-md shadow-water-100 transition hover:-translate-y-0.5 hover:shadow-lg"
          >
            {opt.icon}
            {opt.label}
            <span className="text-xs font-normal text-slate-400">{opt.amount} ml</span>
          </button>
        ))}
        <button
          onClick={() => setShowCustom((v) => !v)}
          className="flex flex-col items-center justify-center gap-1 rounded-3xl bg-white px-2 py-4 text-sm font-medium text-water-700 shadow-md shadow-water-100 transition hover:-translate-y-0.5 hover:shadow-lg"
        >
          <PlusIcon className="h-8 w-8 text-water-500" />
          กำหนดเอง
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
            className="flex-1 rounded-full border border-slate-200 px-4 py-2.5 outline-none transition focus:border-water-500 focus:ring-4 focus:ring-water-100"
          />
          <button
            type="submit"
            className="rounded-full bg-water-500 px-5 py-2.5 font-medium text-white transition hover:bg-water-600"
          >
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
                className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 shadow-sm"
              >
                <span className="flex items-center gap-2 text-sm text-slate-600">
                  <ClockIcon className="h-4 w-4 text-slate-300" />
                  {new Date(log.logged_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                  {' — '}
                  {log.amount_ml} ml
                  {!log.id && <span className="ml-1 text-xs text-sun-400">(รอซิงค์)</span>}
                </span>
                <button
                  onClick={() => setPendingDelete(log)}
                  aria-label="ลบรายการนี้"
                  className="rounded-full p-1.5 text-coral-400 transition hover:bg-coral-100 hover:text-coral-600"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="ลบรายการนี้?"
        description={pendingDelete ? `${pendingDelete.amount_ml} ml — ลบแล้วไม่สามารถกู้คืนได้` : undefined}
        confirmLabel="ลบ"
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  )
}
