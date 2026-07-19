const SOUND_PREF_KEY = 'drink-water:sound'

let audioCtx: AudioContext | null = null

export function isSoundEnabled(): boolean {
  return localStorage.getItem(SOUND_PREF_KEY) !== 'off'
}

export function setSoundEnabled(enabled: boolean): void {
  localStorage.setItem(SOUND_PREF_KEY, enabled ? 'on' : 'off')
}

/** A short descending "droplet" blip. Synthesized so no audio asset is needed. */
export function playAddSound(): void {
  if (!isSoundEnabled()) return
  audioCtx ??= new AudioContext()
  const ctx = audioCtx
  const now = ctx.currentTime

  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(880, now)
  osc.frequency.exponentialRampToValueAtTime(440, now + 0.15)
  gain.gain.setValueAtTime(0.15, now)
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18)

  osc.connect(gain).connect(ctx.destination)
  osc.start(now)
  osc.stop(now + 0.2)
}

/** A short rising three-note arpeggio — distinct from the add-water blip, for
 *  the rarer "leveled up a rank" moment. */
export function playRankUpSound(): void {
  if (!isSoundEnabled()) return
  audioCtx ??= new AudioContext()
  const ctx = audioCtx
  const now = ctx.currentTime

  const notes = [523.25, 659.25, 783.99] // C5, E5, G5
  notes.forEach((freq, i) => {
    const start = now + i * 0.09
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(freq, start)
    gain.gain.setValueAtTime(0.001, start)
    gain.gain.exponentialRampToValueAtTime(0.18, start + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.3)
    osc.connect(gain).connect(ctx.destination)
    osc.start(start)
    osc.stop(start + 0.32)
  })
}
