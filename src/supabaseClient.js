// Usamos una única instancia compartida desde services/supabase para evitar
// el warning de múltiples GoTrueClient en el mismo storage.
import { supabase } from './services/supabase'
import { createOrdersService } from './services/orders/ordersService'
import { createMenuService } from './services/menu/menuService'
import { createCustomOptionsService } from './services/customOptions/customOptionsService'
import { createUsersService } from './services/users/usersService'
import { createAnalyticsService } from './services/analytics/analyticsService'
export { supabase }

// Redirección global si el token expira mucho tiempo (fuera de línea)
supabase.auth.onAuthStateChange((event, session) => {
  if ((event === 'SIGNED_OUT' || event === 'TOKEN_REFRESH_FAILED') && !session) {
    // Evitar interceptar rutas públicas de autenticación (ej: recovery/reset)
    const publicAuthRoutes = ['/login', '/forgot-password', '/reset-password', '/register', '/auth/callback']
    const isPublicAuthRoute = publicAuthRoutes.some((route) => window.location.pathname.startsWith(route))
    if (!isPublicAuthRoute) {
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

const ordersService = createOrdersService({
  supabase,
  invalidateCache: () => cache.clear()
})

// Configuración de autenticación
export const auth = {
  signUp: async (email, password, metadata = {}) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
        emailRedirectTo: `${window.location.origin}/auth/callback`
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
    // Evitamos scope global (403 con anon key). Si falla, limpiamos storage local.
    try {
      const { error } = await supabase.auth.signOut({ scope: 'local' })
      if (error) {
        clearSupabaseStorage()
        return { error }
      }
      return { error: null }
    } catch (error) {
      clearSupabaseStorage()
      return { error }
    }
  },

  resetPassword: async (email) => {
    const redirectTo = `${window.location.origin}/reset-password`
    if (import.meta.env.DEV) {
      console.debug('[auth-recovery] resetPassword redirectTo', redirectTo)
    }
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo
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

// Limpia cualquier rastro de sesión de Supabase en storages
export const clearSupabaseStorage = () => {
  const patterns = ['sb-', 'supabase', 'gotrue']
  ;[window.localStorage, window.sessionStorage].forEach(store => {
    if (!store) return
    const keysToRemove = []
    for (let i = 0; i < store.length; i++) {
      const key = store.key(i)
      if (patterns.some(p => key?.toLowerCase().includes(p))) {
        keysToRemove.push(key)
      }
    }
    keysToRemove.forEach(k => store.removeItem(k))
  })
}

// Funciones de base de datos
import { Archive as ArchiveIcon } from 'lucide-react'

// --- Auditoría básica (inserta registros en audit_logs) ---
const logAudit = async ({
  action,
  details = '',
  target_id = null,
  target_email = null,
  target_name = null,
  metadata = null,
  request_id = null
}) => {
  try {
    const { data: authUser } = await supabase.auth.getUser()
    const actor = authUser?.user
    const payload = {
      action,
      details,
      actor_id: actor?.id || null,
      actor_email: actor?.email || null,
      actor_name: actor?.user_metadata?.full_name || actor?.email || 'Administrador',
      target_id,
      target_email,
      target_name,
      metadata,
      created_at: new Date().toISOString(),
      request_id: request_id || null
    }
    // Idempotencia por request_id + action
    await supabase.from('audit_logs').upsert([payload], { onConflict: 'request_id,action' })
  } catch (err) {
    if (import.meta.env.DEV) {
      console.warn('[audit][logAudit] no se pudo registrar auditoría:', err?.message || err)
    }
  }
}

const menuService = createMenuService({
  supabase,
  cache,
  invalidateCache: () => cache.clear(),
  logAudit
})

const customOptionsService = createCustomOptionsService({
  supabase,
  cache,
  invalidateCache: () => cache.clear()
})

const usersService = createUsersService({
  supabase,
  cache,
  invalidateCache: () => cache.clear(),
  logAudit
})

const analyticsService = createAnalyticsService({ supabase })

export const db = {
  ...ordersService,
  ...menuService,
  ...customOptionsService,
  ...usersService,
  ...analyticsService,

    
  // Cafeteria orders (admin only via RLS)
  getCafeteriaOrders: async () => {
    const { data, error } = await supabase
      .from('cafeteria_orders')
      .select('id, user_id, items, total_items, status, created_at, updated_at, company_slug, company_name, admin_name, admin_email, notes')
      .order('created_at', { ascending: false })
    return { data, error }
  },

  getCafeteriaOrderById: async (orderId) => {
    const { data, error } = await supabase
      .from('cafeteria_orders')
      .select('id, user_id, items, total_items, status, created_at, updated_at, company_slug, company_name, admin_name, admin_email, notes')
      .eq('id', orderId)
      .single()
    return { data, error }
  },

  createCafeteriaOrder: async ({ userId, items, totalItems, companySlug, companyName, adminName, adminEmail, notes }) => {
    const { data, error } = await supabase
      .from('cafeteria_orders')
      .insert([{
        user_id: userId,
        items,
        total_items: totalItems,
        company_slug: companySlug || null,
        company_name: companyName || null,
        admin_name: adminName || null,
        admin_email: adminEmail || null,
        notes: notes || null
      }])
      .select()
      .single()
    return { data, error }
  },

  updateCafeteriaOrder: async (orderId, { items, totalItems, companySlug, companyName, notes }) => {
    const { data, error } = await supabase
      .from('cafeteria_orders')
      .update({
        items,
        total_items: totalItems,
        company_slug: companySlug || null,
        company_name: companyName || null,
        notes: notes || null
      })
      .eq('id', orderId)
      .select()
      .single()
    return { data, error }
  },

  deleteCafeteriaOrder: async (orderId) => {
    const { error } = await supabase
      .from('cafeteria_orders')
      .delete()
      .eq('id', orderId)
    return { error }
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

  // users/admin moved to usersService
  // analytics moved to analyticsService

  // custom_options/custom_option_overrides moved to customOptionsService
  // dinner_menu_by_date methods moved to menuService
}
