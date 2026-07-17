import { useId } from 'react'

interface DrinkIconProps {
  className?: string
  /** 0-100, how full the vessel appears — purely decorative */
  fillPercent?: number
}

const GLASS_PATH = 'M5 4 H19 L17.2 20.5 a2 2 0 0 1-2 1.8 H8.8 a2 2 0 0 1-2-1.8 L5 4 Z'

export function GlassIcon({ className, fillPercent = 55 }: DrinkIconProps) {
  const clipId = useId()
  const fillY = 4 + (22 - 4) * (1 - fillPercent / 100)

  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <clipPath id={clipId}>
        <path d={GLASS_PATH} />
      </clipPath>
      <rect x="0" y={fillY} width="24" height="24" clipPath={`url(#${clipId})`} fill="currentColor" opacity="0.35" />
      <path d={GLASS_PATH} stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  )
}

const BOTTLE_PATH =
  'M10 2.5h4v3l1.6 2.2c.5.7.8 1.6.8 2.5V19a2 2 0 0 1-2 2h-5a2 2 0 0 1-2-2V10.2c0-.9.3-1.8.8-2.5L10 5.5v-3Z'

export function BottleIcon({ className, fillPercent = 60 }: DrinkIconProps) {
  const clipId = useId()
  const fillY = 6 + (21 - 6) * (1 - fillPercent / 100)

  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <clipPath id={clipId}>
        <path d={BOTTLE_PATH} />
      </clipPath>
      <rect x="0" y={fillY} width="24" height="24" clipPath={`url(#${clipId})`} fill="currentColor" opacity="0.35" />
      <path d={BOTTLE_PATH} stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M9.5 8.5h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}
