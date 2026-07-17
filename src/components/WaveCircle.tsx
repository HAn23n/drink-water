interface WaveCircleProps {
  /** 0-100+, percent of daily goal reached */
  percent: number
  label?: string
  sublabel?: string
  size?: number
}

export function WaveCircle({ percent, label, sublabel, size = 240 }: WaveCircleProps) {
  const clamped = Math.max(0, Math.min(100, percent))
  const waterTopPercent = 100 - clamped
  const textIsOnWater = clamped > 55

  return (
    <div
      className="relative overflow-hidden rounded-full border-4 border-water-100 bg-white shadow-inner shadow-water-100"
      style={{ width: size, height: size }}
    >
      <div
        className="absolute inset-x-0 bottom-0 transition-[top] duration-700 ease-out"
        style={{ top: `${waterTopPercent}%` }}
      >
        <div className="relative h-[999px] w-full">
          <svg
            className="absolute top-0 left-0 h-6 w-[200%] -translate-y-3 text-water-400 [animation:wave-move_7s_linear_infinite]"
            viewBox="0 0 400 24"
            preserveAspectRatio="none"
          >
            <path
              d="M0 12 C 50 24, 150 0, 200 12 C 250 24, 350 0, 400 12 L400 24 L0 24 Z"
              fill="currentColor"
              opacity="0.55"
            />
          </svg>
          <svg
            className="absolute top-0 left-0 h-5 w-[200%] -translate-y-2 text-water-500 [animation:wave-move_5s_linear_infinite_reverse]"
            viewBox="0 0 400 24"
            preserveAspectRatio="none"
          >
            <path
              d="M0 12 C 50 0, 150 24, 200 12 C 250 0, 350 24, 400 12 L400 24 L0 24 Z"
              fill="currentColor"
            />
          </svg>
          <div className="absolute inset-x-0 top-2 bottom-0 bg-water-500" />
        </div>
      </div>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className={`text-3xl font-bold ${textIsOnWater ? 'text-white' : 'text-water-700'}`}
        >
          {Math.round(clamped)}%
        </span>
        {label && (
          <span className={`mt-1 text-sm font-medium ${textIsOnWater ? 'text-white' : 'text-slate-600'}`}>
            {label}
          </span>
        )}
        {sublabel && (
          <span className={`text-xs ${textIsOnWater ? 'text-water-50' : 'text-slate-400'}`}>
            {sublabel}
          </span>
        )}
      </div>
    </div>
  )
}
