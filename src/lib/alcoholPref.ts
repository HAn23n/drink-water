const STORAGE_KEY = 'alcohol-tracking-enabled'

export function isAlcoholTrackingEnabled(): boolean {
  return localStorage.getItem(STORAGE_KEY) === 'true'
}

export function setAlcoholTrackingEnabled(enabled: boolean): void {
  localStorage.setItem(STORAGE_KEY, String(enabled))
}
