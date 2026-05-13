import { formatDateDMY, normalizeLabel, toDisplayString } from './monthlyOrderFormatters'
import { normalizeOrderForReadOnly } from '../order/normalizeOrderForReadOnly'

const incrementCount = (map, key, delta = 1) => {
  map[key] = (map[key] || 0) + delta
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
    menus_principales: 0,
    total_opciones: 0,
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
      menus_principales: 0,
      opciones: { 'OPCIÓN 1': 0, 'OPCIÓN 2': 0, 'OPCIÓN 3': 0, 'OPCIÓN 4': 0, 'OPCIÓN 5': 0, 'OPCIÓN 6': 0 },
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
      row.count += 1
      normalizedItems.forEach(it => {
        const qty = it?.quantity || 1
        const name = (it?.name || '').trim()
        if (!name) return
        if (isOptionName(name)) {
          const m = name.match(/\d+/)
          const key = m ? `OPCIÓN ${m[0]}` : name.toUpperCase()
          if (row.opciones[key] === undefined) row.opciones[key] = 0
          row.opciones[key] += qty
          row.total_opciones += qty
        } else {
          row.menus_principales += qty
        }
      })

      normalizedCustomResponses.forEach(cr => {
        const resp = toDisplayString(cr?.response)
        if (resp) addSideItem(resp, sideBuckets)
        if (Array.isArray(cr?.options)) {
          cr.options.forEach(opt => {
            const value = toDisplayString(opt)
            if (!value) return
            addSideItem(value, sideBuckets)
          })
        }
      })
    })

    row.total_guarniciones = sideBuckets.totalGuarniciones
    row.total_bebidas = sideBuckets.totalBebidas
    row.total_postres = sideBuckets.totalPostres

    range_totals.count += row.count
    range_totals.menus_principales += row.menus_principales
    range_totals.total_opciones += row.total_opciones
    range_totals.total_guarniciones += row.total_guarniciones
    range_totals.total_bebidas += row.total_bebidas
    range_totals.total_postres += row.total_postres

    daily_breakdown.push(row)
  })

  return { daily_breakdown, range_totals }
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
