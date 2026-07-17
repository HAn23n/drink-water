import type { BmiTone } from '../lib/water'

interface BmiGaugeProps {
  bmi: number
  tone: BmiTone
}

const TONE_COLOR: Record<BmiTone, string> = {
  low: '#4cc8ea',
  good: '#17b4e0',
  warn: '#ffc857',
  alert: '#f0603d',
}

const TRACK_COLOR = '#e7eef4'

const MIN_BMI = 15
const MAX_BMI = 35
// Each zone's lower bound is the previous zone's upTo (first zone starts at MIN_BMI).
const ZONE_BOUNDS: { upTo: number; tone: BmiTone }[] = [
  { upTo: 18.5, tone: 'low' },
  { upTo: 23, tone: 'good' },
  { upTo: 25, tone: 'warn' },
  { upTo: MAX_BMI, tone: 'alert' },
]

function bmiToAngle(bmi: number): number {
  const t = Math.min(Math.max((bmi - MIN_BMI) / (MAX_BMI - MIN_BMI), 0), 1)
  return 180 - t * 180
}

function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy - r * Math.sin(rad) }
}

function arcPath(cx: number, cy: number, r: number, fromAngle: number, toAngle: number): string {
  const start = polar(cx, cy, r, fromAngle)
  const end = polar(cx, cy, r, toAngle)
  const largeArc = fromAngle - toAngle > 180 ? 1 : 0
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`
}

export function BmiGauge({ bmi, tone }: BmiGaugeProps) {
  const cx = 100
  const cy = 96
  const r = 76
  const needleAngle = bmiToAngle(bmi)
  const needleTip = polar(cx, cy, r - 28, needleAngle)

  // Only the current zone is drawn as a colored arc — a single unbroken track underneath
  // means there are no adjacent round-capped segments to overlap at zone boundaries.
  const activeZoneIndex = ZONE_BOUNDS.findIndex((zone) => zone.tone === tone)
  const activeZoneFromBmi = activeZoneIndex > 0 ? ZONE_BOUNDS[activeZoneIndex - 1].upTo : MIN_BMI
  const activeZoneToBmi = ZONE_BOUNDS[activeZoneIndex]?.upTo ?? MAX_BMI

  return (
    <svg viewBox="0 0 200 112" className="w-full max-w-[220px]" role="img" aria-label={`BMI ${bmi}`}>
      <path
        d={arcPath(cx, cy, r, 180, 0)}
        stroke={TRACK_COLOR}
        strokeWidth={16}
        strokeLinecap="round"
        fill="none"
      />
      <path
        d={arcPath(cx, cy, r, bmiToAngle(activeZoneFromBmi), bmiToAngle(activeZoneToBmi))}
        stroke={TONE_COLOR[tone]}
        strokeWidth={16}
        strokeLinecap="round"
        fill="none"
      />
      <line
        x1={cx}
        y1={cy}
        x2={needleTip.x}
        y2={needleTip.y}
        stroke={TONE_COLOR[tone]}
        strokeWidth={4}
        strokeLinecap="round"
      />
      <circle cx={cx} cy={cy} r={7} fill="white" stroke={TONE_COLOR[tone]} strokeWidth={3} />
    </svg>
  )
}
