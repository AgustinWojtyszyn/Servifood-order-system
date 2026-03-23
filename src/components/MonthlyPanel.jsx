import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import ExcelJS from 'exceljs'
import { supabase, db } from '../supabaseClient'
import RequireUser from './RequireUser'
import MonthlyExportActions from './monthly/MonthlyExportActions'
import MonthlyFilters from './monthly/MonthlyFilters'
import MonthlyHeader from './monthly/MonthlyHeader'
import MonthlySummary from './monthly/MonthlySummary'
import excelLogo from '../assets/logoexcel.png'
import { COUNTABLE_STATUSES } from '../utils/monthly/monthlyOrderConstants'
import { formatDateDMY, toDisplayString } from '../utils/monthly/monthlyOrderFormatters'
import {
  addSideItem,
  buildDailyBreakdownFromOrdersByDay,
  buildDailyRows,
  buildRangeDates,
  buildSummaryRows,
  createSideBuckets,
  indexOrdersByDay
} from '../utils/monthly/monthlyOrderCalculations'

const MonthlyPanel = ({ user, loading }) => {
  const [draftRange, setDraftRange] = useState({ start: '', end: '' })
  const [dateRange, setDateRange] = useState({ start: '', end: '' })
  const [metricsLoading, setMetricsLoading] = useState(false)
  const [metrics, setMetrics] = useState(null)
  const [, setError] = useState(null)
  const ALL_EMPRESAS = '__ALL__'
  const [draftEmpresas, setDraftEmpresas] = useState([ALL_EMPRESAS])
  const [empresaFilter, setEmpresaFilter] = useState([ALL_EMPRESAS])
  const [dailyData, setDailyData] = useState(null)
  const [ordersByDay, setOrdersByDay] = useState({})
  const [rangeOrders, setRangeOrders] = useState([])
  const [selectedDate, setSelectedDate] = useState(null)
  const [showInstructions, setShowInstructions] = useState(false)
  const [, setDebugLogs] = useState([])
  const [debugEnabled, setDebugEnabled] = useState(true)
  const fetchId = useRef(0)
  const manualFetchRef = useRef(false)
  const navigate = useNavigate()

  const pushLog = (label, data = {}) => {
    const entry = { ts: new Date().toISOString(), label, data }
    setDebugLogs(prev => [entry, ...prev].slice(0, 80))
    if (typeof window !== 'undefined') {
      window.__monthlyPanelLogs = window.__monthlyPanelLogs || []
      window.__monthlyPanelLogs.unshift(entry)
      if (window.__monthlyPanelLogs.length > 200) window.__monthlyPanelLogs.pop()
    }
  }

  const isDraftValid = draftRange.start && draftRange.end && draftRange.start <= draftRange.end
  const handlePrintPdf = () => window.print()
  const PAGE_SIZE = 1000

  const fetchAllOrders = async (buildQuery, label) => {
    let from = 0
    let all = []
    while (true) {
      const { data, error } = await buildQuery(from, from + PAGE_SIZE - 1)
      if (error) throw error
      const batch = data || []
      all = all.concat(batch)
      pushLog('orders-page', { label, from, size: batch.length, total: all.length })
      if (batch.length < PAGE_SIZE) break
      from += PAGE_SIZE
    }
    return all
  }

  const isEmpresaAll = empresaFilter.includes(ALL_EMPRESAS)
  const empresaFilterSet = useMemo(() => new Set(empresaFilter), [empresaFilter])

  const ordersByDayForView = useMemo(() => {
    if (isEmpresaAll) return ordersByDay || {}
    const filtered = {}
    Object.entries(ordersByDay || {}).forEach(([date, dayOrders]) => {
      const match = (dayOrders || []).filter(order => empresaFilterSet.has(order.location || 'Sin ubicación'))
      if (match.length) filtered[date] = match
    })
    return filtered
  }, [ordersByDay, isEmpresaAll, empresaFilterSet])

  const dailyDataForView = useMemo(() => {
    if (!dailyData?.daily_breakdown) return dailyData
    if (isEmpresaAll) return dailyData
    const dates = dailyData.daily_breakdown.map(d => d.date)
    const recalculated = buildDailyBreakdownFromOrdersByDay(dates, ordersByDayForView)
    return { ...dailyData, ...recalculated }
  }, [dailyData, ordersByDayForView, isEmpresaAll])

  useEffect(() => {
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

  useEffect(() => {
    if (!debugEnabled) return
    const id = setInterval(() => {
      if (typeof window === 'undefined') return
      const external = window.__monthlyPanelLogs || []
      if (external.length === 0) return
      setDebugLogs(prev => {
        const merged = [...external, ...prev]
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
    if (manualFetchRef.current) return
    if (dateRange.start && dateRange.end && dateRange.start <= dateRange.end) {
      fetchMetrics(dateRange)
    }
  }, [dateRange])

  async function fetchMetrics(range) {
    const currentRange = range || dateRange
    if (!currentRange?.start || !currentRange?.end || currentRange.start > currentRange.end) return

    const reqId = ++fetchId.current
    pushLog('fetchMetrics-init', { currentRange, reqId })
    setMetricsLoading(true)
    setSelectedDate(null)
    setError(null)
    try {
      pushLog('fetch-start', currentRange)
      const columns = 'id,status,delivery_date,created_at,total_items,items,custom_responses,location'
      pushLog('query-params', { start: currentRange.start, end: currentRange.end })

      const deliveryOrders = await fetchAllOrders(
        (from, to) => supabase
          .from('orders')
          .select(columns)
          .gte('delivery_date', currentRange.start)
          .lte('delivery_date', currentRange.end)
          .order('id', { ascending: true })
          .range(from, to),
        'delivery'
      )

      let orders = Array.isArray(deliveryOrders) ? deliveryOrders : []
      pushLog('orders-raw', { total: orders.length })

      orders = Array.isArray(orders) ? orders.filter(o => COUNTABLE_STATUSES.includes(o.status)) : []
      const statusCount = orders.reduce((acc, o) => {
        const s = o.status || 'unknown'
        acc[s] = (acc[s] || 0) + 1
        return acc
      }, {})
      pushLog('orders-filtered', {
        delivery: deliveryOrders?.length || 0,
        afterFilter: orders.length,
        statusCount,
        sample: orders.slice(0, 3)
      })

      const grouped = {}
      for (const order of orders) {
        const empresa = order.location || 'Sin ubicación'
        if (!grouped[empresa]) grouped[empresa] = []
        grouped[empresa].push(order)
      }

      const empresas = Object.keys(grouped).map(empresa => {
        const pedidos = grouped[empresa]
        let totalMenus = 0
        let tiposMenus = {}
        let totalOpciones = 0
        let tiposOpciones = {}
        const sideBuckets = createSideBuckets()

        pedidos.forEach(p => {
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
            const nombre = (item.name || '').trim()
            tiposMenus[nombre] = (tiposMenus[nombre] || 0) + (item.quantity || 1)
            if (/^OPC(ION|IÓN)\s*\d+/i.test(nombre)) {
              totalOpciones += item.quantity || 1
              tiposOpciones[nombre] = (tiposOpciones[nombre] || 0) + (item.quantity || 1)
            }
          })

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
            const baseResp = toDisplayString(resp.response)
            if (baseResp) addSideItem(baseResp, sideBuckets)
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

      const newMetrics = {
        totalPedidos: 0,
        empresas
      }
      pushLog('metrics-grouped', { empresas: newMetrics.empresas.length })
      setMetrics(newMetrics)

      const byDay = indexOrdersByDay(orders)
      const rangeDates = buildRangeDates(currentRange.start, currentRange.end)
      let finalBreakdown = buildDailyBreakdownFromOrdersByDay(rangeDates, byDay)
      let breakdownCount = finalBreakdown?.range_totals?.count ?? 0

      try {
        const { data: breakdown, error: breakdownError } = await db.getDailyBreakdown({ start: currentRange.start, end: currentRange.end })
        if (breakdownError) throw breakdownError
        pushLog('breakdown', {
          days: breakdown?.daily_breakdown?.length || 0,
          total: breakdown?.range_totals?.count || 0,
          sample: breakdown?.daily_breakdown?.slice?.(0, 3) || []
        })
        breakdownCount = breakdown?.range_totals?.count ?? 0
        if (orders.length > 0 && breakdownCount !== orders.length) {
          finalBreakdown = buildDailyBreakdownFromOrdersByDay(rangeDates, byDay)
          pushLog('breakdown-fallback', {
            days: finalBreakdown.daily_breakdown.length,
            total: finalBreakdown.range_totals.count,
            breakdownCount,
            ordersCount: orders.length
          })
        } else {
          finalBreakdown = breakdown
        }
      } catch (err) {
        pushLog('breakdown-error', { message: err?.message || 'unknown' })
      }
      if (reqId === fetchId.current) {
        setDailyData(finalBreakdown)
        pushLog('orders-indexed', { days: Object.keys(byDay).length, sampleDay: Object.keys(byDay)[0] })
        setOrdersByDay(byDay)
        setRangeOrders(orders)
      }

      if (reqId === fetchId.current && finalBreakdown?.range_totals) {
        setMetrics(prev => prev ? { ...prev, totalPedidos: finalBreakdown.range_totals.count } : prev)
        pushLog('totals-updated', { totalPedidos: finalBreakdown.range_totals.count })
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

  const canExportDaily = Boolean(
    dailyDataForView?.daily_breakdown
    || (rangeOrders.length > 0 && dateRange?.start && dateRange?.end)
  )

  const getExportEmpresaLabel = () => {
    if (isEmpresaAll) return 'Todas las empresas'
    if (!empresaFilter.length) return 'Todas las empresas'
    if (empresaFilter.length === 1) return empresaFilter[0]
    return empresaFilter.join(', ')
  }

  const getExportRangeLabel = () => {
    const start = dateRange?.start
    const end = dateRange?.end
    const startLabel = formatDateDMY(start)
    const endLabel = formatDateDMY(end)
    if (start && end) return `${startLabel} a ${endLabel}`
    if (start) return `Desde ${startLabel}`
    if (end) return `Hasta ${endLabel}`
    return 'Sin rango'
  }

  const addExportMetadataToRows = (rows, firstKey, secondKey) => {
    const metaRows = [
      { [firstKey]: 'Empresa', [secondKey]: getExportEmpresaLabel() },
      { [firstKey]: 'Rango', [secondKey]: getExportRangeLabel() },
      {}
    ]
    return metaRows.concat(rows || [])
  }

  const resolveDailyBreakdownForExport = () => {
    if (dailyDataForView?.daily_breakdown) return dailyDataForView
    const dates = buildRangeDates(dateRange?.start, dateRange?.end)
    if (!dates.length) return null
    const hasByDay = ordersByDayForView && Object.keys(ordersByDayForView).length > 0
    const byDay = hasByDay ? ordersByDayForView : indexOrdersByDay(rangeOrders)
    if (!byDay || Object.keys(byDay).length === 0) return null
    return buildDailyBreakdownFromOrdersByDay(dates, byDay)
  }

  const handleExportExcel = async () => {
    if (!metrics || !metrics.empresas) return
    const empresasForExport = isEmpresaAll
      ? metrics.empresas
      : metrics.empresas.filter(e => empresaFilterSet.has(e.empresa))
    const dataRows = buildSummaryRows(metrics, empresasForExport)
    const rows = addExportMetadataToRows(dataRows, 'Empresa', 'Pedidos')
    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet('Resumen')
    if (rows.length > 0) {
      const columns = dataRows.length > 0 ? Object.keys(dataRows[0]) : ['Empresa', 'Pedidos']
      ws.columns = columns.map(k => ({ header: k, key: k, width: 20 }))
      ws.addRows(rows)
    }
    const fileName = `panel-mensual-${dateRange.start || 'inicio'}-a-${dateRange.end || 'fin'}.xlsx`
    await downloadWorkbook(wb, fileName)
  }

  const handleExportDailyExcel = async () => {
    const dailyForExport = resolveDailyBreakdownForExport()
    if (!dailyForExport?.daily_breakdown) {
      alert('No hay datos de desglose diario para exportar en el rango seleccionado.')
      return
    }
    const dataRows = buildDailyRows(dailyForExport, ordersByDayForView)
    const rows = addExportMetadataToRows(dataRows, 'Fecha', 'Pedidos')
    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet('Desglose Diario')
    if (rows.length > 0) {
      const columns = dataRows.length > 0 ? Object.keys(dataRows[0]) : ['Fecha', 'Pedidos']
      ws.columns = columns.map(k => ({ header: k, key: k, width: 20 }))
      ws.addRows(rows)
    }
    const fileName = `desglose-diario-${dateRange.start || 'inicio'}-a-${dateRange.end || 'fin'}.xlsx`
    await downloadWorkbook(wb, fileName)
  }

  const handleExportAllExcel = async () => {
    if (!metrics || !metrics.empresas) return
    const wb = new ExcelJS.Workbook()
    const empresasForExport = isEmpresaAll
      ? metrics.empresas
      : metrics.empresas.filter(e => empresaFilterSet.has(e.empresa))
    const summaryDataRows = buildSummaryRows(metrics, empresasForExport)
    const summaryRows = addExportMetadataToRows(summaryDataRows, 'Empresa', 'Pedidos')
    const wsSummary = wb.addWorksheet('Resumen')
    if (summaryRows.length > 0) {
      const columns = summaryDataRows.length > 0 ? Object.keys(summaryDataRows[0]) : ['Empresa', 'Pedidos']
      wsSummary.columns = columns.map(k => ({ header: k, key: k, width: 20 }))
      wsSummary.addRows(summaryRows)
    }
    const dailyForExport = resolveDailyBreakdownForExport()
    if (dailyForExport?.daily_breakdown) {
      const dailyDataRows = buildDailyRows(dailyForExport, ordersByDayForView)
      const dailyHeader = dailyDataRows.length > 0
        ? Object.keys(dailyDataRows[0])
        : ['Fecha', 'Pedidos']
      wsSummary.addRow([])
      wsSummary.addRow(['DESGLOSE DIARIO'])
      wsSummary.addRow(dailyHeader)
      dailyDataRows.forEach(row => {
        wsSummary.addRow(dailyHeader.map(key => row?.[key] ?? ''))
      })
    }
    const wsDaily = wb.addWorksheet('Desglose Diario')
    if (dailyForExport?.daily_breakdown) {
      const dailyDataRows = buildDailyRows(dailyForExport, ordersByDayForView)
      const dailyRows = addExportMetadataToRows(dailyDataRows, 'Fecha', 'Pedidos')
      if (dailyRows.length > 0) {
        const columns = dailyDataRows.length > 0 ? Object.keys(dailyDataRows[0]) : ['Fecha', 'Pedidos']
        wsDaily.columns = columns.map(k => ({ header: k, key: k, width: 20 }))
        wsDaily.addRows(dailyRows)
      }
    } else {
      wsDaily.columns = [{ header: 'Mensaje', key: 'Mensaje', width: 60 }]
      wsDaily.addRows([{ Mensaje: 'No hay datos de desglose diario para el rango seleccionado.' }])
    }
    const fileName = `panel-completo-${dateRange.start || 'inicio'}-a-${dateRange.end || 'fin'}.xlsx`
    await downloadWorkbook(wb, fileName)
  }

  const handleClearRange = () => {
    setDraftRange({ start: '', end: '' })
    setDateRange({ start: '', end: '' })
    setMetrics(null)
    setDailyData(null)
    setOrdersByDay({})
    setRangeOrders([])
    setSelectedDate(null)
    setError(null)
  }

  const normalizeEmpresas = (list) => {
    const unique = Array.from(new Set((list || []).filter(Boolean)))
    if (unique.length === 0) return [ALL_EMPRESAS]
    if (unique.includes(ALL_EMPRESAS)) return [ALL_EMPRESAS]
    return unique
  }

  const handleToggleDraftEmpresa = (empresa) => {
    setDraftEmpresas(prev => {
      const exists = prev.includes(empresa)
      let next = exists ? prev.filter(e => e !== empresa) : [...prev, empresa]
      if (empresa === ALL_EMPRESAS) {
        next = [ALL_EMPRESAS]
      } else {
        next = next.filter(e => e !== ALL_EMPRESAS)
      }
      return normalizeEmpresas(next)
    })
  }

  const handleApplyEmpresas = () => {
    setEmpresaFilter(normalizeEmpresas(draftEmpresas))
  }

  const handleClearEmpresas = () => {
    setDraftEmpresas([ALL_EMPRESAS])
    setEmpresaFilter([ALL_EMPRESAS])
  }

  const empresasAll = metrics?.empresas || []
  const empresasOptions = useMemo(() => {
    const names = empresasAll.map(e => e.empresa || 'Sin ubicación')
    const unique = Array.from(new Set(names))
    return unique.sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }))
  }, [empresasAll])
  const isEmpresasDirty = JSON.stringify(normalizeEmpresas(draftEmpresas)) !== JSON.stringify(normalizeEmpresas(empresaFilter))

  const handleApplyRange = async () => {
    if (!isDraftValid) return
    const newRange = { ...draftRange }
    manualFetchRef.current = true
    setMetricsLoading(true)
    setMetrics(null)
    setDailyData(null)
    setOrdersByDay({})
    setRangeOrders([])
    setSelectedDate(null)
    setError(null)
    setDateRange(newRange)
    pushLog('apply-range', { range: newRange })
    try {
      await fetchMetrics(newRange)
    } finally {
      manualFetchRef.current = false
    }
  }

  const empresasForView = isEmpresaAll
    ? empresasAll
    : empresasAll.filter(e => empresaFilterSet.has(e.empresa))
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
      <div className="monthly-page min-h-screen bg-[#f6f7f9] py-6">
        <div
          className="monthly-container w-full max-w-[1180px] mx-auto space-y-3 px-3 sm:px-4 md:px-6 pb-20 bg-white rounded-2xl shadow-sm border border-slate-200"
          style={{
            minHeight: '100vh',
            WebkitOverflowScrolling: 'touch'
          }}
        >
          <style>{`
        @media print {
          @page { size: A4 portrait; margin: 10mm; }
          html, body { width: 100%; margin: 0; padding: 0; background: #fff !important; }
          .monthly-page { background: #fff !important; padding: 0 !important; }
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
          <MonthlyHeader
            showInstructions={showInstructions}
            onToggleInstructions={() => setShowInstructions(prev => !prev)}
          />

          <MonthlyFilters
            draftRange={draftRange}
            onDraftRangeChange={setDraftRange}
            dateRange={dateRange}
            onClearRange={handleClearRange}
            onApplyRange={handleApplyRange}
            isDraftValid={isDraftValid}
            empresas={empresasOptions}
            allValue={ALL_EMPRESAS}
            draftEmpresas={draftEmpresas}
            onToggleDraftEmpresa={handleToggleDraftEmpresa}
            onApplyEmpresas={handleApplyEmpresas}
            onClearEmpresas={handleClearEmpresas}
            isEmpresasDirty={isEmpresasDirty}
          />

          <MonthlyExportActions
            metrics={metrics}
            canExportDaily={canExportDaily}
            dailyDataForView={dailyDataForView}
            onExportAllExcel={handleExportAllExcel}
            onExportExcel={handleExportExcel}
            onExportDailyExcel={handleExportDailyExcel}
            onPrintPdf={handlePrintPdf}
            excelLogo={excelLogo}
          />

          {metricsLoading && (
            <div className="mt-4 mx-auto max-w-2xl">
              <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                <div className="h-10 w-10 rounded-full border-4 border-slate-200 border-t-blue-600 animate-spin" aria-hidden="true"></div>
                <div>
                  <p className="text-base sm:text-lg font-extrabold text-slate-800">Cargando métricas del rango...</p>
                  <p className="text-sm text-slate-600">Esto debería tardar solo un momento.</p>
                </div>
              </div>
            </div>
          )}
          {!metrics && !metricsLoading && (
            <div className="flex items-center justify-center text-center rounded-xl border border-slate-200 bg-white shadow-sm min-h-[260px]">
              <div className="max-w-md px-4">
                <p className="text-base font-semibold text-slate-800">Selecciona un rango de fechas</p>
                <p className="text-sm text-slate-600 mt-1">
                  Aplica un rango para visualizar el resumen mensual y exportaciones.
                </p>
              </div>
            </div>
          )}
          {metrics && (
            <MonthlySummary
              totalsForView={totalsForView}
              dailyDataForView={dailyDataForView}
              ordersByDayForView={ordersByDayForView}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
            />
          )}
        </div>
      </div>
    </RequireUser>
  )
}

export default MonthlyPanel
