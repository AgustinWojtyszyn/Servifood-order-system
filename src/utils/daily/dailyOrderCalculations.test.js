import { describe, expect, it } from 'vitest'
import {
  buildOrderPreview,
  buildPrintStats,
  buildTurnSummary,
  filterOrdersByCompany,
  getBeverageLabel,
  summarizeOrderItems
} from './dailyOrderCalculations'

describe('daily order calculations', () => {
  it('handles admin extra side responses stored as arrays without treating them as beverages', () => {
    const responses = [
      {
        title: '¿Desea alguna guarnición distinta al menú?',
        response: ['Puré', 'Puré'],
        quantities: { Puré: 2 }
      }
    ]

    expect(() => getBeverageLabel(responses)).not.toThrow()
    expect(getBeverageLabel(responses)).toBe('—')
  })

  it('filters EPSE Obra Linea de Alta Tension by requesting location code', () => {
    const orders = [
      {
        id: 'alta-tension',
        company_slug: 'epse',
        location: 'EPSE - Planta Fotovoltaica',
        delivery_location: 'EPSE - Planta Fotovoltaica',
        requesting_location_code: 'EPSE_OBRA_LINEA_ALTA_TENSION'
      },
      {
        id: 'anchipurac',
        company_slug: 'epse',
        location: 'EPSE - Anchipurac',
        delivery_location: 'EPSE - Anchipurac',
        requesting_location_code: 'EPSE_ANCHIPURAC'
      }
    ]

    expect(filterOrdersByCompany(orders, 'EPSE - Obra Linea de Alta Tension')).toEqual([
      orders[0]
    ])
  })

  it('separa cantidad de pedidos de cantidad de viandas por turno', () => {
    const orders = [
      {
        id: 'lunch-1',
        service: 'lunch',
        location: 'Greif',
        total_items: 5,
        items: [{ name: 'Menú principal', quantity: 5 }],
        custom_responses: []
      },
      {
        id: 'dinner-1',
        service: 'dinner',
        location: 'Genneia',
        total_items: 2,
        items: [{ name: 'Cena', quantity: 2 }],
        custom_responses: []
      }
    ]

    expect(buildTurnSummary(orders).turnCounts).toEqual({
      lunch: { orders: 1, items: 5 },
      dinner: { orders: 1, items: 2 }
    })
    expect(buildPrintStats(orders).turnCounts).toEqual({
      lunch: { orders: 1, items: 5 },
      dinner: { orders: 1, items: 2 }
    })
  })

  it('no revive items con quantity 0 en resumen ni preview de extras', () => {
    const items = [
      { name: 'Menú principal', quantity: 0 },
      { name: 'Opción 1 - Pollo', quantity: 2 }
    ]

    expect(summarizeOrderItems(items)).toMatchObject({
      principalCount: 0,
      others: [{ name: 'Opción 1 - Pollo', qty: 2 }]
    })

    expect(buildOrderPreview({
      order_origin: 'admin_extra',
      total_items: 2,
      items,
      custom_responses: []
    }).itemsText).toBe('Opción 1 - Pollo (x2)')
  })
})
