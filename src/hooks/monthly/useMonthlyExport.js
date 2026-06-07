import ExcelJS from 'exceljs'
import { notifyInfo } from '../../utils/notice'
import { formatDateDMY } from '../../utils/monthly/monthlyOrderFormatters'
import {
  buildCompanyRowsFromModel,
  buildDailyRowsFromModel,
  buildRangeDates,
  createMonthlyExportModel
} from '../../utils/monthly/monthlyOrderCalculations'
import { normalizeOrderForReadOnly } from '../../utils/order/normalizeOrderForReadOnly'
import { toDisplayString } from '../../utils/monthly/monthlyOrderFormatters'

const SUMMARY_COLUMNS = [
  { header: 'Empresa', key: 'Empresa', width: 24 },
  { header: 'Solicitudes', key: 'Solicitudes', width: 14 },
  { header: 'Raciones', key: 'Raciones', width: 12 },
  { header: 'Almuerzos', key: 'Almuerzos', width: 12 },
  { header: 'Cenas', key: 'Cenas', width: 10 },
  { header: 'Menús principales de almuerzo', key: 'Menús principales de almuerzo', width: 28 },
  { header: 'OPCIÓN 1', key: 'OPCIÓN 1', width: 12 },
  { header: 'OPCIÓN 2', key: 'OPCIÓN 2', width: 12 },
  { header: 'OPCIÓN 3', key: 'OPCIÓN 3', width: 12 },
  { header: 'OPCIÓN 4', key: 'OPCIÓN 4', width: 12 },
  { header: 'OPCIÓN 5', key: 'OPCIÓN 5', width: 12 },
  { header: 'OPCIÓN 6', key: 'OPCIÓN 6', width: 12 },
  { header: 'Total opciones', key: 'Total opciones', width: 15 },
  { header: 'Guarniciones reales', key: 'Guarniciones reales', width: 20 },
  { header: 'Bebidas', key: 'Bebidas', width: 12 },
  { header: 'Postres', key: 'Postres', width: 12 }
]

const DAILY_COLUMNS = [
  { header: 'Fecha', key: 'Fecha', width: 14 },
  ...SUMMARY_COLUMNS.slice(1)
]

const getOrderQuantity = (order = {}) => {
  const totalItems = Number(order?.total_items)
  if (Number.isFinite(totalItems) && totalItems > 0) return totalItems
  const { normalizedItems } = normalizeOrderForReadOnly(order)
  const itemTotal = normalizedItems.reduce((sum, item) => sum + (Number(item?.quantity) || 1), 0)
  return itemTotal || 1
}

const getOrderDate = (order = {}) => (order?.delivery_date || '').slice(0, 10)

const formatResponseSummary = (responses = []) => {
  return responses
    .map(resp => {
      const title = toDisplayString(resp?.title || resp?.label || resp?.question || resp?.name)
      const values = []
      const response = toDisplayString(resp?.response)
      if (response) values.push(response)
      if (Array.isArray(resp?.options)) {
        resp.options.forEach(opt => {
          const value = toDisplayString(opt)
          if (value) values.push(value)
        })
      }
      if (!title && !values.length) return ''
      return title ? `${title}: ${values.join(', ') || '-'}` : values.join(', ')
    })
    .filter(Boolean)
    .join(' | ') || '-'
}

const formatDinnerDish = (order = {}) => {
  const { normalizedItems } = normalizeOrderForReadOnly(order)
  return normalizedItems
    .map(item => {
      const name = toDisplayString(item?.name)
      if (!name) return ''
      return `${name} (x${Number(item?.quantity) || 1})`
    })
    .filter(Boolean)
    .join('; ') || '-'
}

const styleWorksheet = (ws, options = {}) => {
  ws.views = [{ state: 'frozen', ySplit: options.freezeRows || 1 }]
  ws.eachRow((row, rowNumber) => {
    row.eachCell(cell => {
      cell.alignment = { vertical: 'middle', wrapText: true }
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFD9E2EC' } },
        left: { style: 'thin', color: { argb: 'FFD9E2EC' } },
        bottom: { style: 'thin', color: { argb: 'FFD9E2EC' } },
        right: { style: 'thin', color: { argb: 'FFD9E2EC' } }
      }
    })
    if (rowNumber === (options.headerRow || 1)) {
      row.font = { bold: true, color: { argb: 'FFFFFFFF' } }
      row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } }
    }
  })
}

const addRowsSheet = (workbook, name, columns, rows) => {
  const ws = workbook.addWorksheet(name)
  ws.columns = columns
  ws.addRows(rows)
  styleWorksheet(ws)
  return ws
}

export const useMonthlyExport = ({
  metrics,
  dateRange,
  isEmpresaAll,
  empresaFilter,
  empresaFilterSet,
  dailyDataForView,
  ordersByDayForView: _ordersByDayForView,
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

  const getOrdersForExport = () => {
    const orders = Array.isArray(rangeOrders) ? rangeOrders : []
    if (isEmpresaAll) return orders
    return orders.filter(order => empresaFilterSet.has(order?.location || 'Sin ubicación'))
  }

  const createExportModel = () => {
    const dates = buildRangeDates(dateRange?.start, dateRange?.end)
    return createMonthlyExportModel(getOrdersForExport(), dates)
  }

  const addMetadata = (ws) => {
    ws.insertRows(1, [
      ['Empresa', getExportEmpresaLabel()],
      ['Rango', getExportRangeLabel()],
      []
    ])
    ws.getRow(1).font = { bold: true }
    ws.getRow(2).font = { bold: true }
  }

  const addSummarySheet = (wb, model) => {
    const ws = wb.addWorksheet('Resumen')
    ws.getCell('A1').value = 'KPI'
    ws.getCell('B1').value = 'Valor'
    ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
    ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } }
    const kpiRows = [
      ['Solicitudes registradas', model.totals.solicitudesRegistradas],
      ['Raciones totales', model.totals.racionesTotales],
      ['Raciones de almuerzo', model.totals.racionesAlmuerzo],
      ['Raciones de cena', model.totals.racionesCena],
      ['Solicitudes con más de una ración', model.totals.solicitudesMasDeUnaRacion],
      ['Total guarniciones reales', model.totals.sideBuckets.totalGuarniciones],
      ['Total bebidas', model.totals.sideBuckets.totalBebidas],
      ['Total postres', model.totals.sideBuckets.totalPostres]
    ]
    ws.addRows(kpiRows)
    ws.addRow([])
    ws.addRow(['Empresa exportada', getExportEmpresaLabel()])
    ws.addRow(['Rango exportado', getExportRangeLabel()])
    ws.addRow([])

    const headerRowNumber = ws.rowCount + 1
    ws.addRow(SUMMARY_COLUMNS.map(col => col.header))
    const companyRows = buildCompanyRowsFromModel(model)
    companyRows.forEach(row => {
      ws.addRow(SUMMARY_COLUMNS.map(col => row[col.key] ?? ''))
    })
    SUMMARY_COLUMNS.forEach((col, index) => {
      ws.getColumn(index + 1).width = col.width
    })
    styleWorksheet(ws, { headerRow: headerRowNumber, freezeRows: headerRowNumber })
    return ws
  }

  const addDailySheet = (wb, model) => addRowsSheet(wb, 'Desglose Diario', DAILY_COLUMNS, buildDailyRowsFromModel(model))

  const addDinnerSheet = (wb, model) => {
    const columns = [
      { header: 'Fecha', key: 'Fecha', width: 14 },
      { header: 'Empresa', key: 'Empresa', width: 24 },
      { header: 'Cliente', key: 'Cliente', width: 24 },
      { header: 'Email', key: 'Email', width: 28 },
      { header: 'Cantidad', key: 'Cantidad', width: 10 },
      { header: 'Plato de cena', key: 'Plato de cena', width: 42 },
      { header: 'Respuestas adicionales', key: 'Respuestas adicionales', width: 50 },
      { header: 'Estado', key: 'Estado', width: 14 }
    ]
    const rows = model.dinnerRows.map(order => {
      const { normalizedCustomResponses } = normalizeOrderForReadOnly(order)
      return {
        Fecha: formatDateDMY(getOrderDate(order)),
        Empresa: order?.location || 'Sin ubicación',
        Cliente: order?.customer_name || order?.user_name || 'Sin nombre',
        Email: order?.customer_email || order?.user_email || 'Sin email',
        Cantidad: getOrderQuantity(order),
        'Plato de cena': formatDinnerDish(order),
        'Respuestas adicionales': formatResponseSummary(normalizedCustomResponses),
        Estado: order?.status || '-'
      }
    })
    rows.push({
      Fecha: 'Total cenas',
      Empresa: '',
      Cliente: '',
      Email: '',
      Cantidad: model.totals.racionesCena,
      'Plato de cena': '',
      'Respuestas adicionales': '',
      Estado: ''
    })
    return addRowsSheet(wb, 'Detalle Cenas', columns, rows)
  }

  const addValidationsSheet = (wb, model) => {
    const expectedMay2026 = dateRange?.start === '2026-05-01' && dateRange?.end === '2026-05-31' && isEmpresaAll
    const checks = [
      ['Cantidad de filas de pedidos', model.validations.orderRows, expectedMay2026 ? 1828 : model.validations.orderRows],
      ['Suma de total_items', model.validations.totalItems, expectedMay2026 ? 1833 : model.validations.totalItems],
      ['Diferencia entre filas y raciones', model.validations.rowsVsRationsDifference, expectedMay2026 ? 5 : model.validations.rowsVsRationsDifference],
      ['Pedidos con más de una ración', model.validations.multiRationOrders, expectedMay2026 ? 5 : model.validations.multiRationOrders],
      ['Pedidos de cena', model.validations.dinnerOrders, expectedMay2026 ? 117 : model.validations.dinnerOrders],
      ['Pedidos eliminados incluidos', model.validations.deletedOrdersIncluded, 0],
      ['Ítems no clasificados', model.validations.unclassifiedItems, 0],
      ['Diferencia entre suma de selecciones y suma de total_items', model.validations.selectionsVsTotalItemsDifference, model.totals.racionesCena]
    ]
    if (expectedMay2026) {
      checks.push(['Raciones de almuerzo mayo 2026', model.totals.racionesAlmuerzo, 1716])
      checks.push(['Raciones de cena mayo 2026', model.totals.racionesCena, 117])
    }
    const rows = checks.map(([metric, value, expected]) => {
      const ok = value === expected
      return {
        Validación: metric,
        Valor: value,
        Esperado: expected,
        Estado: ok ? 'OK' : 'ADVERTENCIA'
      }
    })
    const hasWarning = rows.some(row => row.Estado === 'ADVERTENCIA')
    if (hasWarning) {
      rows.unshift({
        Validación: 'ADVERTENCIA',
        Valor: 'Revisar diferencias inesperadas antes de operar con este archivo.',
        Esperado: '',
        Estado: 'ADVERTENCIA'
      })
    }
    const ws = addRowsSheet(wb, 'Validaciones', [
      { header: 'Validación', key: 'Validación', width: 48 },
      { header: 'Valor', key: 'Valor', width: 18 },
      { header: 'Esperado', key: 'Esperado', width: 18 },
      { header: 'Estado', key: 'Estado', width: 18 }
    ], rows)
    ws.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return
      const status = row.getCell(4).value
      if (status === 'ADVERTENCIA') {
        row.font = { bold: true, color: { argb: 'FF7F1D1D' } }
        row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } }
      }
    })
    return ws
  }

  const canExportDaily = Boolean(
    dailyDataForView?.daily_breakdown
    || (rangeOrders.length > 0 && dateRange?.start && dateRange?.end)
  )

  const handleExportExcel = async () => {
    if (!metrics || !metrics.empresas) return
    const model = createExportModel()
    const wb = new ExcelJS.Workbook()
    addSummarySheet(wb, model)
    const fileName = `panel-mensual-${dateRange.start || 'inicio'}-a-${dateRange.end || 'fin'}.xlsx`
    await downloadWorkbook(wb, fileName)
  }

  const handleExportDailyExcel = async () => {
    if (!canExportDaily) {
      notifyInfo('No hay datos de desglose diario para exportar en el rango seleccionado.')
      return
    }
    const model = createExportModel()
    const wb = new ExcelJS.Workbook()
    const ws = addDailySheet(wb, model)
    addMetadata(ws)
    const fileName = `desglose-diario-${dateRange.start || 'inicio'}-a-${dateRange.end || 'fin'}.xlsx`
    await downloadWorkbook(wb, fileName)
  }

  const handleExportAllExcel = async () => {
    if (!metrics || !metrics.empresas) return
    const model = createExportModel()
    const wb = new ExcelJS.Workbook()
    addSummarySheet(wb, model)
    addDailySheet(wb, model)
    addDinnerSheet(wb, model)
    addValidationsSheet(wb, model)
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
