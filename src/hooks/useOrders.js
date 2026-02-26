import { useState, useEffect, useCallback, useMemo } from 'react'
import { ordersService } from '../services/orders'
import { debounce } from '../utils'

export const useOrders = (userId = null, options = {}) => {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    archived: 0,
    cancelled: 0
  })

  const {
    autoRefresh = false,
    refreshInterval = 30000,
    includeUserData = false
  } = options

  // Cargar pedidos
  const loadOrders = useCallback(async (force = false) => {
    try {
      setError(null)
      if (!force) setLoading(true)

      const result = await ordersService.getOrders(userId, {
        includeUserData,
        force
      })

      if (result.error) {
        setError(result.error)
        return
      }

      setOrders(result.data)

      // Calcular estadísticas
      const orderStats = await ordersService.getOrderStats(userId)
      if (!orderStats.error) {
        setStats(orderStats.data)
      }

    } catch (err) {
      setError(err)
    } finally {
      if (!force) setLoading(false)
    }
  }, [userId, includeUserData])

  // Cargar pedidos iniciales
  useEffect(() => {
    loadOrders()

    // Auto-refresh si está habilitado
    let interval
    if (autoRefresh) {
      interval = setInterval(() => {
        loadOrders(true) // Silent refresh
      }, refreshInterval)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [loadOrders, autoRefresh, refreshInterval])

  // Crear pedido
  const createOrder = useCallback(async (orderData) => {
    try {
      const result = await ordersService.createOrder(orderData)

      if (result.error) {
        return result
      }

      // Recargar pedidos
      await loadOrders(true)

      return result
    } catch (error) {
      return { data: null, error }
    }
  }, [loadOrders])

  // Actualizar estado del pedido
  const updateOrderStatus = useCallback(async (orderId, status) => {
    try {
      const result = await ordersService.updateOrderStatus(orderId, status)

      if (result.error) {
        return result
      }

      // Actualizar estado local optimistamente
      setOrders(prev => prev.map(order =>
        order.id === orderId
          ? { ...order, status, updated_at: new Date().toISOString() }
          : order
      ))

      // Recargar estadísticas
      const orderStats = await ordersService.getOrderStats(userId)
      if (!orderStats.error) {
        setStats(orderStats.data)
      }

      return result
    } catch (error) {
      return { data: null, error }
    }
  }, [userId])

  // Marcar como archivado
  const markAsArchived = useCallback(async (orderId) => {
    return updateOrderStatus(orderId, 'archived')
  }, [updateOrderStatus])

  // Marcar múltiples como archivados
  const markMultipleAsArchived = useCallback(async (orderIds) => {
    try {
      const result = await ordersService.bulkUpdateStatus(orderIds, 'archived')

      if (result.error) {
        return result
      }

      // Actualizar estado local
      setOrders(prev => prev.map(order =>
        orderIds.includes(order.id)
          ? { ...order, status: 'archived', updated_at: new Date().toISOString() }
          : order
      ))

      // Recargar estadísticas
      const orderStats = await ordersService.getOrderStats(userId)
      if (!orderStats.error) {
        setStats(orderStats.data)
      }

      return result
    } catch (error) {
      return { data: null, error }
    }
  }, [userId])

  // Buscar pedidos con debounce
  const searchOrders = useCallback(
    debounce(async (searchTerm) => {
      if (!searchTerm.trim()) {
        await loadOrders(true)
        return
      }

      try {
        setLoading(true)
        setError(null)

        const result = await ordersService.searchOrders(searchTerm, userId)

        if (result.error) {
          setError(result.error)
          return
        }

        setOrders(result.data)
      } catch (err) {
        setError(err)
      } finally {
        setLoading(false)
      }
    }, 300),
    [userId, loadOrders]
  )

  // Filtrar pedidos por estado
  const filterByStatus = useCallback(async (status) => {
    try {
      setLoading(true)
      setError(null)

      const result = await ordersService.getOrders(userId, {
        status,
        includeUserData
      })

      if (result.error) {
        setError(result.error)
        return
      }

      setOrders(result.data)
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [userId, includeUserData])

  // Computed values
  const pendingOrders = useMemo(() =>
    orders.filter(order => order.status === 'pending'),
    [orders]
  )

  const activeOrders = useMemo(() =>
    orders.filter(order => order.status !== 'archived'),
    [orders]
  )

  const archivedOrders = useMemo(() =>
    orders.filter(order => order.status === 'archived'),
    [orders]
  )

  const todayOrders = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    return orders.filter(order => {
      const orderDate = new Date(order.created_at)
      orderDate.setHours(0, 0, 0, 0)
      return orderDate.getTime() === today.getTime()
    })
  }, [orders])

  return {
    // Estado
    orders,
    loading,
    error,
    stats,

    // Computed
    pendingOrders,
    activeOrders,
    archivedOrders,
    todayOrders,

    // Acciones
    loadOrders,
    createOrder,
    updateOrderStatus,
    markAsArchived,
    markMultipleAsArchived,
    searchOrders,
    filterByStatus
  }
}
