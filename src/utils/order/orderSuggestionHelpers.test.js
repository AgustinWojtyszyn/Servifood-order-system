import { afterEach, describe, expect, it, vi } from 'vitest'
import { findRepeatCandidate } from './orderSuggestionHelpers'

const signature = () => 'same-order'

const buildOrder = (id, createdAt) => ({
  id,
  created_at: createdAt,
  status: 'archived',
  items: [{ id: 'menu-1', name: 'Menú principal', quantity: 1 }]
})

describe('order suggestion operational day grouping', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('does not count a UTC rollover as an extra local day', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-12T01:30:00.000Z'))

    const orders = [
      buildOrder('sep10-early', '2026-09-10T21:00:00.000Z'),
      buildOrder('sep10-late', '2026-09-11T01:30:00.000Z'),
      buildOrder('sep11-late', '2026-09-12T01:00:00.000Z')
    ]

    expect(findRepeatCandidate(orders, signature)).toBeNull()
  })

  it('returns a candidate after the same order appears on three real operational days', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-12T01:30:00.000Z'))

    const orders = [
      buildOrder('sep9', '2026-09-10T01:00:00.000Z'),
      buildOrder('sep10', '2026-09-11T01:00:00.000Z'),
      buildOrder('sep11', '2026-09-12T01:00:00.000Z')
    ]

    expect(findRepeatCandidate(orders, signature)?.id).toBe('sep11')
  })
})
