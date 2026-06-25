import { describe, expect, it } from 'vitest'
import { matchesDailyOrderStatusFilter } from './useDailyOrdersFilters'
import { calculateStats } from '../utils/daily/dailyOrderCalculations'

describe('daily orders status filtering', () => {
  it('pending solo incluye status pending', () => {
    const orders = [
      { id: '1', status: 'pending' },
      { id: '2', status: 'archived' },
      { id: '3', status: 'cancelled' },
      { id: '4', status: 'preparing' },
      { id: '5', status: 'ready' }
    ]

    expect(orders.filter(order => matchesDailyOrderStatusFilter(order, 'pending')).map(order => order.id))
      .toEqual(['1'])
    expect(orders.filter(order => matchesDailyOrderStatusFilter(order, 'archived')).map(order => order.id))
      .toEqual(['2'])
    expect(orders.filter(order => matchesDailyOrderStatusFilter(order, 'all')).map(order => order.id))
      .toEqual(['1', '2', '3', '4', '5'])
  })

  it('calculateStats no cuenta estados legacy como pendientes', () => {
    const stats = calculateStats([
      { id: '1', status: 'pending', location: 'A', total_items: 1, items: [] },
      { id: '2', status: 'archived', location: 'A', total_items: 1, items: [] },
      { id: '3', status: 'cancelled', location: 'A', total_items: 1, items: [] },
      { id: '4', status: 'ready', location: 'A', total_items: 1, items: [] }
    ])

    expect(stats.pending).toBe(1)
    expect(stats.archived).toBe(1)
    expect(stats.total).toBe(4)
  })
})
