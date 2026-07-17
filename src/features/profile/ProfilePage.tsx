import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../lib/AuthContext'
import { supabase } from '../../lib/supabase'
import { fetchProfile, updateProfile, type Profile } from '../../lib/profile'
import { calculateBmi, calculateDailyGoalMl, type ActivityLevel } from '../../lib/water'
import { requestNotificationPermission, subscribeToPush, unsubscribeFromPush } from '../../lib/notifications'
import { useInstallPrompt } from '../../lib/useInstallPrompt'

const ACTIVITY_OPTIONS: { value: ActivityLevel; label: string }[] = [
  { value: 'sedentary', label: 'เบา' },
  { value: 'normal', label: 'ปกติ' },
  { value: 'active', label: 'ออกกำลังกายสม่ำเสมอ' },
  { value: 'very_active', label: 'ออกกำลังกายหนัก' },
]

export function ProfilePage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { canInstall, promptInstall } = useInstallPrompt()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!user) return
    fetchProfile(user.id)
      .then(setProfile)
      .catch((err) => setError(err instanceof Error ? err.message : 'โหลดข้อมูลไม่สำเร็จ'))
      .finally(() => setLoading(false))
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

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/login', { replace: true })
  }

  if (loading || !profile) {
    return <div className="flex min-h-full items-center justify-center text-slate-400">กำลังโหลด...</div>
  }

  const suggestedGoal = profile.weight_kg
    ? calculateDailyGoalMl(profile.weight_kg, profile.activity_level)
    : null
  const bmi = profile.weight_kg && profile.height_cm ? calculateBmi(profile.weight_kg, profile.height_cm) : null

  return (
    <div className="flex min-h-full flex-col items-center gap-4 bg-water-50 px-6 py-8">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-sm">
        <h1 className="mb-4 text-lg font-semibold text-water-700">โปรไฟล์</h1>

        <form onSubmit={handleSave} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm text-slate-600">
            ชื่อที่แสดง
            <input
              value={profile.display_name}
              onChange={(e) => setProfile({ ...profile, display_name: e.target.value })}
              className="rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-water-500"
            />
          </label>

          <div className="flex gap-3">
            <label className="flex flex-1 flex-col gap-1 text-sm text-slate-600">
              น้ำหนัก (kg)
              <input
                type="number"
                value={profile.weight_kg ?? ''}
                onChange={(e) => setProfile({ ...profile, weight_kg: Number(e.target.value) })}
                className="rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-water-500"
              />
            </label>
            <label className="flex flex-1 flex-col gap-1 text-sm text-slate-600">
              ส่วนสูง (cm)
              <input
                type="number"
                value={profile.height_cm ?? ''}
                onChange={(e) => setProfile({ ...profile, height_cm: Number(e.target.value) })}
                className="rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-water-500"
              />
            </label>
          </div>
          {bmi && <p className="text-xs text-slate-400">BMI: {bmi}</p>}

          <label className="flex flex-col gap-1 text-sm text-slate-600">
            ระดับกิจกรรม
            <select
              value={profile.activity_level}
              onChange={(e) => setProfile({ ...profile, activity_level: e.target.value as ActivityLevel })}
              className="rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-water-500"
            >
              {ACTIVITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm text-slate-600">
            เป้าหมายน้ำต่อวัน (ml)
            <input
              type="number"
              value={profile.daily_goal_ml}
              onChange={(e) => setProfile({ ...profile, daily_goal_ml: Number(e.target.value) })}
              className="rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-water-500"
            />
            {suggestedGoal && suggestedGoal !== profile.daily_goal_ml && (
              <button
                type="button"
                onClick={() => setProfile({ ...profile, daily_goal_ml: suggestedGoal })}
                className="self-start text-xs text-water-600 hover:underline"
              >
                ใช้ค่าคำนวณอัตโนมัติ ({suggestedGoal} ml)
              </button>
            )}
          </label>

          <div className="flex gap-3">
            <label className="flex flex-1 flex-col gap-1 text-sm text-slate-600">
              ขนาดแก้ว (ml)
              <input
                type="number"
                value={profile.glass_size_ml}
                onChange={(e) => setProfile({ ...profile, glass_size_ml: Number(e.target.value) })}
                className="rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-water-500"
              />
            </label>
            <label className="flex flex-1 flex-col gap-1 text-sm text-slate-600">
              ขนาดขวด (ml)
              <input
                type="number"
                value={profile.bottle_size_ml}
                onChange={(e) => setProfile({ ...profile, bottle_size_ml: Number(e.target.value) })}
                className="rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-water-500"
              />
            </label>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}
          {saved && <p className="text-sm text-water-600">บันทึกแล้ว</p>}

          <button
            type="submit"
            disabled={saving}
            className="mt-1 rounded-lg bg-water-500 py-2 font-medium text-white hover:bg-water-600 disabled:opacity-50"
          >
            {saving ? 'กำลังบันทึก...' : 'บันทึก'}
          </button>
        </form>
      </div>

      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">การแจ้งเตือน</h2>
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
              <label className="flex flex-1 flex-col gap-1 text-sm text-slate-600">
                เริ่ม
                <input
                  type="time"
                  value={profile.reminder_start}
                  onChange={(e) => setProfile({ ...profile, reminder_start: e.target.value })}
                  className="rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-water-500"
                />
              </label>
              <label className="flex flex-1 flex-col gap-1 text-sm text-slate-600">
                สิ้นสุด
                <input
                  type="time"
                  value={profile.reminder_end}
                  onChange={(e) => setProfile({ ...profile, reminder_end: e.target.value })}
                  className="rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-water-500"
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
                className="rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-water-500"
              />
            </label>
            <button
              type="button"
              onClick={() => handleSave()}
              className="rounded-lg bg-water-500 py-2 text-sm font-medium text-white hover:bg-water-600"
            >
              บันทึกช่วงเวลาแจ้งเตือน
            </button>
          </div>
        )}
      </div>

      {canInstall && (
        <button
          onClick={promptInstall}
          className="w-full max-w-sm rounded-2xl bg-white py-3 text-sm font-medium text-water-700 shadow-sm hover:bg-water-100"
        >
          📲 ติดตั้งแอปลงจอ
        </button>
      )}

      <button
        onClick={handleLogout}
        className="w-full max-w-sm rounded-2xl bg-white py-3 text-sm font-medium text-red-500 shadow-sm hover:bg-red-50"
      >
        ออกจากระบบ
      </button>
    </div>
  )
}
