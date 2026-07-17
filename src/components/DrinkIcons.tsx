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

const MUG_PATH = 'M5 5 H15 V18 a2.5 2.5 0 0 1-2.5 2.5h-5A2.5 2.5 0 0 1 5 18 Z'
const MUG_HANDLE_PATH = 'M15 8 h1.5 a3 3 0 0 1 0 6H15'

export function BeerMugIcon({ className, fillPercent = 60 }: DrinkIconProps) {
  const clipId = useId()
  const fillY = 5 + (20.5 - 5) * (1 - fillPercent / 100)

  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <clipPath id={clipId}>
        <path d={MUG_PATH} />
      </clipPath>
      <rect x="0" y={fillY} width="24" height="24" clipPath={`url(#${clipId})`} fill="currentColor" opacity="0.4" />
      <path d={MUG_PATH} stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d={MUG_HANDLE_PATH} stroke="currentColor" strokeWidth="1.5" fill="none" />
      <path d="M5 9h10" stroke="currentColor" strokeWidth="1.2" opacity="0.6" />
    </svg>
  )
}

const WINE_PATH =
  'M6.5 3.5 C6.5 3.5 6.7 9.5 8.7 11.6 C9.8 12.8 11 13 11 14.5 V19.5 H8.5 V21.5 H15.5 V19.5 H13 V14.5 C13 13 14.2 12.8 15.3 11.6 C17.3 9.5 17.5 3.5 17.5 3.5 Z'

export function WineGlassIcon({ className, fillPercent = 55 }: DrinkIconProps) {
  const clipId = useId()
  const fillY = 3.5 + (11.5 - 3.5) * (1 - fillPercent / 100)

  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <clipPath id={clipId}>
        <path d={WINE_PATH} />
      </clipPath>
      <rect x="0" y={fillY} width="24" height="11.6" clipPath={`url(#${clipId})`} fill="currentColor" opacity="0.4" />
      <path d={WINE_PATH} stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  )
}

const SHOT_PATH = 'M8 4 H16 L14.6 19.2 a1.6 1.6 0 0 1-1.6 1.4h-2 a1.6 1.6 0 0 1-1.6-1.4 Z'

export function ShotGlassIcon({ className, fillPercent = 70 }: DrinkIconProps) {
  const clipId = useId()
  const fillY = 4 + (20.6 - 4) * (1 - fillPercent / 100)

  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <clipPath id={clipId}>
        <path d={SHOT_PATH} />
      </clipPath>
      <rect x="0" y={fillY} width="24" height="24" clipPath={`url(#${clipId})`} fill="currentColor" opacity="0.4" />
      <path d={SHOT_PATH} stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  )
}

const COCKTAIL_PATH = 'M5 4 H19 L12.9 13 V19 H16.5 V21 H7.5 V19 H11.1 V13 Z'

export function CocktailIcon({ className, fillPercent = 50 }: DrinkIconProps) {
  const clipId = useId()
  const fillY = 4 + (13 - 4) * (1 - fillPercent / 100)

  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <clipPath id={clipId}>
        <path d={COCKTAIL_PATH} />
      </clipPath>
      <rect x="0" y={fillY} width="24" height="13" clipPath={`url(#${clipId})`} fill="currentColor" opacity="0.4" />
      <path d={COCKTAIL_PATH} stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  )
}
