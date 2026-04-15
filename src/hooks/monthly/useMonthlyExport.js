import ExcelJS from 'exceljs'
import { notifyInfo } from '../../utils/notice'
import { formatDateDMY } from '../../utils/monthly/monthlyOrderFormatters'
import {
  buildDailyBreakdownFromOrdersByDay,
  buildDailyRows,
  buildRangeDates,
  buildSummaryRows,
  indexOrdersByDay
} from '../../utils/monthly/monthlyOrderCalculations'

export const useMonthlyExport = ({
  metrics,
  dateRange,
  isEmpresaAll,
  empresaFilter,
  empresaFilterSet,
  dailyDataForView,
  ordersByDayForView,
  rangeOrders
}) => {
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

  const canExportDaily = Boolean(
    dailyDataForView?.daily_breakdown
    || (rangeOrders.length > 0 && dateRange?.start && dateRange?.end)
  )

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
      notifyInfo('No hay datos de desglose diario para exportar en el rango seleccionado.')
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

  return {
    canExportDaily,
    handleExportExcel,
    handleExportDailyExcel,
    handleExportAllExcel
  }
}

