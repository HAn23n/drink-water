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
  const goalReached = clamped >= 100

  return (
    <div className="relative" style={{ width: size, height: size }}>
      {/* ambient glow — the orb's "aura", drifting slowly behind it */}
      <div
        className="absolute -inset-6 -z-10 rounded-full opacity-60 blur-2xl [animation:blob-drift_9s_ease-in-out_infinite]"
        style={{ background: 'radial-gradient(circle, var(--color-water-300), transparent 70%)' }}
      />
      <div
        className="absolute -inset-4 -z-10 rounded-full opacity-40 blur-2xl [animation:blob-drift_11s_ease-in-out_infinite_reverse]"
        style={{ background: 'radial-gradient(circle, var(--color-coral-400), transparent 70%)' }}
      />

      <div
        className={`relative h-full w-full overflow-hidden rounded-full bg-white shadow-[0_24px_48px_-16px_rgba(11,79,115,0.4)] ${
          goalReached ? '[animation:goal-ring_2.4s_ease-in-out_infinite]' : ''
        }`}
      >
        <div
          className="absolute inset-x-0 bottom-0 transition-[top] duration-700 ease-out"
          style={{ top: `${waterTopPercent}%` }}
        >
          <div className="relative h-[999px] w-full">
            <svg
              className="absolute top-0 left-0 h-6 w-[200%] -translate-y-3 text-water-300 [animation:wave-move_7s_linear_infinite]"
              viewBox="0 0 400 24"
              preserveAspectRatio="none"
            >
              <path
                d="M0 12 C 50 24, 150 0, 200 12 C 250 24, 350 0, 400 12 L400 24 L0 24 Z"
                fill="currentColor"
                opacity="0.7"
              />
            </svg>
            <svg
              className="absolute top-0 left-0 h-5 w-[200%] -translate-y-2 text-water-400 [animation:wave-move_5s_linear_infinite_reverse]"
              viewBox="0 0 400 24"
              preserveAspectRatio="none"
            >
              <path
                d="M0 12 C 50 0, 150 24, 200 12 C 250 0, 350 24, 400 12 L400 24 L0 24 Z"
                fill="currentColor"
              />
            </svg>
            <div className="absolute inset-x-0 top-2 bottom-0 bg-gradient-to-b from-water-300 to-water-500" />
          </div>
        </div>

        {/* glossy highlight — reads as light hitting a glass/water surface */}
        <div
          className="pointer-events-none absolute inset-0 rounded-full opacity-70"
          style={{
            background:
              'radial-gradient(circle at 32% 26%, rgba(255,255,255,0.85), rgba(255,255,255,0) 45%)',
          }}
        />

        {/* frosted chip keeps text readable at any water level, instead of swapping color */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="flex flex-col items-center gap-0.5 rounded-3xl bg-white/75 px-5 py-3 backdrop-blur-sm">
            <span className="font-display text-4xl font-semibold text-water-700">{Math.round(clamped)}%</span>
            {label && <span className="text-sm font-medium text-slate-600">{label}</span>}
            {sublabel && <span className="text-xs text-slate-400">{sublabel}</span>}
          </div>
        </div>
      </div>
    </div>
  )
}
