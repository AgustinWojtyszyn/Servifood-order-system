import { useState } from 'react'
import { db } from '../../supabaseClient'
import { Sound } from '../../utils/Sound'
import { confirmAction } from '../../utils/confirm'
import { notifyError, notifyInfo, notifySuccess } from '../../utils/notice'

const useAdminCleanupActions = ({
  archivedOrdersCount,
  clearArchivedOrdersCount,
  refreshArchivedOrdersCount,
  onRefreshData
}) => {
  const [archivingPending, setArchivingPending] = useState(false)
  const [deletingOrders, setDeletingOrders] = useState(false)

  const handleArchiveAllPendingOrders = async () => {
    const msg =
      'Este botón moverá TODOS los pedidos pendientes (de hoy y días anteriores) al estado "Archivado".\n\n' +
      'Los pedidos archivados NO se eliminan, pero ya no aparecerán como pendientes ni podrán ser modificados.\n' +
      'Esta acción es útil para limpiar la lista de pendientes y mantener el historial.\n\n' +
      '¿Deseas archivar todos los pedidos pendientes ahora?'
    const confirmed = await confirmAction({
      title: 'Archivar pedidos pendientes',
      message: msg,
      confirmText: 'Archivar pedidos'
    })
    if (!confirmed) return
    setArchivingPending(true)
    try {
      const { data, error } = await db.archiveAllPendingOrders()
      if (error) {
        notifyError(`Ocurrió un error al archivar los pedidos pendientes. ${error.message}`)
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
    } catch (_err) {
      notifyError('Error inesperado al archivar pedidos pendientes. Intenta nuevamente.')
    } finally {
      setArchivingPending(false)
    }
  }

  const handleDeleteArchivedOrders = async () => {
    const confirmed = await confirmAction({
      title: 'Eliminar pedidos archivados',
      message:
        'Esta acción liberará espacio en la base de datos, pero elimina permanentemente los pedidos archivados.',
      highlight: `Se eliminarán ${archivedOrdersCount} pedidos archivados.`,
      confirmText: 'Eliminar definitivamente'
    })
    if (!confirmed) return

    setDeletingOrders(true)

    try {
      const { error } = await db.deleteArchivedOrders()

      if (error) {
        console.error('Error deleting archived orders:', error)
        notifyError(`Error al eliminar los pedidos: ${error.message}`)
      } else {
        notifySuccess(
          archivedOrdersCount > 0
            ? `Se eliminaron ${archivedOrdersCount} pedidos archivados. Se liberó espacio en la base de datos.`
            : 'No había pedidos archivados para eliminar.'
        )
        clearArchivedOrdersCount()
        await onRefreshData?.()
      }
    } catch (_err) {
      console.error('Error:', _err)
      notifyError('Error al eliminar los pedidos')
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
