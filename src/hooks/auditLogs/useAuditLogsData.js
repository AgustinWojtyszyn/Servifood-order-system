import { useEffect, useState, useCallback } from 'react'
import { auditService } from '../../services/audit'
import { healthCheck, supabase } from '../../services/supabase'

export const useAuditLogsData = () => {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [health, setHealth] = useState(null)
  const [healthLoading, setHealthLoading] = useState(true)
  const [healthError, setHealthError] = useState(null)

  const [ordersCount, setOrdersCount] = useState(null)
  const [ordersError, setOrdersError] = useState(null)

  const [healthLogs, setHealthLogs] = useState([])
  const [healthLogsLoading, setHealthLogsLoading] = useState(true)
  const [healthLogsError, setHealthLogsError] = useState(null)

  const loadLogs = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error } = await auditService.getAuditLogs()
    if (error) setError(error.message || 'No se pudieron cargar los registros')
    setLogs(data || [])
    setLoading(false)
  }, [])

  const loadHealth = useCallback(async () => {
    setHealthLoading(true)
    setHealthError(null)
    try {
      const res = await healthCheck()
      if (!res?.healthy) {
        setHealthError(res?.error || 'Supabase respondió con error')
      }
      setHealth(res)
    } catch (err) {
      setHealthError(err?.message || 'No se pudo obtener salud del sistema')
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
        setHealthLogsError(error.message || 'No se pudieron cargar los health probes')
        setHealthLogs([])
      } else {
        setHealthLogs(data || [])
      }
    } catch (err) {
      setHealthLogsError(err?.message || 'Error cargando health probes')
      setHealthLogs([])
    } finally {
      setHealthLogsLoading(false)
    }
  }, [])

  const loadOrdersCount = useCallback(async (silent = false) => {
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
        setOrdersError(error.message || 'Error al contar pedidos del día')
      } else {
        setOrdersCount(count ?? 0)
      }
    } catch (err) {
      setOrdersError(err?.message || 'Error desconocido al contar pedidos del día')
    }
  }, [])

  useEffect(() => {
    loadLogs()
    loadHealth()
    loadOrdersCount()
    loadHealthProbes()

    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document?.visibilityState === 'hidden') return
      loadOrdersCount(true)
    }, 10000) // 10s para pseudo tiempo real ligero sin gastar en background

    return () => clearInterval(interval)
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
    loadOrdersCount,

    healthLogs,
    healthLogsLoading,
    healthLogsError,
    loadHealthProbes
  }
}

