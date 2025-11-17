import { supabase, supabaseService, sanitizeQuery } from './supabase'
import { handleError } from '../utils'
import { ORDER_STATUS } from '../types'

class OrdersService {
  // Crear pedido con validación
  async createOrder(orderData) {
    try {
      const sanitizedData = sanitizeQuery(orderData)

      // Validaciones básicas
      if (!sanitizedData.user_id) {
        throw new Error('ID de usuario requerido')
      }

      if (!sanitizedData.items || !Array.isArray(sanitizedData.items) || sanitizedData.items.length === 0) {
        throw new Error('Debe incluir al menos un item')
      }

      if (!sanitizedData.location) {
        throw new Error('Ubicación requerida')
      }

      // Añadir timestamp y estado por defecto
      const orderWithDefaults = {
        ...sanitizedData,
        status: ORDER_STATUS.PENDING,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const { data, error } = await supabaseService.withRetry(
        () => supabase
          .from('orders')
          .insert([orderWithDefaults])
          .select()
          .single(),
        'createOrder'
      )

      if (error) throw error

      // Invalidar cache relacionado con pedidos
      supabaseService.invalidateCache('orders')

      return { data, error: null }
    } catch (error) {
      return { data: null, error: handleError(error, 'createOrder') }
    }
  }

  // Obtener pedidos con cache inteligente
  async getOrders(userId = null, options = {}) {
    try {
      const {
        status,
        limit = 50,
        offset = 0,
        includeUserData = false,
        force = false
      } = options

      const cacheKey = `orders_${userId || 'all'}_${status || 'all'}_${limit}_${offset}`

      const queryFn = async () => {
        let query = supabase
          .from('orders')
          .select(includeUserData ? '*, users!inner(*)' : '*')
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1)

        if (userId) {
          query = query.eq('user_id', userId)
        }

        if (status) {
          query = query.eq('status', status)
        }

        const { data, error } = await query

        if (error) throw error

        return data || []
      }

      const data = await supabaseService.cachedQuery(cacheKey, queryFn, 30000, force)

      return { data, error: null }
    } catch (error) {
      return { data: [], error: handleError(error, 'getOrders') }
    }
  }

  // Obtener pedido por ID
  async getOrderById(orderId) {
    try {
      if (!orderId) {
        throw new Error('ID de pedido requerido')
      }

      const cacheKey = `order_${orderId}`

      const queryFn = async () => {
        const { data, error } = await supabase
          .from('orders')
          .select('*, users!inner(*)')
          .eq('id', orderId)
          .single()

        if (error) throw error

        return data
      }

      const data = await supabaseService.cachedQuery(cacheKey, queryFn, 60000)

      return { data, error: null }
    } catch (error) {
      return { data: null, error: handleError(error, 'getOrderById') }
    }
  }

  // Actualizar estado del pedido
  async updateOrderStatus(orderId, status, additionalData = {}) {
    try {
      if (!orderId) {
        throw new Error('ID de pedido requerido')
      }

      if (!Object.values(ORDER_STATUS).includes(status)) {
        throw new Error('Estado de pedido inválido')
      }

      const sanitizedData = sanitizeQuery(additionalData)

      const updateData = {
        status,
        updated_at: new Date().toISOString(),
        ...sanitizedData
      }

      const { data, error } = await supabaseService.withRetry(
        () => supabase
          .from('orders')
          .update(updateData)
          .eq('id', orderId)
          .select()
          .single(),
        'updateOrderStatus'
      )

      if (error) throw error

      // Invalidar cache
      supabaseService.invalidateCache('orders')
      supabaseService.invalidateCache(`order_${orderId}`)

      return { data, error: null }
    } catch (error) {
      return { data: null, error: handleError(error, 'updateOrderStatus') }
    }
  }

  // Actualizar pedido completo
  async updateOrder(orderId, updates) {
    try {
      if (!orderId) {
        throw new Error('ID de pedido requerido')
      }

      const sanitizedUpdates = sanitizeQuery(updates)

      const updateData = {
        ...sanitizedUpdates,
        updated_at: new Date().toISOString()
      }

      const { data, error } = await supabaseService.withRetry(
        () => supabase
          .from('orders')
          .update(updateData)
          .eq('id', orderId)
          .select()
          .single(),
        'updateOrder'
      )

      if (error) throw error

      // Invalidar cache
      supabaseService.invalidateCache('orders')
      supabaseService.invalidateCache(`order_${orderId}`)

      return { data, error: null }
    } catch (error) {
      return { data: null, error: handleError(error, 'updateOrder') }
    }
  }

  // Eliminar pedido
  async deleteOrder(orderId) {
    try {
      if (!orderId) {
        throw new Error('ID de pedido requerido')
      }

      const { error } = await supabaseService.withRetry(
        () => supabase
          .from('orders')
          .delete()
          .eq('id', orderId),
        'deleteOrder'
      )

      if (error) throw error

      // Invalidar cache
      supabaseService.invalidateCache('orders')
      supabaseService.invalidateCache(`order_${orderId}`)

      return { error: null }
    } catch (error) {
      return { error: handleError(error, 'deleteOrder') }
    }
  }

  // Eliminar pedidos completados (admin)
  async deleteCompletedOrders() {
    try {
      const { data, error } = await supabaseService.withRetry(
        () => supabase
          .from('orders')
          .delete()
          .in('status', [ORDER_STATUS.COMPLETED, ORDER_STATUS.DELIVERED]),
        'deleteCompletedOrders'
      )

      if (error) throw error

      // Invalidar cache
      supabaseService.invalidateCache('orders')

      return { data, error: null }
    } catch (error) {
      return { data: null, error: handleError(error, 'deleteCompletedOrders') }
    }
  }

  // Obtener estadísticas de pedidos
  async getOrderStats(userId = null, dateRange = null) {
    try {
      const cacheKey = `order_stats_${userId || 'all'}_${dateRange || 'all'}`

      const queryFn = async () => {
        let query = supabase
          .from('orders')
          .select('status, created_at')

        if (userId) {
          query = query.eq('user_id', userId)
        }

        if (dateRange) {
          const { start, end } = dateRange
          query = query.gte('created_at', start).lte('created_at', end)
        }

        const { data, error } = await query

        if (error) throw error

        const stats = {
          total: data.length,
          pending: data.filter(o => o.status === ORDER_STATUS.PENDING).length,
          processing: data.filter(o => o.status === ORDER_STATUS.PROCESSING).length,
          completed: data.filter(o => o.status === ORDER_STATUS.COMPLETED).length,
          delivered: data.filter(o => o.status === ORDER_STATUS.DELIVERED).length,
          cancelled: data.filter(o => o.status === ORDER_STATUS.CANCELLED).length
        }

        return stats
      }

      const data = await supabaseService.cachedQuery(cacheKey, queryFn, 60000)

      return { data, error: null }
    } catch (error) {
      return { data: null, error: handleError(error, 'getOrderStats') }
    }
  }

  // Buscar pedidos
  async searchOrders(searchTerm, userId = null, options = {}) {
    try {
      const { limit = 20, status } = options

      const cacheKey = `search_orders_${searchTerm}_${userId || 'all'}_${status || 'all'}_${limit}`

      const queryFn = async () => {
        let query = supabase
          .from('orders')
          .select('*, users!inner(*)')
          .or(`customer_name.ilike.%${searchTerm}%,location.ilike.%${searchTerm}%,comments.ilike.%${searchTerm}%`)
          .order('created_at', { ascending: false })
          .limit(limit)

        if (userId) {
          query = query.eq('user_id', userId)
        }

        if (status) {
          query = query.eq('status', status)
        }

        const { data, error } = await query

        if (error) throw error

        return data || []
      }

      const data = await supabaseService.cachedQuery(cacheKey, queryFn, 30000)

      return { data, error: null }
    } catch (error) {
      return { data: [], error: handleError(error, 'searchOrders') }
    }
  }

  // Marcar múltiples pedidos como completados
  async bulkUpdateStatus(orderIds, status) {
    try {
      if (!Array.isArray(orderIds) || orderIds.length === 0) {
        throw new Error('Lista de IDs de pedidos requerida')
      }

      if (!Object.values(ORDER_STATUS).includes(status)) {
        throw new Error('Estado de pedido inválido')
      }

      const updateData = {
        status,
        updated_at: new Date().toISOString()
      }

      const { data, error } = await supabaseService.withRetry(
        () => supabase
          .from('orders')
          .update(updateData)
          .in('id', orderIds)
          .select(),
        'bulkUpdateStatus'
      )

      if (error) throw error

      // Invalidar cache
      supabaseService.invalidateCache('orders')

      return { data, error: null }
    } catch (error) {
      return { data: null, error: handleError(error, 'bulkUpdateStatus') }
    }
  }
}

// Instancia singleton del servicio
export const ordersService = new OrdersService()
