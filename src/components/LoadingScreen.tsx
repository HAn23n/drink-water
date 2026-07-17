import { ArrowPathIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'

export function LoadingScreen() {
  return (
    <div className="fixed inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-water-50">
      <ArrowPathIcon className="h-9 w-9 animate-spin text-water-500" />
      <p className="text-sm text-slate-400">กำลังโหลด...</p>
    </div>
  )
}

export function ErrorScreen({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="fixed inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-water-50 px-6 text-center">
      <ExclamationTriangleIcon className="h-10 w-10 text-coral-400" />
      <p className="text-sm font-medium text-slate-600">{message}</p>
      <button
        onClick={onRetry}
        className="rounded-full bg-water-500 px-5 py-2 text-sm font-medium text-white transition hover:bg-water-600"
      >
        ลองใหม่
      </button>
    </div>
  )
}
