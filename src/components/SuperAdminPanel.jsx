import { useState, useEffect } from 'react'
import { db } from '../supabaseClient'
import { Shield, UserX, Trash2, AlertTriangle, Crown, Users, Database, CheckCircle, X } from 'lucide-react'

const InternalLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-700 via-primary-800 to-primary-900">
    <div className="text-center">
      <div className="animate-spin rounded-full h-16 w-16 border-4 border-white/30 border-t-white mx-auto mb-4"></div>
      <p className="text-white text-base font-medium">Cargando...</p>
    </div>
  </div>
)

export default function SuperAdminPanel({ user, loading }) {
  if (loading || !user) return <InternalLoader />

  const [users, setUsers] = useState([])
  const [localLoading, setLocalLoading] = useState(true)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [stats, setStats] = useState({
    totalUsers: 0,
    adminUsers: 0,
    totalOrders: 0,
    totalNotifications: 0
  })

  useEffect(() => {
    checkSuperAdminStatus()
  }, [user])

  useEffect(() => {
    if (isSuperAdmin) {
      fetchUsers()
      fetchStats()
    }
  }, [isSuperAdmin])

  const checkSuperAdminStatus = async () => {
    try {
      const { data, error } = await db.getUsers()
      if (!error && data) {
        const currentUser = data.find(u => u.id === user.id)
        setIsSuperAdmin(currentUser?.is_superadmin === true)
      }
    } catch (err) {
      console.error('Error checking superadmin status:', err)
    }
  }

  const fetchUsers = async () => {
    try {
      const { data, error } = await db.getUsers()
      if (error) {
        console.error('Error fetching users:', error)
      } else {
        setUsers(data || [])
      }
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const [usersRes, ordersRes] = await Promise.all([
        db.getUsers(),
        db.getOrders()
      ])

      const totalUsers = usersRes.data?.length || 0
      const adminUsers = usersRes.data?.filter(u => u.role === 'admin' || u.is_superadmin).length || 0
      const totalOrders = ordersRes.data?.length || 0

      setStats({
        totalUsers,
        adminUsers,
        totalOrders,
        totalNotifications: 0 // Podemos implementar esto después
      })
    } catch (err) {
      console.error('Error fetching stats:', err)
    }
  }

  const handleToggleAdmin = async (userId, currentRole) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin'
    const actionText = newRole === 'admin' ? 'dar permisos de administrador' : 'quitar permisos de administrador'

    if (confirm(`¿Estás seguro de ${actionText} a este usuario?`)) {
      try {
        const { error } = await db.updateUserRole(userId, newRole)
        if (error) {
          alert('Error al actualizar el rol: ' + error.message)
        } else {
          alert(`✓ Rol actualizado exitosamente`)
          fetchUsers()
          fetchStats()
        }
      } catch (err) {
        console.error('Error:', err)
        alert('Error al actualizar el rol')
      }
    }
  }

  const handleDeleteUser = async (userId, userEmail) => {
    if (userId === user.id) {
      alert('No puedes eliminar tu propia cuenta')
      return
    }

    if (confirm(`¿Estás ABSOLUTAMENTE seguro de eliminar a ${userEmail}?\n\nEsto eliminará:\n- El usuario\n- Todos sus pedidos\n- Todas sus notificaciones\n\nEsta acción NO se puede deshacer.`)) {
      const confirmation = prompt(`Escribe "ELIMINAR" para confirmar:`)
      if (confirmation === 'ELIMINAR') {
        try {
          const { error } = await db.deleteUser(userId)
          if (error) {
            alert('Error al eliminar usuario: ' + error.message)
          } else {
            alert(`✓ Usuario eliminado exitosamente`)
            fetchUsers()
            fetchStats()
          }
        } catch (err) {
          console.error('Error:', err)
          alert('Error al eliminar usuario')
        }
      } else {
        alert('Eliminación cancelada')
      }
    }
  }

  const handleClearAllOrders = async () => {
    if (confirm(`¿Estás ABSOLUTAMENTE seguro de eliminar TODOS los pedidos?\n\nEsto eliminará ${stats.totalOrders} pedidos de TODOS los usuarios.\n\nEsta acción NO se puede deshacer.`)) {
      const confirmation = prompt(`Escribe "LIMPIAR PEDIDOS" para confirmar:`)
      if (confirmation === 'LIMPIAR PEDIDOS') {
        try {
          const { error } = await db.deleteAllOrders()
          if (error) {
            alert('Error al eliminar pedidos: ' + error.message)
          } else {
            alert(`✓ Todos los pedidos han sido eliminados`)
            fetchStats()
          }
        } catch (err) {
          console.error('Error:', err)
          alert('Error al eliminar pedidos')
        }
      } else {
        alert('Limpieza cancelada')
      }
    }
  }

  const handleClearAllNotifications = async () => {
    if (confirm(`¿Estás seguro de eliminar TODAS las notificaciones del sistema?`)) {
      try {
        const { error } = await db.deleteAllNotifications()
        if (error) {
          alert('Error al eliminar notificaciones: ' + error.message)
        } else {
          alert(`✓ Todas las notificaciones han sido eliminadas`)
          fetchStats()
        }
      } catch (err) {
        console.error('Error:', err)
        alert('Error al eliminar notificaciones')
      }
    }
  }

  if (!isSuperAdmin) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="bg-red-50 border-2 border-red-300 rounded-xl p-8 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-red-100 rounded-full">
              <Shield className="h-12 w-12 text-red-600" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-red-900 mb-2">Acceso Denegado</h2>
          <p className="text-red-700">Solo los Superadministradores pueden acceder a este panel.</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="p-6 text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary-600 border-t-transparent"></div>
        <p className="mt-4 text-gray-600">Cargando panel de superadmin...</p>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-800 rounded-2xl p-8 text-white shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-white/20 rounded-full">
            <Crown className="h-12 w-12" />
          </div>
          <div>
            <h1 className="text-4xl font-bold">Panel de Superadministrador</h1>
            <p className="text-purple-100 mt-2">Control total del sistema - Usa con precaución</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-lg border-2 border-blue-200">
          <div className="flex items-center gap-3">
            <Users className="h-8 w-8 text-blue-600" />
            <div>
              <p className="text-sm text-gray-600">Total Usuarios</p>
              <p className="text-3xl font-bold text-gray-900">{stats.totalUsers}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-lg border-2 border-purple-200">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-purple-600" />
            <div>
              <p className="text-sm text-gray-600">Administradores</p>
              <p className="text-3xl font-bold text-gray-900">{stats.adminUsers}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-lg border-2 border-green-200">
          <div className="flex items-center gap-3">
            <Database className="h-8 w-8 text-green-600" />
            <div>
              <p className="text-sm text-gray-600">Total Pedidos</p>
              <p className="text-3xl font-bold text-gray-900">{stats.totalOrders}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-lg border-2 border-orange-200">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-8 w-8 text-orange-600" />
            <div>
              <p className="text-sm text-gray-600">Acciones Críticas</p>
              <p className="text-3xl font-bold text-gray-900">2</p>
            </div>
          </div>
        </div>
      </div>

      {/* Danger Zone - Database Actions */}
      <div className="bg-white rounded-xl shadow-lg border-2 border-red-300">
        <div className="p-6 bg-red-50 border-b-2 border-red-300">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 text-red-600" />
            <h2 className="text-2xl font-bold text-red-900">Zona de Peligro - Acciones Críticas</h2>
          </div>
          <p className="text-red-700 mt-2">Estas acciones son irreversibles y afectan a todo el sistema</p>
        </div>
        <div className="p-6 space-y-4">
          <button
            onClick={handleClearAllOrders}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 px-6 rounded-xl flex items-center justify-center gap-3 transition-all shadow-lg hover:shadow-xl"
          >
            <Trash2 className="h-5 w-5" />
            Limpiar Todos los Pedidos ({stats.totalOrders})
          </button>

          <button
            onClick={handleClearAllNotifications}
            className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-4 px-6 rounded-xl flex items-center justify-center gap-3 transition-all shadow-lg hover:shadow-xl"
          >
            <Trash2 className="h-5 w-5" />
            Limpiar Todas las Notificaciones
          </button>
        </div>
      </div>

      {/* Users Management */}
      <div className="bg-white rounded-xl shadow-lg border-2 border-gray-200">
        <div className="p-6 bg-gray-50 border-b-2 border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <Users className="h-6 w-6 text-gray-700" />
            Gestión de Usuarios
          </h2>
        </div>
        <div className="p-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-100 border-b-2 border-gray-300">
                  <th className="text-left p-4 font-bold text-gray-700">Email</th>
                  <th className="text-left p-4 font-bold text-gray-700">Nombre</th>
                  <th className="text-left p-4 font-bold text-gray-700">Rol</th>
                  <th className="text-left p-4 font-bold text-gray-700">Superadmin</th>
                  <th className="text-center p-4 font-bold text-gray-700">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="p-4">
                      <span className="text-gray-900 font-medium">{u.email}</span>
                      {u.id === user.id && (
                        <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Tú</span>
                      )}
                    </td>
                    <td className="p-4 text-gray-700">{u.full_name || u.user_metadata?.full_name || '-'}</td>
                    <td className="p-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        u.role === 'admin' 
                          ? 'bg-purple-100 text-purple-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {u.role === 'admin' ? 'Admin' : 'Usuario'}
                      </span>
                    </td>
                    <td className="p-4">
                      {u.is_superadmin ? (
                        <span className="flex items-center gap-1 text-yellow-600">
                          <Crown className="h-4 w-4" />
                          <span className="font-bold text-xs">Sí</span>
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">No</span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-2">
                        {!u.is_superadmin && (
                          <>
                            <button
                              onClick={() => handleToggleAdmin(u.id, u.role)}
                              className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                                u.role === 'admin'
                                  ? 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                                  : 'bg-green-100 text-green-700 hover:bg-green-200'
                              }`}
                            >
                              {u.role === 'admin' ? (
                                <>
                                  <X className="h-4 w-4 inline mr-1" />
                                  Quitar Admin
                                </>
                              ) : (
                                <>
                                  <CheckCircle className="h-4 w-4 inline mr-1" />
                                  Hacer Admin
                                </>
                              )}
                            </button>
                            <button
                              onClick={() => handleDeleteUser(u.id, u.email)}
                              disabled={u.id === user.id}
                              className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                                u.id === user.id
                                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                  : 'bg-red-100 text-red-700 hover:bg-red-200'
                              }`}
                            >
                              <UserX className="h-4 w-4 inline mr-1" />
                              Eliminar
                            </button>
                          </>
                        )}
                        {u.is_superadmin && u.id !== user.id && (
                          <span className="text-gray-400 text-xs italic">Protegido</span>
                        )}
                        {u.id === user.id && (
                          <span className="text-blue-600 text-xs italic">Tu cuenta</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Warning Footer */}
      <div className="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-6 w-6 text-yellow-600 flex-shrink-0 mt-1" />
          <div>
            <h3 className="font-bold text-yellow-900 mb-2">⚠️ Advertencia Importante</h3>
            <ul className="text-yellow-800 space-y-1 text-sm">
              <li>• Las acciones de eliminación son PERMANENTES e IRREVERSIBLES</li>
              <li>• Eliminar un usuario borrará todos sus pedidos y notificaciones</li>
              <li>• Limpiar pedidos afecta a TODOS los usuarios del sistema</li>
              <li>• Solo usa estas funciones cuando estés completamente seguro</li>
              <li>• Se recomienda hacer respaldos antes de operaciones críticas</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
