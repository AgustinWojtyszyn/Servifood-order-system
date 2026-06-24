import { describe, expect, it } from 'vitest'
import {
  buildDailyOrdersExcelFileName,
  buildDailyOrdersSummary,
  extractCustomResponses,
  extractOrderItems,
  formatDailyOrdersForWhatsApp
} from './dailyOrdersExportModel'

const baseOrder = {
  id: 'order-1',
  created_at: '2026-06-24T13:45:00.000Z',
  delivery_date: '2026-06-25',
  status: 'pending',
  service: 'lunch',
  customer_name: 'Ana Cliente',
  customer_email: 'ana@example.com',
  customer_phone: '',
  location: 'Genneia',
  total_items: 3,
  items: [
    { name: 'Opción 1 - BIDE DEL DIA', quantity: 2 },
    { name: 'Opción 4 - BIFE DEL DÍA CARNE', quantity: 1 }
  ],
  custom_responses: [
    { title: 'Guarnición', response: 'Puré' },
    { title: 'Bebida', response: 'Coca cola' },
    { title: 'Pan', response: 'Sin pan' }
  ],
  comments: 'Sin sal'
}

describe('daily orders export model', () => {
  it('extrae items sin mutar ni normalizar nombres de menú', () => {
    const items = extractOrderItems(baseOrder)

    expect(items).toEqual([
      expect.objectContaining({ label: 'Opción 1 - BIDE DEL DIA', quantity: 2 }),
      expect.objectContaining({ label: 'Opción 4 - BIFE DEL DÍA CARNE', quantity: 1 })
    ])
  })

  it('extrae bebida, guarnición y opciones adicionales', () => {
    const responses = extractCustomResponses(baseOrder)

    expect(responses.side).toBe('Puré')
    expect(responses.beverage).toBe('Coca cola')
    expect(responses.additional).toBe('Pan: Sin pan')
  })

  it('tolera pedido sin teléfono y custom_responses vacío', () => {
    const summary = buildDailyOrdersSummary([{ ...baseOrder, custom_responses: [], customer_phone: null }], 'pending')

    expect(summary.rows[0].telefono).toBe('')
    expect(summary.rows[0].guarnicion).toBe('')
    expect(summary.rows[0].bebida).toBe('')
    expect(summary.rows[0].opcionesAdicionales).toBe('')
  })

  it('calcula agrupación por ubicación y totales por menú', () => {
    const orders = [
      baseOrder,
      {
        ...baseOrder,
        id: 'order-2',
        customer_name: 'Bruno Cliente',
        location: 'La Laja',
        total_items: 1,
        items: [{ name: 'Opción 1 - BIDE DEL DIA', quantity: 1 }],
        comments: ''
      }
    ]

    const summary = buildDailyOrdersSummary(orders, 'pending')

    expect(summary.byLocation).toContainEqual({ label: 'Genneia', orders: 1, items: 3 })
    expect(summary.byLocation).toContainEqual({ label: 'La Laja', orders: 1, items: 1 })
    expect(summary.byMenu).toContainEqual({ label: 'Opción 1 - BIDE DEL DIA', quantity: 3 })
    expect(summary.byMenu).toContainEqual({ label: 'Opción 4 - BIFE DEL DÍA CARNE', quantity: 1 })
    expect(summary.commentsCount).toBe(1)
  })

  it('genera nombre de Excel con delivery_date y estado', () => {
    const summary = buildDailyOrdersSummary([baseOrder], 'pending')

    expect(buildDailyOrdersExcelFileName(summary)).toBe('Pedidos_ServiFood_2026-06-25_pending.xlsx')
  })

  it('genera WhatsApp agrupado por ubicación con comentarios y avisos', () => {
    const text = formatDailyOrdersForWhatsApp([
      baseOrder,
      {
        ...baseOrder,
        id: 'order-2',
        customer_name: 'Bruno Cliente',
        location: 'La Laja',
        service: 'dinner',
        items: [{ name: 'Opción 2 - Cena veggie', quantity: 1 }],
        custom_responses: [{ title: 'Bebida', response: 'Agua' }],
        comments: ''
      }
    ], 'pending')

    expect(text).toContain('REPORTE DE PEDIDOS SERVIFOOD')
    expect(text).toContain('Fecha de entrega: 25/06/2026')
    expect(text).toContain('- Genneia: 1 pedidos / 3 ítems')
    expect(text).toContain('GENNEIA')
    expect(text).toContain('Ana Cliente - Almuerzo')
    expect(text).toContain('Guarnición: Puré')
    expect(text).toContain('Bebida: Coca cola')
    expect(text).toContain('- Ana Cliente: Sin sal')
    expect(text).toContain('✅ No se detectaron datos incompletos o inconsistentes.')
  })

  it('reporta inconsistencias por datos faltantes y cantidades inválidas', () => {
    const summary = buildDailyOrdersSummary([{
      id: 'bad-order',
      status: 'pending',
      delivery_date: '2026-06-25',
      items: [{ name: 'Opción X', quantity: 0 }],
      custom_responses: []
    }], 'pending')

    expect(summary.inconsistencies.map((row) => row.problema)).toEqual(
      expect.arrayContaining(['Sin cliente', 'Sin email', 'Sin ubicación', 'Cantidad inválida'])
    )
  })
})
