import { describe, it, expect, beforeEach } from 'vitest'
import { getWidgetOrder, saveWidgetOrder, DEFAULT_WIDGET_ORDER } from '../widgetLayout'

describe('widgetLayout', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns the default order when nothing is stored', () => {
    expect(getWidgetOrder('user-1')).toEqual(DEFAULT_WIDGET_ORDER)
  })

  it('round-trips a saved order', () => {
    saveWidgetOrder('user-1', ['streakFreeze', 'alcohol', 'tip', 'pacing', 'logs', 'otherDrinks', 'challenge'])
    expect(getWidgetOrder('user-1')).toEqual(['streakFreeze', 'alcohol', 'tip', 'pacing', 'logs', 'otherDrinks', 'challenge'])
  })

  it('falls back to the default when stored JSON is invalid', () => {
    localStorage.setItem('widget-order-user-1', 'not json')
    expect(getWidgetOrder('user-1')).toEqual(DEFAULT_WIDGET_ORDER)
  })

  it('appends widgets missing from a stored order', () => {
    localStorage.setItem('widget-order-user-1', JSON.stringify(['alcohol', 'logs']))
    expect(getWidgetOrder('user-1')).toEqual(['alcohol', 'logs', 'streakFreeze', 'pacing', 'otherDrinks', 'tip', 'challenge'])
  })

  it('drops unknown ids from a stored order', () => {
    localStorage.setItem('widget-order-user-1', JSON.stringify(['alcohol', 'mystery', 'logs']))
    expect(getWidgetOrder('user-1')).toEqual(['alcohol', 'logs', 'streakFreeze', 'pacing', 'otherDrinks', 'tip', 'challenge'])
  })

  it('keeps separate users isolated', () => {
    saveWidgetOrder('user-1', ['tip', 'alcohol', 'pacing', 'logs', 'otherDrinks', 'streakFreeze', 'challenge'])
    expect(getWidgetOrder('user-2')).toEqual(DEFAULT_WIDGET_ORDER)
  })
})
