import { useEffect, useRef, useState } from 'react'
import { ChevronDownIcon, CheckIcon } from '@heroicons/react/24/outline'

interface SelectOption<T extends string> {
  value: T
  label: string
}

interface SelectProps<T extends string> {
  value: T
  options: SelectOption<T>[]
  onChange: (value: T) => void
  className?: string
}

export function Select<T extends string>({ value, options, onChange, className }: SelectProps<T>) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const selected = options.find((o) => o.value === value)

  useEffect(() => {
    if (!open) return
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  return (
    <div ref={containerRef} className={`relative ${className ?? ''}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-left text-sm text-slate-700 outline-none transition focus:border-water-500 focus:ring-4 focus:ring-water-100"
      >
        <span className="truncate">{selected?.label}</span>
        <ChevronDownIcon
          className={`h-4 w-4 flex-shrink-0 text-water-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <ul className="absolute z-20 mt-2 w-full overflow-hidden rounded-2xl bg-white py-1.5 shadow-xl shadow-water-500/15 ring-1 ring-slate-100">
          {options.map((opt) => (
            <li key={opt.value}>
              <button
                type="button"
                onClick={() => {
                  onChange(opt.value)
                  setOpen(false)
                }}
                className={`flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left text-sm transition ${
                  opt.value === value ? 'bg-water-50 font-medium text-water-700' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span>{opt.label}</span>
                {opt.value === value && <CheckIcon className="h-4 w-4 flex-shrink-0 text-water-500" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
