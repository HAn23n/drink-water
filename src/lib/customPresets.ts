export interface CustomPreset {
  id: string
  label: string
  amountMl: number
}

function storageKey(userId: string): string {
  return `custom-presets-${userId}`
}

export function getCustomPresets(userId: string): CustomPreset[] {
  const raw = localStorage.getItem(storageKey(userId))
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (p): p is CustomPreset =>
        !!p && typeof p.id === 'string' && typeof p.label === 'string' && typeof p.amountMl === 'number',
    )
  } catch {
    return []
  }
}

export function saveCustomPresets(userId: string, presets: CustomPreset[]): void {
  localStorage.setItem(storageKey(userId), JSON.stringify(presets))
}
