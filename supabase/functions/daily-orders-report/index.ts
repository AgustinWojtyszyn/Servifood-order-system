/// <reference lib="deno.window" />
/// <reference lib="deno.ns" />

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.80.0'
import ExcelJS from 'npm:exceljs@4.4.0'
import {
  DAILY_REPORT_TEST_TYPE,
  DAILY_REPORT_TYPE,
  DailyReportPayload,
  buildDailySummary,
  buildEmailHtml,
  buildEmailText,
  createMockOrders,
  formatDateEs,
  getArchiveOrdersRpcCall,
  getCustomResponsesText,
  getCustomSide,
  getDefaultReportDate,
  getEmailSubject,
  getMenuOptionText,
  getOrderTotalItems,
  getRecipientsForMode,
  getServiceLabel,
  isAuthorized,
  isStaleRunningRun,
  isTestEmailMode,
  isValidISODate,
  normalizeOrder,
  parseRecipients,
  shouldSkipExistingRun,
  shouldWriteDailyReportRun,
  usesMockOrdersForMode,
  usesRealOrdersForMode
} from '../_shared/daily_report.ts'

const jsonHeaders = {
  'Content-Type': 'application/json'
}

const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const cronSecret = Deno.env.get('CRON_SECRET') || ''
const mailFrom = Deno.env.get('MAIL_FROM') || ''
const resendApiKey = Deno.env.get('EMAIL_PROVIDER_API_KEY') || Deno.env.get('RESEND_API_KEY') || ''
const configuredRecipients = parseRecipients(Deno.env.get('DAILY_REPORT_RECIPIENTS') || '')
const configuredTestRecipients = parseRecipients(Deno.env.get('TEST_REPORT_RECIPIENT') || '')
const serviFoodLogoUrl = (Deno.env.get('SERVIFOOD_LOGO_URL') || '').trim()

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

const toResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: jsonHeaders })

const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
  const bytes = new Uint8Array(buffer)
  const chunkSize = 0x8000
  let binary = ''
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize))
  }
  return btoa(binary)
}

const safeError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error || 'Error desconocido')
  return message.slice(0, 500)
}

const getMenuNames = (order: ReturnType<typeof normalizeOrder>) =>
  order.items
    .map((item) => String(item.name || item.title || item.menu || '').trim())
    .filter(Boolean)
    .join('; ') || 'Sin menú'

const getOptionNames = (order: ReturnType<typeof normalizeOrder>) =>
  order.items
    .map((item) => String(item.option || item.selected_option || item.choice || '').trim())
    .filter(Boolean)
    .join('; ') || getMenuOptionText(order)

const addHeaderStyle = (worksheet: ExcelJS.Worksheet) => {
  worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF14532D' }
  }
  worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' }
  worksheet.views = [{ state: 'frozen', ySplit: 1 }]
  worksheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: worksheet.columnCount }
  }
}

const buildWorkbook = async ({
  orders,
  reportDate,
  isTest
}: {
  orders: ReturnType<typeof normalizeOrder>[]
  reportDate: string
  isTest: boolean
}) => {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'ServiFood Pedidos'
  workbook.created = new Date()

  const details = workbook.addWorksheet('Pedidos Detallados')
  details.columns = [
    { header: 'Cliente', key: 'cliente', width: 24 },
    { header: 'Email', key: 'email', width: 30 },
    { header: 'Teléfono', key: 'telefono', width: 18 },
    { header: 'Ubicación / empresa', key: 'ubicacion', width: 28 },
    { header: 'Fecha de entrega', key: 'fechaEntrega', width: 18 },
    { header: 'Turno / servicio', key: 'turno', width: 16 },
    { header: 'Menú elegido', key: 'menu', width: 36 },
    { header: 'Opción elegida', key: 'opcion', width: 36 },
    { header: 'Cantidad', key: 'cantidad', width: 12 },
    { header: 'Guarniciones', key: 'guarniciones', width: 24 },
    { header: 'Respuestas personalizadas', key: 'respuestas', width: 42 },
    { header: 'Comentarios', key: 'comentarios', width: 36 },
    { header: 'Estado', key: 'estado', width: 14 },
    { header: 'Total de ítems', key: 'totalItems', width: 14 }
  ]

  if (isTest) {
    details.addRow({
      cliente: 'PRUEBA - NO USAR PARA PRODUCCIÓN',
      email: '',
      telefono: '',
      ubicacion: '',
      fechaEntrega: formatDateEs(reportDate),
      turno: '',
      menu: '',
      opcion: '',
      cantidad: '',
      guarniciones: '',
      respuestas: '',
      comentarios: '',
      estado: '',
      totalItems: ''
    })
  }

  orders.forEach((order) => {
    details.addRow({
      cliente: order.customer_name || order.user_name || 'Sin nombre',
      email: order.customer_email || order.user_email || 'Sin email',
      telefono: order.customer_phone || 'Sin teléfono',
      ubicacion: order.location || order.company_name || order.company || 'Sin ubicación / empresa',
      fechaEntrega: formatDateEs(String(order.delivery_date || reportDate)),
      turno: getServiceLabel(order.service),
      menu: getMenuNames(order),
      opcion: getOptionNames(order),
      cantidad: getOrderTotalItems(order),
      guarniciones: getCustomSide(order) || 'Sin guarnición',
      respuestas: getCustomResponsesText(order),
      comentarios: order.comments || 'Sin comentarios',
      estado: order.status === 'pending' ? 'Pendiente' : String(order.status || 'Sin estado'),
      totalItems: getOrderTotalItems(order)
    })
  })
  addHeaderStyle(details)
  details.eachRow((row) => {
    row.alignment = { vertical: 'top', wrapText: true }
  })

  const summary = buildDailySummary(orders, reportDate)
  const stats = workbook.addWorksheet('Resumen')
  stats.columns = [
    { header: 'Concepto', key: 'concepto', width: 36 },
    { header: 'Valor', key: 'valor', width: 48 }
  ]
  stats.addRows([
    { concepto: 'Fecha de entrega reportada', valor: summary.displayDate },
    { concepto: 'Total de pedidos', valor: summary.totalOrders },
    { concepto: 'Total de ítems', valor: summary.totalItems },
    { concepto: '', valor: '' },
    { concepto: 'Totales por ubicación / empresa', valor: '' },
    ...summary.byLocation.map((row) => ({
      concepto: row.label,
      valor: `${row.orders} pedidos, ${row.items} ítems`
    })),
    { concepto: '', valor: '' },
    { concepto: 'Totales por menú / opción', valor: '' },
    ...summary.byMenuOption.map((row) => ({ concepto: row.label, valor: row.quantity })),
    { concepto: '', valor: '' },
    { concepto: 'Avisos', valor: summary.warnings.length ? summary.warnings.join(' | ') : 'Sin avisos' }
  ])
  addHeaderStyle(stats)
  stats.eachRow((row) => {
    row.alignment = { vertical: 'top', wrapText: true }
  })

  return workbook.xlsx.writeBuffer()
}

const sendEmail = async ({
  to,
  subject,
  html,
  text,
  filename,
  attachment
}: {
  to: string[]
  subject: string
  html: string
  text: string
  filename: string
  attachment: ArrayBuffer
}) => {
  if (!resendApiKey) throw new Error('EMAIL_PROVIDER_API_KEY o RESEND_API_KEY no está configurado')
  if (!mailFrom) throw new Error('MAIL_FROM no está configurado')
  if (!to.length) throw new Error('No hay destinatarios configurados')

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: mailFrom,
      to,
      subject,
      html,
      text,
      attachments: [{
        filename,
        content: arrayBufferToBase64(attachment)
      }]
    })
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Resend respondió ${response.status}: ${body.slice(0, 300)}`)
  }

  return response.json()
}

const fetchOrders = async (reportDate: string) => {
  const { data, error } = await supabase
    .from('orders_with_person_key')
    .select('*')
    .eq('status', 'pending')
    .eq('delivery_date', reportDate)
    .order('created_at', { ascending: true })

  if (error) throw error
  return (Array.isArray(data) ? data : []).map((order) => normalizeOrder(order))
}

const fetchOrdersForRealTestEmail = async (reportDate: string) => {
  const query = (filterDeleted = true) => {
    let builder = supabase
      .from('orders')
      .select('*')
      .eq('status', 'pending')
      .eq('delivery_date', reportDate)

    if (filterDeleted) builder = builder.is('deleted_at', null)

    return builder.order('created_at', { ascending: true })
  }

  const { data, error } = await query()

  if (!error) return (Array.isArray(data) ? data : []).map((order) => normalizeOrder(order))

  const missingDeletedAtColumn = String(error.message || '').toLowerCase().includes('deleted_at')
  if (!missingDeletedAtColumn) throw error

  const { data: retryData, error: retryError } = await query(false)
  if (retryError) throw retryError
  return (Array.isArray(retryData) ? retryData : []).map((order) => normalizeOrder(order))
}

const getExistingRun = async (reportDate: string, reportType = DAILY_REPORT_TYPE) => {
  const { data, error } = await supabase
    .from('daily_report_runs')
    .select('id,status,sent_at,created_at,updated_at')
    .eq('report_date', reportDate)
    .eq('report_type', reportType)
    .maybeSingle()

  if (error) throw error
  return data
}

const acquireRunLock = async ({
  reportDate,
  reportType,
  ordersCount,
  recipients,
  force
}: {
  reportDate: string
  reportType: string
  ordersCount: number
  recipients: string[]
  force?: boolean
}) => {
  if (force) {
    await upsertRun({
      reportDate,
      reportType,
      status: 'running',
      ordersCount,
      recipients
    })
    return { acquired: true, existingRun: null }
  }

  const { error } = await supabase
    .from('daily_report_runs')
    .insert({
      report_date: reportDate,
      report_type: reportType,
      status: 'running',
      orders_count: ordersCount,
      recipients,
      sent_at: null,
      error: null
    })

  if (!error) return { acquired: true, existingRun: null }

  if (error.code === '23505') {
    const existingRun = await getExistingRun(reportDate, reportType)
    const canRetryExistingRun = existingRun?.status === 'failed' ||
      (existingRun?.status === 'running' && isStaleRunningRun({
        createdAt: existingRun?.created_at,
        updatedAt: existingRun?.updated_at
      }))

    if (canRetryExistingRun) {
      const { data: retriedRun, error: retryError } = await supabase
        .from('daily_report_runs')
        .update({
          status: 'running',
          orders_count: ordersCount,
          recipients,
          sent_at: null,
          error: existingRun?.status === 'running' ? 'Retry after stale running lock' : null
        })
        .eq('report_date', reportDate)
        .eq('report_type', reportType)
        .in('status', ['failed', 'running'])
        .select('id,status,sent_at,created_at,updated_at')
        .maybeSingle()

      if (retryError) throw retryError
      if (retriedRun) return { acquired: true, existingRun: null }

      return { acquired: false, existingRun: await getExistingRun(reportDate, reportType) }
    }
    return { acquired: false, existingRun }
  }

  throw error
}

const upsertRun = async ({
  reportDate,
  reportType,
  status,
  ordersCount,
  recipients,
  error
}: {
  reportDate: string
  reportType: string
  status: string
  ordersCount: number
  recipients: string[]
  error?: string | null
}) => {
  const payload = {
    report_date: reportDate,
    report_type: reportType,
    status,
    orders_count: ordersCount,
    recipients,
    sent_at: status === 'sent' || status === 'sent_empty' ? new Date().toISOString() : null,
    error: error || null
  }
  const { error: upsertError } = await supabase
    .from('daily_report_runs')
    .upsert(payload, { onConflict: 'report_date,report_type' })

  if (upsertError) throw upsertError
}

const archiveReportedOrders = async (reportDate: string) => {
  const { rpcName, args } = getArchiveOrdersRpcCall(reportDate)
  const { data, error } = await supabase.rpc(rpcName, args)

  if (error) throw error
  return Array.isArray(data) ? data.length : 0
}

Deno.serve(async (req: Request) => {
  let currentPayload: DailyReportPayload = {}
  if (req.method !== 'POST') return toResponse({ error: 'Method not allowed' }, 405)
  if (!isAuthorized(req.headers, cronSecret)) return toResponse({ error: 'Unauthorized' }, 401)

  try {
    const payload = await req.json().catch(() => ({})) as DailyReportPayload
    currentPayload = payload
    const mode = payload.mode || 'send'
    if (!['send', 'dryRun', 'testEmail', 'testEmailReal'].includes(mode)) {
      return toResponse({ error: 'mode inválido' }, 400)
    }

    const reportDate = isValidISODate(payload.reportDate)
      ? payload.reportDate
      : getDefaultReportDate()
    const allowEmpty = payload.allowEmpty !== false
    const isTest = isTestEmailMode(mode)
    const recipients = getRecipientsForMode({
      mode,
      configuredRecipients,
      configuredTestRecipients,
      sendTo: payload.sendTo
    })
    const shouldUseMocks = usesMockOrdersForMode(mode, Boolean(payload.useRealData))
    const shouldUseRealOrders = usesRealOrdersForMode(mode, Boolean(payload.useRealData))

    console.log('[daily-orders-report] inicio', {
      mode,
      reportDate,
      recipientsCount: recipients.length,
      logoUrlConfigured: Boolean(serviFoodLogoUrl),
      force: Boolean(payload.force)
    })

    const orders = shouldUseMocks
      ? createMockOrders(reportDate)
      : shouldUseRealOrders && isTest
        ? await fetchOrdersForRealTestEmail(reportDate)
        : await fetchOrders(reportDate)
    const summary = buildDailySummary(orders, reportDate)
    const filename = `${isTest ? 'PRUEBA_' : ''}pedidos_servifood_${reportDate}.xlsx`
    const wouldAttachExcel = orders.length > 0 || allowEmpty || isTest

    if (mode === 'dryRun') {
      return toResponse({
        ok: true,
        mode,
        reportDate,
        ordersCount: summary.totalOrders,
        itemsCount: summary.totalItems,
        resumen: summary,
        recipientsCount: recipients.length,
        adjuntariaExcel: wouldAttachExcel,
        warnings: summary.warnings
      })
    }

    if (mode === 'send' && orders.length === 0 && !allowEmpty) {
      return toResponse({
        ok: true,
        skipped: true,
        reason: 'No hay pedidos y allowEmpty=false',
        reportDate,
        ordersCount: 0
      })
    }

    const reportType = isTest ? DAILY_REPORT_TEST_TYPE : DAILY_REPORT_TYPE
    if (shouldWriteDailyReportRun(mode)) {
      const { acquired, existingRun } = await acquireRunLock({
        reportDate,
        reportType,
        ordersCount: summary.totalOrders,
        recipients,
        force: payload.force
      })
      if (!acquired && shouldSkipExistingRun({
        existingStatus: existingRun?.status,
        existingCreatedAt: existingRun?.created_at,
        existingUpdatedAt: existingRun?.updated_at,
        force: payload.force
      })) {
        return toResponse({
          ok: true,
          skipped: true,
          reason: `Reporte ya procesado con status ${existingRun?.status}`,
          reportDate,
          status: existingRun?.status
        })
      }
    }

    const workbookBuffer = await buildWorkbook({ orders, reportDate, isTest })
    const emailResult = await sendEmail({
      to: recipients,
      subject: getEmailSubject(reportDate, isTest),
      html: buildEmailHtml(summary, isTest, { logoUrl: serviFoodLogoUrl }),
      text: buildEmailText(summary, isTest),
      filename,
      attachment: workbookBuffer
    })

    const archivedOrdersCount = shouldWriteDailyReportRun(mode)
      ? await archiveReportedOrders(reportDate)
      : 0

    if (shouldWriteDailyReportRun(mode)) {
      await upsertRun({
        reportDate,
        reportType,
        status: orders.length > 0 ? 'sent' : 'sent_empty',
        ordersCount: summary.totalOrders,
        recipients
      })
    }

    console.log('[daily-orders-report] enviado', {
      mode,
      reportDate,
      ordersCount: summary.totalOrders,
      archivedOrdersCount,
      recipientsCount: recipients.length,
      logoUrlConfigured: Boolean(serviFoodLogoUrl)
    })

    return toResponse({
      ok: true,
      mode,
      reportDate,
      ordersCount: summary.totalOrders,
      itemsCount: summary.totalItems,
      recipientsCount: recipients.length,
      archivedOrdersCount,
      filename,
      emailResult
    })
  } catch (error) {
    const message = safeError(error)
    console.error('[daily-orders-report] error', message)
    try {
      const reportDate = isValidISODate(currentPayload.reportDate) ? currentPayload.reportDate : getDefaultReportDate()
      if (shouldWriteDailyReportRun(currentPayload.mode || 'send')) {
        await upsertRun({
          reportDate,
          reportType: DAILY_REPORT_TYPE,
          status: 'failed',
          ordersCount: 0,
          recipients: [],
          error: message
        })
      }
    } catch {
      // Best-effort failure logging only.
    }
    return toResponse({ ok: false, error: message }, 500)
  }
})
