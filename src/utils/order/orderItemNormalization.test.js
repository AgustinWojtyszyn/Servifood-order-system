import { describe, expect, it } from 'vitest'
import {
  normalizeOrderItemsForService,
  normalizeOrderPayloadForService
} from './orderItemNormalization'

describe('order item normalization', () => {
  it('keeps at most one lunch item and resets meal quantity', () => {
    const items = normalizeOrderItemsForService('lunch', [
      { id: 'main', name: 'Menú principal', quantity: 3 },
      { id: 'option-5', name: 'Opción 5 - Ensalada', quantity: 1 }
    ])

    expect(items).toEqual([{ id: 'main', name: 'Menú principal', quantity: 1 }])
  })

  it('keeps cafeteria-style services unchanged', () => {
    const items = normalizeOrderItemsForService('cafeteria', [
      { id: 'coffee', name: 'Café', quantity: 2 },
      { id: 'toast', name: 'Tostado', quantity: 1 }
    ])

    expect(items).toEqual([
      { id: 'coffee', name: 'Café', quantity: 2 },
      { id: 'toast', name: 'Tostado', quantity: 1 }
    ])
  })

  it('aligns total_items and items_length with normalized meal items', () => {
    const payload = normalizeOrderPayloadForService({
      service: 'dinner',
      items: [{ id: 'a' }, { id: 'b' }],
      total_items: 9,
      items_length: 9
    })

    expect(payload.items).toEqual([{ id: 'a', quantity: 1 }])
    expect(payload.total_items).toBe(1)
    expect(payload.items_length).toBe(1)
  })
})
