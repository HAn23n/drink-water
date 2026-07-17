import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'

export function LoadingScreen() {
  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-3 bg-water-50">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-water-100 border-t-water-500" />
      <p className="text-sm text-slate-400">กำลังโหลด...</p>
    </div>
  )
}

export function ErrorScreen({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-3 bg-water-50 px-6 text-center">
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
