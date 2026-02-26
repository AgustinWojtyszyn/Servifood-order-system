import { useState, useEffect } from 'react'
import DatePicker, { registerLocale, setDefaultLocale } from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { useNavigate } from 'react-router-dom'
import { Calendar, Download, Package, TrendingUp, User, BarChart2, Printer } from 'lucide-react'
import ExcelJS from 'exceljs'
import { supabase, db } from '../supabaseClient'
import RequireUser from './RequireUser'
import { es } from 'date-fns/locale'
import { useRef } from 'react'
import clipboardImg from '../assets/clipboard.png'
import choiceImg from '../assets/choice.png'

// Configurar calendario en español
registerLocale('es', es)
setDefaultLocale('es')

// Componente de calendario simple (puedes reemplazarlo por uno ya existente si hay en el proyecto)
function DateRangePicker({ value, onChange }) {
  // value: { start: string, end: string }
  // Usar fechas locales puras para evitar desfase
  const parseDate = (str) => {
    if (!str) return null
    // str: yyyy-MM-dd
    const [year, month, day] = str.split('-').map(Number)
    return new Date(year, month - 1, day)
  }
  const startDate = parseDate(value.start)
  const endDate = parseDate(value.end)
  return (
    <div className="flex flex-col gap-2 md:flex-row md:gap-6">
      <div className="flex flex-col">
        <label className="font-semibold mb-1">Desde:</label>
        <DatePicker
          selected={startDate}
          locale="es"
          onChange={date => {
            const iso = date ? date.toISOString().slice(0, 10) : ''
            // Si la fecha de fin es menor, ajusta
            if (endDate && date && date > endDate) {
              onChange({ start: iso, end: iso })
            } else {
              onChange({ ...value, start: iso })
            }
          }}
          dateFormat="yyyy-MM-dd"
          className="border rounded px-3 py-2 text-base"
          placeholderText="Desde"
          // Permitir cualquier fecha (pasada, presente o futura)
          isClearable
        />
      </div>
      <div className="flex flex-col">
        <label className="font-semibold mb-1">Hasta:</label>
        <DatePicker
          selected={endDate}
          locale="es"
          onChange={date => {
            const iso = date ? date.toISOString().slice(0, 10) : ''
            // Si la fecha de inicio es mayor, ajusta
            if (startDate && date && date < startDate) {
              onChange({ start: iso, end: iso })
            } else {
              onChange({ ...value, end: iso })
            }
          }}
          dateFormat="yyyy-MM-dd"
          className="border rounded px-3 py-2 text-base"
          placeholderText="Hasta"
          minDate={null}
          maxDate={null}
          isClearable
        />
      </div>
      {startDate && endDate && startDate > endDate && (
        <div className="text-red-600 text-xs mt-1">La fecha de inicio no puede ser mayor que la de fin.</div>
      )}
    </div>
  )
}

const toDisplayString = (value) => {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value)
    } catch {
      return String(value)
    }
  }
  return String(value)
}

const normalizeLabel = (value = '') => {
  const base = toDisplayString(value)
  if (!base) return ''
  return base
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

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

const incrementCount = (map, key, delta = 1) => {
  map[key] = (map[key] || 0) + delta
}

const createSideBuckets = () => ({
  tiposGuarniciones: {},
  tiposBebidas: {},
  tiposPostres: {},
  totalGuarniciones: 0,
  totalBebidas: 0,
  totalPostres: 0
})

const addSideItem = (label, buckets) => {
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


const MonthlyPanel = ({ user, loading }) => {
  // Estados que cuentan para métricas (incluir preparaciones listas)
  const COUNTABLE_STATUSES = ['pending', 'archived', 'cancelled']
  const [draftRange, setDraftRange] = useState({ start: '', end: '' })
  const [dateRange, setDateRange] = useState({ start: '', end: '' }) // rango aplicado
  const [metricsLoading, setMetricsLoading] = useState(false)
  const [metrics, setMetrics] = useState(null)
  const [, setError] = useState(null)
  const [empresaFilter, setEmpresaFilter] = useState('ALL')
  const [dailyData, setDailyData] = useState(null)
  const [ordersByDay, setOrdersByDay] = useState({})
  const [selectedDate, setSelectedDate] = useState(null)
  const [showDailyTable, setShowDailyTable] = useState(false)
  const [, setDebugLogs] = useState([])
  const [debugEnabled, setDebugEnabled] = useState(true)
  const fetchId = useRef(0)
  const manualFetchRef = useRef(false)
  const navigate = useNavigate()

  // Logger que no depende de console.* (minificador los elimina). Almacena en estado y window.
  const pushLog = (label, data = {}) => {
    const entry = { ts: new Date().toISOString(), label, data }
    setDebugLogs(prev => [entry, ...prev].slice(0, 80))
    if (typeof window !== 'undefined') {
      window.__monthlyPanelLogs = window.__monthlyPanelLogs || []
      window.__monthlyPanelLogs.unshift(entry)
      if (window.__monthlyPanelLogs.length > 200) window.__monthlyPanelLogs.pop()
    }
  }

  const palette = ['#2563eb']
  const maxDailyCount = dailyData?.daily_breakdown ? Math.max(...dailyData.daily_breakdown.map(x => x.count || 0), 1) : 1
  const isDraftValid = draftRange.start && draftRange.end && draftRange.start <= draftRange.end
  const handlePrintPdf = () => window.print()

  useEffect(() => {
    // Control de acceso: solo admin
    if (!user?.id) return
    if (user.role !== 'admin' && user.user_metadata?.role !== 'admin') {
      navigate('/dashboard')
    }
  }, [user, navigate])

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      if (params.get('debug') === '1') {
        setDebugEnabled(true)
      }
    } catch (err) {
      void err
    }
  }, [])

  // Sync logs from window store into state so getDailyBreakdown logs are visible
  useEffect(() => {
    if (!debugEnabled) return
    const id = setInterval(() => {
      if (typeof window === 'undefined') return
      const external = window.__monthlyPanelLogs || []
      if (external.length === 0) return
      setDebugLogs(prev => {
        const merged = [...external, ...prev]
        // dedupe by timestamp+label+json data
        const seen = new Set()
        const uniq = []
        for (const e of merged) {
          const key = `${e.ts}|${e.label}|${JSON.stringify(e.data || {})}`
          if (seen.has(key)) continue
          seen.add(key)
          uniq.push(e)
        }
        return uniq.slice(0, 120)
      })
    }, 800)
    return () => clearInterval(id)
  }, [debugEnabled])

  useEffect(() => {
    // Solo buscar si el rango aplicado es válido
    if (manualFetchRef.current) return
    if (dateRange.start && dateRange.end && dateRange.start <= dateRange.end) {
      fetchMetrics(dateRange)
    }
    // eslint-disable-next-line
  }, [dateRange])

  async function fetchMetrics(range) {
    const currentRange = range || dateRange
    if (!currentRange?.start || !currentRange?.end || currentRange.start > currentRange.end) return

    const reqId = ++fetchId.current
    pushLog('fetchMetrics-init', { currentRange, reqId })
    setMetricsLoading(true)
    // Mantener datos actuales para evitar parpadeos; solo limpiar selección puntual
    setSelectedDate(null)
    setError(null)
    try {
      pushLog('fetch-start', currentRange)
      // Consulta principal: filtrar por delivery_date; si es null, por created_at
      const startUtc = `${currentRange.start}T00:00:00.000Z`
      const endUtc = `${currentRange.end}T23:59:59.999Z`
      // Solo columnas existentes requeridas para métricas
      const columns = 'id,status,delivery_date,created_at,total_items,items,custom_responses,location'
      pushLog('query-params', { startUtc, endUtc, start: currentRange.start, end: currentRange.end })

      // Dos consultas explícitas para evitar problemas de encoding con OR complejo
      const [{ data: deliveryOrders, error: deliveryErr }, { data: createdOrders, error: createdErr }] = await Promise.all([
        supabase
          .from('orders')
          .select(columns)
          .gte('delivery_date', currentRange.start)
          .lte('delivery_date', currentRange.end),
        supabase
          .from('orders')
          .select(columns)
          .is('delivery_date', null)
          .gte('created_at', startUtc)
          .lte('created_at', endUtc)
      ])

      if (deliveryErr) throw deliveryErr
      if (createdErr) throw createdErr

      let orders = []
      if (Array.isArray(deliveryOrders)) orders = orders.concat(deliveryOrders)
      if (Array.isArray(createdOrders)) orders = orders.concat(createdOrders)
      pushLog('orders-raw', { total: orders.length })

      // Aplicar mismos criterios de estados que el desglose diario
      orders = Array.isArray(orders) ? orders.filter(o => COUNTABLE_STATUSES.includes(o.status)) : []
      const statusCount = orders.reduce((acc, o) => {
        const s = o.status || 'unknown'
        acc[s] = (acc[s] || 0) + 1
        return acc
      }, {})
      pushLog('orders-filtered', {
        delivery: deliveryOrders?.length || 0,
        created: createdOrders?.length || 0,
        afterFilter: orders.length,
        statusCount,
        sample: orders.slice(0, 3)
      })

      // Agrupar por ubicación (location) usando todos los pedidos del rango
      const grouped = {}
      for (const order of orders) {
        const empresa = order.location || 'Sin ubicación'
        if (!grouped[empresa]) grouped[empresa] = []
        grouped[empresa].push(order)
      }

      // Métricas por empresa
      const empresas = Object.keys(grouped).map(empresa => {
        const pedidos = grouped[empresa]
        let totalMenus = 0
        let tiposMenus = {}
        let totalOpciones = 0
        let tiposOpciones = {}
        const sideBuckets = createSideBuckets()

        pedidos.forEach(p => {
          // Procesar items (menús principales y opciones)
          let items = []
          if (Array.isArray(p.items)) {
            items = p.items
          } else if (typeof p.items === 'string') {
            try {
              items = JSON.parse(p.items)
            } catch (err) {
              void err
            }
          }
          items.forEach(item => {
            totalMenus += item.quantity || 1
            // Contar por nombre de menú
            const nombre = (item.name || '').trim()
            tiposMenus[nombre] = (tiposMenus[nombre] || 0) + (item.quantity || 1)
            // Si el nombre es "OPCIÓN X", contarlo como opción
            if (/^OPC(ION|IÓN)\s*\d+/i.test(nombre)) {
              totalOpciones += item.quantity || 1
              tiposOpciones[nombre] = (tiposOpciones[nombre] || 0) + (item.quantity || 1)
            }
          })

          // Procesar guarniciones desde custom_responses
          let customResponses = []
          if (Array.isArray(p.custom_responses)) {
            customResponses = p.custom_responses
          } else if (typeof p.custom_responses === 'string') {
            try {
              customResponses = JSON.parse(p.custom_responses)
            } catch (err) {
              void err
            }
          }
          customResponses.forEach(resp => {
            // Si hay respuesta de guarnición
            const baseResp = toDisplayString(resp.response)
            if (baseResp) addSideItem(baseResp, sideBuckets)
            // Si hay opciones (array)
            if (Array.isArray(resp.options)) {
              resp.options.forEach(opt => {
                const tipo = toDisplayString(opt)
                if (!tipo) return
                addSideItem(tipo, sideBuckets)
              })
            }
          })
        })
        return {
          empresa,
          cantidadPedidos: pedidos.length,
          totalMenus,
          totalMenusPrincipales: totalMenus - totalOpciones,
          totalMenusTotal: totalMenus,
          totalOpciones,
          totalGuarniciones: sideBuckets.totalGuarniciones,
          totalBebidas: sideBuckets.totalBebidas,
          totalPostres: sideBuckets.totalPostres,
          tiposMenus,
          tiposOpciones,
          tiposGuarniciones: sideBuckets.tiposGuarniciones,
          tiposBebidas: sideBuckets.tiposBebidas,
          tiposPostres: sideBuckets.tiposPostres
        }
      })

      // Para consistencia, usar el total del desglose diario
      const newMetrics = {
        totalPedidos: 0,
        empresas
      }
      pushLog('metrics-grouped', { empresas: newMetrics.empresas.length })
      setMetrics(newMetrics)

      // Desglose diario del rango (fuente histórica real)
      const { data: breakdown, error: breakdownError } = await db.getDailyBreakdown({ start: currentRange.start, end: currentRange.end })
      if (breakdownError) throw breakdownError
      pushLog('breakdown', {
        days: breakdown?.daily_breakdown?.length || 0,
        total: breakdown?.range_totals?.count || 0,
        sample: breakdown?.daily_breakdown?.slice?.(0, 3) || []
      })
      // Fallback: si Supabase devolvió 0 en breakdown pero tenemos órdenes, recalcular rápido desde "orders"
      let finalBreakdown = breakdown
      if ((breakdown?.range_totals?.count ?? 0) === 0 && orders.length > 0) {
        const byDay = {}
        const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/San_Juan', year: 'numeric', month: '2-digit', day: '2-digit' })
        const bucketForOrder = (o) => {
          if (o.delivery_date) return o.delivery_date.slice(0, 10)
          try {
            return fmt.format(new Date(o.created_at))
          } catch { return null }
        }
        orders.forEach(o => {
          const day = bucketForOrder(o)
          if (!day) return
          if (!byDay[day]) {
            const sideBuckets = createSideBuckets()
            byDay[day] = {
              date: day,
              count: 0,
              menus_principales: 0,
              opciones: {},
              total_opciones: 0,
              tipos_guarniciones: sideBuckets.tiposGuarniciones,
              total_guarniciones: 0,
              tipos_bebidas: sideBuckets.tiposBebidas,
              total_bebidas: 0,
              tipos_postres: sideBuckets.tiposPostres,
              total_postres: 0,
              sideBuckets
            }
          }
          const row = byDay[day]
          const addSide = (value) => {
            if (!value) return
            addSideItem(value, row.sideBuckets)
            row.total_guarniciones = row.sideBuckets.totalGuarniciones
            row.total_bebidas = row.sideBuckets.totalBebidas
            row.total_postres = row.sideBuckets.totalPostres
          }
          row.count += 1
          let items = []
          if (Array.isArray(o.items)) items = o.items
          else if (typeof o.items === 'string') {
            try {
              items = JSON.parse(o.items)
            } catch (err) {
              void err
            }
          }
          items.forEach(it => {
            const qty = it?.quantity || 1
            const name = (it?.name || '').trim()
            const m = name.match(/^OPC(ION|IÓN)\s*(\d+)/i)
            if (m) {
              const key = `OPCIÓN ${m[2]}`
              row.opciones[key] = (row.opciones[key] || 0) + qty
              row.total_opciones += qty
            } else {
              row.menus_principales += qty
            }
          })
          let custom = []
          if (Array.isArray(o.custom_responses)) custom = o.custom_responses
          else if (typeof o.custom_responses === 'string') {
            try {
              custom = JSON.parse(o.custom_responses)
            } catch (err) {
              void err
            }
          }
          custom.forEach(cr => {
            const r = toDisplayString(cr?.response)
            if (r) addSide(r)
            if (Array.isArray(cr?.options)) {
              cr.options.forEach(opt => {
                const v = toDisplayString(opt)
                if (!v) return
                addSide(v)
              })
            }
          })
        })
        const daily_breakdown = Object.values(byDay)
          .map(({ sideBuckets, ...rest }) => {
            void sideBuckets
            return rest
          })
          .sort((a, b) => a.date.localeCompare(b.date))
        const range_totals = daily_breakdown.reduce((acc, d) => {
          acc.count += d.count
          acc.menus_principales += d.menus_principales || 0
          acc.total_opciones += d.total_opciones || 0
          acc.total_guarniciones += d.total_guarniciones || 0
          acc.total_bebidas += d.total_bebidas || 0
          acc.total_postres += d.total_postres || 0
          return acc
        }, { count: 0, menus_principales: 0, total_opciones: 0, total_guarniciones: 0, total_bebidas: 0, total_postres: 0 })
        finalBreakdown = { daily_breakdown, range_totals }
        pushLog('breakdown-fallback', { days: daily_breakdown.length, total: range_totals.count })
      }
      // Evitar condiciones de carrera: solo actualizar si es la petición vigente
      if (reqId === fetchId.current) {
        setDailyData(finalBreakdown)
        setShowDailyTable(false) // requiere confirmación para desplegar
        // Indexar órdenes por día para detalles sin refetch
        const byDay = {}
        const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/San_Juan', year: 'numeric', month: '2-digit', day: '2-digit' })
        const bucketForOrder = (o) => {
          if (o.delivery_date) return o.delivery_date.slice(0, 10)
          try {
            return fmt.format(new Date(o.created_at))
          } catch {
            return null
          }
        }
        orders.forEach(o => {
          const day = bucketForOrder(o)
          if (!day) return
          if (!byDay[day]) byDay[day] = []
          byDay[day].push(o)
        })
        pushLog('orders-indexed', { days: Object.keys(byDay).length, sampleDay: Object.keys(byDay)[0] })
        setOrdersByDay(byDay)
      }

      // Actualizar totalPedidos desde breakdown para consistencia
      if (reqId === fetchId.current) {
        setMetrics(prev => prev ? { ...prev, totalPedidos: breakdown.range_totals.count } : prev)
        pushLog('totals-updated', { totalPedidos: breakdown.range_totals.count })
      }
    } catch (err) {
      pushLog('error', { message: err?.message || 'unknown', stack: err?.stack })
      setError(null)
    } finally {
      if (reqId === fetchId.current) {
        setMetricsLoading(false)
        pushLog('fetch-end', { reqId, currentRange })
      }
    }
  }

  // Exportar a Excel
  const downloadWorkbook = async (workbook, fileName) => {
    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1200)
  }

  const handleExportExcel = async () => {
    if (!metrics || !metrics.empresas) return
    // Exportación robusta: separar menús principales y opciones, y mostrar cantidades claras
    const empresasForExport = empresaFilter === 'ALL'
      ? metrics.empresas
      : metrics.empresas.filter(e => e.empresa === empresaFilter)
    const rows = buildSummaryRows(metrics, empresasForExport)
    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet('Resumen')
    if (rows.length > 0) {
      ws.columns = Object.keys(rows[0]).map(k => ({ header: k, key: k, width: 20 }))
      ws.addRows(rows)
    }
    const fileName = `panel-mensual-${dateRange.start || 'inicio'}-a-${dateRange.end || 'fin'}.xlsx`
    await downloadWorkbook(wb, fileName)
  }

  // Exportar desglose diario del rango
  const handleExportDailyExcel = async () => {
    if (!dailyData || !dailyData.daily_breakdown) return
    const rows = buildDailyRows(dailyData, ordersByDay)
    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet('Desglose Diario')
    if (rows.length > 0) {
      ws.columns = Object.keys(rows[0]).map(k => ({ header: k, key: k, width: 20 }))
      ws.addRows(rows)
    }
    const fileName = `desglose-diario-${dateRange.start || 'inicio'}-a-${dateRange.end || 'fin'}.xlsx`
    await downloadWorkbook(wb, fileName)
  }

  const handleExportAllExcel = async () => {
    if (!metrics || !metrics.empresas) return
    const wb = new ExcelJS.Workbook()
    const empresasForExport = empresaFilter === 'ALL'
      ? metrics.empresas
      : metrics.empresas.filter(e => e.empresa === empresaFilter)
    const summaryRows = buildSummaryRows(metrics, empresasForExport)
    const wsSummary = wb.addWorksheet('Resumen')
    if (summaryRows.length > 0) {
      wsSummary.columns = Object.keys(summaryRows[0]).map(k => ({ header: k, key: k, width: 20 }))
      wsSummary.addRows(summaryRows)
    }
    if (dailyData?.daily_breakdown) {
      const dailyRows = buildDailyRows(dailyData, ordersByDay)
      const wsDaily = wb.addWorksheet('Desglose Diario')
      if (dailyRows.length > 0) {
        wsDaily.columns = Object.keys(dailyRows[0]).map(k => ({ header: k, key: k, width: 20 }))
        wsDaily.addRows(dailyRows)
      }
    }
    const fileName = `panel-completo-${dateRange.start || 'inicio'}-a-${dateRange.end || 'fin'}.xlsx`
    await downloadWorkbook(wb, fileName)
  }

  const buildSummaryRows = (metricsData, empresasOverride) => {
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

  const buildDailyRows = (daily, byDay) => {
    const rows = []
    const rangeBuckets = createSideBuckets()

    daily.daily_breakdown.forEach(d => {
      const dayOrders = byDay?.[d.date] || []
      const dayBuckets = createSideBuckets()

      if (dayOrders.length) {
        dayOrders.forEach(o => {
          let custom = []
          if (Array.isArray(o.custom_responses)) custom = o.custom_responses
          else if (typeof o.custom_responses === 'string') {
            try {
              custom = JSON.parse(o.custom_responses)
            } catch (err) {
              void err
            }
          }
          custom.forEach(cr => {
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
        Fecha: d.date,
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

  const handleClearRange = () => {
    setDraftRange({ start: '', end: '' })
    setDateRange({ start: '', end: '' })
    setMetrics(null)
    setDailyData(null)
    setOrdersByDay({})
    setSelectedDate(null)
    setShowDailyTable(false)
    setError(null)
  }

  const handleApplyRange = async () => {
    if (!isDraftValid) return
    const newRange = { ...draftRange }
    // Marcar fetch manual para evitar doble disparo desde el effect
    manualFetchRef.current = true
    // Feedback inmediato
    setMetricsLoading(true)
    // Limpiar datos anteriores para evitar parpadeos de rangos previos
    setMetrics(null)
    setDailyData(null)
    setOrdersByDay({})
    setSelectedDate(null)
    setShowDailyTable(false)
    setError(null)
    setDateRange(newRange)
    pushLog('apply-range', { range: newRange })
    try {
      await fetchMetrics(newRange)
    } finally {
      manualFetchRef.current = false
    }
  }

  const empresasAll = metrics?.empresas || []
  const empresasForView = empresaFilter === 'ALL'
    ? empresasAll
    : empresasAll.filter(e => e.empresa === empresaFilter)
  const empresasForDropdown = [...empresasAll].sort((a, b) => (a.empresa || '').localeCompare(b.empresa || ''))
  const totalsForView = empresasForView.reduce((acc, e) => {
    acc.pedidos += e.cantidadPedidos || 0
    acc.menusPrincipales += e.totalMenusPrincipales ?? (e.totalMenus - e.totalOpciones)
    acc.opciones += e.totalOpciones || 0
    acc.menusTotal += e.totalMenusTotal ?? e.totalMenus
    acc.guarniciones += e.totalGuarniciones || 0
    acc.bebidas += e.totalBebidas || 0
    acc.postres += e.totalPostres || 0
    return acc
  }, {
    pedidos: 0,
    menusPrincipales: 0,
    opciones: 0,
    menusTotal: 0,
    guarniciones: 0,
    bebidas: 0,
    postres: 0
  })

  return (
    <RequireUser user={user} loading={loading}>
    <div
      className="monthly-container w-full space-y-6 px-2 sm:px-4 md:px-6 md:max-w-7xl md:mx-auto pb-32"
      style={{
        overflowY: 'auto',
        overflowX: 'hidden',
        minHeight: '100vh',
        WebkitOverflowScrolling: 'touch'
      }}
    >
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 10mm; }
          html, body { width: 100%; margin: 0; padding: 0; background: #fff !important; }
          .monthly-container {
            max-width: 100% !important;
            width: 100% !important;
            overflow: visible !important;
            height: auto !important;
            padding: 0 !important;
            zoom: 0.9;
          }
          .monthly-container table { width: 100% !important; table-layout: fixed; }
          .monthly-container th, .monthly-container td { word-break: break-word; }
          .monthly-container img { max-width: 100% !important; height: auto !important; }
          .monthly-container .w-full, .monthly-container .max-w-full { max-width: 100% !important; }
          .monthly-container * {
            box-shadow: none !important;
            overflow: visible !important;
          }
          .print-hide { display: none !important; }
          .print-no-break { page-break-inside: avoid; }
          .print-break { page-break-before: always; }
          .print-full-width { width: 100% !important; max-width: 100% !important; }
          .print-unclamp { overflow: visible !important; height: auto !important; }
        }
        @media screen {
          .print-only { display: none; }
        }
      `}</style>
      {/* Título arriba de los tips */}
      <div className="bg-linear-to-r from-blue-600 to-blue-800 rounded-2xl p-4 md:p-8 text-white shadow-2xl mb-6">
        <div className="flex flex-col gap-4">
          <div className="text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
              <Calendar className="h-8 w-8 md:h-10 md:w-10" />
              <h1 className="text-2xl md:text-4xl font-bold">Panel Mensual</h1>
            </div>
            <p className="text-blue-100 text-base md:text-lg">Resumen y métricas de pedidos mensuales</p>
          </div>
        </div>
      </div>
      {/* Modo de uso */}
      <div className="bg-blue-50 border-l-4 border-blue-400 rounded-xl p-5 mb-6 shadow flex items-start gap-4">
        <span className="text-blue-600 mt-1"><Calendar className="h-6 w-6" /></span>
        <div>
          <div className="font-bold text-blue-900 mb-2 text-lg">Modo de uso del Panel Mensual</div>
          <ol className="list-decimal pl-6 text-blue-900 text-base space-y-1">
            <li>Selecciona el <b>rango de fechas</b> y presiona <b>“Aplicar rango”</b> para ver el resumen de pedidos por empresa.</li>
            <li>La fecha seleccionada corresponde siempre al <b>día de entrega</b> (por ejemplo, si quieres saber los pedidos del martes, selecciona martes).</li>
            <li>Exporta el resumen a Excel con el botón <b>Exportar Excel</b>.</li>
            <li>Los <b>menús principales</b> y las <b>opciones</b> aparecen separados y con cantidades claras.</li>
            <li>Haz clic en una <b>barra del gráfico</b> para ver el detalle completo de ese día (totales, desglose por empresa/menús/opciones/guarniciones/bebidas/postres y lista de pedidos). Usa “Cerrar detalle” para volver.</li>
            <li>El <b>desglose diario en tabla</b> se muestra solo cuando presionas “Ver tabla diaria”, para evitar scroll en rangos grandes.</li>
          </ol>
        </div>
      </div>

      {/* Selector de fechas */}
      <div className="bg-white rounded-xl p-4 md:p-6 shadow-lg border-2 border-blue-200 w-full mb-4">
        <div className="flex flex-col gap-3">
          <DateRangePicker value={draftRange} onChange={setDraftRange} />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={handleClearRange}
              disabled={!dateRange.start && !dateRange.end && !draftRange.start && !draftRange.end}
              className={`px-4 py-2 rounded-lg font-bold text-blue-700 border-2 border-blue-200 shadow transition-all duration-200 ${
                dateRange.start || dateRange.end || draftRange.start || draftRange.end
                  ? 'bg-white hover:bg-blue-50 hover:border-blue-400'
                  : 'bg-gray-200 cursor-not-allowed text-gray-500 border-gray-200'
              }`}
            >
              Limpiar rango
            </button>
            <button
              onClick={handleApplyRange}
              disabled={!isDraftValid}
              className={`px-4 py-2 rounded-lg font-bold text-white shadow transition-all duration-200 ${
                isDraftValid
                  ? 'bg-blue-600 hover:bg-blue-700 hover:shadow-lg'
                  : 'bg-gray-400 cursor-not-allowed'
              }`}
            >
              Aplicar rango
            </button>
          </div>
        </div>
      </div>

      {/* Exportar a Excel */}
      {metrics && (
        <div className="flex justify-end mb-2 flex-wrap gap-2">
          <button
            onClick={handleExportAllExcel}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-xl shadow transition-all duration-200"
          >
            <Download className="h-5 w-5" />
            Exportar panel (todo)
          </button>
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-xl shadow transition-all duration-200"
          >
            <Download className="h-5 w-5" />
            Exportar Excel
          </button>
          {dailyData?.daily_breakdown && (
            <button
              onClick={handleExportDailyExcel}
              className="ml-2 flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-xl shadow transition-all duration-200"
            >
              <Download className="h-5 w-5" />
              Exportar rango (diario)
            </button>
          )}
          <button
            onClick={handlePrintPdf}
            className="flex items-center gap-2 bg-gray-900 hover:bg-black text-white font-bold py-2 px-4 rounded-xl shadow transition-all duration-200"
          >
            <Printer className="h-5 w-5" />
            Imprimir / PDF
          </button>
        </div>
      )}
      {/* Métricas y tabla */}
      {metricsLoading && (
        <div className="mt-4 mx-auto max-w-2xl">
          <div className="flex items-center gap-3 bg-blue-50 border-2 border-blue-300 rounded-xl p-4 shadow-lg">
            <div className="h-10 w-10 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin" aria-hidden="true"></div>
            <div>
              <p className="text-base sm:text-lg font-extrabold text-blue-900">Cargando métricas del rango...</p>
              <p className="text-sm text-blue-800">Esto debería tardar solo un momento.</p>
            </div>
          </div>
        </div>
      )}
      {/* Error suprimido visualmente para no bloquear la vista */}
      {metrics && (
        <div className="space-y-6">
          {/* Gráficos rápidos (siempre visibles cuando hay datos) */}
          {dailyData?.daily_breakdown && (
          <div className="bg-white rounded-xl p-4 md:p-6 shadow-lg border-2 border-blue-200 w-full print-no-break print-full-width">
            <div className="flex items-center gap-2 mb-3">
              <BarChart2 className="h-5 w-5 text-blue-600" />
              <div className="font-bold text-blue-900 text-lg">Pedidos por día (rango)</div>
            </div>
            <p className="text-sm text-gray-700 mb-3">
              {dailyData.daily_breakdown.length} días en el rango seleccionado.
            </p>
            <div className="h-72 flex items-end gap-2 overflow-x-auto px-1 mt-1 print-unclamp print-full-width">
                {dailyData.daily_breakdown.map(d => {
                  const heightPx = Math.max((d.count / maxDailyCount) * 220, 8)
                  const height = `${heightPx}px`
                  const color = palette[0]
                  return (
                    <div
                      key={d.date}
                      className="flex flex-col items-center flex-1 min-w-[46px] cursor-pointer select-none"
                      onClick={() => setSelectedDate(d.date)}
                    >
                      <div
                        className={`w-full rounded-t-md transition-all ${selectedDate === d.date ? 'ring-2 ring-blue-400 shadow-lg' : ''}`}
                        style={{
                          background: color,
                          height,
                          minHeight: '6px'
                        }}
                        title={`${d.date}: ${d.count} pedidos`}
                      />
                      <div className="text-[11px] text-gray-600 mt-1 whitespace-nowrap">{d.date.slice(5)}</div>
                      <div className="text-xs font-semibold text-gray-800">{d.count}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Desglose diario del rango */}
          {dailyData?.daily_breakdown && (
            <div className="bg-white rounded-xl p-4 md:p-6 shadow-lg border-2 border-blue-200 w-full print-no-break print-full-width">
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="h-5 w-5 text-blue-600" />
                <div className="font-bold text-blue-900 text-lg">Desglose diario del rango</div>
              </div>
              {selectedDate && (
                <DailyDetailPanel
                  date={selectedDate}
                  orders={ordersByDay[selectedDate] || []}
                  dailyBreakdown={dailyData.daily_breakdown.find(d => d.date === selectedDate)}
                  onClose={() => setSelectedDate(null)}
                />
              )}
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-gray-700">
                  {dailyData.daily_breakdown.length} días en el rango seleccionado.
                </p>
                <button
                  onClick={() => setShowDailyTable(prev => !prev)}
                  className="px-3 py-2 rounded-lg text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all shadow disabled:opacity-60"
                >
                  {showDailyTable ? 'Ocultar tabla' : 'Ver tabla diaria'}
                </button>
              </div>

              {showDailyTable && (
                <div className="overflow-x-auto print-unclamp print-full-width">
                  <table className="min-w-full bg-white rounded-xl shadow-lg text-black border-2 border-blue-200">
                    <thead className="bg-blue-50">
                      <tr>
                        <th className="px-4 py-2 text-left">Fecha (YYYY-MM-DD)</th>
                        <th className="px-4 py-2 text-right">Cantidad de pedidos</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dailyData.daily_breakdown.map(d => (
                        <tr key={d.date} className="border-t hover:bg-blue-50 transition-all">
                          <td className="px-4 py-2">{d.date}</td>
                          <td className="px-4 py-2 text-right">{d.count}</td>
                        </tr>
                      ))}
                      <tr className="border-t bg-blue-100">
                        <td className="px-4 py-2 font-semibold">Totales del rango</td>
                        <td className="px-4 py-2 text-right font-semibold">{dailyData.range_totals.count}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Tarjetas de métricas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 md:gap-4 w-full print-no-break print-full-width">
            <div className="bg-white rounded-xl p-3 md:p-6 shadow-lg border-2 border-blue-200 w-full">
              <div className="text-center">
                <img
                  src={clipboardImg}
                  alt="Total pedidos"
                  className="h-8 w-8 mx-auto mb-2 object-contain"
                />
                <p className="text-xs md:text-sm text-gray-600 font-semibold">Total Pedidos</p>
                <p className="text-2xl md:text-3xl font-bold text-blue-600">{totalsForView.pedidos}</p>
              </div>
            </div>
            <div className="bg-white rounded-xl p-3 md:p-6 shadow-lg border-2 border-green-200 w-full">
              <div className="text-center">
                <svg
                  viewBox="0 0 24 24"
                  className="h-6 w-6 md:h-8 md:w-8 text-green-600 mx-auto mb-2"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  {/* plato con comida */}
                  <circle cx="12" cy="12" r="8" />
                  <path d="M5.5 12h13" />
                  <path d="M8 9c1.5 1 3.5 1 5 0" />
                  <path d="M9 14c.8-.6 2.2-.6 3 0" />
                  <path d="M14.5 9.5c.7.4 1.2 1.1 1.2 1.9 0 .6-.2 1-.4 1.3" />
                  {/* Tenedor a la izquierda */}
                  <path d="M2.7 6v10" />
                  <path d="M3.7 6v10" />
                  <path d="M2 6.2h2.4" />
                  <path d="M2 8h2.4" />
                  {/* Cuchillo a la derecha */}
                  <path d="M19.8 6v10" />
                  <path d="M20.8 6v10" />
                  <path d="M19.8 6c0-.6 1-.6 1 0" />
                  <path d="M19.8 15.5c0 .8.8 1.5 1.5 1.5" />
                </svg>
                <p className="text-xs md:text-sm text-gray-600 font-semibold">Total Menús Principales</p>
                <p className="text-2xl md:text-3xl font-bold text-green-600">{totalsForView.menusPrincipales}</p>
              </div>
            </div>
            <div className="bg-white rounded-xl p-3 md:p-6 shadow-lg border-2 border-yellow-200 w-full">
              <div className="text-center">
                <img
                  src={choiceImg}
                  alt="Total opciones"
                  className="h-8 w-8 mx-auto mb-2 object-contain"
                />
                <p className="text-xs md:text-sm text-gray-600 font-semibold">Total Opciones</p>
                <p className="text-2xl md:text-3xl font-bold text-yellow-600">{totalsForView.opciones}</p>
              </div>
            </div>
            <div className="bg-white rounded-xl p-3 md:p-6 shadow-lg border-2 border-purple-200 w-full">
              <div className="text-center">
                <svg
                  viewBox="0 0 24 24"
                  className="h-6 w-6 md:h-8 md:w-8 text-purple-600 mx-auto mb-2"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M6 9l1.2 10.2c.1 1 1 1.8 2 1.8h5.6c1 0 1.9-.8 2-1.8L18 9" />
                  <path d="M5 9h14" />
                  <path d="M8 9L9 4.5" />
                  <path d="M11 9l-.3-5" />
                  <path d="M13 9l.3-5" />
                  <path d="M16 9L15 4.5" />
                  <path d="M9 14h6" />
                </svg>
                <p className="text-xs md:text-sm text-gray-600 font-semibold">Total Guarniciones</p>
                <p className="text-2xl md:text-3xl font-bold text-purple-600">{totalsForView.guarniciones}</p>
              </div>
            </div>
            <div className="bg-white rounded-xl p-3 md:p-6 shadow-lg border-2 border-sky-200 w-full">
              <div className="text-center">
                <svg
                  viewBox="0 0 24 24"
                  className="h-6 w-6 md:h-8 md:w-8 text-sky-600 mx-auto mb-2"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M7 3h7a3 3 0 0 1 3 3v8a5 5 0 0 1-5 5H7z" />
                  <path d="M7 3v16" />
                  <path d="M7 10h10" />
                </svg>
                <p className="text-xs md:text-sm text-gray-600 font-semibold">Total Bebidas</p>
                <p className="text-2xl md:text-3xl font-bold text-sky-600">{totalsForView.bebidas}</p>
              </div>
            </div>
            <div className="bg-white rounded-xl p-3 md:p-6 shadow-lg border-2 border-pink-200 w-full">
              <div className="text-center">
                <svg
                  viewBox="0 0 24 24"
                  className="h-6 w-6 md:h-8 md:w-8 text-pink-600 mx-auto mb-2"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M4 14h16" />
                  <path d="M6 14c0-3.3 2.7-6 6-6s6 2.7 6 6" />
                  <path d="M8 18h8" />
                </svg>
                <p className="text-xs md:text-sm text-gray-600 font-semibold">Total Postres</p>
                <p className="text-2xl md:text-3xl font-bold text-pink-600">{totalsForView.postres}</p>
              </div>
            </div>
          </div>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3">
            <div className="font-semibold text-center md:text-left">
              Mostrando los pedidos del <span className="font-bold">{dateRange.start || '...'}</span> al <span className="font-bold">{dateRange.end || '...'}</span>
            </div>
            <div className="flex items-center gap-2 justify-center md:justify-end">
              <label className="text-sm font-semibold text-gray-700">Empresa:</label>
              <select
                value={empresaFilter}
                onChange={(e) => setEmpresaFilter(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm font-semibold text-gray-800 bg-white shadow-sm"
              >
                <option value="ALL">Todas las empresas</option>
                {empresasForDropdown.map(e => (
                  <option key={e.empresa} value={e.empresa}>{e.empresa}</option>
                ))}
              </select>
            </div>
          </div>
          {empresasForView.length === 0 ? (
            <div className="text-gray-600 text-center">No hay datos para el rango seleccionado.</div>
          ) : (
            <div className="overflow-x-auto print-unclamp print-full-width">
              <div className="mb-2 font-bold text-blue-900">Resumen por empresa (rango seleccionado)</div>
              <table className="min-w-full bg-white rounded-xl shadow-lg text-black border-2 border-blue-200">
                <thead className="bg-blue-50">
                  <tr>
                    <th className="px-4 py-2">Empresa</th>
                    <th className="px-4 py-2">Pedidos</th>
                    <th className="px-4 py-2">Menús principales</th>
                    <th className="px-4 py-2">Opciones</th>
                    <th className="px-4 py-2">Guarniciones</th>
                    <th className="px-4 py-2">Bebidas</th>
                    <th className="px-4 py-2">Postres</th>
                    <th className="px-4 py-2">Total menús principales</th>
                    <th className="px-4 py-2">Total opciones</th>
                    <th className="px-4 py-2">Total menús (total)</th>
                    <th className="px-4 py-2">Total guarniciones</th>
                    <th className="px-4 py-2">Total bebidas</th>
                    <th className="px-4 py-2">Total postres</th>
                  </tr>
                </thead>
                <tbody>
                  {empresasForView.map(e => (
                    <tr key={e.empresa} className="border-t hover:bg-blue-50 transition-all">
                      <td className="px-4 py-2 font-bold">{e.empresa}</td>
                      <td className="px-4 py-2">{e.cantidadPedidos}</td>
                      <td className="px-4 py-2">{Object.entries(e.tiposMenus).filter(([nombre]) => nombre && !/^OPC(ION|IÓN)\s*\d+/i.test(nombre) && nombre.trim() !== '').map(([k, v]) => (<span key={k} className="inline-block bg-blue-100 text-blue-800 rounded px-2 py-1 m-1 text-xs font-semibold">{k}: {v}</span>))}</td>
                      <td className="px-4 py-2">{Object.entries(e.tiposMenus).filter(([nombre]) => /^OPC(ION|IÓN)\s*\d+/i.test(nombre)).map(([k, v]) => (<span key={k} className="inline-block bg-yellow-100 text-yellow-800 rounded px-2 py-1 m-1 text-xs font-semibold">{k}: {v}</span>))}</td>
                      <td className="px-4 py-2">{Object.entries(e.tiposGuarniciones).map(([k, v]) => (<span key={k} className="inline-block bg-purple-100 text-purple-800 rounded px-2 py-1 m-1 text-xs font-semibold">{k}: {v}</span>))}</td>
                      <td className="px-4 py-2">{Object.entries(e.tiposBebidas || {}).map(([k, v]) => (<span key={k} className="inline-block bg-sky-100 text-sky-800 rounded px-2 py-1 m-1 text-xs font-semibold">{k}: {v}</span>))}</td>
                      <td className="px-4 py-2">{Object.entries(e.tiposPostres || {}).map(([k, v]) => (<span key={k} className="inline-block bg-pink-100 text-pink-800 rounded px-2 py-1 m-1 text-xs font-semibold">{k}: {v}</span>))}</td>
                      <td className="px-4 py-2 text-center">{e.totalMenusPrincipales ?? (e.totalMenus - e.totalOpciones)}</td>
                      <td className="px-4 py-2 text-center">{e.totalOpciones}</td>
                      <td className="px-4 py-2 text-center">{e.totalMenusTotal ?? e.totalMenus}</td>
                      <td className="px-4 py-2 text-center">{e.totalGuarniciones}</td>
                      <td className="px-4 py-2 text-center">{e.totalBebidas || 0}</td>
                      <td className="px-4 py-2 text-center">{e.totalPostres || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
    </RequireUser>
  )
}

export default MonthlyPanel

// Panel de detalle diario
const DailyDetailPanel = ({ date, orders = [], dailyBreakdown, onClose }) => {
  if (!date) return null

  const fmtTime = (ts) => {
    try {
      return new Date(ts).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
    } catch (err) {
      void err
      return '—'
    }
  }

  const isOption = (name = '') => /^OPC(ION|IÓN)\s*\d+/i.test(name.trim())

  let totals = { pedidos: orders.length, menus: 0, opciones: 0 }
  const sideBuckets = createSideBuckets()
  const byEmpresa = {}
  const byMenu = {}
  const byOpcion = {}

  orders.forEach(order => {
    const empresa = order.location || 'Sin ubicación'
    if (!byEmpresa[empresa]) byEmpresa[empresa] = 0
    byEmpresa[empresa] += 1

    let items = []
    if (Array.isArray(order.items)) items = order.items
    else if (typeof order.items === 'string') {
      try {
        items = JSON.parse(order.items)
      } catch (err) {
        void err
      }
    }
    items.forEach(it => {
      const qty = it?.quantity || 1
      const name = (it?.name || '').trim()
      if (!name) return
      if (isOption(name)) {
        totals.opciones += qty
        byOpcion[name] = (byOpcion[name] || 0) + qty
      } else {
        totals.menus += qty
        byMenu[name] = (byMenu[name] || 0) + qty
      }
    })

    let custom = []
    if (Array.isArray(order.custom_responses)) custom = order.custom_responses
    else if (typeof order.custom_responses === 'string') {
      try {
        custom = JSON.parse(order.custom_responses)
      } catch (err) {
        void err
      }
    }
    custom.forEach(cr => {
      const val = toDisplayString(cr?.response)
      if (val) addSideItem(val, sideBuckets)
      if (Array.isArray(cr?.options)) {
        cr.options.forEach(opt => {
          const o = toDisplayString(opt)
          if (!o) return
          addSideItem(o, sideBuckets)
        })
      }
    })
  })

  const summary = {
    date,
    count: dailyBreakdown?.count ?? totals.pedidos,
    menus_principales: dailyBreakdown?.menus_principales ?? totals.menus,
    total_opciones: dailyBreakdown?.total_opciones ?? totals.opciones,
    total_guarniciones: sideBuckets.totalGuarniciones,
    total_bebidas: sideBuckets.totalBebidas,
    total_postres: sideBuckets.totalPostres
  }

  return (
    <div className="mb-4 border-2 border-blue-200 rounded-xl p-4 bg-blue-50/60 shadow-inner">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h4 className="text-lg font-bold text-blue-900">Detalle del {date}</h4>
          <p className="text-sm text-blue-800">Pedidos: {summary.count ?? totals.pedidos}</p>
        </div>
        <button
          onClick={onClose}
          className="px-3 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow"
        >
          Cerrar detalle
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
        <Stat label="Total pedidos" value={summary.count ?? totals.pedidos} />
        <Stat label="Total menús" value={summary.menus_principales ?? totals.menus} />
        <Stat label="Total opciones" value={summary.total_opciones ?? totals.opciones} />
        <Stat label="Total guarniciones" value={summary.total_guarniciones} />
        <Stat label="Total bebidas" value={summary.total_bebidas} />
        <Stat label="Total postres" value={summary.total_postres} />
      </div>

      <Section title="Desglose por empresa">
        <ChipList data={byEmpresa} />
      </Section>

      <Section title="Menús principales">
        <ChipList data={byMenu} />
      </Section>

      <Section title="Opciones">
        <ChipList data={byOpcion} />
      </Section>

      <Section title="Guarniciones">
        <ChipList data={sideBuckets.tiposGuarniciones} />
      </Section>

      <Section title="Bebidas">
        <ChipList data={sideBuckets.tiposBebidas} />
      </Section>

      <Section title="Postres">
        <ChipList data={sideBuckets.tiposPostres} />
      </Section>

      <Section title="Pedidos del día">
        {orders.length === 0 ? (
          <p className="text-sm text-gray-600">No hay pedidos en este día.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm bg-white border rounded-xl shadow">
              <thead className="bg-blue-100 text-blue-900">
                <tr>
                  <th className="px-3 py-2 text-left">Hora</th>
                  <th className="px-3 py-2 text-left">Empresa</th>
                  <th className="px-3 py-2 text-left">Turno</th>
                  <th className="px-3 py-2 text-left">Items</th>
                  <th className="px-3 py-2 text-left">Estado</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o, i) => (
                  <tr key={`${o.id}-${i}`} className="border-t hover:bg-blue-50">
                    <td className="px-3 py-2">{fmtTime(o.created_at)}</td>
                    <td className="px-3 py-2">{o.location || '—'}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold border ${
                        (o.service || 'lunch') === 'dinner'
                          ? 'bg-amber-100 text-amber-800 border-amber-200'
                          : 'bg-sky-100 text-sky-800 border-sky-200'
                      }`}>
                        {(o.service || 'lunch') === 'dinner' ? 'Cena' : 'Almuerzo'}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      {renderItems(o, isOption)}
                    </td>
                    <td className="px-3 py-2 capitalize">{o.status || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </div>
  )
}

const Stat = ({ label, value }) => (
  <div className="bg-white rounded-lg border border-blue-200 p-3 text-center shadow-sm">
    <p className="text-xs font-semibold text-gray-600">{label}</p>
    <p className="text-xl font-bold text-blue-800">{value ?? 0}</p>
  </div>
)

const Section = ({ title, children }) => (
  <div className="mb-4">
    <h5 className="text-sm font-bold text-blue-900 mb-2">{title}</h5>
    {children}
  </div>
)

const ChipList = ({ data }) => {
  const entries = Object.entries(data || {})
  if (!entries.length) return <p className="text-sm text-gray-600">Sin datos.</p>
  return (
    <div className="flex flex-wrap gap-2">
      {entries.map(([k, v]) => (
        <span key={k} className="px-3 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 border border-blue-200">
          {k}: {v}
        </span>
      ))}
    </div>
  )
}

const renderItems = (order, isOptionFn) => {
  let items = []
  if (Array.isArray(order.items)) items = order.items
  else if (typeof order.items === 'string') {
    try {
      items = JSON.parse(order.items)
    } catch (err) {
      void err
    }
  }
  if (!items.length) return '—'
  return items.map((it, idx) => {
    const name = it?.name || 'Item'
    const qty = it?.quantity || 1
    const tag = isOptionFn(name) ? 'Opción' : 'Menú'
    return (
      <span key={idx} className="inline-block mr-2 mb-1 px-2 py-1 rounded bg-gray-100 text-gray-800 text-xs font-semibold">
        {tag}: {name} (x{qty})
      </span>
    )
  })
}
