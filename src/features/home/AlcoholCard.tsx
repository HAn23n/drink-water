import { useState } from 'react'
import { BeakerIcon } from '@heroicons/react/24/outline'
import { addAlcoholLog, DRINK_TYPE_OPTIONS } from '../../lib/alcoholLogs'
import { HYDRATION_TIP_AFTER_ALCOHOL } from '../../lib/tips'

interface AlcoholCardProps {
  userId: string
  logDate: string
}

export function AlcoholCard({ userId, logDate }: AlcoholCardProps) {
  const [open, setOpen] = useState(false)
  const [tip, setTip] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleLog(option: (typeof DRINK_TYPE_OPTIONS)[number]) {
    setSaving(true)
    setError(null)
    try {
      await addAlcoholLog(userId, option.value, option.amount_ml, logDate)
      setTip(true)
      setOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'บันทึกไม่สำเร็จ')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="w-full max-w-sm">
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-white py-3 text-sm font-medium text-slate-500 shadow-sm transition hover:bg-slate-50"
        >
          <BeakerIcon className="h-4 w-4" />
          บันทึกแอลกอฮอล์
        </button>
      ) : (
        <div className="rounded-3xl bg-white p-4 shadow-md shadow-water-100">
          <p className="mb-2 text-sm font-medium text-slate-600">ดื่มอะไร?</p>
          <div className="grid grid-cols-2 gap-2">
            {DRINK_TYPE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                disabled={saving}
                onClick={() => handleLog(opt)}
                className="rounded-2xl bg-slate-50 py-2 text-sm text-slate-600 transition hover:bg-slate-100 disabled:opacity-50"
              >
                {opt.label}
              </button>
            ))}
          </div>
          <button onClick={() => setOpen(false)} className="mt-2 text-xs text-slate-400 hover:underline">
            ยกเลิก
          </button>
          {error && <p className="mt-2 text-xs text-coral-500">{error}</p>}
        </div>
      )}
      {tip && <p className="mt-2 rounded-2xl bg-sun-300/30 p-3 text-xs text-water-700">{HYDRATION_TIP_AFTER_ALCOHOL}</p>}
    </div>
  )
}
