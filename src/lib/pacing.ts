function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

function fromMinutes(min: number): string {
  const wrapped = ((min % (24 * 60)) + 24 * 60) % (24 * 60)
  const h = Math.floor(wrapped / 60)
  const m = wrapped % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/** How far "into" the drinking window (reminderStart-reminderEnd) `nowMinutes` is, as a 0-1 ratio. */
function elapsedRatio(reminderStart: string, reminderEnd: string, nowMinutes: number): number {
  const startM = toMinutes(reminderStart)
  const endM = toMinutes(reminderEnd)
  const wraps = endM <= startM
  const windowMin = wraps ? 24 * 60 - startM + endM : endM - startM
  if (windowMin <= 0) return 1

  let elapsed: number
  if (!wraps) {
    if (nowMinutes <= startM) elapsed = 0
    else if (nowMinutes >= endM) elapsed = windowMin
    else elapsed = nowMinutes - startM
  } else if (nowMinutes >= startM) {
    elapsed = nowMinutes - startM
  } else if (nowMinutes <= endM) {
    elapsed = 24 * 60 - startM + nowMinutes
  } else {
    elapsed = windowMin
  }

  return Math.min(Math.max(elapsed / windowMin, 0), 1)
}

/** Roughly how much water someone pacing evenly through their reminder window
 *  should have had by now. A guideline, not a medical calculation. */
export function calculateExpectedProgress(
  reminderStart: string,
  reminderEnd: string,
  dailyGoalMl: number,
  nowMinutes: number,
): { expectedMl: number; progressRatio: number } {
  const progressRatio = elapsedRatio(reminderStart, reminderEnd, nowMinutes)
  return { expectedMl: Math.round(dailyGoalMl * progressRatio), progressRatio }
}

export interface PacingSlot {
  label: string
  time: string
  targetMl: number
  done: boolean
}

/** Splits the reminder window into `slotCount` even checkpoints for a simple
 *  "did I keep pace" checklist. Each slot is "done" once logged total reaches it. */
export function buildPacingSlots(
  reminderStart: string,
  reminderEnd: string,
  dailyGoalMl: number,
  slotCount: number,
  totalMlSoFar: number,
): PacingSlot[] {
  const startM = toMinutes(reminderStart)
  const endM = toMinutes(reminderEnd)
  const wraps = endM <= startM
  const windowMin = wraps ? 24 * 60 - startM + endM : endM - startM

  const slots: PacingSlot[] = []
  for (let i = 1; i <= slotCount; i++) {
    const atMin = startM + Math.round((windowMin * i) / slotCount)
    const targetMl = Math.round((dailyGoalMl * i) / slotCount)
    slots.push({
      label: `แก้วที่ ${i}`,
      time: fromMinutes(atMin),
      targetMl,
      done: totalMlSoFar >= targetMl,
    })
  }
  return slots
}
