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
    const empresas = {}
    sortedOrders.forEach(order => {
      const empresa = order.company_name || order.company || order.company_slug || order.target_company || order.location || 'Sin empresa'
      if (!empresas[empresa]) {
        empresas[empresa] = { opciones: {} }
      }
      const guarnicion = getCustomSideFromResponses(order.custom_responses || [])
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach(item => {
          const nombre = normalizeDishName(item.name)
          const cantidad = item.quantity || 1
          if (!empresas[empresa].opciones[nombre]) {
            empresas[empresa].opciones[nombre] = { total: 0, guarniciones: {} }
          }
          empresas[empresa].opciones[nombre].total += cantidad
          if (guarnicion) {
            empresas[empresa].opciones[nombre].guarniciones[guarnicion] =
              (empresas[empresa].opciones[nombre].guarniciones[guarnicion] || 0) + cantidad
          }
        })
      }
    })
    Object.entries(empresas)
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([empresa, datos]) => {
        message += `*${empresa}*\n\n`
        const sortedOptions = Object.entries(datos.opciones).sort((a, b) => {
          const extractNumber = (name) => {
            const match = name.match(/(\d+)/)
            return match ? parseInt(match[1], 10) : Infinity
          }
          return extractNumber(a[0]) - extractNumber(b[0])
        })
        sortedOptions.forEach(([opcion, resumen]) => {
          message += `${opcion}: ${resumen.total}\n`
          const sides = Object.entries(resumen.guarniciones)
          if (sides.length > 0) {
            sides.forEach(([guarnicion, cantidad]) => {
              message += `- ${cantidad} ${guarnicion}\n`
            })
          }
          message += `\n`
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
