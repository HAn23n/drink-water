export type WidgetId = 'streakFreeze' | 'pacing' | 'alcohol' | 'otherDrinks' | 'tip' | 'logs' | 'challenge'

export const DEFAULT_WIDGET_ORDER: WidgetId[] = [
  'streakFreeze',
  'logs',
  'otherDrinks',
  'pacing',
  'alcohol',
  'tip',
  'challenge',
]

// New widgets start hidden until the user opts to add them from the widget picker.
export const DEFAULT_HIDDEN_WIDGETS: WidgetId[] = ['challenge']

const KNOWN_IDS: WidgetId[] = ['streakFreeze', 'pacing', 'alcohol', 'otherDrinks', 'tip', 'logs', 'challenge']

export const WIDGET_LABELS: Record<WidgetId, string> = {
  streakFreeze: 'ตั๋วพักแรงค์',
  logs: 'รายการดื่มน้ำ',
  pacing: 'ตารางดื่มน้ำ',
  alcohol: 'แอลกอฮอล์',
  otherDrinks: 'ชา/กาแฟ/น้ำหวาน',
  tip: 'เคล็ดลับวันนี้',
  challenge: 'ความท้าทาย (Challenge)',
}

function orderStorageKey(userId: string): string {
  return `widget-order-${userId}`
}

function hiddenStorageKey(userId: string): string {
  return `widget-hidden-${userId}`
}

export function getWidgetOrder(userId: string): WidgetId[] {
  const raw = localStorage.getItem(orderStorageKey(userId))
  if (!raw) return DEFAULT_WIDGET_ORDER

  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return DEFAULT_WIDGET_ORDER
    const valid = parsed.filter((id): id is WidgetId => KNOWN_IDS.includes(id))
    const missing = KNOWN_IDS.filter((id) => !valid.includes(id))
    return [...valid, ...missing]
  } catch {
    return DEFAULT_WIDGET_ORDER
  }
}

export function saveWidgetOrder(userId: string, order: WidgetId[]): void {
  localStorage.setItem(orderStorageKey(userId), JSON.stringify(order))
}

export function getHiddenWidgets(userId: string): WidgetId[] {
  const raw = localStorage.getItem(hiddenStorageKey(userId))
  if (!raw) return DEFAULT_HIDDEN_WIDGETS

  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return DEFAULT_HIDDEN_WIDGETS
    return parsed.filter((id): id is WidgetId => KNOWN_IDS.includes(id))
  } catch {
    return DEFAULT_HIDDEN_WIDGETS
  }
}

export function saveHiddenWidgets(userId: string, hidden: WidgetId[]): void {
  localStorage.setItem(hiddenStorageKey(userId), JSON.stringify(hidden))
}
