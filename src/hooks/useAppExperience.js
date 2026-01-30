import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../services/supabase'

// Ventanas alineadas a la necesidad del módulo (sin exponerlas en UI)
const WINDOW_SECONDS = 3600 // traemos hasta 60 min para tener errores recientes
const REFRESH_MS = 5000
const USAGE_WINDOW_MS = 10 * 60 * 1000
const PROBLEM_WINDOW_MS = 30 * 60 * 1000
const ERROR_WINDOW_MS = 60 * 60 * 1000

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

export const useAppExperience = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [data, setData] = useState([])
  const timer = useRef(null)

  const fetchData = async (silent = false) => {
    if (!silent) setLoading(true)
    setError(null)
    const { data, error } = await supabase.rpc('get_metrics_summary', {
      p_window_seconds: WINDOW_SECONDS,
      p_limit: 50
    })
    if (error) setError(error.message)
    setData(data || [])
    if (!silent) setLoading(false)
  }

  useEffect(() => {
    fetchData()
    timer.current = setInterval(() => fetchData(true), REFRESH_MS)
    return () => timer.current && clearInterval(timer.current)
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
    rawOps: ops,
    problems,
    speedLabel,
    refetch: fetchData
  }
}
