import { useState } from 'react'
import { usersService } from '../../services/users'
import { notifyError, notifySuccess, notifyWarning } from '../../utils/notice'
import { confirmAction } from '../../utils/confirm'

const useAdminUsersActions = ({
  user,
  refreshSession,
  refreshAdminData
}) => {
  const [expandedPeople, setExpandedPeople] = useState({})
  const [roleUpdatingById, setRoleUpdatingById] = useState({})
  const [deletingById, setDeletingById] = useState({})

  const togglePersonDetails = (personId) => {
    if (!personId) return
    setExpandedPeople(prev => ({
      ...prev,
      [personId]: !prev[personId]
    }))
  }

  const isPersonExpanded = (personId) => !!expandedPeople[personId]

  const handleRoleChange = async (userId, newRole) => {
    if (!userId || roleUpdatingById[userId] || deletingById[userId]) return
    setRoleUpdatingById(prev => ({ ...prev, [userId]: true }))
    try {
      const roleValue = newRole.toLowerCase()
      const { data, error } = await usersService.updateUserRole(userId, roleValue)
      if (error) {
        notifyError(`Error al actualizar el rol: ${error.message}`)
        return
      }
      if (!data || (Array.isArray(data) && data.length === 0)) {
        notifyWarning('No se pudo actualizar el rol. Verifica las políticas de seguridad o el valor enviado.')
        return
      }
      notifySuccess('Rol actualizado correctamente')
      await refreshAdminData()
      if (user && user.id === userId) {
        await refreshSession()
      }
    } catch {
      notifyError('Error al actualizar el rol')
    } finally {
      setRoleUpdatingById(prev => ({ ...prev, [userId]: false }))
    }
  }

  const handleDeleteUser = async (userId, userName) => {
    if (!userId || deletingById[userId]) return
    const confirmed = await confirmAction({
      title: 'Eliminar usuario',
      message:
        `Se eliminarán todos los pedidos asociados al usuario "${userName}".`,
      highlight: 'Esta acción NO se puede deshacer.',
      confirmText: 'Eliminar usuario'
    })
    if (!confirmed) return

    try {
      setDeletingById(prev => ({ ...prev, [userId]: true }))
      const { error } = await usersService.deleteUser(userId)

      if (error) {
        notifyError(`Error al eliminar el usuario: ${error.message}`)
      } else {
        notifySuccess('Usuario eliminado exitosamente')
        await refreshAdminData()
      }
    } catch {
      notifyError('Error al eliminar el usuario')
    } finally {
      setDeletingById(prev => ({ ...prev, [userId]: false }))
    }
  }

  return {
    isPersonExpanded,
    togglePersonDetails,
    handleRoleChange,
    handleDeleteUser,
    roleUpdatingById,
    deletingById
  }
}

export { useAdminUsersActions }
