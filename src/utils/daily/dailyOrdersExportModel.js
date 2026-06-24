import { getStatusText } from './dailyOrderFormatters'
import { isBeverage } from './dailyOrderCalculations'
import { normalizeOrderForReadOnly } from '../order/normalizeOrderForReadOnly'

const EMPTY = ''

const toArray = (value) => {
  if (Array.isArray(value)) return value
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  return []
}

const normalizeText = (value) => String(value ?? '').trim()

const valueToText = (value) => {
  if (Array.isArray(value)) return value.map(normalizeText).filter(Boolean).join(', ')
  return normalizeText(value)
}

const safeDate = (value) => {
  if (!value) return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export const formatDateOnly = (value) => {
  if (!value) return EMPTY
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) {
    const [year, month, day] = String(value).split('-')
    return `${day}/${month}/${year}`
  }
  const parsed = safeDate(value)
  return parsed
    ? parsed.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : EMPTY
}

export const formatTimeOnly = (value) => {
  const parsed = safeDate(value)
  return parsed
    ? parsed.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
    : EMPTY
}

const formatStatusForFilename = (selectedStatus) => {
  if (selectedStatus === 'archived') return 'archived'
  if (selectedStatus === 'pending') return 'pending'
  return 'all'
}

export const formatStatusForDisplay = (selectedStatus) => {
  if (selectedStatus === 'archived') return 'Archivados'
  if (selectedStatus === 'pending') return 'Pendientes'
  return 'Todos'
}

export const getOrderLocation = (order = {}) =>
  normalizeText(order.location || order.company_name || order.company || order.company_slug || order.target_company) || 'Sin ubicación'

export const getOrderCustomer = (order = {}) =>
  normalizeText(order.customer_name || order.user_name || order.name) || 'Sin cliente'

export const getOrderEmail = (order = {}) =>
  normalizeText(order.customer_email || order.user_email || order.email)

export const getOrderPhone = (order = {}) =>
  normalizeText(order.customer_phone || order.phone)

export const getOrderServiceLabel = (order = {}) =>
  String(order.service || 'lunch') === 'dinner' ? 'Cena' : 'Almuerzo'

export const getItemQuantity = (item = {}) => {
  const quantity = Number(item.quantity ?? item.qty ?? 1)
  return Number.isFinite(quantity) && quantity > 0 ? quantity : 1
}

const getRawItemQuantity = (item = {}) => Number(item.quantity ?? item.qty ?? 1)

export const getItemLabel = (item = {}) => {
  const name = normalizeText(item.name || item.title || item.menu || item.label)
  const option = normalizeText(item.option || item.selected_option || item.choice)
  return [name, option].filter(Boolean).join(' - ') || 'Sin menú / opción'
}

export const extractOrderItems = (order = {}) => {
  const { normalizedItems } = normalizeOrderForReadOnly(order)
  return toArray(normalizedItems).map((item) => ({
    raw: item,
    label: getItemLabel(item),
    quantity: getItemQuantity(item),
    rawQuantity: getRawItemQuantity(item)
  }))
}

export const extractCustomResponses = (order = {}) => {
  const { normalizedCustomResponses } = normalizeOrderForReadOnly(order)
  const responses = toArray(normalizedCustomResponses)
  const sideValues = []
  const beverageValues = []
  const additional = []

  responses.forEach((response) => {
    const title = normalizeText(response.title || response.label || 'Opción')
    const answer = valueToText(response.answer ?? response.response ?? response.value)
    const optionText = valueToText(response.options)
    const combined = [answer, optionText].filter(Boolean).join(', ')
    const lowerTitle = title.toLowerCase()
    const isSide = lowerTitle.includes('guarn')
    const isDrink = lowerTitle.includes('bebida') || isBeverage(combined)

    if (isSide && combined) {
      sideValues.push(combined)
      return
    }

    if (isDrink && combined) {
      beverageValues.push(combined)
      return
    }

    if (combined) additional.push(`${title}: ${combined}`)
  })

  return {
    side: [...new Set(sideValues)].join(', '),
    beverage: [...new Set(beverageValues)].join(', '),
    additional: additional.join(' | ')
  }
}

export const getOrderTotalItems = (order = {}, items = extractOrderItems(order)) => {
  const stored = Number(order.total_items)
  if (Number.isFinite(stored) && stored > 0) return stored
  return items.reduce((sum, item) => sum + item.quantity, 0)
}

export const buildOrderExportRow = (order = {}) => {
  const items = extractOrderItems(order)
  const custom = extractCustomResponses(order)
  const menuOption = items.map((item) => `${item.label} (x${item.quantity})`).join('; ')
  const deliveryDate = normalizeText(order.delivery_date || '').slice(0, 10)

  return {
    original: order,
    fechaPedido: formatDateOnly(order.created_at),
    horaPedido: formatTimeOnly(order.created_at),
    cliente: getOrderCustomer(order),
    email: getOrderEmail(order),
    telefono: getOrderPhone(order),
    ubicacion: getOrderLocation(order),
    fechaEntregaISO: deliveryDate,
    fechaEntrega: formatDateOnly(deliveryDate),
    servicio: getOrderServiceLabel(order),
    menuOpcion: menuOption || 'Sin menú / opción',
    guarnicion: custom.side,
    bebida: custom.beverage,
    cantidad: getOrderTotalItems(order, items),
    totalItems: getOrderTotalItems(order, items),
    comentarios: normalizeText(order.comments),
    opcionesAdicionales: custom.additional,
    estado: getStatusText(order.status),
    items
  }
}

const incrementCounter = (map, key, amount = 1) => {
  const safeKey = normalizeText(key) || 'Sin dato'
  map.set(safeKey, (map.get(safeKey) || 0) + amount)
}

const incrementLocation = (map, location, orders = 1, items = 0) => {
  const safeLocation = normalizeText(location) || 'Sin ubicación'
  const current = map.get(safeLocation) || { orders: 0, items: 0 }
  current.orders += orders
  current.items += items
  map.set(safeLocation, current)
}

const buildInconsistencies = (orders) => {
  const rows = []
  orders.forEach((order, index) => {
    const label = getOrderCustomer(order) || `Pedido ${index + 1}`
    const issues = []
    const normalized = normalizeOrderForReadOnly(order || {})
    const items = toArray(normalized.normalizedItems)

    if (!normalizeText(order.customer_name || order.user_name || order.name)) issues.push('Sin cliente')
    if (!getOrderEmail(order)) issues.push('Sin email')
    if (!normalizeText(order.location || order.company_name || order.company)) issues.push('Sin ubicación')
    if (items.length === 0) issues.push('Sin items')
    if (!Array.isArray(normalized.normalizedItems)) issues.push('Items malformados')

    items.forEach((item) => {
      if (!item || typeof item !== 'object' || !getItemLabel(item)) issues.push('Items malformados')
      const quantity = getRawItemQuantity(item)
      if (!Number.isFinite(quantity) || quantity <= 0) issues.push('Cantidad inválida')
    })

    ;[...new Set(issues)].forEach((issue) => {
      rows.push({
        pedido: label,
        ubicacion: getOrderLocation(order),
        problema: issue
      })
    })
  })
  return rows
}

export const buildDailyOrdersSummary = (orders = [], selectedStatus = 'pending') => {
  const rows = orders.map(buildOrderExportRow)
  const byLocation = new Map()
  const byMenu = new Map()
  const byService = new Map()
  let totalItems = 0
  let commentsCount = 0

  rows.forEach((row) => {
    totalItems += row.totalItems
    if (row.comentarios) commentsCount += 1
    incrementLocation(byLocation, row.ubicacion, 1, row.totalItems)
    incrementCounter(byService, row.servicio, row.totalItems)
    row.items.forEach((item) => incrementCounter(byMenu, item.label, item.quantity))
    if (row.items.length === 0) incrementCounter(byMenu, 'Sin menú / opción', 1)
  })

  const deliveryDateISO = rows.find((row) => row.fechaEntregaISO)?.fechaEntregaISO || ''

  return {
    deliveryDateISO,
    deliveryDate: formatDateOnly(deliveryDateISO),
    exportedStatus: formatStatusForDisplay(selectedStatus),
    exportedStatusSlug: formatStatusForFilename(selectedStatus),
    totalOrders: rows.length,
    totalItems,
    commentsCount,
    byLocation: [...byLocation.entries()].map(([label, value]) => ({ label, ...value }))
      .sort((a, b) => b.orders - a.orders || a.label.localeCompare(b.label)),
    byMenu: [...byMenu.entries()].map(([label, quantity]) => ({ label, quantity }))
      .sort((a, b) => b.quantity - a.quantity || a.label.localeCompare(b.label)),
    byService: [...byService.entries()].map(([label, items]) => ({
      label,
      orders: rows.filter((row) => row.servicio === label).length,
      items
    })).sort((a, b) => a.label.localeCompare(b.label)),
    rows,
    comments: rows.filter((row) => row.comentarios),
    inconsistencies: buildInconsistencies(orders)
  }
}

export const buildDailyOrdersExcelFileName = (summary) => {
  const date = summary.deliveryDateISO || new Date().toISOString().slice(0, 10)
  return `Pedidos_ServiFood_${date}_${summary.exportedStatusSlug}.xlsx`
}

const plural = (count, singular, pluralText) => `${count} ${count === 1 ? singular : pluralText}`

const countRowsWithValue = (rows, key) => rows.filter((row) => normalizeText(row[key])).length

const formatIssueCounts = (inconsistencies) => {
  const counts = new Map()
  inconsistencies.forEach((row) => {
    const issue = normalizeText(row.problema) || 'Dato incompleto'
    counts.set(issue, (counts.get(issue) || 0) + 1)
  })
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
}

export const formatDailyOrdersForWhatsApp = (orders = [], selectedStatus = 'pending') => {
  const summary = buildDailyOrdersSummary(orders, selectedStatus)
  const topMenus = summary.byMenu.slice(0, 10)
  const remainingMenus = Math.max(summary.byMenu.length - topMenus.length, 0)
  const beverageCount = countRowsWithValue(summary.rows, 'bebida')
  const sideCount = countRowsWithValue(summary.rows, 'guarnicion')
  const lines = [
    '*REPORTE DE PEDIDOS SERVIFOOD*',
    '',
    `*Fecha de entrega:* ${summary.deliveryDate || 'Sin fecha'}`,
    `*Estado:* ${summary.exportedStatus}`,
    '',
    `*Total de pedidos:* ${summary.totalOrders}`,
    `*Total de ítems:* ${summary.totalItems}`,
    '',
    '*TOTALES POR UBICACIÓN*',
    ''
  ]

  if (summary.byLocation.length) {
    summary.byLocation.forEach((row) => {
      lines.push(`- ${row.label}: ${plural(row.orders, 'pedido', 'pedidos')} / ${plural(row.items, 'ítem', 'ítems')}`)
    })
  } else {
    lines.push('- Sin pedidos')
  }

  lines.push('', '*TOTALES POR MENÚ*', '')
  if (topMenus.length) {
    topMenus.forEach((row) => lines.push(`- ${row.label}: ${row.quantity}`))
    if (remainingMenus > 0) lines.push(`- + ${remainingMenus} opciones más en el Excel.`)
  } else {
    lines.push('- Sin menús')
  }

  lines.push('', '*TOTALES POR SERVICIO*', '')
  if (summary.byService.length) {
    summary.byService.forEach((row) => lines.push(`- ${row.label}: ${plural(row.orders, 'pedido', 'pedidos')}`))
  } else {
    lines.push('- Sin servicios')
  }

  lines.push('', '*OBSERVACIONES*', '')
  lines.push(`- ${plural(summary.commentsCount, 'pedido tiene', 'pedidos tienen')} comentarios.`)
  lines.push(`- ${plural(beverageCount, 'pedido incluye', 'pedidos incluyen')} bebida.`)
  lines.push(`- ${plural(sideCount, 'pedido incluye', 'pedidos incluyen')} guarnición.`)

  lines.push('', '*AVISOS*', '')
  if (summary.inconsistencies.length) {
    formatIssueCounts(summary.inconsistencies).forEach(([issue, count]) => {
      lines.push(`⚠️ ${issue}: ${plural(count, 'pedido', 'pedidos')}`)
    })
  } else {
    lines.push('✓ No se detectaron datos incompletos o inconsistentes.')
  }

  lines.push('', 'El detalle completo de clientes, opciones, bebidas, guarniciones y comentarios está en el Excel exportado.')

  return lines.join('\n')
}
