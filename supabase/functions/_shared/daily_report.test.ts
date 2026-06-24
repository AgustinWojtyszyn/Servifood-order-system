import { describe, expect, it } from 'vitest'
import {
  buildDailySummary,
  buildEmailHtml,
  buildEmailText,
  createMockOrders,
  getDefaultReportDate,
  getEmailSubject,
  getRecipientsForMode,
  isAuthorized,
  normalizeOrder,
  shouldArchiveOrdersForMode,
  shouldSkipExistingRun,
  shouldWriteDailyReportRun,
  usesMockOrdersForMode,
  usesRealOrdersForMode
} from './daily_report'

describe('daily report helpers', () => {
  it('calcula por defecto el día siguiente en America/Argentina/Buenos_Aires', () => {
    const runAt2210Art = new Date('2026-06-23T01:10:00.000Z')

    expect(getDefaultReportDate(runAt2210Art)).toBe('2026-06-23')
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

  it('deduplica comentarios exactos y escapa contenido dinámico en el HTML', () => {
    const orders = [
      normalizeOrder({
        id: '1',
        customer_name: '<Ana>',
        customer_email: 'ana@example.com',
        location: 'Planta <Norte>',
        delivery_date: '2026-06-23',
        status: 'pending',
        total_items: 1,
        items: [{ name: 'Menú <script>', option: 'Pollo', quantity: 1 }],
        comments: '<b>Sin sal</b>'
      }),
      normalizeOrder({
        id: '2',
        customer_name: '<Ana>',
        customer_email: 'ana@example.com',
        location: 'Planta <Norte>',
        delivery_date: '2026-06-23',
        status: 'pending',
        total_items: 1,
        items: [{ name: 'Menú <script>', option: 'Pollo', quantity: 1 }],
        comments: '<b>Sin sal</b>'
      })
    ]

    const summary = buildDailySummary(orders, '2026-06-23')
    const html = buildEmailHtml(summary, false, { logoUrl: 'https://example.com/logo.png?name="brand"' })

    expect(summary.comments).toEqual(['<Ana>: <b>Sin sal</b> (x2)'])
    expect(html).toContain('background:#2E3168')
    expect(html).toContain('bgcolor="#2E3168"')
    expect(html).toContain('src="https://example.com/logo.png?name=&quot;brand&quot;"')
    expect(html).toContain('alt="ServiFood Catering"')
    expect(html).toContain('display:block;margin:0 auto;max-width:180px;width:180px;height:auto;')
    expect(html).toContain('&lt;Ana&gt;')
    expect(html).toContain('&lt;b&gt;Sin sal&lt;/b&gt;')
    expect(html).toContain('Planta &lt;Norte&gt;')
    expect(html).not.toContain('<Ana>')
    expect(html).not.toContain('<b>Sin sal</b>')
  })

  it('mantiene fallback textual del logo dentro del header azul', () => {
    const summary = buildDailySummary([], '2026-06-23')
    const html = buildEmailHtml(summary, false, { logoUrl: '' })

    expect(html).toContain('background:#2E3168')
    expect(html).toContain('color:#ffffff;text-align:center;">ServiFood Catering</div>')
    expect(html).not.toContain('<img src=')
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

  it('testEmailReal usa pedidos reales y no mocks', () => {
    expect(usesRealOrdersForMode('testEmailReal')).toBe(true)
    expect(usesMockOrdersForMode('testEmailReal')).toBe(false)
    expect(usesRealOrdersForMode('testEmail', true)).toBe(true)
    expect(usesMockOrdersForMode('testEmail', true)).toBe(false)
    expect(usesMockOrdersForMode('testEmail')).toBe(true)
  })

  it('testEmailReal no archiva pedidos ni escribe daily_report_runs', () => {
    expect(shouldArchiveOrdersForMode('testEmailReal')).toBe(false)
    expect(shouldWriteDailyReportRun('testEmailReal')).toBe(false)
    expect(shouldArchiveOrdersForMode('send')).toBe(true)
    expect(shouldWriteDailyReportRun('send')).toBe(true)
  })

  it('testEmailReal envía solo a destinatario de prueba', () => {
    const recipients = getRecipientsForMode({
      mode: 'testEmailReal',
      configuredRecipients: ['produccion1@example.com', 'produccion2@example.com'],
      configuredTestRecipients: ['test@example.com', 'otro-test@example.com']
    })

    expect(recipients).toEqual(['test@example.com'])
  })

  it('testEmailReal usa fallback de destinatario de prueba y asunto con fecha', () => {
    const recipients = getRecipientsForMode({
      mode: 'testEmailReal',
      configuredRecipients: ['produccion@example.com']
    })

    expect(recipients).toEqual(['agustinwojtyszyn99@gmail.com'])
    expect(getEmailSubject('2026-06-25', true)).toBe('PRUEBA - Reporte diario de pedidos ServiFood - 25/06/2026')
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
