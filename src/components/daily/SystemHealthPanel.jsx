import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Database,
  History,
  RefreshCw,
  ShieldAlert,
  XCircle
} from 'lucide-react'
import { getSystemHealthDashboard } from '../../services/systemHealthService'
import {
  formatHealthDateTime,
  formatIncidentMessage,
  getCanonicalRecentIncidents,
  getHealthyRpcCount,
  getIncidentStatusLabel,
  getIncidentTone,
  normalizeSystemHealthDashboard
} from '../../utils/systemHealth'

const toneClasses = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  warning: 'border-amber-200 bg-amber-50 text-amber-900',
  error: 'border-red-200 bg-red-50 text-red-800',
  neutral: 'border-slate-200 bg-slate-50 text-slate-700'
}

const stateIcons = {
  ok: CheckCircle2,
  warning: AlertTriangle,
  critical: XCircle,
  unavailable: XCircle
}

const Chip = ({ children, tone = 'neutral' }) => (
  <span className={`inline-flex min-h-[30px] items-center gap-1 rounded-full border px-3 py-1 text-xs font-bold ${toneClasses[tone] || toneClasses.neutral}`}>
    {children}
  </span>
)

const IncidentCard = ({ incident }) => {
  const tone = getIncidentTone(incident)
  const message = formatIncidentMessage(incident)
  const isResolved = String(incident?.status || '').toLowerCase() === 'resolved'
  const Icon = isResolved ? CheckCircle2 : String(incident?.severity || '').toLowerCase() === 'critical' ? ShieldAlert : AlertTriangle

  return (
    <article className={`rounded-xl border ${isResolved ? 'p-2.5' : 'p-3'} ${toneClasses[tone] || toneClasses.warning}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2">
          <Icon className={`${isResolved ? 'mt-0.5 h-3.5 w-3.5' : 'mt-0.5 h-4 w-4'} shrink-0`} />
          <div className="min-w-0">
            <p className={`${isResolved ? 'text-[13px]' : 'text-sm'} font-black leading-tight`}>
              {incident?.title || 'Incidente del sistema'}
            </p>
            <p className={`${isResolved ? 'mt-0.5 text-[11px]' : 'mt-0.5 text-xs'} font-semibold opacity-80`}>
              {formatHealthDateTime(incident?.detected_at)}
              {incident?.report_date ? ` · Operación ${incident.report_date}` : ''}
            </p>
          </div>
        </div>
        <span className={`${isResolved ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-[11px]'} rounded-full border border-current/20 font-black uppercase tracking-wide`}>
          {getIncidentStatusLabel(incident)}
        </span>
      </div>

      {message && (
        <p className={`${isResolved ? 'mt-1.5 text-[11px] leading-4' : 'mt-2 text-xs'} break-words font-semibold`}>
          {message}
        </p>
      )}

      <div className={`${isResolved ? 'mt-1.5 text-[11px]' : 'mt-2 text-xs'} flex flex-wrap gap-x-3 gap-y-1 font-bold opacity-85`}>
        {incident?.error_code && <span>Código: {incident.error_code}</span>}
        {Number.isFinite(Number(incident?.affected_orders)) && Number(incident.affected_orders) > 0 && (
          <span>Pedidos afectados: {Number(incident.affected_orders)}</span>
        )}
        {incident?.resolved_at && <span>Resuelto: {formatHealthDateTime(incident.resolved_at)}</span>}
      </div>

      {incident?.resolution && (
        <p className={`${isResolved ? 'mt-1.5 px-2 py-1 text-[11px] leading-4' : 'mt-2 px-2 py-1.5 text-xs'} rounded-lg bg-white/50 font-semibold`}>
          Resolución: {incident.resolution}
        </p>
      )}
    </article>
  )
}

const SystemHealthPanel = ({ enabled = false, defaultExpanded = false }) => {
  const [payload, setPayload] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(Boolean(defaultExpanded))
  const [incidentFilter, setIncidentFilter] = useState('all')

  const loadHealth = useCallback(async ({ silent = false } = {}) => {
    if (!enabled) return
    if (!silent) setLoading(true)

    try {
      const result = await getSystemHealthDashboard({ days: 30 })
      if (result.error) {
        setError(result.error.message || 'No se pudo consultar la salud del sistema.')
        setPayload(null)
      } else {
        setPayload(result.data)
        setError('')
      }
    } catch (healthError) {
      setError(healthError?.message || 'No se pudo consultar la salud del sistema.')
      setPayload(null)
    } finally {
      if (!silent) setLoading(false)
    }
  }, [enabled])

  useEffect(() => {
    if (!enabled) return undefined
    loadHealth()
    const interval = setInterval(() => loadHealth({ silent: true }), 60000)
    return () => clearInterval(interval)
  }, [enabled, loadHealth])

  const health = useMemo(
    () => normalizeSystemHealthDashboard(payload, error),
    [error, payload]
  )

  if (!enabled) return null

  const StateIcon = stateIcons[health.state] || AlertTriangle
  const rpcHealthyCount = getHealthyRpcCount(health.criticalRpcs)
  const rpcTotal = health.criticalRpcs.length
  const canonicalIncidents = getCanonicalRecentIncidents(health.recentIncidents).slice(0, 12)
  const activeIncidentHistoryCount = canonicalIncidents.filter((incident) => String(incident?.status || '').toLowerCase() === 'active').length
  const resolvedIncidentHistoryCount = canonicalIncidents.length - activeIncidentHistoryCount
  const filteredIncidents = canonicalIncidents.filter((incident) => {
    if (incidentFilter === 'all') return true
    return String(incident?.status || '').toLowerCase() === incidentFilter
  })
  const hasHistory = canonicalIncidents.length > 0
  const hasFilteredHistory = filteredIncidents.length > 0
  const filterOptions = [
    { id: 'all', label: 'Todos', count: canonicalIncidents.length },
    { id: 'active', label: 'Activos', count: activeIncidentHistoryCount },
    { id: 'resolved', label: 'Resueltos', count: resolvedIncidentHistoryCount }
  ]

  return (
    <section className="mb-4 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm print-hide">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex min-h-[32px] items-center gap-2 rounded-full border px-3 py-1 text-sm font-black ${toneClasses[health.tone] || toneClasses.warning}`}>
              <StateIcon className="h-4 w-4" />
              Sistema: {health.label}
            </span>
            <div>
              <h2 className="text-sm font-black text-slate-900">Salud del sistema</h2>
              <p className="text-xs font-semibold text-slate-500">
                Estado actual + incidentes históricos. No desaparecen al resolverlos.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Chip tone={health.stalePendingCount > 0 ? 'error' : 'success'}>
            Pendientes vencidos: {health.stalePendingCount}
          </Chip>
          <Chip tone={rpcTotal > 0 && rpcHealthyCount === rpcTotal ? 'success' : 'error'}>
            RPC críticas: {rpcHealthyCount}/{rpcTotal || 0}
          </Chip>
          <Chip tone={health.activeIncidentCount > 0 ? 'error' : 'success'}>
            Incidentes activos: {health.activeIncidentCount}
          </Chip>

          <button
            type="button"
            onClick={() => loadHealth()}
            disabled={loading}
            className="inline-flex min-h-[32px] items-center rounded-lg border border-slate-300 bg-white px-3 py-1 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw className={`mr-1 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Revisar
          </button>

          <button
            type="button"
            onClick={() => setExpanded((current) => !current)}
            className="inline-flex min-h-[32px] items-center rounded-lg border border-slate-300 bg-white px-3 py-1 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50"
            aria-expanded={expanded}
          >
            {expanded ? <ChevronUp className="mr-1 h-4 w-4" /> : <ChevronDown className="mr-1 h-4 w-4" />}
            {expanded ? 'Ocultar salud' : 'Ver salud'}
          </button>
        </div>
      </div>

      {health.error && (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-800">
          No se pudo cargar la salud del sistema: {health.error}
        </div>
      )}

      {!health.error && health.activeCriticalCount > 0 && !expanded && (
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-800">
          <ShieldAlert className="h-4 w-4 shrink-0" />
          Hay {health.activeCriticalCount} incidente{health.activeCriticalCount === 1 ? '' : 's'} crítico{health.activeCriticalCount === 1 ? '' : 's'} activo{health.activeCriticalCount === 1 ? '' : 's'}.
        </div>
      )}

      {expanded && !health.error && (
        <div className="mt-4 space-y-4 border-t border-slate-100 pt-4">
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center gap-2 text-xs font-black text-slate-700"><Activity className="h-4 w-4" /> Fecha operativa</div>
              <p className="mt-1 text-lg font-black text-slate-950">{health.operationalDate || 'Sin dato'}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center gap-2 text-xs font-black text-slate-700"><AlertTriangle className="h-4 w-4" /> Pendientes vencidos</div>
              <p className="mt-1 text-lg font-black text-slate-950">{health.stalePendingCount}</p>
              <p className="text-xs font-semibold text-slate-500">{health.stalePendingItems} ítems</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center gap-2 text-xs font-black text-slate-700"><Database className="h-4 w-4" /> RPC críticas</div>
              <p className="mt-1 text-lg font-black text-slate-950">{rpcHealthyCount}/{rpcTotal}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center gap-2 text-xs font-black text-slate-700"><History className="h-4 w-4" /> Historial 30 días</div>
              <p className="mt-1 text-lg font-black text-slate-950">{canonicalIncidents.length}</p>
            </div>
          </div>

          {health.stalePendingDates.length > 0 && (
            <div>
              <h3 className="mb-2 text-xs font-black uppercase tracking-wide text-slate-600">Pendientes vencidos por fecha</h3>
              <div className="flex flex-wrap gap-2">
                {health.stalePendingDates.map((row) => (
                  <Chip key={row.delivery_date || JSON.stringify(row)} tone="error">
                    {row.delivery_date}: {Number(row.orders || 0)} pedidos / {Number(row.items || 0)} ítems
                  </Chip>
                ))}
              </div>
            </div>
          )}

          <div>
            <h3 className="mb-2 text-xs font-black uppercase tracking-wide text-slate-600">Chequeos críticos</h3>
            <div className="grid gap-2 md:grid-cols-3">
              {health.criticalRpcs.map((check) => (
                <div key={check.signature || check.label} className={`rounded-xl border p-3 text-xs font-bold ${check.ok ? toneClasses.success : toneClasses.error}`}>
                  <div className="flex items-center gap-2">
                    {check.ok ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                    <span>{check.label || check.signature}</span>
                  </div>
                  <p className="mt-1 break-all font-semibold opacity-80">{check.signature}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-2 flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h3 className="text-xs font-black uppercase tracking-wide text-slate-600">Incidentes recientes</h3>
                <p className="mt-0.5 text-[11px] font-semibold text-slate-500">
                  Las alertas de demora se agrupan con el fallo explícito de la misma fecha para evitar duplicados.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {hasHistory && (
                  <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5" aria-label="Filtrar incidentes">
                    {filterOptions.map((option) => {
                      const active = incidentFilter === option.id
                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => setIncidentFilter(option.id)}
                          aria-pressed={active}
                          className={`rounded-md px-2.5 py-1 text-[11px] font-black transition-colors ${
                            active
                              ? 'bg-white text-slate-950 shadow-sm'
                              : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          {option.label} {option.count}
                        </button>
                      )
                    })}
                  </div>
                )}
                <span className="text-xs font-semibold text-slate-500">
                  Revisado {formatHealthDateTime(health.checkedAt)}
                </span>
              </div>
            </div>

            {hasHistory && hasFilteredHistory ? (
              <div className="grid gap-2 lg:grid-cols-2">
                {filteredIncidents.map((incident) => (
                  <IncidentCard key={incident.id || incident.event_key} incident={incident} />
                ))}
              </div>
            ) : hasHistory ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold text-slate-600">
                No hay incidentes {incidentFilter === 'active' ? 'activos' : 'resueltos'} en el historial reciente.
              </div>
            ) : (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm font-bold text-emerald-800">
                No hay incidentes registrados en los últimos 30 días.
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  )
}

export default SystemHealthPanel
