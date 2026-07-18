import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BellIcon,
  ArrowDownTrayIcon,
  ArrowRightOnRectangleIcon,
  SpeakerWaveIcon,
  FireIcon,
  CalendarDaysIcon,
  ScaleIcon,
  ArrowsUpDownIcon,
} from '@heroicons/react/24/outline'
import { LoadingScreen, ErrorScreen } from '../../components/LoadingScreen'
import { BmiGauge } from '../../components/BmiGauge'
import { Select } from '../../components/Select'
import { NumberField } from '../../components/NumberField'
import { CocktailIcon } from '../../components/DrinkIcons'
import { useAuth } from '../../lib/AuthContext'
import { supabase } from '../../lib/supabase'
import { fetchProfile, updateProfile, type Profile } from '../../lib/profile'
import { ACTIVITY_OPTIONS, calculateBmi, calculateDailyGoalMl, getBmiCategory } from '../../lib/water'
import { requestNotificationPermission, subscribeToPush, unsubscribeFromPush } from '../../lib/notifications'
import { useInstallPrompt } from '../../lib/useInstallPrompt'
import { isSoundEnabled, setSoundEnabled } from '../../lib/sound'
import { isAlcoholTrackingEnabled, setAlcoholTrackingEnabled } from '../../lib/alcoholPref'

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
  const [alcoholTrackingOn, setAlcoholTrackingOn] = useState(false)

  useEffect(() => {
    setSoundOn(isSoundEnabled())
    setAlcoholTrackingOn(isAlcoholTrackingEnabled())
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

  function handleAlcoholTrackingToggle(enabled: boolean) {
    setAlcoholTrackingEnabled(enabled)
    setAlcoholTrackingOn(enabled)
  }

  async function handleDailySummaryToggle(enabled: boolean) {
    if (!user || !profile) return
    if (enabled) {
      const permission = await requestNotificationPermission()
      if (permission !== 'granted') {
        setError('กรุณาอนุญาตการแจ้งเตือนในเบราว์เซอร์ก่อน')
        return
      }
      await subscribeToPush(user.id).catch(() => {})
    } else if (!profile.reminder_enabled) {
      // Only drop the device subscription if no other push feature still needs it.
      await unsubscribeFromPush(user.id).catch(() => {})
    }
    const updated = await updateProfile(user.id, { daily_summary_enabled: enabled })
    setProfile(updated)
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
      <div className="w-full max-w-sm rounded-[28px] bg-white p-6 shadow-md shadow-water-100">
        <div className="flex items-center gap-4">
          <div className="font-display flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-water-400 to-water-600 text-xl font-semibold text-white">
            {initial}
          </div>
          <div className="min-w-0">
            <p className="font-display truncate text-lg font-semibold text-water-700">{profile.display_name || 'ผู้ใช้'}</p>
            <p className="truncate text-xs text-slate-400">{user?.email}</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4">
          <div className="flex items-center gap-2">
            <FireIcon className="h-4 w-4 text-coral-500" />
            <div>
              <p className="font-display text-sm font-semibold text-water-700">{profile.longest_streak_days} วัน</p>
              <p className="text-[11px] text-slate-400">สถิติดีที่สุด</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <CalendarDaysIcon className="h-4 w-4 text-water-500" />
            <div>
              <p className="font-display text-sm font-semibold text-water-700">
                {new Date(profile.created_at).toLocaleDateString('th-TH', { month: 'short', year: 'numeric' })}
              </p>
              <p className="text-[11px] text-slate-400">สมาชิกตั้งแต่</p>
            </div>
          </div>
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
              <div className="relative">
                <ScaleIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-water-400" />
                <NumberField
                  value={profile.weight_kg}
                  nullable
                  decimal
                  onChange={(v) => setProfile({ ...profile, weight_kg: v })}
                  className="w-full min-w-0 rounded-2xl border border-slate-200 py-2.5 pl-9 pr-3 outline-none transition focus:border-water-500 focus:ring-4 focus:ring-water-100"
                />
              </div>
            </label>
            <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm text-slate-600">
              ส่วนสูง (cm)
              <div className="relative">
                <ArrowsUpDownIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-water-400" />
                <NumberField
                  value={profile.height_cm}
                  nullable
                  onChange={(v) => setProfile({ ...profile, height_cm: v })}
                  className="w-full min-w-0 rounded-2xl border border-slate-200 py-2.5 pl-9 pr-3 outline-none transition focus:border-water-500 focus:ring-4 focus:ring-water-100"
                />
              </div>
            </label>
          </div>

          {bmi !== null && bmiCategory && (
            <div className="my-1 flex flex-col items-center">
              <BmiGauge bmi={bmi} tone={bmiCategory.tone} />
              <p className="font-display mt-1 text-3xl font-bold text-water-700">{bmi}</p>
              <span className={`mt-1 rounded-full px-3 py-1 text-xs font-medium ${BMI_TONE_CLASSES[bmiCategory.tone]}`}>
                {bmiCategory.label}
              </span>
            </div>
          )}

          <label className="flex flex-col gap-1 text-sm text-slate-600">
            ระดับกิจกรรม
            <Select
              value={profile.activity_level}
              options={ACTIVITY_OPTIONS}
              onChange={(v) => setProfile({ ...profile, activity_level: v })}
            />
          </label>

          <div className="rounded-2xl bg-water-50 p-4">
            <p className="mb-2 text-sm text-slate-500">เป้าหมายน้ำต่อวัน</p>
            <div className="flex items-center gap-2">
              <NumberField
                value={profile.daily_goal_ml}
                onChange={(v) => v != null && setProfile({ ...profile, daily_goal_ml: v })}
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
              <NumberField
                value={profile.glass_size_ml}
                onChange={(v) => v != null && setProfile({ ...profile, glass_size_ml: v })}
                className="w-full min-w-0 rounded-2xl border border-slate-200 px-3 py-2.5 outline-none transition focus:border-water-500 focus:ring-4 focus:ring-water-100"
              />
            </label>
            <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm text-slate-600">
              ขนาดขวด (ml)
              <NumberField
                value={profile.bottle_size_ml}
                onChange={(v) => v != null && setProfile({ ...profile, bottle_size_ml: v })}
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
            <div className="grid grid-cols-2 gap-3">
              <label className="flex min-w-0 flex-col gap-1 text-sm text-slate-600">
                เริ่ม
                <input
                  type="time"
                  value={profile.reminder_start}
                  onChange={(e) => setProfile({ ...profile, reminder_start: e.target.value })}
                  className="w-full min-w-0 appearance-none rounded-2xl border border-slate-200 px-3 py-2.5 outline-none transition focus:border-water-500 focus:ring-4 focus:ring-water-100"
                />
              </label>
              <label className="flex min-w-0 flex-col gap-1 text-sm text-slate-600">
                สิ้นสุด
                <input
                  type="time"
                  value={profile.reminder_end}
                  onChange={(e) => setProfile({ ...profile, reminder_end: e.target.value })}
                  className="w-full min-w-0 appearance-none rounded-2xl border border-slate-200 px-3 py-2.5 outline-none transition focus:border-water-500 focus:ring-4 focus:ring-water-100"
                />
              </label>
            </div>
            <label className="flex flex-col gap-1 text-sm text-slate-600">
              เตือนทุกกี่นาที
              <NumberField
                value={profile.reminder_interval_min}
                onChange={(v) => v != null && setProfile({ ...profile, reminder_interval_min: v })}
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

        <div className="mt-4 border-t border-slate-100 pt-4">
          <label className="flex items-center justify-between text-sm text-slate-600">
            <span>สรุปวันท้ายวัน (21:00)</span>
            <input
              type="checkbox"
              checked={profile.daily_summary_enabled}
              onChange={(e) => handleDailySummaryToggle(e.target.checked)}
              className="h-5 w-5 accent-water-500"
            />
          </label>
          <p className="mt-1 text-xs text-slate-400">แจ้งเตือนสรุปว่าวันนี้ดื่มน้ำไปเท่าไหร่ ตอนสามทุ่ม</p>
        </div>
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

      <div className="w-full max-w-sm rounded-[28px] border border-amber-100 bg-gradient-to-br from-amber-50 to-white p-6 shadow-md shadow-amber-100/70">
        <label className="flex items-center justify-between text-sm text-slate-600">
          <span className="flex items-center gap-2 font-semibold text-amber-600">
            <CocktailIcon className="h-4 w-4 text-amber-500" fillPercent={40} />
            บันทึกแอลกอฮอล์
          </span>
          <input
            type="checkbox"
            checked={alcoholTrackingOn}
            onChange={(e) => handleAlcoholTrackingToggle(e.target.checked)}
            className="h-5 w-5 accent-amber-500"
          />
        </label>
        <p className="mt-2 text-xs text-amber-500">
          เปิดเพื่อแสดงวิดเจ็ตบันทึกแอลกอฮอล์ในหน้าหลัก
        </p>
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
