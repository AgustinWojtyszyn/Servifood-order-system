import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../services/supabase'

const AUTO_REFRESH_MS = 90000
const CHECK_TIMEOUT_MS = 8000
const METRICS_WINDOW_SECONDS = 3600
const METRICS_LIMIT = 300
const ERRORS_WINDOW_MS = 60 * 60 * 1000
const ERRORS_15M_WINDOW_MS = 15 * 60 * 1000
const ORDER_ZERO_ALERT_HOUR = 11

const ALERT_THRESHOLDS = {
  errors15mRed: 3,
  postgrestSlowMs: 1200,
  p95SlowMs: 2000
}

const ACTION_LABELS = {
  create: 'Crear pedido',
  update: 'Actualizar pedido',
  load: 'Cargar menú/pedidos',
  confirm: 'Confirmar',
  export: 'Exportar',
  other: 'Otras acciones'
}

const memoryCache = {
  snapshot: null,
  lastRefreshedAt: null
}

const actionOrder = ['create', 'load', 'confirm', 'export', 'update', 'other']

export const detectAction = (op = '', actionType = '', path = '') => {
  const explicit = `${actionType || ''} ${op || ''} ${path || ''}`.toLowerCase()

  if (explicit.includes('order_create') || explicit.includes('create_order') || explicit.includes('insert')) return 'create'
  if (explicit.includes('export')) return 'export'
  if (explicit.includes('confirm')) return 'confirm'
  if (explicit.includes('order_update') || explicit.includes('order_status') || explicit.includes('update') || explicit.includes('patch')) return 'update'
  if (explicit.includes('orders_list') || explicit.includes('menu') || explicit.includes('fetch') || explicit.includes('select') || explicit.includes('load')) return 'load'
  return 'other'
}

const toSafeNumber = (value) => {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

const startAbortable = (ref, timeoutMs = CHECK_TIMEOUT_MS) => {
  if (ref.current) ref.current.abort('cancelled')
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort('timeout'), timeoutMs)
  ref.current = controller
  return {
    controller,
    clear: () => clearTimeout(timer)
  }
}

const weightedPercentile = (points = [], percentile = 50) => {
  if (!Array.isArray(points) || points.length === 0) return null
  const sorted = points
    .filter((p) => Number.isFinite(p.value) && p.weight > 0)
    .sort((a, b) => a.value - b.value)
  if (sorted.length === 0) return null

  const totalWeight = sorted.reduce((acc, p) => acc + p.weight, 0)
  if (totalWeight <= 0) return null

  const target = (percentile / 100) * totalWeight
  let cumulative = 0
  for (const point of sorted) {
    cumulative += point.weight
    if (cumulative >= target) return Math.round(point.value)
  }

  return Math.round(sorted[sorted.length - 1].value)
}

const formatAgo = (isoDate) => {
  if (!isoDate) return null
  const diff = Date.now() - new Date(isoDate).getTime()
  if (!Number.isFinite(diff) || diff < 0) return 'recién'
  if (diff < 60000) return 'hace menos de 1 min'
  if (diff < 3600000) return `hace ${Math.floor(diff / 60000)} min`
  if (diff < 86400000) return `hace ${Math.floor(diff / 3600000)} h`
  return `hace ${Math.floor(diff / 86400000)} d`
}

const buildCheckResult = (ok, latencyMs, error = null) => ({
  ok,
  latencyMs: Number.isFinite(latencyMs) ? Math.round(latencyMs) : null,
  lastCheckedAt: new Date().toISOString(),
  error: error ? String(error).slice(0, 180) : null
})

export const useAppExperience = () => {
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)
  const [snapshot, setSnapshot] = useState(memoryCache.snapshot)
  const [lastRefreshedAt, setLastRefreshedAt] = useState(memoryCache.lastRefreshedAt)

  const postgrestControllerRef = useRef(null)
  const rpcControllerRef = useRef(null)
  const authControllerRef = useRef(null)
  const metricsControllerRef = useRef(null)
  const ordersControllerRef = useRef(null)
  const errorsControllerRef = useRef(null)
  const inFlightRef = useRef(false)
  const intervalRef = useRef(null)

  const fetchPostgrestHealth = async () => {
    const { controller, clear } = startAbortable(postgrestControllerRef)
    const started = performance.now()
    try {
      const { error: queryError } = await supabase
        .from('orders')
        .select('id')
        .limit(1)
        .abortSignal(controller.signal)
      const latency = performance.now() - started
      return buildCheckResult(!queryError, latency, queryError?.message || null)
    } catch (err) {
      const latency = performance.now() - started
      return buildCheckResult(false, latency, err?.message || 'PostgREST no disponible')
    } finally {
      clear()
    }
  }

  const fetchRpcHealth = async () => {
    const { controller, clear } = startAbortable(rpcControllerRef)
    const started = performance.now()
    try {
      const { error: rpcError } = await supabase
        .rpc('get_metrics_summary', {
          p_window_seconds: 60,
          p_limit: 1
        })
        .abortSignal(controller.signal)

      const latency = performance.now() - started
      return buildCheckResult(!rpcError, latency, rpcError?.message || null)
    } catch (err) {
      const latency = performance.now() - started
      return buildCheckResult(false, latency, err?.message || 'RPC no disponible')
    } finally {
      clear()
    }
  }

  const fetchAuthHealth = async () => {
    const { controller, clear } = startAbortable(authControllerRef)
    const started = performance.now()
    try {
      const { data, error: authError } = await supabase.auth.getSession()
      if (controller.signal.aborted) throw new Error('auth-check-timeout')
      const session = data?.session
      const expiresAtMs = toSafeNumber(session?.expires_at) * 1000
      const isValidToken = !!session?.access_token && expiresAtMs > Date.now()
      const latency = performance.now() - started

      if (authError) {
        return buildCheckResult(false, latency, authError.message || 'Sesión inválida')
      }

      return buildCheckResult(isValidToken, latency, isValidToken ? null : 'Token ausente o vencido')
    } catch (err) {
      const latency = performance.now() - started
      return buildCheckResult(false, latency, err?.message || 'Auth no disponible')
    } finally {
      clear()
    }
  }

  const fetchMetricsRows = async () => {
    const { controller, clear } = startAbortable(metricsControllerRef, 10000)
    try {
      const { data, error: metricsError } = await supabase
        .rpc('get_metrics_summary', {
          p_window_seconds: METRICS_WINDOW_SECONDS,
          p_limit: METRICS_LIMIT
        })
        .abortSignal(controller.signal)

      if (metricsError) throw metricsError
      return Array.isArray(data) ? data : []
    } finally {
      clear()
    }
  }

  const fetchOrdersToday = async () => {
    const { controller, clear } = startAbortable(ordersControllerRef, 10000)
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    const end = new Date(start)
    end.setDate(end.getDate() + 1)

    try {
      const { data, error: ordersError } = await supabase
        .from('orders')
        .select('created_at,status,service')
        .gte('created_at', start.toISOString())
        .lt('created_at', end.toISOString())
        .abortSignal(controller.signal)

      if (ordersError) throw ordersError

      const rows = Array.isArray(data) ? data : []
      const totals = {
        ordersTodayTotal: rows.length,
        ordersTodayLunch: 0,
        ordersTodayDinner: 0,
        ordersTodayPending: 0,
        ordersTodayConfirmed: 0,
        ordersTodayArchived: 0,
        lastOrderAt: null
      }

      rows.forEach((row) => {
        const service = (row?.service || 'lunch').toLowerCase()
        const status = (row?.status || '').toLowerCase()

        if (service === 'dinner') totals.ordersTodayDinner += 1
        else totals.ordersTodayLunch += 1

        if (status === 'pending') totals.ordersTodayPending += 1
        if (status === 'completed' || status === 'delivered') totals.ordersTodayConfirmed += 1
        if (status === 'archived') totals.ordersTodayArchived += 1

        if (!totals.lastOrderAt || new Date(row.created_at).getTime() > new Date(totals.lastOrderAt).getTime()) {
          totals.lastOrderAt = row.created_at
        }
      })

      return {
        ...totals,
        lastOrderAgo: totals.lastOrderAt ? formatAgo(totals.lastOrderAt) : null
      }
    } finally {
      clear()
    }
  }

  const fetchRecentErrors = async () => {
    const { controller, clear } = startAbortable(errorsControllerRef, 10000)
    const hourAgo = new Date(Date.now() - ERRORS_WINDOW_MS).toISOString()
    try {
      const { data, error: tableError } = await supabase
        .from('system_metrics')
        .select('message,created_at')
        .eq('kind', 'error')
        .gte('created_at', hourAgo)
        .order('created_at', { ascending: false })
        .limit(200)
        .abortSignal(controller.signal)

      if (tableError) return { rows: [], source: 'none' }
      return { rows: Array.isArray(data) ? data : [], source: 'system_metrics' }
    } finally {
      clear()
    }
  }

  const buildActionLatency = (metricsRows = []) => {
    const opRows = metricsRows.filter((row) => row?.kind === 'op')
    const groups = {}

    opRows.forEach((row) => {
      const action = detectAction(row?.op, row?.action_type, row?.path)
      if (!groups[action]) {
        groups[action] = {
          action,
          label: ACTION_LABELS[action] || ACTION_LABELS.other,
          calls: 0,
          p50Points: [],
          p95Points: []
        }
      }

      const calls = Math.max(1, toSafeNumber(row?.calls))
      groups[action].calls += calls

      const p50 = toSafeNumber(row?.p50_ms || row?.avg_ms || row?.duration_ms)
      const p95 = toSafeNumber(row?.p95_ms || row?.max_ms || row?.duration_ms)

      if (p50 > 0) groups[action].p50Points.push({ value: p50, weight: calls })
      if (p95 > 0) groups[action].p95Points.push({ value: p95, weight: calls })
    })

    return Object.values(groups)
      .map((g) => ({
        action: g.action,
        label: g.label,
        calls: g.calls,
        p50: weightedPercentile(g.p50Points, 50),
        p95: weightedPercentile(g.p95Points, 95)
      }))
      .sort((a, b) => {
        const ai = actionOrder.indexOf(a.action)
        const bi = actionOrder.indexOf(b.action)
        return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi)
      })
  }

  const buildErrorSummary = (errorRows = []) => {
    const rows = (errorRows || []).filter((row) => row?.message)
    const fifteenMinAgo = Date.now() - ERRORS_15M_WINDOW_MS

    const errorsLast15mCount = rows.filter((row) => new Date(row.created_at).getTime() >= fifteenMinAgo).length
    const lastError = rows[0] || null

    const topMap = new Map()
    rows.forEach((row) => {
      const msg = String(row.message || 'Error sin mensaje').trim().slice(0, 180)
      topMap.set(msg, (topMap.get(msg) || 0) + 1)
    })

    const topErrors = Array.from(topMap.entries())
      .map(([message, count]) => ({ message, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)

    return {
      errorsLast15mCount,
      lastErrorMessage: lastError?.message || null,
      lastErrorAt: lastError?.created_at || null,
      lastErrorAgo: lastError?.created_at ? formatAgo(lastError.created_at) : null,
      topErrors
    }
  }

  const buildAlerts = (state) => {
    const alerts = []
    const { health, ordersToday, errorSummary, actionLatency } = state

    if (!health.postgrest.ok) {
      alerts.push({ level: 'red', title: 'PostgREST caído', detail: health.postgrest.error || 'No responde la API de datos.' })
    }
    if (!health.rpc_create_order_idempotent.ok) {
      alerts.push({ level: 'red', title: 'RPC degradada', detail: health.rpc_create_order_idempotent.error || 'No responde el canal RPC.' })
    }
    if (!health.auth.ok) {
      alerts.push({ level: 'red', title: 'Sesión inválida', detail: health.auth.error || 'No hay token válido.' })
    }
    if (errorSummary.errorsLast15mCount >= ALERT_THRESHOLDS.errors15mRed) {
      alerts.push({
        level: 'red',
        title: 'Pico de errores',
        detail: `${errorSummary.errorsLast15mCount} errores en los últimos 15 minutos.`
      })
    }

    if (health.postgrest.ok && (health.postgrest.latencyMs || 0) > ALERT_THRESHOLDS.postgrestSlowMs) {
      alerts.push({
        level: 'yellow',
        title: 'Latencia alta en API',
        detail: `PostgREST está tardando ${health.postgrest.latencyMs} ms.`
      })
    }

    const slowAction = actionLatency.find((row) => (row.p95 || 0) > ALERT_THRESHOLDS.p95SlowMs)
    if (slowAction) {
      alerts.push({
        level: 'yellow',
        title: 'Latencia p95 alta',
        detail: `${slowAction.label} tiene p95 de ${slowAction.p95} ms.`
      })
    }

    const localHour = new Date().getHours()
    if (localHour >= ORDER_ZERO_ALERT_HOUR && ordersToday.ordersTodayTotal === 0) {
      alerts.push({
        level: 'yellow',
        title: 'Sin pedidos hoy',
        detail: `Son las ${localHour}:00 y todavía no hay pedidos registrados.`
      })
    }

    return alerts
      .sort((a, b) => (a.level === 'red' ? 0 : 1) - (b.level === 'red' ? 0 : 1))
      .slice(0, 5)
  }

  const refreshNow = async () => {
    if (document?.visibilityState === 'hidden' || inFlightRef.current) return
    inFlightRef.current = true
    setRefreshing(true)
    setError(null)

    try {
      const [postgrest, rpcFallback, auth, metricsRows, ordersToday, errorData] = await Promise.all([
        fetchPostgrestHealth(),
        fetchRpcHealth(),
        fetchAuthHealth(),
        fetchMetricsRows(),
        fetchOrdersToday(),
        fetchRecentErrors()
      ])

      const actionLatency = buildActionLatency(metricsRows)
      const errorSummary = buildErrorSummary(errorData.rows)

      const next = {
        health: {
          postgrest,
          rpc_create_order_idempotent: {
            ...rpcFallback,
            detail: 'medido vía get_metrics_summary (fallback seguro sin dry-run)'
          },
          auth
        },
        ordersToday,
        actionLatency,
        errorSummary
      }
      next.alerts = buildAlerts(next)

      setSnapshot(next)
      const refreshedAt = new Date().toISOString()
      setLastRefreshedAt(refreshedAt)
      memoryCache.snapshot = next
      memoryCache.lastRefreshedAt = refreshedAt
    } catch (err) {
      setError(err?.message || 'No se pudo actualizar Experiencia en vivo')
    } finally {
      inFlightRef.current = false
      setRefreshing(false)
    }
  }

  useEffect(() => {
    if (memoryCache.snapshot) {
      setSnapshot(memoryCache.snapshot)
      setLastRefreshedAt(memoryCache.lastRefreshedAt)
    } else {
      setLoading(true)
    }

    refreshNow().finally(() => setLoading(false))

    const onVisible = () => {
      if (document.visibilityState === 'visible') refreshNow()
    }

    intervalRef.current = setInterval(() => {
      if (document?.visibilityState !== 'hidden') refreshNow()
    }, AUTO_REFRESH_MS)
    document.addEventListener('visibilitychange', onVisible)

    const postgrestCtrl = postgrestControllerRef.current
    const rpcCtrl = rpcControllerRef.current
    const authCtrl = authControllerRef.current
    const metricsCtrl = metricsControllerRef.current
    const ordersCtrl = ordersControllerRef.current
    const errorsCtrl = errorsControllerRef.current

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      document.removeEventListener('visibilitychange', onVisible)
      postgrestCtrl?.abort('unmount')
      rpcCtrl?.abort('unmount')
      authCtrl?.abort('unmount')
      metricsCtrl?.abort('unmount')
      ordersCtrl?.abort('unmount')
      errorsCtrl?.abort('unmount')
    }
    // refreshNow queda intencionalmente fuera para preservar un único ciclo de montaje.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const derived = useMemo(() => {
    if (!snapshot) {
      return {
        health: {
          postgrest: buildCheckResult(false, null, 'Sin datos aún'),
          rpc_create_order_idempotent: buildCheckResult(false, null, 'Sin datos aún'),
          auth: buildCheckResult(false, null, 'Sin datos aún')
        },
        ordersToday: {
          ordersTodayTotal: 0,
          ordersTodayLunch: 0,
          ordersTodayDinner: 0,
          ordersTodayPending: 0,
          ordersTodayConfirmed: 0,
          ordersTodayArchived: 0,
          lastOrderAt: null,
          lastOrderAgo: null
        },
        actionLatency: [],
        errorSummary: {
          errorsLast15mCount: 0,
          lastErrorMessage: null,
          lastErrorAt: null,
          lastErrorAgo: null,
          topErrors: []
        },
        alerts: []
      }
    }
    return snapshot
  }, [snapshot])

  return {
    loading,
    refreshing,
    error,
    lastRefreshedAt,
    refreshNow,
    health: derived.health,
    ordersToday: derived.ordersToday,
    actionLatency: derived.actionLatency,
    errorSummary: derived.errorSummary,
    alerts: derived.alerts
  }
}
