interface ConfirmDialogProps {
  open: boolean
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'ยืนยัน',
  cancelLabel = 'ยกเลิก',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-water-700/30 px-6 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-xs rounded-[28px] bg-white p-6 text-center shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="font-display text-lg font-semibold text-water-700">{title}</p>
        {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
        <div className="mt-5 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded-full border border-slate-200 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 rounded-full bg-coral-500 py-2.5 text-sm font-medium text-white transition hover:bg-coral-600"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
