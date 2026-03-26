import ExcelJS from 'exceljs'
import {
  downloadWorkbook,
  filterOrdersByCompany,
  getCustomSideFromResponses,
  getDinnerOverrideSelection,
  getOtherCustomResponses
} from './dailyOrderCalculations'
import {
  formatDate,
  formatTime,
  getStatusText,
  getTomorrowDate,
  normalizeDishName
} from './dailyOrderFormatters'
import { notifyError, notifyInfo, notifySuccess } from '../notice'

export async function exportDailyOrdersExcel({
  sortedOrders,
  exportCompany,
  selectedLocation,
  selectedStatus,
  stats
}) {
  const ordersToExport = filterOrdersByCompany(sortedOrders, exportCompany)

  if (ordersToExport.length === 0) {
    notifyInfo('No hay pedidos para exportar')
    return
  }

  try {
    const excelData = ordersToExport.map(order => {
      const overrideChoice = getDinnerOverrideSelection(order)
      let menuItems = []
      if (overrideChoice && (order.location || '').toLowerCase().includes('genneia')) {
        menuItems.push(`Cena: ${overrideChoice}`)
      } else if (Array.isArray(order.items)) {
        const principal = order.items.filter(
          item => item && item.name && item.name.toLowerCase().includes('menú principal')
        )
        const others = order.items.filter(
          item => item && item.name && !item.name.toLowerCase().includes('menú principal')
        )

        if (principal.length > 0) {
          const totalPrincipal = principal.reduce((sum, item) => sum + (item.quantity || 1), 0)
          menuItems.push(`Plato Principal: ${totalPrincipal}`)
        }

        others.forEach(item => {
          menuItems.push(`${normalizeDishName(item.name)} (x${item.quantity || 1})`)
        })
      }

      const customSide = getCustomSideFromResponses(order.custom_responses || [])
      if (customSide) {
        menuItems.push(`🔸 Guarnición: ${customSide}`)
      }

      const items = menuItems.join('; ') || 'Sin items'

      const otherResponses = getOtherCustomResponses(order.custom_responses || [])
      const customResponses = otherResponses
        .map(r => {
          const response = Array.isArray(r.response) ? r.response.join(', ') : r.response
          return `${r.title}: ${response}`
        }).join(' | ') || 'Sin opciones'

      return {
        'Fecha Pedido': formatDate(order.created_at),
        'Hora Pedido': formatTime(order.created_at),
        'Usuario': order.user_name || 'Sin nombre',
        'Email': order.customer_email || order.user_email || 'Sin email',
        'Teléfono': order.customer_phone || 'Sin teléfono',
        'Ubicación': order.location || 'Sin ubicación',
        'Fecha Entrega': getTomorrowDate(),
        'Platillos': items,
        'Guarnición': customSide || 'Sin guarnición',
        'Cantidad Items': order.total_items || 0,
        'Estado': getStatusText(order.status),
        'Turno': (order.service || 'lunch') === 'dinner' ? 'Cena' : 'Almuerzo',
        'Comentarios': order.comments || 'Sin comentarios',
        'Opciones Adicionales': customResponses,
        'Cliente': order.customer_name || order.user_name || 'Sin nombre'
      }
    })

    const statsData = [
      { Concepto: 'Total de Pedidos', Valor: stats.total },
      { Concepto: 'Pedidos Archivados', Valor: stats.archived },
      { Concepto: 'Pedidos Pendientes', Valor: stats.pending },
      { Concepto: 'Total de Items', Valor: stats.totalItems },
      { Concepto: '', Valor: '' },
      { Concepto: 'PEDIDOS POR UBICACIÓN', Valor: '' },
    ]

    Object.entries(stats.byLocation).forEach(([location, count]) => {
      statsData.push({ Concepto: location, Valor: count })
    })

    statsData.push({ Concepto: '', Valor: '' })
    statsData.push({ Concepto: 'PEDIDOS POR PLATILLO', Valor: '' })

    Object.entries(stats.byDish).forEach(([dish, count]) => {
      statsData.push({ Concepto: dish, Valor: count })
    })

    const wb = new ExcelJS.Workbook()
    const ws1 = wb.addWorksheet('Pedidos Detallados')
    ws1.columns = [
      { header: 'Fecha Pedido', key: 'Fecha Pedido', width: 12 },
      { header: 'Hora Pedido', key: 'Hora Pedido', width: 10 },
      { header: 'Usuario', key: 'Usuario', width: 20 },
      { header: 'Email', key: 'Email', width: 25 },
      { header: 'Teléfono', key: 'Teléfono', width: 15 },
      { header: 'Ubicación', key: 'Ubicación', width: 15 },
      { header: 'Fecha Entrega', key: 'Fecha Entrega', width: 25 },
      { header: 'Platillos', key: 'Platillos', width: 40 },
      { header: 'Guarnición', key: 'Guarnición', width: 18 },
      { header: 'Cantidad Items', key: 'Cantidad Items', width: 14 },
      { header: 'Estado', key: 'Estado', width: 14 },
      { header: 'Turno', key: 'Turno', width: 12 },
      { header: 'Comentarios', key: 'Comentarios', width: 30 },
      { header: 'Opciones Adicionales', key: 'Opciones Adicionales', width: 40 },
      { header: 'Cliente', key: 'Cliente', width: 20 }
    ]
    ws1.addRows(excelData)

    const ws2 = wb.addWorksheet('Estadísticas')
    ws2.columns = [
      { header: 'Concepto', key: 'Concepto', width: 30 },
      { header: 'Valor', key: 'Valor', width: 15 }
    ]
    ws2.addRows(statsData)

    const today = new Date().toISOString().split('T')[0]
    const locationFilter = selectedLocation !== 'all' ? `_${selectedLocation.replace(/\s+/g, '_')}` : ''
    const statusFilter = selectedStatus !== 'all' ? `_${selectedStatus}` : ''
    const companyFilter = exportCompany !== 'all' ? `_empresa_${exportCompany.replace(/\s+/g, '_')}` : ''
    const fileName = `Pedidos_ServiFood_${today}${locationFilter}${statusFilter}${companyFilter}.xlsx`

    await downloadWorkbook(wb, fileName)

    notifySuccess(`✓ ${ordersToExport.length} pedidos exportados correctamente a ${fileName}`)
  } catch (error) {
    console.error('Error al exportar:', error)
    notifyError('Error al exportar el archivo. Por favor, inténtalo de nuevo.')
  }
}
