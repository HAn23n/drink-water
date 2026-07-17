import { useCallback, useEffect, useState, type ReactElement } from 'react'
import { ClockIcon, TrashIcon, XMarkIcon } from '@heroicons/react/24/outline'
import {
  addAlcoholLog,
  deleteAlcoholLog,
  fetchAlcoholLogsForDate,
  DRINK_TYPE_OPTIONS,
  type AlcoholLog,
  type DrinkType,
} from '../../lib/alcoholLogs'
import { HYDRATION_TIP_AFTER_ALCOHOL } from '../../lib/tips'
import { BeerMugIcon, WineGlassIcon, ShotGlassIcon, CocktailIcon } from '../../components/DrinkIcons'

interface AlcoholCardProps {
  userId: string
  logDate: string
}

const DRINK_ICON: Record<DrinkType, (props: { className?: string }) => ReactElement> = {
  beer: (props) => <BeerMugIcon {...props} fillPercent={70} />,
  wine: (props) => <WineGlassIcon {...props} fillPercent={60} />,
  spirit: (props) => <ShotGlassIcon {...props} fillPercent={80} />,
  other: (props) => <CocktailIcon {...props} fillPercent={55} />,
}

export function AlcoholCard({ userId, logDate }: AlcoholCardProps) {
  const [open, setOpen] = useState(false)
  const [tip, setTip] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [logs, setLogs] = useState<AlcoholLog[]>([])

  const reload = useCallback(async () => {
    setLogs(await fetchAlcoholLogsForDate(userId, logDate))
  }, [userId, logDate])

  useEffect(() => {
    reload().catch((err) => setError(err instanceof Error ? err.message : 'โหลดข้อมูลไม่สำเร็จ'))
  }, [reload])

  async function handleLog(option: (typeof DRINK_TYPE_OPTIONS)[number]) {
    setSaving(true)
    setError(null)
    try {
      await addAlcoholLog(userId, option.value, option.amount_ml, logDate)
      await reload()
      setTip(true)
      setOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'บันทึกไม่สำเร็จ')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteAlcoholLog(id)
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ลบไม่สำเร็จ')
    }
  }

  return (
    <div className="w-full max-w-sm overflow-hidden rounded-3xl border border-amber-100 bg-gradient-to-br from-amber-50 to-white shadow-md shadow-amber-100/70">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-4 py-3.5"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-amber-600">
          <CocktailIcon className="h-5 w-5 text-amber-500" fillPercent={40} />
          แอลกอฮอล์วันนี้
        </span>
        {logs.length > 0 ? (
          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-600">
            {logs.length} แก้ว
          </span>
        ) : (
          <span className="text-xs text-amber-400">{open ? 'ปิด' : 'บันทึก'}</span>
        )}
      </button>

      {logs.length > 0 && (
        <ul className="flex flex-col gap-1.5 px-4 pb-2">
          {logs.map((log) => (
            <li
              key={log.id}
              className="flex items-center justify-between gap-2 rounded-2xl bg-white/70 px-3 py-2 text-xs text-amber-700"
            >
              <span className="flex items-center gap-2">
                {DRINK_ICON[log.drink_type]({ className: 'h-4 w-4 text-amber-400' })}
                {DRINK_TYPE_OPTIONS.find((o) => o.value === log.drink_type)?.label ?? log.drink_type}
                <span className="flex items-center gap-1 text-amber-400">
                  <ClockIcon className="h-3 w-3" />
                  {new Date(log.logged_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </span>
              <button
                onClick={() => handleDelete(log.id)}
                aria-label="ลบรายการนี้"
                className="rounded-full p-1 text-amber-300 transition hover:bg-amber-100 hover:text-amber-600"
              >
                <TrashIcon className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {open && (
        <div className="border-t border-amber-100/80 px-4 py-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-medium text-amber-500">ดื่มอะไร?</p>
            <button onClick={() => setOpen(false)} aria-label="ปิด" className="text-amber-300 hover:text-amber-500">
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {DRINK_TYPE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                disabled={saving}
                onClick={() => handleLog(opt)}
                className="flex flex-col items-center gap-1 rounded-2xl bg-white px-1 py-3 text-[11px] font-medium text-amber-600 shadow-sm shadow-amber-100 transition hover:-translate-y-0.5 hover:shadow-md disabled:opacity-50"
              >
                {DRINK_ICON[opt.value]({ className: 'h-7 w-7 text-amber-500' })}
                {opt.label.split(' ')[0]}
              </button>
            ))}
          </div>
          {error && <p className="mt-2 text-xs text-coral-500">{error}</p>}
        </div>
      )}

      {tip && (
        <p className="mx-4 mb-3 rounded-2xl bg-amber-100/60 p-3 text-xs text-amber-700">{HYDRATION_TIP_AFTER_ALCOHOL}</p>
      )}
    </div>
  )
}
