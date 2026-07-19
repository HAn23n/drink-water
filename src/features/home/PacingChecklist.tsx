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
  slotCount = 6,
}: PacingChecklistProps) {
  const slots = buildPacingSlots(reminderStart, reminderEnd, dailyGoalMl, slotCount, totalMlSoFar)
  const nextIndex = slots.findIndex((slot) => !slot.done)
  const doneCount = slots.filter((s) => s.done).length

  return (
    <div className="w-full max-w-sm rounded-3xl bg-white p-4 shadow-md shadow-water-100">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-medium text-slate-500">
          <ClipboardDocumentCheckIcon className="h-4 w-4 text-water-500" />
          ตารางดื่มน้ำวันนี้
        </h2>
        <span className="rounded-full bg-water-50 px-2.5 py-1 text-xs font-medium text-water-600">
          {doneCount}/{slots.length} แก้ว
        </span>
      </div>
      <ul className="relative flex flex-col gap-5 pl-1">
        <div className="absolute left-[19px] top-3 bottom-3 w-0.5 bg-slate-100" />
        {slots.map((slot, i) => {
          const isNext = i === nextIndex
          // Per-checkpoint chunk = how much to drink between this slot and the last,
          // which is far easier to read than the running cumulative total.
          const chunkMl = Math.max(0, slot.targetMl - (i > 0 ? slots[i - 1].targetMl : 0))
          return (
            <li key={slot.label} className="relative flex items-center gap-3">
              <span
                className={`z-10 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border-2 transition ${
                  slot.done
                    ? 'border-mint-500 bg-mint-500 text-white'
                    : isNext
                      ? 'border-water-400 bg-white text-water-500 ring-4 ring-water-100'
                      : 'border-slate-200 bg-white text-slate-300'
                }`}
              >
                {slot.done && <CheckIcon className="h-4 w-4" />}
              </span>
              <div className="flex flex-1 items-center justify-between gap-2">
                <div className="flex flex-col">
                  <span className={`text-sm ${slot.done ? 'text-slate-400' : isNext ? 'font-semibold text-water-700' : 'text-slate-600'}`}>
                    {slot.time} น.
                  </span>
                  <span className="text-[11px] text-slate-400">รวม {slot.targetMl.toLocaleString()} ml</span>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-sm font-semibold ${
                    slot.done
                      ? 'bg-mint-100 text-mint-600'
                      : isNext
                        ? 'bg-water-50 text-water-600'
                        : 'bg-slate-50 text-slate-400'
                  }`}
                >
                  +{chunkMl.toLocaleString()} ml
                </span>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
