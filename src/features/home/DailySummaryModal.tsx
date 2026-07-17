import { InformationCircleIcon } from '@heroicons/react/24/outline'
import { calculateExpectedProgress } from '../../lib/pacing'

interface DailySummaryModalProps {
  open: boolean
  onClose: () => void
  totalMl: number
  goalMl: number
  reminderStart: string
  reminderEnd: string
}

export function DailySummaryModal({ open, onClose, totalMl, goalMl, reminderStart, reminderEnd }: DailySummaryModalProps) {
  if (!open) return null

  const now = new Date()
  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  const { expectedMl } = calculateExpectedProgress(reminderStart, reminderEnd, goalMl, nowMinutes)
  const percent = goalMl > 0 ? Math.round((totalMl / goalMl) * 100) : 0

  let message: string
  if (totalMl >= goalMl) {
    message = 'สุดยอด! วันนี้คุณดื่มน้ำครบเป้าหมายแล้ว 🎉'
  } else if (totalMl >= expectedMl) {
    message = 'ตอนนี้คุณดื่มน้ำตามจังหวะที่ควรเป็นแล้ว ทำต่อไปแบบนี้!'
  } else {
    const gap = expectedMl - totalMl
    message = `เทียบกับช่วงเวลานี้ ควรดื่มไปแล้วประมาณ ${expectedMl.toLocaleString()} ml — ลองดื่มเพิ่มอีกสัก ${gap.toLocaleString()} ml เพื่อให้ทันจังหวะ`
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-water-700/30 px-6 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="w-full max-w-sm rounded-[28px] bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-display mb-1 flex items-center gap-2 text-lg font-semibold text-water-700">
          <InformationCircleIcon className="h-5 w-5" />
          สรุปวันนี้
        </h2>
        <p className="mb-4 text-sm text-slate-500">
          ดื่มไปแล้ว {totalMl.toLocaleString()} ml จากเป้าหมาย {goalMl.toLocaleString()} ml ({percent}%)
        </p>
        <div className="mb-4 rounded-2xl bg-water-50 p-4 text-sm text-water-700">{message}</div>
        <button
          onClick={onClose}
          className="w-full rounded-full bg-water-500 py-2.5 text-sm font-medium text-white transition hover:bg-water-600"
        >
          ปิด
        </button>
      </div>
    </div>
  )
}
