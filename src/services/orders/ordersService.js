export const createOrdersService = ({ supabase, invalidateCache = () => {} } = {}) => {
  if (!supabase) {
    throw new Error('createOrdersService requires a supabase client')
  }

  // Archivar todos los pedidos pendientes (de cualquier día)
  const archiveAllPendingOrders = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    console.log('session?', !!session, session?.user?.id)
    const pendingLike = ['pending']
    const { data, error } = await supabase.rpc('archive_orders_bulk', {
      statuses: pendingLike
    })
    return { data, error }
  }

  // Helpers para operaciones "por días anteriores"
  const isoTodayStart = () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return today.toISOString()
  }

  return {
    archiveAllPendingOrders,

    // "Eliminar" pendientes: se cancelan para conservarlos en el histórico (panel mensual)
    deleteAllPendingOrders: async () => {
      const { data, error } = await supabase
        .from('orders')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('status', 'pending')
        .select('id')
      return { data, error }
    },

    // Marcar todos los pedidos pendientes de días anteriores como archivados
    completeAllOldPendingOrders: async () => {
      const { data, error } = await supabase
        .from('orders')
        .update({ status: 'archived' })
        .eq('status', 'pending')
        .lt('created_at', isoTodayStart())
      return { data, error }
    },

    // Marcar pedidos pendientes de días anteriores como cancelados (no borrar)
    cancelPreviousDaysPendingOrders: async () => {
      const { data, error } = await supabase
        .from('orders')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('status', 'pending')
        .lt('created_at', isoTodayStart())
        .select('id') // devuelve ids para confirmar que se actualizaron
      return { data, error }
    },

    deleteAllOrders: async () => {
      const { data, error } = await supabase
        .from('orders')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000') // Eliminar todos
      return { data, error }
    },

    createOrder: async (orderData) => {
      invalidateCache()
      const { data, error } = await supabase
        .from('orders')
        .insert([orderData])
        .select()
      return { data, error }
    },

    getOrders: async (userId = null) => {
      let query = supabase
        .from('orders')
        .select('*') // Seleccionar TODOS los campos
        .order('created_at', { ascending: false })

      if (userId) {
        query = query.eq('user_id', userId)
      }

      const { data, error } = await query
      return { data, error }
    },

    // Pedidos con person_key para agrupar por persona (grupo o usuario suelto)
    getOrdersWithPersonKey: async ({ userId = null, personKey = null } = {}) => {
      let query = supabase
        .from('orders_with_person_key')
        .select('*')
        .order('created_at', { ascending: false })

      if (userId) {
        query = query.eq('user_id', userId)
      }

      if (personKey) {
        query = query.eq('person_key', personKey)
      }

      const { data, error } = await query
      return { data, error }
    },

    // Conteo de pedidos agrupado por persona
    getOrdersCountByPerson: async () => {
      const { data, error } = await supabase
        .from('orders_count_by_person')
        .select('*')
        .order('total_orders', { ascending: false })
      return { data, error }
    },

    updateOrderStatus: async (orderId, status) => {
      invalidateCache()
      const { data, error } = await supabase
        .from('orders')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', orderId)
        .select()
      return { data, error }
    },

    deleteOrder: async (orderId) => {
      invalidateCache()
      const { data, error } = await supabase
        .from('orders')
        .delete()
        .eq('id', orderId)
      return { data, error }
    },

    deleteArchivedOrders: async () => {
      invalidateCache()
      const { data, error } = await supabase
        .from('orders')
        .delete()
        .eq('status', 'archived')
      return { data, error }
    },

    getArchivedOrdersCount: async () => {
      const { count, error } = await supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'archived')
      return { count, error }
    }
  }
}

