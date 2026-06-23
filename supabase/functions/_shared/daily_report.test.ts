import { describe, expect, it } from 'vitest'
import {
  buildDailySummary,
  buildEmailText,
  createMockOrders,
  getDefaultReportDate,
  getRecipientsForMode,
  isAuthorized,
  normalizeOrder,
  shouldSkipExistingRun
} from './daily_report'

describe('daily report helpers', () => {
  it('calcula por defecto el día siguiente en America/Argentina/Buenos_Aires', () => {
    const runAt2205Art = new Date('2026-06-23T01:05:00.000Z')

    expect(getDefaultReportDate(runAt2205Art)).toBe('2026-06-23')
  })

  it('genera resumen con pedidos, ítems, ubicaciones, menú/opción, comentarios y warnings', () => {
    const orders = [
      normalizeOrder({
        id: '1',
        customer_name: 'Ana',
        customer_email: 'ana@example.com',
        location: 'Planta Norte',
        delivery_date: '2026-06-23',
        status: 'pending',
        total_items: 2,
        items: [{ name: 'Menú principal', option: 'Pollo', quantity: 2 }],
        custom_responses: [{ title: 'Guarnición', response: 'Puré' }],
        comments: 'Sin sal'
      }),
      normalizeOrder({
        id: '2',
        delivery_date: '2026-06-23',
        status: 'pending',
        total_items: 1,
        items: []
      })
    ]

    const summary = buildDailySummary(orders, '2026-06-23')

    expect(summary.totalOrders).toBe(2)
    expect(summary.totalItems).toBe(3)
    expect(summary.byLocation[0]).toEqual({ label: 'Planta Norte', orders: 1, items: 2 })
    expect(summary.byMenuOption).toContainEqual({ label: 'Menú principal - Pollo', quantity: 2 })
    expect(summary.comments).toEqual(['Ana: Sin sal'])
    expect(summary.warnings.some((warning) => warning.includes('Pedido 2'))).toBe(true)
  })

  it('genera resumen y aviso cuando no hay pedidos', () => {
    const summary = buildDailySummary([], '2026-06-23')
    const text = buildEmailText(summary)

    expect(summary.totalOrders).toBe(0)
    expect(summary.emptyMessage).toBe('No hay pedidos pendientes para la fecha de entrega 23/06/2026.')
    expect(text).toContain('No hay pedidos pendientes')
  })

  it('dryRun puede reutilizar resumen sin necesitar envío de email', () => {
    const summary = buildDailySummary(createMockOrders('2026-06-23'), '2026-06-23')

    expect(summary.totalOrders).toBe(3)
    expect(summary.totalItems).toBe(4)
  })

  it('testEmail usa mock interno y destinatario seguro por defecto', () => {
    const recipients = getRecipientsForMode({
      mode: 'testEmail',
      configuredRecipients: ['sarmientoclaudia985@gmail.com', 'agustinwojtyszyn99@gmail.com']
    })

    expect(createMockOrders('2026-06-23')).toHaveLength(3)
    expect(recipients).toEqual(['agustinwojtyszyn99@gmail.com'])
  })

  it('testEmail respeta sendTo explícito', () => {
    const recipients = getRecipientsForMode({
      mode: 'testEmail',
      configuredRecipients: ['sarmientoclaudia985@gmail.com', 'agustinwojtyszyn99@gmail.com'],
      sendTo: 'sarmientoclaudia985@gmail.com'
    })

    expect(recipients).toEqual(['sarmientoclaudia985@gmail.com'])
  })

  it('send evita duplicados salvo force', () => {
    expect(shouldSkipExistingRun({ existingStatus: 'sent', force: false })).toBe(true)
    expect(shouldSkipExistingRun({ existingStatus: 'sent_empty', force: false })).toBe(true)
    expect(shouldSkipExistingRun({ existingStatus: 'running', force: false })).toBe(true)
    expect(shouldSkipExistingRun({ existingStatus: 'failed', force: false })).toBe(false)
    expect(shouldSkipExistingRun({ existingStatus: 'sent', force: true })).toBe(false)
  })

  it('rechaza requests sin x-cron-secret correcto', () => {
    expect(isAuthorized(new Headers(), 'secret')).toBe(false)
    expect(isAuthorized(new Headers({ 'x-cron-secret': 'mal' }), 'secret')).toBe(false)
    expect(isAuthorized(new Headers({ 'x-cron-secret': 'secret' }), 'secret')).toBe(true)
  })
})
