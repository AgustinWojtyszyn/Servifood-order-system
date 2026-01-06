import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'your-supabase-url'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-supabase-anon-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  },
  db: {
    schema: 'public'
  },
  global: {
    headers: { 
      'x-application-name': 'servifood-app'
    }
  }
})

// Redirección global si el token expira mucho tiempo (fuera de línea)
supabase.auth.onAuthStateChange((event, session) => {
  if ((event === 'SIGNED_OUT' || event === 'TOKEN_REFRESH_FAILED') && !session) {
    // Si el usuario estaba logueado y el token expiró mucho tiempo
    if (!window.location.pathname.startsWith('/login')) {
      window.location.href = '/login';
    }
  }
})

// Eliminar todos los pedidos pendientes de días anteriores
// Se agrega como método a db más abajo
// Cache simple en memoria para reducir consultas repetidas
// (definido más arriba)

// Configuración de autenticación
// (definición única de 'auth' más abajo)


// ...existing code...
// Archivar todos los pedidos pendientes (de cualquier día)
export const archiveAllPendingOrders = async () => {
  const { data, error } = await supabase
    .from('orders')
    .update({ status: 'archived', updated_at: new Date().toISOString() })
    .eq('status', 'pending')
  return { data, error }
}
// ...existing code...

// Redirección global si el token expira mucho tiempo (fuera de línea)
supabase.auth.onAuthStateChange((event, session) => {
  if ((event === 'SIGNED_OUT' || event === 'TOKEN_REFRESH_FAILED') && !session) {
    // Si el usuario estaba logueado y el token expiró mucho tiempo
    if (!window.location.pathname.startsWith('/login')) {
      window.location.href = '/login';
    }
  }
})

// Eliminar todos los pedidos pendientes de días anteriores
// Se agrega como método a db más abajo
// Cache simple en memoria para reducir consultas repetidas
const cache = {
  data: new Map(),
  ttl: new Map(),
  
  get(key) {
    const expiry = this.ttl.get(key)
    if (expiry && Date.now() > expiry) {
      this.data.delete(key)
      this.ttl.delete(key)
      return null
    }
    return this.data.get(key)
  },
  
  set(key, value, ttlMs = 30000) { // TTL por defecto: 30 segundos
    this.data.set(key, value)
    this.ttl.set(key, Date.now() + ttlMs)
  },
  
  clear() {
    this.data.clear()
    this.ttl.clear()
  }
}

// Configuración de autenticación
export const auth = {
  signUp: async (email, password, metadata = {}) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
        emailRedirectTo: `${window.location.origin}/dashboard`
      }
    })
    return { data, error }
  },

  signIn: async (email, password, rememberMe = false) => {
    const { data, error} = await supabase.auth.signInWithPassword({
      email,
      password,
      options: {
        // Si rememberMe es true, la sesión persiste indefinidamente
        // Si es false, la sesión solo dura mientras el navegador esté abierto
        persistSession: true,
        ...(rememberMe && { storageOptions: { type: 'local' } })
      }
    })
    return { data, error }
  },

  signOut: async () => {
    const { error } = await supabase.auth.signOut()
    return { error }
  },

  resetPassword: async (email) => {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    })
    return { data, error }
  },

  updatePassword: async (newPassword) => {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword
    })
    return { data, error }
  },

  updateProfile: async (updates) => {
    const { data, error } = await supabase.auth.updateUser({
      email: updates.email,
      data: {
        full_name: updates.full_name
      }
    })
    return { data, error }
  },

  getUser: async () => {
    const { data: { user }, error } = await supabase.auth.getUser()
    return { user, error }
  },

  onAuthStateChange: (callback) => {
    return supabase.auth.onAuthStateChange(callback)
  }
}

// Funciones de base de datos
import { Archive as ArchiveIcon } from 'lucide-react'

export const db = {
  archiveAllPendingOrders: archiveAllPendingOrders,
        // "Eliminar" pendientes: se cancelan para conservarlos en el histórico (panel mensual)
        deleteAllPendingOrders: async () => {
          const { data, error } = await supabase
            .from('orders')
            .update({ status: 'cancelled', updated_at: new Date().toISOString() })
            .eq('status', 'pending')
            .select('id')
          return { data, error }
        },
    // Marcar todos los pedidos pendientes de días anteriores como completados
    completeAllOldPendingOrders: async () => {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const isoToday = today.toISOString()
      const { data, error } = await supabase
        .from('orders')
        .update({ status: 'completed' })
        .eq('status', 'pending')
        .lt('created_at', isoToday)
      return { data, error }
    },

      // Marcar pedidos pendientes de días anteriores como cancelados (no borrar)
      cancelPreviousDaysPendingOrders: async () => {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const isoToday = today.toISOString()
        const { data, error } = await supabase
          .from('orders')
          .update({ status: 'cancelled', updated_at: new Date().toISOString() })
          .eq('status', 'pending')
          .lt('created_at', isoToday)
          .select('id') // devuelve ids para confirmar que se actualizaron
        return { data, error }
      },

    
  // Usuarios
  getUsers: async (force = false) => {
    // Usar cache para reducir consultas repetidas
    const cacheKey = 'users-list'
    if (!force) {
      const cached = cache.get(cacheKey)
      if (cached) return { data: cached, error: null }
    }
    const { data, error } = await supabase
      .from('users')
      .select('id, email, full_name, role, created_at') // Solo campos necesarios
      .order('created_at', { ascending: false })
    if (!error && data) {
      cache.set(cacheKey, data, 60000) // Cache por 1 minuto
    }
    return { data, error }
  },

  updateUserRole: async (userId, role) => {
    cache.clear() // Limpiar cache al actualizar
    const { data, error } = await supabase
      .from('users')
      .update({ role })
      .eq('id', userId)
      .select()
    // data es array, tomar el primero si existe
    return { data: Array.isArray(data) ? data[0] : data, error }
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
    
    return { data, error }
  },

  deleteAllOrders: async () => {
    const { data, error } = await supabase
      .from('orders')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Eliminar todos
    return { data, error }
  },

  deleteAllNotifications: async () => {
    // Comentado temporalmente hasta que se cree la tabla notifications
    /*
    const { data, error } = await supabase
      .from('notifications')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Eliminar todos
    return { data, error }
    */
    // Retornar éxito sin hacer nada si la tabla no existe
    return { data: null, error: null }
  },

  // Pedidos
  createOrder: async (orderData) => {
    cache.clear() // Limpiar cache al crear pedido nuevo
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

  updateOrderStatus: async (orderId, status) => {
    cache.clear() // Limpiar cache al actualizar estado
    const { data, error } = await supabase
      .from('orders')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', orderId)
      .select()
    return { data, error }
  },

  deleteOrder: async (orderId) => {
    cache.clear() // Limpiar cache al eliminar pedido
    const { data, error } = await supabase
      .from('orders')
      .delete()
      .eq('id', orderId)
    return { data, error }
  },

  deleteCompletedOrders: async () => {
    cache.clear() // Limpiar cache al eliminar pedidos completados
    const { data, error } = await supabase
      .from('orders')
      .delete()
      .eq('status', 'completed')
    return { data, error }
  },

  getCompletedOrdersCount: async () => {
    const { count, error } = await supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'completed')
    return { count, error }
  },

  // Desglose diario por rango usando datos históricos reales
  // - Filtra por delivery_date si existe (día de entrega del negocio)
  // - Aplica mismos criterios de estado para consistencia
  // - Incluye días sin pedidos con valor 0 para continuidad
  getDailyBreakdown: async ({ start, end, timeZone = 'America/Argentina/San_Juan' }) => {
    if (!start || !end) {
      return { error: new Error('Rango inválido: start/end son requeridos') }
    }

    // Estados que cuentan como "pedido" en este panel
    const COUNTABLE_STATUSES = ['completed', 'delivered', 'archived', 'pending']

    // Consultar pedidos del rango por created_at (más seguro), luego agrupar por día de negocio (delivery_date si existe)
    const startUtc = new Date(`${start}T00:00:00.000Z`).toISOString()
    const endUtc = new Date(`${end}T23:59:59.999Z`).toISOString()
    const selectOrders = async (cols) => {
      return supabase
        .from('orders')
        .select(cols)
        .gte('created_at', startUtc)
        .lte('created_at', endUtc)
    }

    // Intento principal: incluye custom_responses si existe
    const primaryColumns = 'id, status, delivery_date, created_at, total_items, items, custom_responses'
    let { data: orders, error } = await selectOrders(primaryColumns)

    // Si falla por columna inexistente (ej. custom_responses), reintentar sin esa columna
    if (error && (error.code === '42703' || /custom_responses/i.test(error.message || ''))) {
      const fallbackColumns = 'id, status, delivery_date, created_at, total_items, items'
      const fallbackResult = await selectOrders(fallbackColumns)
      orders = fallbackResult.data
      error = fallbackResult.error
    }

    if (error) return { error }

    // Helper para iterar fechas del rango inclusive
    const parseISODate = (str) => {
      const [y, m, d] = str.split('-').map(Number)
      return new Date(y, m - 1, d)
    }
    const startDate = parseISODate(start)
    const endDate = parseISODate(end)
    const days = []
    for (let dt = new Date(startDate); dt <= endDate; dt.setDate(dt.getDate() + 1)) {
      const yyyy = dt.getFullYear()
      const mm = String(dt.getMonth() + 1).padStart(2, '0')
      const dd = String(dt.getDate()).padStart(2, '0')
      days.push(`${yyyy}-${mm}-${dd}`)
    }

    // Agrupar por fecha de negocio preferentemente delivery_date, si no existe, por created_at convertido a zona local
    const fmt = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' })
    const bucketForOrder = (o) => {
      if (o.delivery_date) return o.delivery_date.slice(0, 10)
      // Fallback a created_at -> fecha local del negocio
      try {
        const d = new Date(o.created_at)
        return fmt.format(d)
      } catch {
        return null
      }
    }

    const byDay = new Map()
    for (const day of days) {
      byDay.set(day, {
        date: day,
        count: 0,
        total_items: 0,
        total_amount: 0,
        menus_principales: 0,
        opciones: { 'OPCIÓN 1': 0, 'OPCIÓN 2': 0, 'OPCIÓN 3': 0, 'OPCIÓN 4': 0, 'OPCIÓN 5': 0, 'OPCIÓN 6': 0 },
        tipos_guarniciones: {},
        total_opciones: 0,
        total_guarniciones: 0
      })
    }

    const filteredOrders = Array.isArray(orders) ? orders.filter(o => COUNTABLE_STATUSES.includes(o.status)) : []
    filteredOrders.forEach(o => {
      const key = bucketForOrder(o)
      if (!key) return
      if (!byDay.has(key)) {
        byDay.set(key, { date: key, count: 0, total_items: 0, total_amount: 0 })
      }
      const row = byDay.get(key)
      row.count += 1
      row.total_items += (o.total_items || 0)
      row.total_amount += (o.total_amount || 0)

      // Procesar items: separar menús principales y opciones
      let items = []
      if (Array.isArray(o.items)) {
        items = o.items
      } else if (typeof o.items === 'string') {
        try { items = JSON.parse(o.items) } catch {}
      }
      items.forEach(item => {
        const qty = (item?.quantity ?? 1)
        const nombre = (item?.name ?? '').trim()
        const m = nombre.match(/^OPC(ION|IÓN)\s*(\d+)/i)
        if (m) {
          const n = Number(m[2])
          const key = `OPCIÓN ${n}`
          if (row.opciones[key] === undefined) row.opciones[key] = 0
          row.opciones[key] += qty
          row.total_opciones += qty
        } else {
          row.menus_principales += qty
        }
      })

      // Procesar guarniciones desde custom_responses
      let customResponses = []
      if (Array.isArray(o.custom_responses)) {
        customResponses = o.custom_responses
      } else if (typeof o.custom_responses === 'string') {
        try { customResponses = JSON.parse(o.custom_responses) } catch {}
      }
      customResponses.forEach(resp => {
        const r = (resp?.response ?? '').trim()
        if (r) {
          row.tipos_guarniciones[r] = (row.tipos_guarniciones[r] || 0) + 1
          row.total_guarniciones += 1
        }
        if (Array.isArray(resp?.options)) {
          resp.options.forEach(opt => {
            const o = (opt ?? '').trim()
            if (!o) return
            row.tipos_guarniciones[o] = (row.tipos_guarniciones[o] || 0) + 1
            row.total_guarniciones += 1
          })
        }
      })

      byDay.set(key, row)
    })

    const daily_breakdown = days.map(d => byDay.get(d)).filter(Boolean)
    const range_totals = daily_breakdown.reduce((acc, d) => {
      acc.count += d.count
      acc.total_items += d.total_items
      acc.total_amount += d.total_amount
      acc.menus_principales += d.menus_principales
      acc.total_opciones += d.total_opciones
      acc.total_guarniciones += d.total_guarniciones
      return acc
    }, { count: 0, total_items: 0, total_amount: 0, menus_principales: 0, total_opciones: 0, total_guarniciones: 0 })

    return { data: { daily_breakdown, range_totals, start, end, statuses: COUNTABLE_STATUSES, timeZone }, error: null }
  },

  // Menú
  getMenuItems: async () => {
    // Usar cache para menú (cambia poco)
    const cacheKey = 'menu-items'
    const cached = cache.get(cacheKey)
    if (cached) return { data: cached, error: null }
    
    const { data, error } = await supabase
      .from('menu_items')
      .select('id, name, description, created_at') // Solo campos necesarios
      .order('created_at', { ascending: false })
    
    if (!error && data) {
      cache.set(cacheKey, data, 300000) // Cache por 5 minutos (menú cambia poco)
    }
    
    return { data, error }
  },

  updateMenuItems: async (menuItems) => {
    try {
      cache.clear() // Limpiar cache al actualizar menú
      
      // Obtener items existentes
      const { data: existingItems, error: fetchError } = await supabase
        .from('menu_items')
        .select('id')
      
      if (fetchError) {
        console.error('Error fetching existing items:', fetchError)
        return { error: fetchError }
      }

      const existingIds = existingItems?.map(item => item.id) || []
      const itemsToUpdate = menuItems.filter(item => item.id && existingIds.includes(item.id))
      const itemsToInsert = menuItems.filter(item => !item.id || !existingIds.includes(item.id))
      const idsToKeep = menuItems.filter(item => item.id).map(item => item.id)
      const itemsToDelete = existingIds.filter(id => !idsToKeep.includes(id))

      // Eliminar items que ya no están en la lista
      if (itemsToDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from('menu_items')
          .delete()
          .in('id', itemsToDelete)
        
        if (deleteError) {
          console.error('Error deleting items:', deleteError)
          return { error: deleteError }
        }
      }

      // Actualizar items existentes
      for (const item of itemsToUpdate) {
        const { error: updateError } = await supabase
          .from('menu_items')
          .update({
            name: item.name,
            description: item.description
          })
          .eq('id', item.id)
        
        if (updateError) {
          console.error('Error updating item:', updateError)
          return { error: updateError }
        }
      }

      // Insertar nuevos items
      if (itemsToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('menu_items')
          .insert(itemsToInsert.map(item => ({
            name: item.name,
            description: item.description
          })))
        
        if (insertError) {
          console.error('Error inserting items:', insertError)
          return { error: insertError }
        }
      }

      // Obtener todos los items actualizados
      const { data, error } = await supabase
        .from('menu_items')
        .select('id, name, description, created_at')
        .order('created_at', { ascending: true })
      
      return { data, error }
    } catch (err) {
      console.error('Unexpected error in updateMenuItems:', err)
      return { error: err }
    }
  },

  // Opciones personalizables
  getCustomOptions: async () => {
    // Usar cache para opciones (cambian poco)
    const cacheKey = 'custom-options'
    const cached = cache.get(cacheKey)
    if (cached) return { data: cached, error: null }
    
    const { data, error } = await supabase
      .from('custom_options')
      .select('*') // Seleccionar todos los campos
      .order('order_position', { ascending: true })
    
    if (!error && data) {
      cache.set(cacheKey, data, 120000) // Cache por 2 minutos
    }
    
    return { data, error }
  },

  createCustomOption: async (option) => {
    cache.clear() // Limpiar cache al crear opción
    const { data, error } = await supabase
      .from('custom_options')
      .insert([option])
      .select()
    return { data, error }
  },

  updateCustomOption: async (id, updates) => {
    cache.clear() // Limpiar cache al actualizar
    const { data, error } = await supabase
      .from('custom_options')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
    return { data, error }
  },

  deleteCustomOption: async (id) => {
    cache.clear() // Limpiar cache al eliminar
    const { data, error } = await supabase
      .from('custom_options')
      .delete()
      .eq('id', id)
    return { data, error }
  },

  updateCustomOptionsOrder: async (options) => {
    cache.clear() // Limpiar cache al reordenar
    // Actualizar el orden de múltiples opciones
    const promises = options.map((option, index) =>
      supabase
        .from('custom_options')
        .update({ order_position: index })
        .eq('id', option.id)
    )
    const results = await Promise.all(promises)
    const error = results.find(r => r.error)?.error
    return { error }
  }
}
