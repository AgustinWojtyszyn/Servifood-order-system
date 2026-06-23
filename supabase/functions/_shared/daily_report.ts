export const ARGENTINA_TIME_ZONE = 'America/Argentina/Buenos_Aires'
export const DAILY_REPORT_TYPE = 'daily_orders'
export const DAILY_REPORT_TEST_TYPE = 'daily_orders_test'

const DEFAULT_TEST_RECIPIENT = 'agustinwojtyszyn99@gmail.com'

const pad = (value: number) => String(value).padStart(2, '0')

export type DailyReportMode = 'send' | 'dryRun' | 'testEmail'

export type DailyReportPayload = {
  mode?: DailyReportMode
  reportDate?: string
  force?: boolean
  allowEmpty?: boolean
  sendTo?: string
}

export type NormalizedOrder = {
  id?: string
  customer_name?: string | null
  user_name?: string | null
  customer_email?: string | null
  user_email?: string | null
  customer_phone?: string | null
  location?: string | null
  company?: string | null
  company_name?: string | null
  delivery_date?: string | null
  service?: string | null
  items: Array<Record<string, unknown>>
  custom_responses: Array<Record<string, unknown>>
  comments?: string | null
  status?: string | null
  total_items?: number | null
  created_at?: string | null
}

export type DailySummary = {
  reportDate: string
  displayDate: string
  totalOrders: number
  totalItems: number
  byLocation: Array<{ label: string; orders: number; items: number }>
  byMenuOption: Array<{ label: string; quantity: number }>
  comments: Array<string>
  warnings: Array<string>
  emptyMessage?: string
}

export const parseRecipients = (raw = ''): string[] =>
  raw
    .split(',')
    .map((value) => value.replace(/^mailto:/i, '').trim())
    .filter(Boolean)

export const isValidISODate = (value?: string): value is string =>
  Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value))

export const getArgentinaDateParts = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: ARGENTINA_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date)

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day)
  }
}

export const toISODate = ({ year, month, day }: { year: number; month: number; day: number }) =>
  `${year}-${pad(month)}-${pad(day)}`

export const getDefaultReportDate = (now = new Date()) => {
  const argentina = getArgentinaDateParts(now)
  const utcNoon = new Date(Date.UTC(argentina.year, argentina.month - 1, argentina.day + 1, 12, 0, 0))
  return toISODate({
    year: utcNoon.getUTCFullYear(),
    month: utcNoon.getUTCMonth() + 1,
    day: utcNoon.getUTCDate()
  })
}

export const formatDateEs = (isoDate: string) => {
  if (!isValidISODate(isoDate)) return isoDate
  const [year, month, day] = isoDate.split('-').map(Number)
  return new Intl.DateTimeFormat('es-AR', {
    timeZone: 'UTC',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(new Date(Date.UTC(year, month - 1, day, 12, 0, 0)))
}

export const getEmailSubject = (reportDate: string, isTest = false) =>
  isTest
    ? 'PRUEBA - Reporte diario de pedidos - ServiFood'
    : `Reporte diario de pedidos - ServiFood - ${formatDateEs(reportDate)}`

const safeArray = (value: unknown): Array<Record<string, unknown>> => {
  if (Array.isArray(value)) return value.filter((item) => item && typeof item === 'object') as Array<Record<string, unknown>>
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? safeArray(parsed) : []
    } catch {
      return []
    }
  }
  return []
}

export const normalizeOrder = (order: Record<string, unknown>): NormalizedOrder => ({
  ...order,
  items: safeArray(order.items),
  custom_responses: safeArray(order.custom_responses),
  total_items: Number.isFinite(Number(order.total_items)) ? Number(order.total_items) : 0
})

const normalizeValue = (value: unknown) => {
  if (Array.isArray(value)) return value.map(String).filter(Boolean).join(', ')
  if (value === null || value === undefined || value === '') return ''
  return String(value)
}

export const getCustomSide = (order: NormalizedOrder) => {
  const match = order.custom_responses.find((response) =>
    String(response.title || response.label || '').toLowerCase().includes('guarn')
  )
  return normalizeValue(match?.answer ?? match?.response)
}

export const getCustomResponsesText = (order: NormalizedOrder) => {
  const side = getCustomSide(order)
  return order.custom_responses
    .filter((response) => !String(response.title || response.label || '').toLowerCase().includes('guarn'))
    .map((response) => {
      const title = String(response.title || response.label || 'Respuesta')
      const value = normalizeValue(response.answer ?? response.response)
      return value ? `${title}: ${value}` : ''
    })
    .filter(Boolean)
    .join(' | ') || (side ? 'Sin otras respuestas' : 'Sin respuestas')
}

export const getMenuOptionText = (order: NormalizedOrder) => {
  const itemText = order.items
    .map((item) => {
      const name = String(item.name || item.title || item.menu || '').trim()
      const option = String(item.option || item.selected_option || item.choice || '').trim()
      const quantity = Number(item.quantity || item.qty || 1)
      const base = [name, option].filter(Boolean).join(' - ')
      return base ? `${base} (x${quantity || 1})` : ''
    })
    .filter(Boolean)

  return itemText.join('; ') || 'Sin menú/opción'
}

export const getServiceLabel = (service?: string | null) =>
  String(service || 'lunch') === 'dinner' ? 'Cena' : 'Almuerzo'

export const getOrderTotalItems = (order: NormalizedOrder) => {
  const storedTotal = Number(order.total_items || 0)
  if (storedTotal > 0) return storedTotal
  return order.items.reduce((sum, item) => sum + Number(item.quantity || item.qty || 1), 0)
}

export const buildDailySummary = (orders: NormalizedOrder[], reportDate: string): DailySummary => {
  const byLocation = new Map<string, { orders: number; items: number }>()
  const byMenuOption = new Map<string, number>()
  const comments: string[] = []
  const warnings: string[] = []
  let totalItems = 0

  orders.forEach((order, index) => {
    const items = getOrderTotalItems(order)
    totalItems += items

    const location = String(order.location || order.company_name || order.company || 'Sin ubicación / empresa')
    const locationRow = byLocation.get(location) || { orders: 0, items: 0 }
    locationRow.orders += 1
    locationRow.items += items
    byLocation.set(location, locationRow)

    if (order.items.length === 0) {
      byMenuOption.set('Sin menú/opción', (byMenuOption.get('Sin menú/opción') || 0) + Math.max(items, 1))
    } else {
      order.items.forEach((item) => {
        const name = String(item.name || item.title || item.menu || 'Sin menú').trim()
        const option = String(item.option || item.selected_option || item.choice || '').trim()
        const label = [name, option].filter(Boolean).join(' - ')
        const quantity = Number(item.quantity || item.qty || 1)
        byMenuOption.set(label, (byMenuOption.get(label) || 0) + (quantity || 1))
      })
    }

    if (String(order.comments || '').trim()) {
      const customer = order.customer_name || order.user_name || `Pedido ${index + 1}`
      comments.push(`${customer}: ${String(order.comments).trim()}`)
    }

    const missing = []
    if (!order.customer_name && !order.user_name) missing.push('cliente')
    if (!order.customer_email && !order.user_email) missing.push('email')
    if (!order.location && !order.company && !order.company_name) missing.push('ubicación / empresa')
    if (order.items.length === 0) missing.push('menú/opción')
    if (missing.length > 0) {
      warnings.push(`Pedido ${order.id || index + 1} con datos incompletos: ${missing.join(', ')}`)
    }
  })

  const displayDate = formatDateEs(reportDate)
  return {
    reportDate,
    displayDate,
    totalOrders: orders.length,
    totalItems,
    byLocation: [...byLocation.entries()]
      .map(([label, value]) => ({ label, ...value }))
      .sort((a, b) => b.orders - a.orders || a.label.localeCompare(b.label)),
    byMenuOption: [...byMenuOption.entries()]
      .map(([label, quantity]) => ({ label, quantity }))
      .sort((a, b) => b.quantity - a.quantity || a.label.localeCompare(b.label)),
    comments,
    warnings,
    emptyMessage: orders.length === 0
      ? `No hay pedidos pendientes para la fecha de entrega ${displayDate}.`
      : undefined
  }
}

const escapeHtml = (value: unknown) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')

const renderList = (items: string[], empty: string) =>
  items.length > 0
    ? `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`
    : `<p>${escapeHtml(empty)}</p>`

export const buildEmailHtml = (summary: DailySummary, isTest = false) => `
  <div style="font-family:Arial,sans-serif;color:#111827;line-height:1.45">
    ${isTest ? '<p style="font-weight:700;color:#b91c1c">PRUEBA - NO USAR PARA PRODUCCIÓN</p>' : ''}
    <h1>Reporte diario de pedidos ServiFood</h1>
    <p><strong>Fecha de entrega reportada:</strong> ${escapeHtml(summary.displayDate)}</p>
    ${summary.emptyMessage ? `<p><strong>${escapeHtml(summary.emptyMessage)}</strong></p>` : ''}
    <p><strong>Total de pedidos:</strong> ${summary.totalOrders}</p>
    <p><strong>Total de ítems:</strong> ${summary.totalItems}</p>
    <h2>Totales por ubicación / empresa</h2>
    ${summary.byLocation.length > 0
      ? `<ul>${summary.byLocation.map((row) => `<li>${escapeHtml(row.label)}: ${row.orders} pedidos, ${row.items} ítems</li>`).join('')}</ul>`
      : '<p>Sin ubicaciones para listar.</p>'}
    <h2>Totales por menú / opción</h2>
    ${summary.byMenuOption.length > 0
      ? `<ul>${summary.byMenuOption.map((row) => `<li>${escapeHtml(row.label)}: ${row.quantity}</li>`).join('')}</ul>`
      : '<p>Sin menús/opciones para listar.</p>'}
    <h2>Comentarios destacados</h2>
    ${renderList(summary.comments, 'No hay comentarios destacados.')}
    <h2>Avisos</h2>
    ${renderList(summary.warnings, 'No se detectaron datos incompletos o inconsistentes.')}
  </div>
`

export const buildEmailText = (summary: DailySummary, isTest = false) => [
  isTest ? 'PRUEBA - NO USAR PARA PRODUCCIÓN' : '',
  'Reporte diario de pedidos ServiFood',
  `Fecha de entrega reportada: ${summary.displayDate}`,
  summary.emptyMessage || '',
  `Total de pedidos: ${summary.totalOrders}`,
  `Total de ítems: ${summary.totalItems}`,
  'Totales por ubicación / empresa:',
  ...(summary.byLocation.length
    ? summary.byLocation.map((row) => `- ${row.label}: ${row.orders} pedidos, ${row.items} ítems`)
    : ['- Sin ubicaciones para listar.']),
  'Totales por menú / opción:',
  ...(summary.byMenuOption.length
    ? summary.byMenuOption.map((row) => `- ${row.label}: ${row.quantity}`)
    : ['- Sin menús/opciones para listar.']),
  'Comentarios destacados:',
  ...(summary.comments.length ? summary.comments.map((item) => `- ${item}`) : ['- No hay comentarios destacados.']),
  'Avisos:',
  ...(summary.warnings.length ? summary.warnings.map((item) => `- ${item}`) : ['- No se detectaron datos incompletos o inconsistentes.'])
].filter(Boolean).join('\n')

export const getRecipientsForMode = ({
  mode,
  configuredRecipients,
  sendTo
}: {
  mode: DailyReportMode
  configuredRecipients: string[]
  sendTo?: string
}) => {
  if (mode === 'testEmail') {
    return sendTo ? parseRecipients(sendTo) : [DEFAULT_TEST_RECIPIENT]
  }
  return configuredRecipients
}

export const isAuthorized = (headers: Headers, expectedSecret?: string | null) => {
  const secret = expectedSecret || ''
  return Boolean(secret && headers.get('x-cron-secret') === secret)
}

export const shouldSkipExistingRun = ({
  existingStatus,
  force
}: {
  existingStatus?: string | null
  force?: boolean
}) => {
  if (force) return false
  return existingStatus === 'sent' || existingStatus === 'sent_empty' || existingStatus === 'running'
}

export const createMockOrders = (reportDate: string): NormalizedOrder[] => [
  normalizeOrder({
    id: 'mock-1',
    customer_name: 'Pedido de prueba 1',
    customer_email: 'persona1@example.com',
    customer_phone: '+54 9 11 1111-1111',
    location: 'Empresa Demo Centro',
    delivery_date: reportDate,
    service: 'lunch',
    status: 'pending',
    items: [{ name: 'Menú principal', option: 'Pollo al horno', quantity: 1 }],
    custom_responses: [{ title: 'Guarnición', response: 'Ensalada mixta' }],
    comments: 'Sin sal',
    total_items: 1
  }),
  normalizeOrder({
    id: 'mock-2',
    customer_name: 'Pedido de prueba 2',
    customer_email: 'persona2@example.com',
    customer_phone: '+54 9 11 2222-2222',
    location: 'Empresa Demo Norte',
    delivery_date: reportDate,
    service: 'lunch',
    status: 'pending',
    items: [{ name: 'Menú vegetariano', option: 'Tarta de verduras', quantity: 2 }],
    custom_responses: [{ title: 'Bebida', response: 'Agua' }],
    comments: '',
    total_items: 2
  }),
  normalizeOrder({
    id: 'mock-3',
    customer_name: 'Pedido de prueba 3',
    customer_email: 'persona3@example.com',
    customer_phone: '+54 9 11 3333-3333',
    location: 'Empresa Demo Centro',
    delivery_date: reportDate,
    service: 'dinner',
    status: 'pending',
    items: [{ name: 'Cena', option: 'Milanesa con puré', quantity: 1 }],
    custom_responses: [{ title: 'Guarnición', response: 'Puré' }],
    comments: 'Retira por recepción',
    total_items: 1
  })
]
