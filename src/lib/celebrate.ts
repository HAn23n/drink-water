import confetti from 'canvas-confetti'

const PALETTE = ['#17b4e0', '#4cc8ea', '#ff7a59', '#ffc857']

/** A three-burst confetti moment for hitting the daily goal. */
export function celebrateGoalReached(): void {
  confetti({ particleCount: 140, spread: 80, startVelocity: 45, colors: PALETTE, origin: { y: 0.6 } })
  confetti({ particleCount: 60, spread: 100, startVelocity: 30, angle: 60, colors: PALETTE, origin: { y: 0.6 } })
  confetti({ particleCount: 60, spread: 100, startVelocity: 30, angle: 120, colors: PALETTE, origin: { y: 0.6 } })
}
