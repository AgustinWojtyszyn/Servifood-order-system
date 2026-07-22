import { useState } from 'react'
import { db } from '../../supabaseClient'
import { Sound } from '../../utils/Sound'
import { confirmAction } from '../../utils/confirm'
import { notifyError, notifyInfo, notifySuccess } from '../../utils/notice'
import { getTomorrowISOInTimeZone } from '../../utils/dateUtils'
import { getUserFriendlyErrorMessage } from '../../utils'

const useAdminCleanupActions = ({
  archivedOrdersCount,
  clearArchivedOrdersCount,
  refreshArchivedOrdersCount,
  onRefreshData
}) => {
  const [archivingPending, setArchivingPending] = useState(false)
  const [deletingOrders, setDeletingOrders] = useState(false)

  const handleArchiveAllPendingOrders = async () => {
    const operationalDate = getTomorrowISOInTimeZone()
    const msg =
      `Este botón moverá los pedidos pendientes con fecha de entrega ${operationalDate} al estado "Archivado".\n\n` +
      'Los pedidos archivados NO se eliminan, pero ya no aparecerán como pendientes ni podrán ser modificados.\n' +
      'Esta acción es útil para cerrar la fecha operativa y mantener el historial sin tocar pedidos de otras fechas.\n\n' +
      '¿Deseas archivar todos los pedidos pendientes ahora?'
    const confirmed = await confirmAction({
      title: 'Archivar pedidos pendientes',
      message: msg,
      confirmText: 'Archivar pedidos'
    })
    if (!confirmed) return
    setArchivingPending(true)
    try {
      const { data, error } = await db.archivePendingOrdersByDeliveryDate({
        deliveryDate: operationalDate,
        statuses: ['pending']
      })
      if (error) {
        notifyError(getUserFriendlyErrorMessage(error, 'No pudimos archivar los pedidos pendientes. Intentá nuevamente.'))
      } else {
        const affected = Array.isArray(data) ? data.length : 0
        if (affected === 0) {
          notifyInfo('No hay pedidos pendientes para archivar.')
        } else {
          notifySuccess(`Pedidos archivados correctamente: ${affected}. Podés consultar el historial en pedidos archivados.`)
        }
        Sound.playSuccess()
        await onRefreshData?.()
        await refreshArchivedOrdersCount?.()
      }
    } catch (err) {
      notifyError(getUserFriendlyErrorMessage(err, 'No pudimos archivar los pedidos pendientes. Intentá nuevamente.'))
    } finally {
      setArchivingPending(false)
    }
  }

  const handleDeleteArchivedOrders = async () => {
    const confirmed = await confirmAction({
      title: 'Eliminar pedidos archivados',
      message:
        'Esta acción afecta pedidos archivados guardados en la base de datos. No limpia la caché del navegador ni archivos temporales del dispositivo.',
      highlight: `Se eliminarán permanentemente ${archivedOrdersCount} pedidos archivados.`,
      confirmText: 'Eliminar definitivamente'
    })
    if (!confirmed) return

    setDeletingOrders(true)

    try {
      const { data: deletedCount, error } = await db.deleteArchivedOrders()

      if (error) {
        console.error('Error deleting archived orders:', error)
        notifyError(getUserFriendlyErrorMessage(error, 'No pudimos eliminar los pedidos archivados. Intentá nuevamente.'))
      } else {
        const affected = Number.isFinite(deletedCount) ? deletedCount : archivedOrdersCount
        notifySuccess(
          affected > 0
            ? `Se eliminaron ${affected} pedidos archivados. Se liberó espacio en la base de datos.`
            : 'No había pedidos archivados para eliminar.'
        )
        clearArchivedOrdersCount()
        await onRefreshData?.()
      }
    } catch (err) {
      console.error('Error:', err)
      notifyError(getUserFriendlyErrorMessage(err, 'No pudimos eliminar los pedidos archivados. Intentá nuevamente.'))
    } finally {
      setDeletingOrders(false)
    }
  }

  return {
    archivingPending,
    deletingOrders,
    handleArchiveAllPendingOrders,
    handleDeleteArchivedOrders
  }
}

export { useAdminCleanupActions }
