import confetti from 'canvas-confetti'

const PALETTE = ['#17b4e0', '#4cc8ea', '#ff7a59', '#ffc857']
const RANK_UP_PALETTE = ['#ffc857', '#ff7a59', '#d94a29', '#ffffff']

/** A three-burst confetti moment for hitting the daily goal. */
export function celebrateGoalReached(): void {
  confetti({ particleCount: 140, spread: 80, startVelocity: 45, colors: PALETTE, origin: { y: 0.6 } })
  confetti({ particleCount: 60, spread: 100, startVelocity: 30, angle: 60, colors: PALETTE, origin: { y: 0.6 } })
  confetti({ particleCount: 60, spread: 100, startVelocity: 30, angle: 120, colors: PALETTE, origin: { y: 0.6 } })
}

/** A single wide gold/coral burst from the top — rarer than the daily-goal
 *  confetti, so it reads as a bigger, ceremonial moment for leveling up a rank. */
export function celebrateRankUp(): void {
  confetti({ particleCount: 200, spread: 130, startVelocity: 55, ticks: 200, colors: RANK_UP_PALETTE, origin: { y: 0.3 } })
}
