import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../lib/AuthContext'
import { updateProfile } from '../../lib/profile'
import { ACTIVITY_OPTIONS, calculateDailyGoalMl, type ActivityLevel } from '../../lib/water'

export function OnboardingPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [displayName, setDisplayName] = useState('')
  const [weightKg, setWeightKg] = useState(60)
  const [heightCm, setHeightCm] = useState(165)
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>('normal')
  const [goalOverride, setGoalOverride] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const suggestedGoal = calculateDailyGoalMl(weightKg, activityLevel)
  const goal = goalOverride ?? suggestedGoal

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!user) return
    setSaving(true)
    setError(null)
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
      await updateProfile(user.id, {
        display_name: displayName,
        weight_kg: weightKg,
        height_cm: heightCm,
        activity_level: activityLevel,
        daily_goal_ml: goal,
        timezone,
        onboarded: true,
      })
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'บันทึกไม่สำเร็จ')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex min-h-full flex-col items-center bg-water-50 px-6 py-10">
      <div className="w-full max-w-md rounded-[28px] bg-white p-8 shadow-[0_30px_60px_-24px_rgba(11,79,115,0.3)]">
        <h1 className="font-display mb-1 text-xl font-semibold text-water-700">มาตั้งเป้าหมายกันก่อน</h1>
        <p className="mb-6 text-sm text-slate-500">กรอกข้อมูลเพื่อคำนวณปริมาณน้ำที่ควรดื่มต่อวัน</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm text-slate-600">
            ชื่อที่แสดง
            <input
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="rounded-2xl border border-slate-200 px-4 py-2.5 outline-none transition focus:border-water-500 focus:ring-4 focus:ring-water-100"
            />
          </label>

          <div className="flex gap-3">
            <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm text-slate-600">
              น้ำหนัก (kg)
              <input
                type="number"
                required
                min={20}
                max={300}
                value={weightKg}
                onChange={(e) => setWeightKg(Number(e.target.value))}
                className="w-full min-w-0 rounded-2xl border border-slate-200 px-4 py-2.5 outline-none transition focus:border-water-500 focus:ring-4 focus:ring-water-100"
              />
            </label>
            <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm text-slate-600">
              ส่วนสูง (cm)
              <input
                type="number"
                required
                min={100}
                max={250}
                value={heightCm}
                onChange={(e) => setHeightCm(Number(e.target.value))}
                className="w-full min-w-0 rounded-2xl border border-slate-200 px-4 py-2.5 outline-none transition focus:border-water-500 focus:ring-4 focus:ring-water-100"
              />
            </label>
          </div>

          <label className="flex flex-col gap-1 text-sm text-slate-600">
            ระดับกิจกรรม
            <select
              value={activityLevel}
              onChange={(e) => setActivityLevel(e.target.value as ActivityLevel)}
              className="rounded-2xl border border-slate-200 px-4 py-2.5 outline-none transition focus:border-water-500 focus:ring-4 focus:ring-water-100"
            >
              {ACTIVITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          <div className="rounded-2xl bg-water-50 p-4 text-center">
            <p className="text-sm text-slate-500">เป้าหมายน้ำต่อวัน</p>
            <div className="flex items-center justify-center gap-2">
              <input
                type="number"
                min={500}
                max={10000}
                value={goal}
                onChange={(e) => setGoalOverride(Number(e.target.value))}
                className="font-display w-28 rounded-xl border border-slate-200 bg-white px-3 py-1 text-center text-lg font-semibold text-water-700 outline-none focus:border-water-500"
              />
              <span className="text-slate-500">ml</span>
            </div>
            {goalOverride !== null && goalOverride !== suggestedGoal && (
              <button
                type="button"
                onClick={() => setGoalOverride(null)}
                className="mt-1 text-xs text-water-600 hover:underline"
              >
                ใช้ค่าที่คำนวณอัตโนมัติ ({suggestedGoal} ml)
              </button>
            )}
          </div>

          {error && <p className="text-sm text-coral-500">{error}</p>}

          <button
            type="submit"
            disabled={saving}
            className="mt-1 rounded-full bg-gradient-to-r from-water-500 to-water-600 py-3 font-medium text-white shadow-lg shadow-water-500/30 transition hover:-translate-y-0.5 hover:shadow-xl disabled:translate-y-0 disabled:opacity-50 disabled:shadow-none"
          >
            {saving ? 'กำลังบันทึก...' : 'เริ่มใช้งาน'}
          </button>
        </form>
      </div>
    </div>
  )
}
