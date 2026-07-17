import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { BellIcon, ArrowDownTrayIcon, ArrowRightOnRectangleIcon, SpeakerWaveIcon } from '@heroicons/react/24/outline'
import { LoadingScreen, ErrorScreen } from '../../components/LoadingScreen'
import { useAuth } from '../../lib/AuthContext'
import { supabase } from '../../lib/supabase'
import { fetchProfile, updateProfile, type Profile } from '../../lib/profile'
import { ACTIVITY_OPTIONS, calculateBmi, calculateDailyGoalMl, getBmiCategory, type ActivityLevel } from '../../lib/water'
import { requestNotificationPermission, subscribeToPush, unsubscribeFromPush } from '../../lib/notifications'
import { useInstallPrompt } from '../../lib/useInstallPrompt'
import { isSoundEnabled, setSoundEnabled } from '../../lib/sound'

const BMI_TONE_CLASSES: Record<string, string> = {
  low: 'bg-sun-300/40 text-water-700',
  good: 'bg-water-100 text-water-700',
  warn: 'bg-sun-300/50 text-coral-600',
  alert: 'bg-coral-100 text-coral-600',
}

export function ProfilePage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { canInstall, promptInstall } = useInstallPrompt()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [soundOn, setSoundOn] = useState(true)

  useEffect(() => {
    setSoundOn(isSoundEnabled())
  }, [])

  useEffect(() => {
    if (!user) return
    let cancelled = false

    fetchProfile(user.id)
      .then((loaded) => {
        if (!cancelled) setProfile(loaded)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'โหลดข้อมูลไม่สำเร็จ')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [user])

  async function handleSave(e?: FormEvent) {
    e?.preventDefault()
    if (!user || !profile) return
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const updated = await updateProfile(user.id, profile)
      setProfile(updated)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'บันทึกไม่สำเร็จ')
    } finally {
      setSaving(false)
    }
  }

  async function handleReminderToggle(enabled: boolean) {
    if (!user || !profile) return
    if (enabled) {
      const permission = await requestNotificationPermission()
      if (permission !== 'granted') {
        setError('กรุณาอนุญาตการแจ้งเตือนในเบราว์เซอร์ก่อน')
        return
      }
      await subscribeToPush(user.id).catch(() => {
        // Push subscription is best-effort — local reminders (Type A) still work without it.
      })
    } else {
      await unsubscribeFromPush(user.id).catch(() => {})
    }
    const updated = await updateProfile(user.id, { reminder_enabled: enabled })
    setProfile(updated)
  }

  function handleSoundToggle(enabled: boolean) {
    setSoundEnabled(enabled)
    setSoundOn(enabled)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/login', { replace: true })
  }

  if (loading) return <LoadingScreen />
  if (!profile) {
    return <ErrorScreen message={error ?? 'โหลดข้อมูลไม่สำเร็จ'} onRetry={() => window.location.reload()} />
  }

  const suggestedGoal = profile.weight_kg
    ? calculateDailyGoalMl(profile.weight_kg, profile.activity_level)
    : null
  const bmi = profile.weight_kg && profile.height_cm ? calculateBmi(profile.weight_kg, profile.height_cm) : null
  const bmiCategory = bmi !== null ? getBmiCategory(bmi) : null
  const initial = (profile.display_name || user?.email || '?').charAt(0).toUpperCase()

  return (
    <div className="flex min-h-full flex-col items-center gap-4 bg-water-50 px-6 py-10">
      <div className="flex w-full max-w-sm items-center gap-4 rounded-[28px] bg-white p-6 shadow-md shadow-water-100">
        <div className="font-display flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-water-400 to-water-600 text-xl font-semibold text-white">
          {initial}
        </div>
        <div className="min-w-0">
          <p className="font-display truncate text-lg font-semibold text-water-700">{profile.display_name || 'ผู้ใช้'}</p>
          <p className="truncate text-xs text-slate-400">{user?.email}</p>
        </div>
      </div>

      <div className="w-full max-w-sm rounded-[28px] bg-white p-6 shadow-md shadow-water-100">
        <h2 className="font-display mb-4 text-lg font-semibold text-water-700">ข้อมูลร่างกาย</h2>

        <form onSubmit={handleSave} className="flex flex-col gap-3">
          <label className="flex min-w-0 flex-col gap-1 text-sm text-slate-600">
            ชื่อที่แสดง
            <input
              value={profile.display_name}
              onChange={(e) => setProfile({ ...profile, display_name: e.target.value })}
              className="w-full min-w-0 rounded-2xl border border-slate-200 px-3 py-2.5 outline-none transition focus:border-water-500 focus:ring-4 focus:ring-water-100"
            />
          </label>

          <div className="flex gap-3">
            <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm text-slate-600">
              น้ำหนัก (kg)
              <input
                type="number"
                value={profile.weight_kg ?? ''}
                onChange={(e) => setProfile({ ...profile, weight_kg: Number(e.target.value) })}
                className="w-full min-w-0 rounded-2xl border border-slate-200 px-3 py-2.5 outline-none transition focus:border-water-500 focus:ring-4 focus:ring-water-100"
              />
            </label>
            <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm text-slate-600">
              ส่วนสูง (cm)
              <input
                type="number"
                value={profile.height_cm ?? ''}
                onChange={(e) => setProfile({ ...profile, height_cm: Number(e.target.value) })}
                className="w-full min-w-0 rounded-2xl border border-slate-200 px-3 py-2.5 outline-none transition focus:border-water-500 focus:ring-4 focus:ring-water-100"
              />
            </label>
          </div>
          {bmi !== null && bmiCategory && (
            <span
              className={`self-start rounded-full px-3 py-1 text-xs font-medium ${BMI_TONE_CLASSES[bmiCategory.tone]}`}
            >
              BMI {bmi} · {bmiCategory.label}
            </span>
          )}

          <label className="flex flex-col gap-1 text-sm text-slate-600">
            ระดับกิจกรรม
            <select
              value={profile.activity_level}
              onChange={(e) => setProfile({ ...profile, activity_level: e.target.value as ActivityLevel })}
              className="rounded-2xl border border-slate-200 px-3 py-2.5 outline-none transition focus:border-water-500 focus:ring-4 focus:ring-water-100"
            >
              {ACTIVITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          <div className="rounded-2xl bg-water-50 p-4">
            <p className="mb-2 text-sm text-slate-500">เป้าหมายน้ำต่อวัน</p>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={profile.daily_goal_ml}
                onChange={(e) => setProfile({ ...profile, daily_goal_ml: Number(e.target.value) })}
                className="font-display w-28 min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-center text-lg font-semibold text-water-700 outline-none focus:border-water-500"
              />
              <span className="text-sm text-slate-500">ml</span>
              {suggestedGoal && suggestedGoal !== profile.daily_goal_ml && (
                <button
                  type="button"
                  onClick={() => setProfile({ ...profile, daily_goal_ml: suggestedGoal })}
                  className="ml-auto text-xs text-water-600 hover:underline"
                >
                  ใช้ {suggestedGoal} ml
                </button>
              )}
            </div>
          </div>

          <div className="flex gap-3">
            <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm text-slate-600">
              ขนาดแก้ว (ml)
              <input
                type="number"
                value={profile.glass_size_ml}
                onChange={(e) => setProfile({ ...profile, glass_size_ml: Number(e.target.value) })}
                className="w-full min-w-0 rounded-2xl border border-slate-200 px-3 py-2.5 outline-none transition focus:border-water-500 focus:ring-4 focus:ring-water-100"
              />
            </label>
            <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm text-slate-600">
              ขนาดขวด (ml)
              <input
                type="number"
                value={profile.bottle_size_ml}
                onChange={(e) => setProfile({ ...profile, bottle_size_ml: Number(e.target.value) })}
                className="w-full min-w-0 rounded-2xl border border-slate-200 px-3 py-2.5 outline-none transition focus:border-water-500 focus:ring-4 focus:ring-water-100"
              />
            </label>
          </div>

          {error && <p className="text-sm text-coral-500">{error}</p>}
          {saved && <p className="text-sm text-water-600">บันทึกแล้ว</p>}

          <button
            type="submit"
            disabled={saving}
            className="mt-1 rounded-full bg-gradient-to-r from-water-500 to-water-600 py-3 font-medium text-white shadow-lg shadow-water-500/30 transition hover:-translate-y-0.5 hover:shadow-xl disabled:translate-y-0 disabled:opacity-50 disabled:shadow-none"
          >
            {saving ? 'กำลังบันทึก...' : 'บันทึก'}
          </button>
        </form>
      </div>

      <div className="w-full max-w-sm rounded-[28px] bg-white p-6 shadow-md shadow-water-100">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
          <BellIcon className="h-4 w-4 text-water-500" />
          การแจ้งเตือน
        </h2>
        <label className="flex items-center justify-between text-sm text-slate-600">
          เปิดแจ้งเตือน
          <input
            type="checkbox"
            checked={profile.reminder_enabled}
            onChange={(e) => handleReminderToggle(e.target.checked)}
            className="h-5 w-5 accent-water-500"
          />
        </label>

        {profile.reminder_enabled && (
          <div className="mt-3 flex flex-col gap-3">
            <div className="flex gap-3">
              <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm text-slate-600">
                เริ่ม
                <input
                  type="time"
                  value={profile.reminder_start}
                  onChange={(e) => setProfile({ ...profile, reminder_start: e.target.value })}
                  className="w-full min-w-0 rounded-2xl border border-slate-200 px-3 py-2.5 outline-none transition focus:border-water-500 focus:ring-4 focus:ring-water-100"
                />
              </label>
              <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm text-slate-600">
                สิ้นสุด
                <input
                  type="time"
                  value={profile.reminder_end}
                  onChange={(e) => setProfile({ ...profile, reminder_end: e.target.value })}
                  className="w-full min-w-0 rounded-2xl border border-slate-200 px-3 py-2.5 outline-none transition focus:border-water-500 focus:ring-4 focus:ring-water-100"
                />
              </label>
            </div>
            <label className="flex flex-col gap-1 text-sm text-slate-600">
              เตือนทุกกี่นาที
              <input
                type="number"
                min={15}
                value={profile.reminder_interval_min}
                onChange={(e) => setProfile({ ...profile, reminder_interval_min: Number(e.target.value) })}
                className="rounded-2xl border border-slate-200 px-3 py-2.5 outline-none transition focus:border-water-500 focus:ring-4 focus:ring-water-100"
              />
            </label>
            <button
              type="button"
              onClick={() => handleSave()}
              className="rounded-full bg-water-500 py-2.5 text-sm font-medium text-white transition hover:bg-water-600"
            >
              บันทึกช่วงเวลาแจ้งเตือน
            </button>
          </div>
        )}
      </div>

      <div className="w-full max-w-sm rounded-[28px] bg-white p-6 shadow-md shadow-water-100">
        <label className="flex items-center justify-between text-sm text-slate-600">
          <span className="flex items-center gap-2 font-semibold text-slate-700">
            <SpeakerWaveIcon className="h-4 w-4 text-water-500" />
            เสียงตอนกดเพิ่มน้ำ
          </span>
          <input
            type="checkbox"
            checked={soundOn}
            onChange={(e) => handleSoundToggle(e.target.checked)}
            className="h-5 w-5 accent-water-500"
          />
        </label>
      </div>

      {canInstall && (
        <button
          onClick={promptInstall}
          className="flex w-full max-w-sm items-center justify-center gap-2 rounded-full bg-white py-3 text-sm font-medium text-water-700 shadow-md shadow-water-100 transition hover:-translate-y-0.5 hover:shadow-lg"
        >
          <ArrowDownTrayIcon className="h-4 w-4" />
          ติดตั้งแอปลงจอ
        </button>
      )}

      <button
        onClick={handleLogout}
        className="flex w-full max-w-sm items-center justify-center gap-2 rounded-full bg-white py-3 text-sm font-medium text-coral-500 shadow-md shadow-water-100 transition hover:-translate-y-0.5 hover:bg-coral-100/40 hover:shadow-lg"
      >
        <ArrowRightOnRectangleIcon className="h-4 w-4" />
        ออกจากระบบ
      </button>
    </div>
  )
}
