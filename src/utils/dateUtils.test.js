import { afterEach, describe, expect, it, vi } from 'vitest'
import { getTodayISOInTimeZone } from './dateUtils'

describe('getTodayISOInTimeZone', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('keeps the San Juan calendar date after UTC has rolled to the next day', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-12T00:30:00.000Z'))

    expect(getTodayISOInTimeZone()).toBe('2026-09-11')
  })

  it('moves to the next San Juan day at local midnight', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-12T03:00:00.000Z'))

    expect(getTodayISOInTimeZone()).toBe('2026-09-12')
  })
})
