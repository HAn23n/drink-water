import type { ReactNode } from 'react'
import { Reorder, useDragControls } from 'framer-motion'
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline'
import type { WidgetId } from '../../lib/widgetLayout'

interface DraggableWidgetProps {
  id: WidgetId
  onRemove: () => void
  children: ReactNode
}

export function DraggableWidget({ id, onRemove, children }: DraggableWidgetProps) {
  const controls = useDragControls()

  return (
    <Reorder.Item as="div" value={id} dragListener={false} dragControls={controls} className="relative">
      <div
        onPointerDown={(e) => controls.start(e)}
        aria-label="ลากเพื่อจัดเรียง"
        className="absolute -left-2 top-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2 cursor-grab touch-none items-center justify-center rounded-full bg-white p-1.5 text-slate-300 shadow-md shadow-water-100 active:cursor-grabbing"
      >
        <Bars3Icon className="h-4 w-4" />
      </div>
      <button
        onClick={onRemove}
        aria-label="ซ่อนวิดเจ็ตนี้"
        className="absolute -right-2 -top-2 z-10 rounded-full bg-white p-1 text-coral-400 shadow-md shadow-water-100 transition hover:bg-coral-100 hover:text-coral-600"
      >
        <XMarkIcon className="h-3.5 w-3.5" />
      </button>
      <div className="pl-2">{children}</div>
    </Reorder.Item>
  )
}
