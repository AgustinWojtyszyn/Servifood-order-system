export const createUsersService = ({
  supabase,
  cache = null,
  invalidateCache = () => {},
  logAudit = null
} = {}) => {
  if (!supabase) {
    throw new Error('createUsersService requires a supabase client')
  }

  return {
    // Usuarios
    getUsers: async (force = false) => {
      // Usar cache para reducir consultas repetidas
      const cacheKey = 'users-list'
      if (!force) {
        const cached = cache?.get?.(cacheKey)
        if (cached) return { data: cached, error: null }
      }
      const { data, error } = await supabase
        .from('users')
        .select('id, email, full_name, role, created_at') // Solo campos necesarios
        .order('created_at', { ascending: false })
      if (!error && data && cache?.set) {
        cache.set(cacheKey, data, 60000) // Cache por 1 minuto
      }
      return { data, error }
    },

    // Personas admin (usuarios agrupados + sueltos, sin duplicados)
    getAdminPeopleUnified: async (force = false) => {
      const cacheKey = 'admin-people-unified'
      if (!force) {
        const cached = cache?.get?.(cacheKey)
        if (cached) return { data: cached, error: null }
      }

      const { data, error } = await supabase
        .from('admin_people_unified')
        .select('person_id, group_id, display_name, emails, user_ids, members_count, first_created, last_created, is_grouped')
        .order('display_name', { ascending: true })

      if (!error && data && cache?.set) {
        cache.set(cacheKey, data, 60000)
      }

      return { data, error }
    },

    updateUserRole: async (userId, role) => {
      invalidateCache() // Limpiar cache al actualizar
      const { data, error } = await supabase
        .from('users')
        .update({ role })
        .eq('id', userId)
        .select()
      // data es array, tomar el primero si existe
      const normalizedData = Array.isArray(data) ? data[0] : data

      if (!error && normalizedData && typeof logAudit === 'function') {
        // Auditoría: cambio de rol
        await logAudit({
          action: 'role_changed',
          details: `Rol actualizado a "${role}"`,
          target_id: userId,
          target_email: normalizedData?.email,
          target_name: normalizedData?.full_name,
          metadata: { role }
        })
      }

      return { data: normalizedData, error }
    },

    deleteUser: async (userId) => {
      // Primero eliminar todos los pedidos del usuario
      const { error: ordersError } = await supabase
        .from('orders')
        .delete()
        .eq('user_id', userId)

      if (ordersError) return { error: ordersError }

      // Eliminar notificaciones del usuario (solo si la tabla existe)
      // Comentado temporalmente hasta que se cree la tabla notifications
      /*
      const { error: notificationsError } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', userId)

      if (notificationsError) return { error: notificationsError }
      */

      // Luego eliminar el usuario de auth usando Admin API
      // Nota: Esto requiere que tengas configurado el Service Role Key
      // Por ahora solo eliminamos de la tabla users
      const { data, error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId)

      if (!error && typeof logAudit === 'function') {
        await logAudit({
          action: 'user_deleted',
          details: 'Usuario eliminado por administrador',
          target_id: userId
        })
      }

      return { data, error }
    },

    // Pedidos
    getUserFeatures: async () => {
      const cacheKey = 'user-features'
      const cached = cache?.get?.(cacheKey)
      if (cached) return { data: cached, error: null }
      const { data, error } = await supabase
        .from('user_features')
        .select('feature, enabled')
      if (!error && data && cache?.set) {
        cache.set(cacheKey, data, 60_000)
      }
      return { data, error }
    }
  }
}

