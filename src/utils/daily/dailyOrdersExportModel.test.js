import { describe, expect, it } from 'vitest'
import {
  buildDailyOrdersExcelDetailRows,
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

  it('genera filas de Excel manual con las mismas columnas de detalle que el reporte automático', () => {
    const rows = buildDailyOrdersExcelDetailRows([{
      ...baseOrder,
      customer_name: '',
      user_name: '',
      user_full_name: 'Nombre Desde Vista',
      customer_email: '',
      user_email: 'vista@example.com',
      customer_phone: null
    }])

    expect(Object.keys(rows[0])).toEqual([
      'Cliente',
      'Email',
      'Teléfono',
      'Ubicación / empresa',
      'Fecha de entrega',
      'Turno / servicio',
      'Menú elegido',
      'Opción elegida',
      'Cantidad',
      'Guarniciones',
      'Respuestas personalizadas',
      'Comentarios',
      'Estado',
      'Total de ítems'
    ])
    expect(rows[0]).toMatchObject({
      Cliente: 'Nombre Desde Vista',
      Email: 'vista@example.com',
      'Teléfono': 'Sin teléfono',
      'Ubicación / empresa': 'Genneia',
      'Fecha de entrega': '25/06/2026',
      'Turno / servicio': 'Almuerzo',
      'Menú elegido': 'Opción 1 - BIDE DEL DIA; Opción 4 - BIFE DEL DÍA CARNE',
      'Opción elegida': 'Opción 1 - BIDE DEL DIA (x2); Opción 4 - BIFE DEL DÍA CARNE (x1)',
      Cantidad: 3,
      Guarniciones: 'Puré',
      'Respuestas personalizadas': 'Bebida: Coca cola | Pan: Sin pan',
      Comentarios: 'Sin sal',
      Estado: 'Pendiente',
      'Total de ítems': 3
    })
  })

  it('genera WhatsApp como resumen operativo sin datos personales ni detalle individual', () => {
    const text = formatDailyOrdersForWhatsApp([
      baseOrder,
      {
        ...baseOrder,
        id: 'order-2',
        customer_name: 'Bruno Cliente',
        customer_email: 'bruno@example.com',
        customer_phone: '2615551234',
        location: 'La Laja',
        service: 'dinner',
        items: [{ name: 'Opción 2 - Cena veggie', quantity: 1 }],
        custom_responses: [{ title: 'Bebida', response: 'Agua' }],
        comments: ''
      }
    ], 'pending')

    expect(text).toContain('*REPORTE DE PEDIDOS SERVIFOOD*')
    expect(text).toContain('*Fecha de entrega:* 25/06/2026')
    expect(text).toContain('*Estado:* Pendientes')
    expect(text).toContain('*Total de pedidos:* 2')
    expect(text).toContain('*Total de ítems:* 6')
    expect(text).toContain('*TOTALES POR UBICACIÓN*')
    expect(text).toContain('*TOTALES POR MENÚ*')
    expect(text).toContain('*TOTALES POR SERVICIO*')
    expect(text).toContain('*OBSERVACIONES*')
    expect(text).toContain('*AVISOS*')
    expect(text).toContain('- Genneia: 1 pedido / 3 ítems')
    expect(text).toContain('- Almuerzo: 1 pedido')
    expect(text).toContain('- Cena: 1 pedido')
    expect(text).toContain('- 1 pedido tiene comentarios.')
    expect(text).toContain('- 2 pedidos incluyen bebida.')
    expect(text).toContain('- 1 pedido incluye guarnición.')
    expect(text).toContain('✓ No se detectaron datos incompletos o inconsistentes.')
    expect(text).toContain('El detalle completo de clientes, opciones, bebidas, guarniciones y comentarios está en el Excel exportado.')
    expect(text).toContain('\n\n*TOTALES POR UBICACIÓN*\n\n- Genneia')
    expect(text).toContain('*REPORTE DE PEDIDOS SERVIFOOD*\n\n*Fecha de entrega:*')
    expect(text.split('\n').length).toBeGreaterThan(20)
    expect(text).not.toContain('* Genneia')
    expect(text).not.toContain('* Almuerzo')
    expect(text).not.toContain('Total de 2 pedidos')
    expect(text).not.toContain('Total de 6 ítems:')
    expect(text).not.toContain('Ana Cliente')
    expect(text).not.toContain('Bruno Cliente')
    expect(text).not.toContain('ana@example.com')
    expect(text).not.toContain('bruno@example.com')
    expect(text).not.toContain('2615551234')
    expect(text).not.toContain('Sin sal')
    expect(text).not.toContain('DETALLE POR UBICACIÓN')
    expect(text).not.toContain('COMENTARIOS DESTACADOS')
  })

  it('limita WhatsApp a top 10 menús y deriva el resto al Excel', () => {
    const orders = Array.from({ length: 11 }, (_, index) => ({
      ...baseOrder,
      id: `order-${index}`,
      customer_name: `Cliente ${index}`,
      customer_email: `cliente${index}@example.com`,
      items: [{ name: `Opción ${index + 1}`, quantity: 1 }],
      total_items: 1,
      comments: ''
    }))

    const text = formatDailyOrdersForWhatsApp(orders, 'pending')

    expect(text).toContain('- + 1 opciones más en el Excel.')
    expect(text).not.toContain('* + 1 opciones más en el Excel.')
    expect(text).not.toContain('Cliente 1')
  })

  it('corrige formato de totales para muchos pedidos en WhatsApp', () => {
    const orders = Array.from({ length: 19 }, (_, index) => ({
      ...baseOrder,
      id: `bulk-${index}`,
      customer_name: `Cliente Bulk ${index}`,
      customer_email: `bulk${index}@example.com`,
      customer_phone: `26155599${index}`,
      items: [{ name: 'Menú principal - FILETE DE MERLUZA A LA ROMANA CON PURE MIXTO', quantity: 1 }],
      total_items: 1,
      comments: ''
    }))

    const text = formatDailyOrdersForWhatsApp(orders, 'pending')

    expect(text).toContain('*Total de pedidos:* 19')
    expect(text).toContain('*Total de ítems:* 19')
    expect(text).not.toContain('Total de 19 pedidos')
    expect(text).not.toContain('bulk1@example.com')
    expect(text).not.toContain('261555991')
    expect(text).not.toContain('Cliente Bulk')
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
