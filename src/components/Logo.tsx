import { useId } from 'react'

interface LogoProps {
  className?: string
  /** Render the droplet in solid white — for placing on a coloured tile. */
  white?: boolean
}

// The "Minimal" mark: one clean water droplet with a soft highlight.
const DROPLET_PATH = 'M50 8 C40 28 20 46 20 66 A30 30 0 0 0 80 66 C80 46 60 28 50 8 Z'

export function Logo({ className, white = false }: LogoProps) {
  const gradientId = useId()
  return (
    <svg viewBox="0 0 100 100" className={className} role="img" aria-label="Drink Water">
      {!white && (
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#17b4e0" />
            <stop offset="1" stopColor="#0b4f73" />
          </linearGradient>
        </defs>
      )}
      <path d={DROPLET_PATH} fill={white ? '#ffffff' : `url(#${gradientId})`} />
      <ellipse
        cx="38"
        cy="50"
        rx="7"
        ry="13"
        fill={white ? '#cdeefb' : '#ffffff'}
        opacity={white ? 0.75 : 0.35}
        transform="rotate(-18 38 50)"
      />
    </svg>
  )
}
