import { getCustomSideFromResponses } from './dailyOrderCalculations'
import { normalizeDishName } from './dailyOrderFormatters'
import { notifyError, notifyInfo } from '../notice'

export function shareDailyOrdersWhatsApp(sortedOrders) {
  if (sortedOrders.length === 0) {
    notifyInfo('No hay pedidos para compartir')
    return
  }

  try {
    let message = `📋 *PEDIDOS SERVIFOOD*\n`
    message += `${'='.repeat(40)}\n\n`
    const ubicaciones = {}
    sortedOrders.forEach(order => {
      const ubicacion = order.location || 'Sin ubicación'
      if (!ubicaciones[ubicacion]) {
        ubicaciones[ubicacion] = { menues: {}, guarniciones: {} }
      }
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach(item => {
          const nombre = normalizeDishName(item.name)
          ubicaciones[ubicacion].menues[nombre] = (ubicaciones[ubicacion].menues[nombre] || 0) + (item.quantity || 1)
        })
      }
      const guarnicion = getCustomSideFromResponses(order.custom_responses || [])
      if (guarnicion) {
        ubicaciones[ubicacion].guarniciones[guarnicion] = (ubicaciones[ubicacion].guarniciones[guarnicion] || 0) + 1
      }
    })
    Object.entries(ubicaciones).forEach(([ubicacion, datos]) => {
      message += `*${ubicacion}*\n`
      const sortedMenus = Object.entries(datos.menues).sort((a, b) => {
        const extractNumber = (name) => {
          const match = name.match(/(\d+)/)
          return match ? parseInt(match[1], 10) : Infinity
        }
        return extractNumber(a[0]) - extractNumber(b[0])
      })
      sortedMenus.forEach(([menu, cantidad]) => {
        message += `  • ${menu}: ${cantidad}\n`
      })
      Object.entries(datos.guarniciones).forEach(([guarnicion, cantidad]) => {
        message += `  • Guarnición: ${guarnicion} (${cantidad})\n`
      })
      message += `\n`
    })
    message += `${'='.repeat(40)}\n`
    message += `\n✅ *Resumen listo para enviar por WhatsApp*\n`
    const encodedMessage = encodeURIComponent(message)
    const whatsappUrl = `https://wa.me/?text=${encodedMessage}`
    window.open(whatsappUrl, '_blank')
  } catch (error) {
    console.error('Error al compartir:', error)
    notifyError('Error al compartir por WhatsApp')
  }
}
