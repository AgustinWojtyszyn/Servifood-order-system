import { describe, expect, it } from 'vitest'
import {
  findItemForSideResponse,
  getSideAssociationsForOrder,
  getSideSummaryForOrder
} from './dailyOrderSideAssociations'

const orderWithItems = (items, response) => ({
  items,
  custom_responses: [response]
})

describe('daily order side associations', () => {
  it('asocia guarnición por itemId explícito del item preservado', () => {
    const associations = getSideAssociationsForOrder(orderWithItems([
      { id: 'op4', name: 'Opción 4 - BIFE DEL DÍA CARNE', quantity: 1 },
      { id: 'op5', name: 'Opción 5 - ENSALADA DEL FOOD', quantity: 1 }
    ], { title: 'Guarnición', response: 'Puré', itemId: 'op4' }))

    expect(associations).toHaveLength(1)
    expect(associations[0]).toMatchObject({
      label: 'Puré',
      assigned: true,
      reason: 'metadata',
      itemLabel: 'Opción 4 - BIFE DEL DÍA CARNE'
    })
  })

  it('no reasigna guarnición si la metadata apunta a un item histórico descartado', () => {
    const associations = getSideAssociationsForOrder(orderWithItems([
      { id: 'op4', name: 'Opción 4 - BIFE DEL DÍA CARNE', quantity: 1 },
      { id: 'op5', name: 'Opción 5 - ENSALADA DEL FOOD', quantity: 1 }
    ], { title: 'Guarnición', response: 'Puré', itemId: 'op5' }))

    expect(associations[0]).toMatchObject({
      label: 'Puré',
      assigned: false,
      reason: 'ambiguous-metadata',
      itemLabel: ''
    })
  })

  it('asocia guarnición por slotIndex único', () => {
    const { item, reason } = findItemForSideResponse(orderWithItems([
      { name: 'Opción 4 - BIFE DEL DÍA CARNE', slotIndex: 0 },
      { name: 'Opción 5 - ENSALADA DEL FOOD', slotIndex: 1 }
    ], { title: 'Guarnición', response: 'Papas', slotIndex: 0 }), {
      title: 'Guarnición',
      response: 'Papas',
      slotIndex: 0
    })

    expect(reason).toBe('metadata')
    expect(item.label).toBe('Opción 4 - BIFE DEL DÍA CARNE')
  })

  it('mantiene compatibilidad histórica para pedido con un solo ítem', () => {
    const summary = getSideSummaryForOrder(orderWithItems([
      { name: 'Opción 4 - BIFE DEL DÍA CARNE', quantity: 1 }
    ], { title: 'Guarnición', response: 'Puré' }))

    expect(summary.summaryText).toBe('Puré')
    expect(summary.associations[0]).toMatchObject({
      assigned: true,
      reason: 'single-item'
    })
  })

  it('normaliza múltiples ítems históricos y asocia sin metadata al item preservado', () => {
    const summary = getSideSummaryForOrder(orderWithItems([
      { id: 'op4', name: 'Opción 4 - BIFE DEL DÍA CARNE', quantity: 1 },
      { id: 'op5', name: 'Opción 5 - ENSALADA DEL FOOD', quantity: 1 }
    ], { title: 'Guarnición', response: 'Puré' }))

    expect(summary.summaryText).toBe('Puré')
    expect(summary.unassigned).toHaveLength(0)
    expect(summary.associations[0]).toMatchObject({
      assigned: true,
      reason: 'single-item'
    })
  })
})
