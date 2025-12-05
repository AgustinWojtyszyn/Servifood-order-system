// --- AUTH API migrada desde supabaseClient.js ---
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
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
      options: {
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
// --- DB API migrada desde supabaseClient.js ---
export const db = {
  // Marcar todos los pedidos pendientes de días anteriores como completados
  completeAllOldPendingOrders: async () => {
    const { data, error } = await supabase
      .from('orders')
      .update({ status: 'completed', updated_at: new Date().toISOString() })
      .lt('created_at', new Date().toISOString().slice(0, 10))
      .eq('status', 'pending')
    return { data, error }
  },

  // Usuarios
  getUsers: async () => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
    return { data, error }
  },
  updateUserRole: async (userId, role) => {
    cache.clear()
    const { data, error } = await supabase
      .from('users')
      .update({ role })
      .eq('id', userId)
      .select()
    return { data: Array.isArray(data) ? data[0] : data, error }
  },
  deleteUser: async (userId) => {
    const { error: ordersError } = await supabase
      .from('orders')
      .delete()
      .eq('user_id', userId)
    if (ordersError) return { error: ordersError }
    const { data, error } = await supabase
      .from('users')
      .delete()
      .eq('id', userId)
    return { data, error }
  },

  // Pedidos
  createOrder: async (orderData) => {
    cache.clear()
    const { data, error } = await supabase
      .from('orders')
      .insert([orderData])
      .select()
    return { data, error }
  },
  getOrders: async (userId = null) => {
    let query = supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
    if (userId) {
      query = query.eq('user_id', userId)
    }
    const { data, error } = await query
    return { data, error }
  },
  updateOrderStatus: async (orderId, status) => {
    cache.clear()
    const { data, error } = await supabase
      .from('orders')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', orderId)
      .select()
    return { data, error }
  },
  deleteOrder: async (orderId) => {
    cache.clear()
    const { data, error } = await supabase
      .from('orders')
      .delete()
      .eq('id', orderId)
    return { data, error }
  },
  deleteCompletedOrders: async () => {
    cache.clear()
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

  // Menú
  getMenuItems: async () => {
    const cacheKey = 'menu-items'
    const cached = cache.get(cacheKey)
    if (cached) return { data: cached, error: null }
    const { data, error } = await supabase
      .from('menu_items')
      .select('id, name, description, created_at')
      .order('created_at', { ascending: false })
    if (!error && data) {
      cache.set(cacheKey, data, 300000)
    }
    return { data, error }
  },
  updateMenuItems: async (menuItems) => {
    try {
      cache.clear()
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
    const cacheKey = 'custom-options'
    const cached = cache.get(cacheKey)
    if (cached) return { data: cached, error: null }
    const { data, error } = await supabase
      .from('custom_options')
      .select('*')
      .order('order_position', { ascending: true })
    if (!error && data) {
      cache.set(cacheKey, data, 120000)
    }
    return { data, error }
  },
  createCustomOption: async (option) => {
    cache.clear()
    const { data, error } = await supabase
      .from('custom_options')
      .insert([option])
      .select()
    return { data, error }
  },
  updateCustomOption: async (id, updates) => {
    cache.clear()
    const { data, error } = await supabase
      .from('custom_options')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
    return { data, error }
  },
  deleteCustomOption: async (id) => {
    cache.clear()
    const { data, error } = await supabase
      .from('custom_options')
      .delete()
      .eq('id', id)
    return { data, error }
  },
  updateCustomOptionsOrder: async (options) => {
    cache.clear()
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
import { createClient } from '@supabase/supabase-js'
import { sanitizeInput } from '../utils'

// Configuración del cliente Supabase optimizada
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// Cliente principal con configuración avanzada
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  },
  db: {
    schema: 'public'
  },
  global: {
    headers: {
      'x-application-name': 'servifood-app',
      'x-client-info': 'servifood-web'
    }
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
})

// Cache inteligente con TTL y LRU-like eviction
class SmartCache {
  constructor(maxSize = 100, defaultTTL = 30000) {
    this.cache = new Map()
    this.maxSize = maxSize
    this.defaultTTL = defaultTTL
  }

  get(key) {
    const item = this.cache.get(key)
    if (!item) return null

    if (Date.now() > item.expiry) {
      this.cache.delete(key)
      return null
    }

    // Actualizar LRU
    item.lastAccessed = Date.now()
    return item.value
  }

  set(key, value, ttl = this.defaultTTL) {
    const expiry = Date.now() + ttl

    if (this.cache.size >= this.maxSize) {
      // Evict least recently used
      let oldestKey = null
      let oldestTime = Date.now()

      for (const [k, v] of this.cache) {
        if (v.lastAccessed < oldestTime) {
          oldestTime = v.lastAccessed
          oldestKey = k
        }
      }

      if (oldestKey) {
        this.cache.delete(oldestKey)
      }
    }

    this.cache.set(key, {
      value,
      expiry,
      lastAccessed: Date.now()
    })
  }

  clear() {
    this.cache.clear()
  }

  delete(key) {
    return this.cache.delete(key)
  }

  has(key) {
    const item = this.cache.get(key)
    if (!item) return false

    if (Date.now() > item.expiry) {
      this.cache.delete(key)
      return false
    }

    return true
  }
}

// Instancia global del cache
export const cache = new SmartCache()

// Wrapper para operaciones con retry y cache
class SupabaseService {
  constructor() {
    this.maxRetries = 3
    this.retryDelay = 1000
  }

  async withRetry(operation, context = '') {
    let lastError

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error

        if (attempt === this.maxRetries) {
          console.error(`Operation failed after ${this.maxRetries} attempts${context ? ` in ${context}` : ''}:`, error)
          throw error
        }

        // Exponential backoff
        const delay = this.retryDelay * Math.pow(2, attempt - 1)
        console.warn(`Attempt ${attempt} failed${context ? ` in ${context}` : ''}, retrying in ${delay}ms...`)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }

    throw lastError
  }

  async cachedQuery(key, queryFn, ttl = 30000, force = false) {
    if (!force && cache.has(key)) {
      return cache.get(key)
    }

    const result = await this.withRetry(queryFn, `cached query ${key}`)
    cache.set(key, result, ttl)
    return result
  }

  invalidateCache(pattern = null) {
    if (pattern) {
      // Invalidate by pattern (simple string matching)
      for (const key of cache.cache.keys()) {
        if (key.includes(pattern)) {
          cache.delete(key)
        }
      }
    } else {
      cache.clear()
    }
  }
}

// Instancia global del servicio
export const supabaseService = new SupabaseService()

// Función helper para sanitizar queries
export const sanitizeQuery = (query) => {
  if (typeof query === 'string') {
    return sanitizeInput(query)
  }
  if (typeof query === 'object' && query !== null) {
    const sanitized = {}
    for (const [key, value] of Object.entries(query)) {
      sanitized[key] = typeof value === 'string' ? sanitizeInput(value) : value
    }
    return sanitized
  }
  return query
}

// Health check del servicio
export const healthCheck = async () => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('count', { count: 'exact', head: true })
      .limit(1)

    return {
      healthy: !error,
      timestamp: new Date().toISOString(),
      error: error?.message
    }
  } catch (error) {
    return {
      healthy: false,
      timestamp: new Date().toISOString(),
      error: error.message
    }
  }
}
