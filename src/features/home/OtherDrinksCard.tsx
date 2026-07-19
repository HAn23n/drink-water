import { useCallback, useEffect, useState } from 'react'
import { ClockIcon, TrashIcon, XMarkIcon } from '@heroicons/react/24/outline'
import {
  addOtherDrinkLog,
  deleteOtherDrinkLog,
  fetchOtherDrinkLogsForDate,
  otherDrinkGoalCompensation,
  otherDrinkWaterCredit,
  OTHER_DRINK_OPTIONS,
  type OtherDrinkLog,
} from '../../lib/otherDrinks'
import { TakeoutCupIcon } from '../../components/DrinkIcons'

interface OtherDrinksCardProps {
  userId: string
  logDate: string
  compensationRatio?: number
  /** Fires after a log is added or removed, so the parent can refetch its
   *  own water-credit/goal-compensation total for this day. */
  onChange?: () => void
}

export function OtherDrinksCard({ userId, logDate, compensationRatio, onChange }: OtherDrinksCardProps) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [logs, setLogs] = useState<OtherDrinkLog[]>([])

  const reload = useCallback(async () => {
    setLogs(await fetchOtherDrinkLogsForDate(userId, logDate))
  }, [userId, logDate])

  useEffect(() => {
    reload().catch((err) => setError(err instanceof Error ? err.message : 'โหลดข้อมูลไม่สำเร็จ'))
  }, [reload])

  const totalMl = logs.reduce((sum, log) => sum + log.amount_ml, 0)

  async function handleLog(option: (typeof OTHER_DRINK_OPTIONS)[number]) {
    setSaving(true)
    setError(null)
    try {
      await addOtherDrinkLog(userId, option.value, option.amount_ml, logDate)
      await reload()
      onChange?.()
      setOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'บันทึกไม่สำเร็จ')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteOtherDrinkLog(id)
      await reload()
      onChange?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ลบไม่สำเร็จ')
    }
  }

  return (
    <div className="w-full max-w-sm overflow-hidden rounded-3xl border border-latte-100 bg-gradient-to-br from-latte-50 to-white shadow-md shadow-latte-100/70">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-4 py-3.5"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-latte-600">
          <TakeoutCupIcon className="h-5 w-5 text-latte-500" fillPercent={45} />
          ชา/กาแฟ/น้ำหวานวันนี้
        </span>
        {logs.length > 0 ? (
          <span className="rounded-full bg-latte-100 px-2.5 py-1 text-xs font-medium text-latte-600">
            {logs.length} แก้ว
          </span>
        ) : (
          <span className="text-xs text-latte-400">{open ? 'ปิด' : 'บันทึก'}</span>
        )}
      </button>

      {logs.length > 0 && (
        <ul className="flex flex-col gap-1.5 px-4 pb-2">
          {logs.map((log) => (
            <li
              key={log.id}
              className="flex items-center justify-between gap-2 rounded-2xl bg-white/70 px-3 py-2 text-xs text-latte-700"
            >
              <span className="flex items-center gap-2">
                <TakeoutCupIcon className="h-4 w-4 text-latte-400" fillPercent={45} />
                {OTHER_DRINK_OPTIONS.find((o) => o.value === log.drink_type)?.label ?? log.drink_type}
                <span className="flex items-center gap-1 text-latte-400">
                  <ClockIcon className="h-3 w-3" />
                  {new Date(log.logged_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </span>
              <button
                onClick={() => handleDelete(log.id)}
                aria-label="ลบรายการนี้"
                className="rounded-full p-1 text-latte-300 transition hover:bg-latte-100 hover:text-latte-600"
              >
                <TrashIcon className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {open && (
        <div className="border-t border-latte-100/80 px-4 py-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-medium text-latte-500">ดื่มอะไร?</p>
            <button onClick={() => setOpen(false)} aria-label="ปิด" className="text-latte-300 hover:text-latte-500">
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-5 gap-2">
            {OTHER_DRINK_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                disabled={saving}
                onClick={() => handleLog(opt)}
                className="flex flex-col items-center gap-1 rounded-2xl bg-white px-1 py-3 text-[11px] font-medium text-latte-600 shadow-sm shadow-latte-100 transition hover:-translate-y-0.5 hover:shadow-md disabled:opacity-50"
              >
                <TakeoutCupIcon className="h-7 w-7 text-latte-500" fillPercent={45} />
                {opt.label}
              </button>
            ))}
          </div>
          {error && <p className="mt-2 text-xs text-coral-500">{error}</p>}
        </div>
      )}

      {totalMl > 0 && (
        <p className="mx-4 mb-3 rounded-2xl bg-latte-100/60 p-3 text-xs text-latte-700">
          นับเป็นน้ำ +{otherDrinkWaterCredit(totalMl).toLocaleString()} ml เข้าเป้าหมาย และเพิ่มเป้าหมายวันนี้อีก +
          {otherDrinkGoalCompensation(totalMl, compensationRatio).toLocaleString()} ml เพื่อชดเชยคาเฟอีน/น้ำตาล
        </p>
      )}
    </div>
  )
}
