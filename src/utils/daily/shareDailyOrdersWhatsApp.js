import { formatDailyOrdersForWhatsApp } from './dailyOrdersExportModel'
import { notifyError, notifyInfo, notifySuccess } from '../notice'

const copyToClipboard = async (message) => {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(message)
    return true
  }
  return false
}

export const normalizeWhatsAppLineBreaks = (message = '') =>
  String(message).replace(/\r?\n/g, '\r\n')

export const buildWhatsAppShareUrl = (message) => {
  const normalizedMessage = normalizeWhatsAppLineBreaks(message)
  return `https://wa.me/?text=${encodeURIComponent(normalizedMessage)}`
}

export function shareDailyOrdersWhatsApp(sortedOrders, selectedStatus = 'pending') {
  if (!Array.isArray(sortedOrders) || sortedOrders.length === 0) {
    notifyInfo('No hay pedidos para compartir')
    return
  }

  try {
    const message = formatDailyOrdersForWhatsApp(sortedOrders, selectedStatus)

    copyToClipboard(message)
      .then((copied) => {
        if (copied) notifySuccess('Mensaje copiado. Revisá WhatsApp antes de enviarlo.')
      })
      .catch(() => {
        notifyInfo('No se pudo copiar automáticamente. Se abrirá WhatsApp con el texto preparado.')
      })

    const whatsappUrl = buildWhatsAppShareUrl(message)
    window.open(whatsappUrl, '_blank')
  } catch (error) {
    console.error('Error al compartir:', error)
    notifyError('Error al compartir por WhatsApp')
  }
}
