import { useEffect, useState, useCallback, useRef } from 'react'
import { auditService } from '../../services/audit'
import { healthCheck, supabase } from '../../services/supabase'
import { getUserFriendlyErrorMessage } from '../../utils'

export const useAuditLogsData = () => {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [health, setHealth] = useState(null)
  const [healthLoading, setHealthLoading] = useState(true)
  const [healthError, setHealthError] = useState(null)

  const [ordersCount, setOrdersCount] = useState(null)
  const [ordersError, setOrdersError] = useState(null)
  const [ordersRealtimeStatus, setOrdersRealtimeStatus] = useState('connecting')

  const [healthLogs, setHealthLogs] = useState([])
  const [healthLogsLoading, setHealthLogsLoading] = useState(true)
  const [healthLogsError, setHealthLogsError] = useState(null)
  const isFetchingOrdersCountRef = useRef(false)

  const loadLogs = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error } = await auditService.getAuditLogs()
    if (error) setError(getUserFriendlyErrorMessage(error, 'No se pudieron cargar los registros. Intentá nuevamente.'))
    setLogs(data || [])
    setLoading(false)
  }, [])

  const loadHealth = useCallback(async () => {
    setHealthLoading(true)
    setHealthError(null)
    try {
      const res = await healthCheck()
      if (!res?.healthy) {
        setHealthError(getUserFriendlyErrorMessage(res?.error, 'No pudimos comprobar el estado del sistema. Intentá nuevamente.'))
      }
      setHealth(res)
    } catch (err) {
      setHealthError(getUserFriendlyErrorMessage(err, 'No se pudo obtener el estado del sistema. Intentá nuevamente.'))
    } finally {
      setHealthLoading(false)
    }
  }, [])

  const loadHealthProbes = useCallback(async () => {
    setHealthLogsLoading(true)
    setHealthLogsError(null)
    try {
      const { data, error } = await auditService.getAuditLogs({
        actions: ['health_probe'],
        limit: 200
      })
      if (error) {
        setHealthLogsError(getUserFriendlyErrorMessage(error, 'No se pudieron cargar los registros de estado. Intentá nuevamente.'))
        setHealthLogs([])
      } else {
        setHealthLogs(data || [])
      }
    } catch (err) {
      setHealthLogsError(getUserFriendlyErrorMessage(err, 'No se pudieron cargar los registros de estado. Intentá nuevamente.'))
      setHealthLogs([])
    } finally {
      setHealthLogsLoading(false)
    }
  }, [])

  const loadOrdersCount = useCallback(async (silent = false) => {
    if (isFetchingOrdersCountRef.current) return
    isFetchingOrdersCountRef.current = true
    if (!silent) setOrdersError(null)
    try {
      const start = new Date()
      start.setHours(0, 0, 0, 0)
      const end = new Date()
      end.setHours(23, 59, 59, 999)
      const { count, error } = await supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString())

      if (error) {
        setOrdersError(getUserFriendlyErrorMessage(error, 'No pudimos contar los pedidos del día. Intentá nuevamente.'))
      } else {
        setOrdersCount(count ?? 0)
        setOrdersError(null)
      }
    } catch (err) {
      setOrdersError(getUserFriendlyErrorMessage(err, 'No pudimos contar los pedidos del día. Intentá nuevamente.'))
    } finally {
      isFetchingOrdersCountRef.current = false
    }
  }, [])

  useEffect(() => {
    loadLogs()
    loadHealth()
    loadOrdersCount()
    loadHealthProbes()

    let disposed = false
    let refreshTimer = null
    let fallbackInterval = null

    const isPageHidden = () => typeof document !== 'undefined' && document.visibilityState === 'hidden'

    const refreshOrdersSoon = () => {
      if (disposed || isPageHidden()) return
      if (refreshTimer) clearTimeout(refreshTimer)
      refreshTimer = setTimeout(() => {
        refreshTimer = null
        loadOrdersCount(true)
      }, 250)
    }

    const stopFallback = () => {
      if (!fallbackInterval) return
      clearInterval(fallbackInterval)
      fallbackInterval = null
    }

    const startFallback = () => {
      if (fallbackInterval) return
      fallbackInterval = setInterval(() => {
        if (!isPageHidden()) loadOrdersCount(true)
      }, 60000)
    }

    const channel = supabase
      .channel('audit-orders-count')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        refreshOrdersSoon
      )
      .subscribe((status) => {
        if (disposed) return
        if (status === 'SUBSCRIBED') {
          setOrdersRealtimeStatus('subscribed')
          stopFallback()
          return
        }
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          setOrdersRealtimeStatus('fallback')
          startFallback()
          return
        }
        setOrdersRealtimeStatus('connecting')
      })

    const handleVisibilityChange = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        loadOrdersCount(true)
      }
    }

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange)
    }

    return () => {
      disposed = true
      if (refreshTimer) clearTimeout(refreshTimer)
      stopFallback()
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange)
      }
      void supabase.removeChannel(channel)
    }
  }, [loadHealth, loadHealthProbes, loadLogs, loadOrdersCount])

  return {
    logs,
    loading,
    error,
    loadLogs,

    health,
    healthLoading,
    healthError,
    loadHealth,

    ordersCount,
    ordersError,
    ordersRealtimeStatus,
    loadOrdersCount,

    healthLogs,
    healthLogsLoading,
    healthLogsError,
    loadHealthProbes
  }
}
