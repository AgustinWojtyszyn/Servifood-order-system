import { formatDateDMY, normalizeLabel, toDisplayString } from './monthlyOrderFormatters'
import { normalizeOrderForReadOnly } from '../order/normalizeOrderForReadOnly'

const incrementCount = (map, key, delta = 1) => {
  map[key] = (map[key] || 0) + delta
}

export const OPTION_KEYS = ['OPCIÓN 1', 'OPCIÓN 2', 'OPCIÓN 3', 'OPCIÓN 4', 'OPCIÓN 5', 'OPCIÓN 6']

export const createOptionCounts = () => OPTION_KEYS.reduce((acc, key) => {
  acc[key] = 0
  return acc
}, {})

const getService = (order = {}) => String(order?.service || 'lunch').toLowerCase() === 'dinner' ? 'dinner' : 'lunch'

const getOrderQuantity = (order = {}) => {
  const totalItems = Number(order?.total_items)
  if (Number.isFinite(totalItems) && totalItems > 0) return totalItems
  const { normalizedItems } = normalizeOrderForReadOnly(order)
  const itemsTotal = normalizedItems.reduce((sum, item) => sum + (Number(item?.quantity) || 1), 0)
  return itemsTotal || 1
}

const addResponseValues = (resp, callback) => {
  const baseResp = toDisplayString(resp?.response)
  if (baseResp) callback(baseResp)
  if (Array.isArray(resp?.options)) {
    resp.options.forEach(opt => {
      const value = toDisplayString(opt)
      if (value) callback(value)
    })
  }
}

const isQuestionTitle = (resp = {}, keywords = []) => {
  const title = normalizeLabel(resp?.title || resp?.label || resp?.question || resp?.name || '')
  return keywords.some(keyword => title.includes(keyword))
}

const isSideQuestion = (resp = {}) => isQuestionTitle(resp, ['guarnicion', 'guarn'])
const isBeverageQuestion = (resp = {}) => isQuestionTitle(resp, ['bebida', 'bebidas'])
const isDessertQuestion = (resp = {}) => isQuestionTitle(resp, ['postre', 'postres'])

const addBucketItem = (label, buckets, bucketName, delta = 1) => {
  if (!label) return
  if (bucketName === 'bebida') {
    buckets.totalBebidas += delta
    incrementCount(buckets.tiposBebidas, label, delta)
    return
  }
  if (bucketName === 'postre') {
    buckets.totalPostres += delta
    incrementCount(buckets.tiposPostres, label, delta)
    return
  }
  buckets.totalGuarniciones += delta
  incrementCount(buckets.tiposGuarniciones, label, delta)
}

export const createSideBuckets = () => ({
  tiposGuarniciones: {},
  tiposBebidas: {},
  tiposPostres: {},
  totalGuarniciones: 0,
  totalBebidas: 0,
  totalPostres: 0
})

const classifySideItem = (label = '') => {
  const normalized = normalizeLabel(label)
  if (!normalized) return 'guarnicion'
  const tokens = normalized.split(' ').filter(Boolean)
  const matches = (keyword) => {
    if (keyword.includes(' ')) return normalized.includes(keyword)
    return tokens.includes(keyword)
  }
  const beverageKeywords = [
    'agua',
    'coca',
    'coca cola',
    'cola',
    'sprite',
    'fanta',
    'soda',
    'jugo',
    'gaseosa',
    'pepsi',
    'seven',
    '7up',
    'seven up',
    'limonada',
    'te',
    'mate',
    'cafe'
  ]
  const dessertKeywords = [
    'flan',
    'budin',
    'gelatina',
    'mousse',
    'helado',
    'postre',
    'torta',
    'brownie',
    'alfajor',
    'fruta',
    'frutas'
  ]
  if (beverageKeywords.some(matches)) return 'bebida'
  if (dessertKeywords.some(matches)) return 'postre'
  return 'guarnicion'
}

export const addSideItem = (label, buckets) => {
  if (!label) return
  const kind = classifySideItem(label)
  if (kind === 'bebida') {
    buckets.totalBebidas += 1
    incrementCount(buckets.tiposBebidas, label)
    return
  }
  if (kind === 'postre') {
    buckets.totalPostres += 1
    incrementCount(buckets.tiposPostres, label)
    return
  }
  buckets.totalGuarniciones += 1
  incrementCount(buckets.tiposGuarniciones, label)
}

export const isOptionName = (name = '') => /^OPC(ION|IÓN)\s*\d+/i.test(name.trim())

export const getOptionKey = (name = '') => {
  const match = name.trim().match(/^OPC(ION|IÓN)\s*(\d+)/i)
  if (!match) return null
  const optionNumber = Number(match[2])
  if (!Number.isInteger(optionNumber) || optionNumber < 1 || optionNumber > 6) return null
  return `OPCIÓN ${optionNumber}`
}

export const buildRangeDates = (start, end) => {
  if (!start || !end) return []
  const parse = (str) => {
    const [y, m, d] = str.split('-').map(Number)
    if (!y || !m || !d) return null
    return new Date(y, m - 1, d)
  }
  const startDate = parse(start)
  const endDate = parse(end)
  if (!startDate || !endDate || startDate > endDate) return []
  const dates = []
  for (let dt = new Date(startDate); dt <= endDate; dt.setDate(dt.getDate() + 1)) {
    const yyyy = dt.getFullYear()
    const mm = String(dt.getMonth() + 1).padStart(2, '0')
    const dd = String(dt.getDate()).padStart(2, '0')
    dates.push(`${yyyy}-${mm}-${dd}`)
  }
  return dates
}

export const indexOrdersByDay = (orders = [], _timeZone = 'America/Argentina/San_Juan') => {
  const byDay = {}
  const bucketForOrder = (o) => {
    if (o?.delivery_date) return o.delivery_date.slice(0, 10)
    return null
  }
  orders.forEach(o => {
    const day = bucketForOrder(o)
    if (!day) return
    if (!byDay[day]) byDay[day] = []
    byDay[day].push(o)
  })
  return byDay
}

export const buildDailyBreakdownFromOrdersByDay = (dates = [], byDay = {}) => {
  const daily_breakdown = []
  const range_totals = {
    count: 0,
    total_items: 0,
    lunch_items: 0,
    dinner_items: 0,
    menus_principales: 0,
    total_opciones: 0,
    opciones: createOptionCounts(),
    total_guarniciones: 0,
    total_bebidas: 0,
    total_postres: 0
  }

  dates.forEach(date => {
    const dayOrders = byDay?.[date] || []
    const sideBuckets = createSideBuckets()
    const row = {
      date,
      count: 0,
      total_items: 0,
      lunch_items: 0,
      dinner_items: 0,
      menus_principales: 0,
      opciones: createOptionCounts(),
      total_opciones: 0,
      tipos_guarniciones: sideBuckets.tiposGuarniciones,
      total_guarniciones: 0,
      tipos_bebidas: sideBuckets.tiposBebidas,
      total_bebidas: 0,
      tipos_postres: sideBuckets.tiposPostres,
      total_postres: 0
    }

    dayOrders.forEach(o => {
      const { normalizedItems, normalizedCustomResponses } = normalizeOrderForReadOnly(o)
      const orderQty = getOrderQuantity(o)
      const service = getService(o)
      row.count += 1
      row.total_items += orderQty
      if (service === 'dinner') {
        row.dinner_items += orderQty
      } else {
        row.lunch_items += orderQty
      }

      if (service === 'dinner') return

      normalizedItems.forEach(it => {
        const qty = Number(it?.quantity) || 1
        const name = (it?.name || '').trim()
        if (!name) return
        const key = getOptionKey(name)
        if (key) {
          row.opciones[key] += qty
          row.total_opciones += qty
        } else {
          row.menus_principales += qty
        }
      })

      normalizedCustomResponses.forEach(cr => {
        if (isSideQuestion(cr)) addResponseValues(cr, value => addBucketItem(value, sideBuckets, 'guarnicion'))
        if (isBeverageQuestion(cr)) addResponseValues(cr, value => addBucketItem(value, sideBuckets, 'bebida'))
        if (isDessertQuestion(cr)) addResponseValues(cr, value => addBucketItem(value, sideBuckets, 'postre'))
      })
    })

    row.total_guarniciones = sideBuckets.totalGuarniciones
    row.total_bebidas = sideBuckets.totalBebidas
    row.total_postres = sideBuckets.totalPostres

    range_totals.count += row.count
    range_totals.total_items += row.total_items
    range_totals.lunch_items += row.lunch_items
    range_totals.dinner_items += row.dinner_items
    range_totals.menus_principales += row.menus_principales
    range_totals.total_opciones += row.total_opciones
    OPTION_KEYS.forEach(key => {
      range_totals.opciones[key] += row.opciones[key] || 0
    })
    range_totals.total_guarniciones += row.total_guarniciones
    range_totals.total_bebidas += row.total_bebidas
    range_totals.total_postres += row.total_postres

    daily_breakdown.push(row)
  })

  return { daily_breakdown, range_totals }
}

export const createMonthlyExportModel = (orders = [], dates = []) => {
  const companies = {}
  const days = {}
  const dinnerRows = []
  const validations = {
    orderRows: orders.length,
    totalItems: 0,
    multiRationOrders: 0,
    dinnerOrders: 0,
    deletedOrdersIncluded: 0,
    unclassifiedItems: 0,
    selectionSum: 0
  }
  const totals = {
    solicitudesRegistradas: orders.length,
    racionesTotales: 0,
    racionesAlmuerzo: 0,
    racionesCena: 0,
    solicitudesMasDeUnaRacion: 0,
    menusPrincipalesAlmuerzo: 0,
    opciones: createOptionCounts(),
    totalOpciones: 0,
    sideBuckets: createSideBuckets()
  }

  const ensureGroup = (map, key, label) => {
    if (!map[key]) {
      map[key] = {
        label,
        solicitudes: 0,
        raciones: 0,
        almuerzos: 0,
        cenas: 0,
        menusPrincipalesAlmuerzo: 0,
        opciones: createOptionCounts(),
        totalOpciones: 0,
        sideBuckets: createSideBuckets()
      }
    }
    return map[key]
  }

  dates.forEach(date => ensureGroup(days, date, date))

  orders.forEach(order => {
    const normalized = normalizeOrderForReadOnly(order)
    const service = getService(order)
    const orderQty = getOrderQuantity(order)
    const date = (order?.delivery_date || '').slice(0, 10) || 'Sin fecha'
    const company = order?.location || 'Sin ubicación'
    const companyGroup = ensureGroup(companies, company, company)
    const dayGroup = ensureGroup(days, date, date)
    const groups = [companyGroup, dayGroup]

    validations.totalItems += orderQty
    if (orderQty > 1) {
      validations.multiRationOrders += 1
      totals.solicitudesMasDeUnaRacion += 1
    }
    if (service === 'dinner') {
      validations.dinnerOrders += 1
      dinnerRows.push(order)
    }
    if (String(order?.status || '').toLowerCase() === 'deleted') validations.deletedOrdersIncluded += 1

    totals.racionesTotales += orderQty
    if (service === 'dinner') totals.racionesCena += orderQty
    else totals.racionesAlmuerzo += orderQty

    groups.forEach(group => {
      group.solicitudes += 1
      group.raciones += orderQty
      if (service === 'dinner') group.cenas += orderQty
      else group.almuerzos += orderQty
    })

    if (service === 'lunch') {
      normalized.normalizedItems.forEach(item => {
        const name = (item?.name || '').trim()
        const qty = Number(item?.quantity) || 1
        if (!name) {
          validations.unclassifiedItems += qty
          return
        }
        const optionKey = getOptionKey(name)
        validations.selectionSum += qty
        if (optionKey) {
          totals.opciones[optionKey] += qty
          totals.totalOpciones += qty
          groups.forEach(group => {
            group.opciones[optionKey] += qty
            group.totalOpciones += qty
          })
        } else {
          totals.menusPrincipalesAlmuerzo += qty
          groups.forEach(group => {
            group.menusPrincipalesAlmuerzo += qty
          })
        }
      })

      normalized.normalizedCustomResponses.forEach(resp => {
        if (isSideQuestion(resp)) {
          addResponseValues(resp, value => {
            addBucketItem(value, totals.sideBuckets, 'guarnicion')
            groups.forEach(group => addBucketItem(value, group.sideBuckets, 'guarnicion'))
          })
        }
        if (isBeverageQuestion(resp)) {
          addResponseValues(resp, value => {
            addBucketItem(value, totals.sideBuckets, 'bebida')
            groups.forEach(group => addBucketItem(value, group.sideBuckets, 'bebida'))
          })
        }
        if (isDessertQuestion(resp)) {
          addResponseValues(resp, value => {
            addBucketItem(value, totals.sideBuckets, 'postre')
            groups.forEach(group => addBucketItem(value, group.sideBuckets, 'postre'))
          })
        }
      })
    }
  })

  return {
    totals,
    companies: Object.values(companies).sort((a, b) => a.label.localeCompare(b.label, 'es', { sensitivity: 'base' })),
    days: Object.values(days).sort((a, b) => a.label.localeCompare(b.label)),
    dinnerRows,
    validations: {
      ...validations,
      rowsVsRationsDifference: validations.totalItems - validations.orderRows,
      selectionsVsTotalItemsDifference: validations.totalItems - validations.selectionSum
    }
  }
}

export const buildSummaryRows = (metricsData, empresasOverride) => {
  const rows = []
  const empresas = empresasOverride || metricsData?.empresas || []
  empresas.forEach(e => {
    const tiposMenusPrincipales = Object.entries(e.tiposMenus)
      .filter(([nombre]) => nombre && !/^OPC(ION|IÓN)\s*\d+/i.test(nombre) && nombre.trim() !== '')
      .reduce((acc, [, v]) => acc + v, 0)

    const opciones = {}
    for (let i = 1; i <= 6; i++) {
      const key = `OPCIÓN ${i}`
      const cantidad = Object.entries(e.tiposMenus).reduce((acc, [nombre, v]) => {
        if (new RegExp(`^OPC(ION|IÓN)\\s*${i}$`, 'i').test(nombre)) return acc + v
        return acc
      }, 0)
      opciones[key] = cantidad
    }

    const tiposGuarniciones = Object.entries(e.tiposGuarniciones)
      .map(([k, v]) => `${k}: ${v}`)
      .join('; ')
    const tiposBebidas = Object.entries(e.tiposBebidas || {})
      .map(([k, v]) => `${k}: ${v}`)
      .join('; ')
    const tiposPostres = Object.entries(e.tiposPostres || {})
      .map(([k, v]) => `${k}: ${v}`)
      .join('; ')

    rows.push({
      Empresa: e.empresa,
      'Pedidos': e.cantidadPedidos,
      'Menús principales': tiposMenusPrincipales || 0,
      'OPCIÓN 1': opciones['OPCIÓN 1'] || 0,
      'OPCIÓN 2': opciones['OPCIÓN 2'] || 0,
      'OPCIÓN 3': opciones['OPCIÓN 3'] || 0,
      'OPCIÓN 4': opciones['OPCIÓN 4'] || 0,
      'OPCIÓN 5': opciones['OPCIÓN 5'] || 0,
      'OPCIÓN 6': opciones['OPCIÓN 6'] || 0,
      'Guarniciones': tiposGuarniciones || '—',
      'Bebidas': tiposBebidas || '—',
      'Postres': tiposPostres || '—',
      'Total menús principales': e.totalMenusPrincipales ?? (e.totalMenus - e.totalOpciones),
      'Total opciones': e.totalOpciones,
      'Total menús (total)': e.totalMenusTotal ?? e.totalMenus,
      'Total guarniciones': e.totalGuarniciones,
      'Total bebidas': e.totalBebidas || 0,
      'Total postres': e.totalPostres || 0
    })
  })
  return rows
}

const bucketsTotal = (buckets, key) => buckets?.[key] || 0

export const buildCompanyRowsFromModel = (model) => {
  return (model?.companies || []).map(company => ({
    Empresa: company.label,
    Solicitudes: company.solicitudes,
    Raciones: company.raciones,
    Almuerzos: company.almuerzos,
    Cenas: company.cenas,
    'Menús principales de almuerzo': company.menusPrincipalesAlmuerzo,
    'OPCIÓN 1': company.opciones['OPCIÓN 1'] || 0,
    'OPCIÓN 2': company.opciones['OPCIÓN 2'] || 0,
    'OPCIÓN 3': company.opciones['OPCIÓN 3'] || 0,
    'OPCIÓN 4': company.opciones['OPCIÓN 4'] || 0,
    'OPCIÓN 5': company.opciones['OPCIÓN 5'] || 0,
    'OPCIÓN 6': company.opciones['OPCIÓN 6'] || 0,
    'Total opciones': company.totalOpciones,
    'Guarniciones reales': bucketsTotal(company.sideBuckets, 'totalGuarniciones'),
    Bebidas: bucketsTotal(company.sideBuckets, 'totalBebidas'),
    Postres: bucketsTotal(company.sideBuckets, 'totalPostres')
  }))
}

export const buildDailyRowsFromModel = (model) => {
  const rows = (model?.days || []).map(day => ({
    Fecha: formatDateDMY(day.label),
    Solicitudes: day.solicitudes,
    Raciones: day.raciones,
    Almuerzos: day.almuerzos,
    Cenas: day.cenas,
    'Menús principales de almuerzo': day.menusPrincipalesAlmuerzo,
    'OPCIÓN 1': day.opciones['OPCIÓN 1'] || 0,
    'OPCIÓN 2': day.opciones['OPCIÓN 2'] || 0,
    'OPCIÓN 3': day.opciones['OPCIÓN 3'] || 0,
    'OPCIÓN 4': day.opciones['OPCIÓN 4'] || 0,
    'OPCIÓN 5': day.opciones['OPCIÓN 5'] || 0,
    'OPCIÓN 6': day.opciones['OPCIÓN 6'] || 0,
    'Total opciones': day.totalOpciones,
    'Guarniciones reales': bucketsTotal(day.sideBuckets, 'totalGuarniciones'),
    Bebidas: bucketsTotal(day.sideBuckets, 'totalBebidas'),
    Postres: bucketsTotal(day.sideBuckets, 'totalPostres')
  }))

  rows.push({
    Fecha: 'Totales',
    Solicitudes: model?.totals?.solicitudesRegistradas || 0,
    Raciones: model?.totals?.racionesTotales || 0,
    Almuerzos: model?.totals?.racionesAlmuerzo || 0,
    Cenas: model?.totals?.racionesCena || 0,
    'Menús principales de almuerzo': model?.totals?.menusPrincipalesAlmuerzo || 0,
    'OPCIÓN 1': model?.totals?.opciones?.['OPCIÓN 1'] || 0,
    'OPCIÓN 2': model?.totals?.opciones?.['OPCIÓN 2'] || 0,
    'OPCIÓN 3': model?.totals?.opciones?.['OPCIÓN 3'] || 0,
    'OPCIÓN 4': model?.totals?.opciones?.['OPCIÓN 4'] || 0,
    'OPCIÓN 5': model?.totals?.opciones?.['OPCIÓN 5'] || 0,
    'OPCIÓN 6': model?.totals?.opciones?.['OPCIÓN 6'] || 0,
    'Total opciones': model?.totals?.totalOpciones || 0,
    'Guarniciones reales': bucketsTotal(model?.totals?.sideBuckets, 'totalGuarniciones'),
    Bebidas: bucketsTotal(model?.totals?.sideBuckets, 'totalBebidas'),
    Postres: bucketsTotal(model?.totals?.sideBuckets, 'totalPostres')
  })

  return rows
}

export const buildDailyRows = (daily, byDay) => {
  const rows = []
  const rangeBuckets = createSideBuckets()

  daily.daily_breakdown.forEach(d => {
    const dayOrders = byDay?.[d.date] || []
    const dayBuckets = createSideBuckets()

    if (dayOrders.length) {
      dayOrders.forEach(o => {
        const { normalizedCustomResponses } = normalizeOrderForReadOnly(o)
        normalizedCustomResponses.forEach(cr => {
          const resp = toDisplayString(cr?.response)
          if (resp) addSideItem(resp, dayBuckets)
          if (Array.isArray(cr?.options)) {
            cr.options.forEach(opt => {
              const value = toDisplayString(opt)
              if (!value) return
              addSideItem(value, dayBuckets)
            })
          }
        })
      })
    }

    rangeBuckets.totalGuarniciones += dayBuckets.totalGuarniciones
    rangeBuckets.totalBebidas += dayBuckets.totalBebidas
    rangeBuckets.totalPostres += dayBuckets.totalPostres

    const guarnStr = Object.entries(dayBuckets.tiposGuarniciones)
      .map(([k, v]) => `${k}: ${v}`)
      .join('; ')
    const bebidasStr = Object.entries(dayBuckets.tiposBebidas)
      .map(([k, v]) => `${k}: ${v}`)
      .join('; ')
    const postresStr = Object.entries(dayBuckets.tiposPostres)
      .map(([k, v]) => `${k}: ${v}`)
      .join('; ')

    rows.push({
      Fecha: formatDateDMY(d.date),
      Pedidos: d.count,
      'Menús principales': d.menus_principales || 0,
      'OPCIÓN 1': d.opciones?.['OPCIÓN 1'] || 0,
      'OPCIÓN 2': d.opciones?.['OPCIÓN 2'] || 0,
      'OPCIÓN 3': d.opciones?.['OPCIÓN 3'] || 0,
      'OPCIÓN 4': d.opciones?.['OPCIÓN 4'] || 0,
      'OPCIÓN 5': d.opciones?.['OPCIÓN 5'] || 0,
      'OPCIÓN 6': d.opciones?.['OPCIÓN 6'] || 0,
      'Total opciones': d.total_opciones || 0,
      'Guarniciones (tipo: cantidad)': guarnStr || '—',
      'Total guarniciones': dayBuckets.totalGuarniciones,
      'Bebidas (tipo: cantidad)': bebidasStr || '—',
      'Total bebidas': dayBuckets.totalBebidas,
      'Postres (tipo: cantidad)': postresStr || '—',
      'Total postres': dayBuckets.totalPostres
    })
  })

  rows.push({
    Fecha: 'Totales',
    Pedidos: daily.range_totals.count,
    'Menús principales': daily.range_totals.menus_principales,
    'OPCIÓN 1': '',
    'OPCIÓN 2': '',
    'OPCIÓN 3': '',
    'OPCIÓN 4': '',
    'OPCIÓN 5': '',
    'OPCIÓN 6': '',
    'Total opciones': daily.range_totals.total_opciones,
    'Guarniciones (tipo: cantidad)': '',
    'Total guarniciones': rangeBuckets.totalGuarniciones,
    'Bebidas (tipo: cantidad)': '',
    'Total bebidas': rangeBuckets.totalBebidas,
    'Postres (tipo: cantidad)': '',
    'Total postres': rangeBuckets.totalPostres
  })
  return rows
}
