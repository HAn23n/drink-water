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
