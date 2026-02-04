import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase, healthCheck } from '../services/supabase'

// Ventanas alineadas a la necesidad del módulo (sin exponerlas en UI)
const WINDOW_SECONDS = 3600 // traemos hasta 60 min para tener errores recientes
const REFRESH_MS = 60000 // refresco pasivo más liviano
const USAGE_WINDOW_MS = 10 * 60 * 1000
const PROBLEM_WINDOW_MS = 30 * 60 * 1000
const ERROR_WINDOW_MS = 60 * 60 * 1000
const CONNECTIVITY_REFRESH_MS = 12000
const PING_ONCE_KEY = 'exp_ping_once' // evita spam por render

// Umbrales deterministas (no se muestran en UI)
const THRESHOLDS = {
  slowMs: 1200, // acción lenta
  graveMs: 2000, // acción muy lenta
  slowRate: 0.15 // 15% lentas en ventana -> amber
}

const ACTION_LABEL = {
  create: 'guardar pedidos',
  update: 'actualizar pedidos',
  load: 'cargar pedidos',
  confirm: 'confirmar acciones',
  other: 'acciones generales'
}

// Publicar para tests/fixtures
export const detectAction = (op = '', actionType = '', path = '') => {
  const explicit = (actionType || '').toLowerCase()
  if (explicit) {
    if (explicit.includes('order_create')) return 'create'
    if (explicit.includes('order_update')) return 'update'
    if (explicit.includes('order_status')) return 'update'
    if (explicit.includes('orders_list') || explicit.includes('load')) return 'load'
    if (explicit.includes('payment_confirm')) return 'confirm'
  }
  const name = `${op} ${path}`.toLowerCase()
  if (name.includes('insert') || name.includes('create') || name.includes('new') || name.includes('add')) return 'create'
  if (name.includes('update') || name.includes('status') || name.includes('patch')) return 'update'
  if (name.includes('list') || name.includes('get') || name.includes('fetch') || name.includes('select') || name.includes('load')) return 'load'
  if (name.includes('confirm') || name.includes('approve')) return 'confirm'
  return 'other'
}

const stateOrder = { red: 2, amber: 1, green: 0 }

// Cache en memoria (SWR) para evitar pantallas en blanco y reducir requests
const experienceCache = {
  data: null,
  ordersToday: null,
  summary: null,
  supabaseStatus: null,
  lastRefreshedAt: null
}

const startAbortable = (ref, timeoutMs = 12000) => {
  if (ref.current) {
    ref.current.abort('cancelled')
  }
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort('timeout'), timeoutMs)
  ref.current = controller
  return {
    controller,
    clear: () => clearTimeout(timer)
  }
}

export const useAppExperience = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [data, setData] = useState([])
  const [ordersToday, setOrdersToday] = useState(0)
  const [supabaseStatus, setSupabaseStatus] = useState({ state: 'unknown', latencyMs: null, message: null })
  const [summary, setSummary] = useState(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastRefreshedAt, setLastRefreshedAt] = useState(null)
  const timer = useRef(null)
  const connectivityTimer = useRef(null)
  const fetchingRef = useRef(false)
  const dataControllerRef = useRef(null)
  const healthControllerRef = useRef(null)
  const summaryControllerRef = useRef(null)
  const ordersControllerRef = useRef(null)

  const fetchOrdersToday = async () => {
    const { controller, clear } = startAbortable(ordersControllerRef, 12000)
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    try {
      const { count, error } = await supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', start.toISOString())
        .abortSignal(controller.signal)

      if (!error && typeof count === 'number') {
        setOrdersToday(count || 0)
        experienceCache.ordersToday = count || 0
      }
    } finally {
      clear()
    }
  }

  const fetchData = async (silent = false) => {
    if (document?.visibilityState === 'hidden') return
    if (fetchingRef.current) return
    fetchingRef.current = true

    if (experienceCache.data && !silent) {
      setData(experienceCache.data)
      setOrdersToday(experienceCache.ordersToday ?? 0)
      setSummary(experienceCache.summary)
      if (experienceCache.supabaseStatus) setSupabaseStatus(experienceCache.supabaseStatus)
      if (experienceCache.lastRefreshedAt) setLastRefreshedAt(experienceCache.lastRefreshedAt)
    }

    if (!silent) setLoading(true)
    setError(null)

    const { controller, clear } = startAbortable(dataControllerRef, 15000)
    try {
      const { data: metrics, error } = await supabase.rpc('get_metrics_summary', {
        p_window_seconds: WINDOW_SECONDS,
        p_limit: 50
      }).abortSignal(controller.signal)

      if (error) throw error

      setData(metrics || [])
      experienceCache.data = metrics || []
      experienceCache.lastRefreshedAt = new Date().toISOString()
      setLastRefreshedAt(experienceCache.lastRefreshedAt)

      if (!ordersControllerRef.current || ordersControllerRef.current.signal.aborted) {
        fetchOrdersToday()
      }
    } catch (err) {
      if (err?.name !== 'AbortError') {
        setError(err?.message || 'No se pudieron cargar las métricas')
      }
    } finally {
      clear()
      fetchingRef.current = false
      if (!silent) setLoading(false)
    }
  }

  const pingSupabase = async (reason = 'auto') => {
    const metaBase = { source: 'ping', reason, ts_client: new Date().toISOString() }
    const { controller, clear } = startAbortable(healthControllerRef, 5000)
    try {
      const health = await healthCheck(4000)
      clear()

      let state = 'green'
      if (!health.healthy || health.latencyMs > 1500) state = 'red'
      else if (health.latencyMs > 500) state = 'amber'

      const status = { state, latencyMs: health.latencyMs, message: health.error || null }
      setSupabaseStatus(status)
      experienceCache.supabaseStatus = status

      supabase.rpc('log_system_metric', {
        kind: 'health_ping',
        ok: health.healthy,
        latency_ms: health.latencyMs,
        path: '/experiencia',
        status_code: health.healthy ? 200 : null,
        message: health.error?.slice(0, 120) || null,
        meta: metaBase
      }).abortSignal(controller.signal).catch(() => {})
    } catch (err) {
      clear()
      if (err?.name === 'AbortError') return
      const latency = err?.latencyMs || null
      const status = { state: 'red', latencyMs: latency, message: err?.message || 'No disponible' }
      setSupabaseStatus(status)
      experienceCache.supabaseStatus = status
    }
  }

  const refreshExperienceStatus = async ({ reason = 'manual' } = {}) => {
    if (isRefreshing) return
    if (document?.visibilityState === 'hidden') return
    setIsRefreshing(true)
    const { controller, clear } = startAbortable(summaryControllerRef, 12000)
    try {
      await pingSupabase(reason)
      const { data: statusData, error: summaryError } = await supabase
        .rpc('get_system_status_summary', { window_minutes: 60 })
        .abortSignal(controller.signal)
      if (!summaryError && statusData) {
        setSummary(statusData)
        experienceCache.summary = statusData
      }
    } catch (err) {
      console.error('Refresh experience status error', err)
    } finally {
      clear()
      setIsRefreshing(false)
      setLastRefreshedAt(new Date().toISOString())
      experienceCache.lastRefreshedAt = new Date().toISOString()
    }
  }

  useEffect(() => {
    // Mostrar cache inmediato (SWR)
    if (experienceCache.data) {
      setData(experienceCache.data)
      setOrdersToday(experienceCache.ordersToday ?? 0)
      setSummary(experienceCache.summary)
      if (experienceCache.supabaseStatus) setSupabaseStatus(experienceCache.supabaseStatus)
      if (experienceCache.lastRefreshedAt) setLastRefreshedAt(experienceCache.lastRefreshedAt)
    }

    fetchData()
    timer.current = setInterval(() => {
      if (document?.visibilityState !== 'hidden') {
        fetchData(true)
      }
    }, REFRESH_MS)

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchData(true)
      }
    }
    document.addEventListener('visibilitychange', onVisibility)

    if (!sessionStorage.getItem(PING_ONCE_KEY)) {
      refreshExperienceStatus({ reason: 'auto' })
      sessionStorage.setItem(PING_ONCE_KEY, '1')
    } else {
      // solo medir sin log en montajes repetidos
      pingSupabase('auto')
    }
    return () => {
      timer.current && clearInterval(timer.current)
      document.removeEventListener('visibilitychange', onVisibility)
      dataControllerRef.current?.abort('unmount')
      healthControllerRef.current?.abort('unmount')
      summaryControllerRef.current?.abort('unmount')
      ordersControllerRef.current?.abort('unmount')
    }
  }, [])

  const ops = useMemo(() => data.filter(d => d.kind === 'op'), [data])
  const now = Date.now()

  const aggregated = useMemo(() => {
    const groups = {}
    ops.forEach((row) => {
      const action = detectAction(row.op, row.action_type, row.path)
      if (!groups[action]) groups[action] = { action, calls: 0, errors: 0, maxP95: 0, last_ts: null, slowCount: 0 }
      const calls = row.calls || 0
      const errors = row.errors || 0
      groups[action].calls += calls
      groups[action].errors += errors
      const p95 = row.p95_ms || 0
      groups[action].maxP95 = Math.max(groups[action].maxP95, p95)
      if (p95 > THRESHOLDS.slowMs) groups[action].slowCount += calls || 1
      const ts = row.last_ts ? new Date(row.last_ts).getTime() : null
      if (ts && (!groups[action].last_ts || ts > groups[action].last_ts)) groups[action].last_ts = ts
    })
    return Object.values(groups)
  }, [ops])

  const totals = useMemo(() => {
    const usageActions = aggregated
      .filter(g => g.last_ts && now - g.last_ts <= USAGE_WINDOW_MS)
      .reduce((acc, g) => acc + g.calls, 0)

    const errors60m = aggregated
      .filter(g => g.last_ts && now - g.last_ts <= ERROR_WINDOW_MS)
      .reduce((acc, g) => acc + g.errors, 0)

    const slowGroups = aggregated
      .filter(g => g.last_ts && now - g.last_ts <= PROBLEM_WINDOW_MS)
      .filter(g => g.maxP95 > THRESHOLDS.slowMs)

    const grave = aggregated
      .filter(g => g.last_ts && now - g.last_ts <= PROBLEM_WINDOW_MS)
      .some(g => g.maxP95 > THRESHOLDS.graveMs || g.errors >= 2)

    const slowRate = usageActions > 0
      ? slowGroups.reduce((acc, g) => acc + g.slowCount, 0) / Math.max(usageActions, 1)
      : 0

    let state = 'green'
    if (grave || errors60m >= 2 || slowGroups.length >= 2 || slowRate > THRESHOLDS.slowRate) state = 'red'
    else if (errors60m >= 1 || slowGroups.length >= 1 || slowRate > 0) state = 'amber'

    return { actions: usageActions, errors: errors60m, state, slowGroups, slowRate }
  }, [aggregated, now])

  const latencyMs = useMemo(() => {
    if (summary?.avg_latency_ms) return summary.avg_latency_ms
    if (summary?.last_ping_latency_ms) return summary.last_ping_latency_ms
    const totalCalls = aggregated.reduce((acc, g) => acc + g.calls, 0)
    if (totalCalls === 0) return null
    const weighted = aggregated.reduce((acc, g) => acc + (g.maxP95 || 0) * (g.calls || 1), 0)
    return Math.round(weighted / Math.max(totalCalls, 1))
  }, [aggregated, summary])

  const lastPingAt = useMemo(() => summary?.last_ping_at || lastRefreshedAt, [summary, lastRefreshedAt])

  const lastError = useMemo(() => {
    if (summary?.last_error_at) {
      return {
        type: summary.last_error_message || 'Sin fallos',
        at: summary.last_error_at
      }
    }
    const withErrors = aggregated.filter(g => g.errors > 0 && g.last_ts)
    if (!withErrors.length) return null
    const latest = withErrors.sort((a, b) => (b.last_ts || 0) - (a.last_ts || 0))[0]
    return {
      type: ACTION_LABEL[latest.action] || 'Acción',
      at: latest.last_ts
    }
  }, [aggregated, summary])

  const problems = useMemo(() => {
    const recent = aggregated.filter(g => g.last_ts && now - g.last_ts <= PROBLEM_WINDOW_MS)
    const items = []

    recent.forEach((g) => {
      const label = ACTION_LABEL[g.action] || ACTION_LABEL.other
      const hasError = g.errors > 0
      const isSlow = g.maxP95 > THRESHOLDS.slowMs
      if (hasError) items.push({ state: 'red', message: `Errores al ${label}.`, key: `${g.action}-err` })
      if (!hasError && isSlow) items.push({ state: 'amber', message: `El ${label} está tardando más de lo esperado.`, key: `${g.action}-slow` })
    })

    return items.slice(0, 3)
  }, [aggregated, now])

  const speedLabel = useMemo(() => {
    if (totals.state === 'red') return { title: 'Lenta', text: 'Varias acciones están tardando demasiado o fallando.' }
    if (totals.state === 'amber') return { title: 'Normal', text: 'Algunas acciones tardan un poco más de lo esperado.' }
    return { title: 'Rápida', text: 'Los pedidos se guardan sin demoras.' }
  }, [totals.state])

  return {
    loading,
    error,
    totals,
    aggregated,
    ordersToday,
    problems,
    speedLabel,
    latencyMs,
    lastError,
    supabaseStatus,
    summary,
    isRefreshing,
    lastRefreshedAt,
    lastPingAt,
    refreshExperienceStatus,
    refetch: fetchData
  }
}
