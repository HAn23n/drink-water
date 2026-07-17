import { ClipboardDocumentCheckIcon, CheckIcon } from '@heroicons/react/24/outline'
import { buildPacingSlots } from '../../lib/pacing'

interface PacingChecklistProps {
  reminderStart: string
  reminderEnd: string
  dailyGoalMl: number
  totalMlSoFar: number
  slotCount?: number
}

export function PacingChecklist({
  reminderStart,
  reminderEnd,
  dailyGoalMl,
  totalMlSoFar,
  slotCount = 4,
}: PacingChecklistProps) {
  const slots = buildPacingSlots(reminderStart, reminderEnd, dailyGoalMl, slotCount, totalMlSoFar)

  return (
    <div className="w-full max-w-sm rounded-3xl bg-white p-4 shadow-md shadow-water-100">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-500">
        <ClipboardDocumentCheckIcon className="h-4 w-4 text-water-500" />
        ตารางดื่มน้ำวันนี้
      </h2>
      <ul className="flex flex-col gap-2">
        {slots.map((slot) => (
          <li key={slot.label} className="flex items-center gap-3 text-sm">
            <span
              className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full ${
                slot.done ? 'bg-water-500 text-white' : 'border border-slate-200'
              }`}
            >
              {slot.done && <CheckIcon className="h-3 w-3" />}
            </span>
            <span className={slot.done ? 'text-slate-400 line-through' : 'text-slate-600'}>
              {slot.time} · {slot.label} ({slot.targetMl.toLocaleString()} ml)
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
