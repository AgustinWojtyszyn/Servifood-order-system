import { notifyError, notifyInfo } from '../notice'
import { summarizeCafeteriaOrders } from './exportCafeteriaOrdersExcel'

export function shareCafeteriaOrdersWhatsApp(orders = [], companyFilter = 'all') {
  const filtered = companyFilter === 'all'
    ? orders
    : orders.filter((order) => (order.company_slug || order.company_name || '').toLowerCase() === companyFilter.toLowerCase())

  if (filtered.length === 0) {
    notifyInfo('No hay pedidos de cafeteria para compartir')
    return
  }

  try {
    const summary = summarizeCafeteriaOrders(filtered)
    let message = `☕ *PEDIDOS CAFETERIA*\n`
    message += `${'='.repeat(32)}\n`
    message += `Empresa: ${companyFilter === 'all' ? 'Todas' : companyFilter}\n`
    message += `Total pedidos: ${summary.totalOrders}\n`
    message += `Basico: ${summary.totalsByPlan.basico} | Medium: ${summary.totalsByPlan.medium} | Premium: ${summary.totalsByPlan.premium}\n\n`

    filtered.forEach((order) => {
      const company = order.company_name || order.company_slug || 'Sin empresa'
      const admin = order.admin_name || order.admin_email || 'Sin nombre'
      const notes = order.notes ? ` | Notas: ${order.notes}` : ''
      const items = (order.items || []).map((item) => {
        const label = item.planId === 'basico' ? 'Basico' : item.planId === 'medium' ? 'Medium' : 'Premium'
        return `${label}: ${item.quantity}`
      }).join(' | ')
      message += `• ${company} | ${admin}\n  ${items}${notes}\n`
    })

    const encoded = encodeURIComponent(message)
    const whatsappUrl = `https://wa.me/?text=${encoded}`
    window.open(whatsappUrl, '_blank')
  } catch (error) {
    console.error('Error al compartir cafeteria:', error)
    notifyError('Error al compartir por WhatsApp')
  }
}
