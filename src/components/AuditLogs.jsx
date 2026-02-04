import { useEffect, useMemo, useState, useCallback } from 'react'
import { ClipboardList, RefreshCcw, Search, ShieldCheck, Activity, ServerCrash, BarChart2 } from 'lucide-react'
import { auditService } from '../services/audit'
import { formatDate, getTimeAgo, truncate } from '../utils'
import { healthCheck, supabase } from '../services/supabase'
import { withAdmin } from '../contexts/AuthContext'

const ACTION_LABELS = {
  role_transfer: 'Transferencia de rol',
  role_changed: 'Cambio de rol',
  user_created: 'Alta de usuario',
  user_invited: 'Invitación de usuario',
  user_deleted: 'Eliminación de usuario',
  member_removed: 'Baja de miembro',
  login_as: 'Ingreso como otro usuario',
  permission_updated: 'Actualización de permisos',
  menu_updated: 'Carga/actualización del menú diario'
}

const ACTION_FILTERS = [
  { id: 'role', label: 'Cambios de rol', actions: ['role_transfer', 'role_changed'] },
  { id: 'create', label: 'Altas de usuarios', actions: ['user_created', 'user_invited'] },
  { id: 'delete', label: 'Bajas / eliminaciones', actions: ['user_deleted', 'member_removed'] },
  { id: 'perm', label: 'Permisos', actions: ['permission_updated'] },
  { id: 'menu', label: 'Cambios de menú', actions: ['menu_updated'] }
]

const friendlyAction = (action) => ACTION_LABELS[action] || (action ? action.replace(/_/g, ' ') : 'Acción')

const formatActor = (log) => log.actor_name || log.actor_email || log.actor || 'Administrador'

const formatTarget = (log) =>
  log.target_name || log.target_email || log.target || log.affected_user || 'N/A'

const buildReadableDetail = (log) => {
  if (log.details) return log.details
  if (log.reason) return log.reason
  if (log.metadata && typeof log.metadata === 'object') {
    try {
      return JSON.stringify(log.metadata)
    } catch (_) {
      return String(log.metadata)
    }
  }
  return 'Sin descripción adicional'
}

const formatTimestamp = (value) => {
  if (!value) return 'Sin fecha'
  const readable = formatDate(value, { hour12: false })
  return `${readable} (${getTimeAgo(value)})`
}

const AuditLogs = () => {
  const [activeTab, setActiveTab] = useState('logs')
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [activeFilters, setActiveFilters] = useState([])
  const [health, setHealth] = useState(null)
  const [healthLoading, setHealthLoading] = useState(true)
  const [healthError, setHealthError] = useState(null)
  const [ordersCount, setOrdersCount] = useState(null)
  const [ordersError, setOrdersError] = useState(null)
  const [healthLogs, setHealthLogs] = useState([])
  const [healthLogsLoading, setHealthLogsLoading] = useState(true)
  const [healthLogsError, setHealthLogsError] = useState(null)
  const [healthRange, setHealthRange] = useState('24h') // '24h' | '7d'
  const [healthOnlyErrors, setHealthOnlyErrors] = useState(false)

  useEffect(() => {
    loadLogs()
    loadHealth()
    loadOrdersCount()
    loadHealthProbes()

    const interval = setInterval(() => {
      if (document?.visibilityState === 'hidden') return
      loadOrdersCount(true)
    }, 10000) // 10s para pseudo tiempo real ligero sin gastar en background

    return () => clearInterval(interval)
  }, [])

  const loadLogs = async () => {
    setLoading(true)
    setError(null)
    const { data, error } = await auditService.getAuditLogs()
    if (error) setError(error.message || 'No se pudieron cargar los registros')
    setLogs(data || [])
    setLoading(false)
  }

  const loadHealth = async () => {
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
  }

  const loadHealthProbes = async () => {
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
  }

  const loadOrdersCount = async (silent = false) => {
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
  }

  const toggleFilter = (actions) => {
    const actionsKey = actions.join(',')
    setActiveFilters((prev) =>
      prev.includes(actionsKey)
        ? prev.filter((f) => f !== actionsKey)
        : [...prev, actionsKey]
    )
  }

  const filteredLogs = useMemo(() => {
    const selectedActions = activeFilters
      .flatMap((key) => key.split(','))
      .filter(Boolean)

    return (logs || []).filter((log) => {
      const matchAction =
        !selectedActions.length || selectedActions.includes(log.action)

      if (!matchAction) return false

      if (!search) return true

      const haystack = [
        formatActor(log),
        formatTarget(log),
        log.action,
        log.details,
        log.reason,
        JSON.stringify(log.metadata || {})
      ]
        .join(' ')
        .toLowerCase()

      return haystack.includes(search.toLowerCase())
    })
  }, [logs, activeFilters, search])

  const filteredHealthLogs = useCallback(() => {
    const now = new Date()
    const from = new Date(now)
    if (healthRange === '24h') {
      from.setHours(now.getHours() - 24)
    } else if (healthRange === '7d') {
      from.setDate(now.getDate() - 7)
    }

    return (healthLogs || [])
      .filter((log) => {
        const ts = new Date(log.created_at || log.timestamp || 0)
        if (isNaN(ts)) return false
        if (ts < from || ts > now) return false

        const md = log.metadata || {}
        const status = Number(md.status_code || md.status || 0)
        const supabaseOk = md.supabase_ok

        if (healthOnlyErrors) {
          return (status >= 400) || supabaseOk === false
        }
        return true
      })
      .slice(0, 200)
  }, [healthLogs, healthRange, healthOnlyErrors])

  const missingTable = error && /audit_logs/i.test(error)

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Nav interno */}
      <div className="flex items-center gap-2">
        {[
          { id: 'logs', label: 'Auditoría' },
          { id: 'health', label: 'Salud del sistema' }
        ].map((tab) => {
          const active = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${
                active
                  ? 'bg-white text-blue-700 border-blue-600 shadow-md'
                  : 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700'
              }`}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {activeTab === 'logs' && (
      <>
      <div className="grid gap-4 lg:grid-cols-[1.6fr,1fr]">
        <header className="bg-white rounded-2xl shadow-xl border border-blue-100 p-6 flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg">
              <ClipboardList className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm uppercase tracking-wide text-blue-700 font-semibold">
                Auditoría
              </p>
              <h1 className="text-2xl font-extrabold text-gray-900">
                Reporte de acciones administrativas
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Seguimiento legible de eventos sensibles: transferencias de rol, altas y bajas de usuarios,
                cambios de permisos y ajustes de menú.
              </p>
            </div>
          </div>
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por responsable, usuario afectado o detalle"
                className="w-full pl-10 pr-3 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-inner bg-white/70"
              />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {ACTION_FILTERS.map((filter) => {
                const key = filter.actions.join(',')
                const active = activeFilters.includes(key)
                return (
                  <button
                    key={filter.id}
                    onClick={() => toggleFilter(filter.actions)}
                    className={`inline-flex items-center gap-2 px-3 py-2 rounded-full text-sm font-semibold border transition-all ${
                      active
                        ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-blue-400 hover:text-blue-700'
                    }`}
                  >
                    <ShieldCheck className="h-4 w-4" />
                    {filter.label}
                  </button>
                )
              })}
              <button
                onClick={() => setActiveFilters([])}
                className="text-sm font-semibold text-blue-700 hover:text-blue-900"
              >
                Quitar filtros
              </button>
              <button
                onClick={loadLogs}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-full text-sm font-semibold border border-blue-200 text-blue-700 hover:bg-blue-50 transition-colors"
                disabled={loading}
              >
                <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Actualizar
              </button>
            </div>
          </div>
        </header>
      </div>

      <section className="bg-white rounded-2xl shadow-xl border border-blue-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <p className="text-sm text-gray-600">
            {loading
              ? 'Cargando eventos...'
              : `${filteredLogs.length} evento${filteredLogs.length === 1 ? '' : 's'} mostrado${filteredLogs.length === 1 ? '' : 's'}`}
          </p>
          {error && (
            <span className="text-sm text-red-600 font-semibold">
              {truncate(error, 160)}
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Fecha</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Acción</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Detalle</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Responsable</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Usuario afectado</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {!loading && missingTable && (
                <tr>
                  <td className="px-4 py-6 text-left text-gray-700 text-sm space-y-2" colSpan={5}>
                    <p className="font-semibold text-red-700">La tabla <code>audit_logs</code> no existe en Supabase.</p>
                    <p className="text-gray-700">
                      Crea la tabla y vuelve a cargar la página. SQL sugerido:
                    </p>
                    <pre className="bg-gray-900 text-gray-100 text-xs p-3 rounded-lg overflow-x-auto">
{`create extension if not exists "uuid-ossp";

create table public.audit_logs (
  id uuid primary key default uuid_generate_v4(),
  action text not null,
  details text,
  actor_id uuid,
  actor_email text,
  actor_name text,
  target_id uuid,
  target_email text,
  target_name text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index audit_logs_action_idx on public.audit_logs (action);
create index audit_logs_created_at_idx on public.audit_logs (created_at desc);`}
                    </pre>
                    <p className="text-gray-700">
                      Luego refresca este panel para ver los eventos.
                    </p>
                  </td>
                </tr>
              )}
              {!loading && !missingTable && filteredLogs.length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-center text-gray-500 text-sm" colSpan={5}>
                    No hay eventos que coincidan con los filtros actuales.
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td className="px-4 py-6 text-center text-gray-500 text-sm" colSpan={5}>
                    Cargando registros de auditoría...
                  </td>
                </tr>
              )}
              {!loading && filteredLogs.map((log) => (
                <tr key={log.id || `${log.action}-${log.created_at}-${log.actor_email}`}>
                  <td className="px-4 py-3 text-sm text-gray-800 whitespace-nowrap">
                    {formatTimestamp(log.created_at || log.timestamp)}
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900 whitespace-nowrap">
                    {friendlyAction(log.action)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {buildReadableDetail(log)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-800 whitespace-nowrap">
                    {formatActor(log)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-800 whitespace-nowrap">
                    {formatTarget(log)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      </>
      )}

      {activeTab === 'health' && (
        <section className="bg-white rounded-2xl shadow-xl border border-emerald-100 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-lg">
                <Activity className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm uppercase tracking-wide text-emerald-700 font-semibold">Salud del sistema</p>
                <h2 className="text-xl font-extrabold text-gray-900">Supabase + app</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Ping ligero a Supabase, timestamp y conteo de pedidos casi en tiempo real.
                </p>
              </div>
            </div>
            <button
              onClick={() => { loadHealth(); loadOrdersCount(true); loadHealthProbes() }}
              disabled={healthLoading}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-full text-sm font-semibold border border-emerald-200 text-emerald-700 hover:bg-emerald-50 transition-colors"
            >
              <RefreshCcw className={`h-4 w-4 ${healthLoading ? 'animate-spin' : ''}`} />
              Re-evaluar
            </button>
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/70">
              <p className="text-xs font-semibold text-gray-600 uppercase">Estado Supabase</p>
              <div className="mt-1 flex items-center gap-2">
                <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold ${
                  healthLoading ? 'bg-gray-200 text-gray-600' :
                  healthError || health?.healthy === false ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                }`}>
                  {healthLoading ? 'Evaluando…' : healthError || health?.healthy === false ? 'Degradado' : 'OK'}
                </span>
                {!healthLoading && (healthError || health?.error) && (
                  <ServerCrash className="h-5 w-5 text-red-600" />
                )}
              </div>
              <p className="text-xs text-gray-600 mt-2">
                {healthLoading
                  ? 'Ejecutando healthCheck()'
                  : healthError || health?.error
                    ? truncate(healthError || health?.error, 120)
                    : 'Consulta HEAD a tabla users exitosa'}
              </p>
            </div>

            <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/70">
              <p className="text-xs font-semibold text-gray-600 uppercase">Última ejecución</p>
              <p className="text-sm text-gray-900 mt-1">
                {health?.timestamp ? formatTimestamp(health.timestamp) : 'N/D'}
              </p>
              <p className="text-xs text-gray-600 mt-2">
                Timestamp ISO de healthCheck (lado cliente).
              </p>
            </div>

            <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/70">
              <p className="text-xs font-semibold text-gray-600 uppercase">Pedidos del día</p>
              <div className="mt-1 flex items-center gap-2">
                <div className="h-9 w-9 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow">
                  <BarChart2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-lg font-extrabold text-gray-900">
                    {ordersCount === null ? '—' : ordersCount}
                  </p>
                  <p className="text-xs text-gray-600">Pedidos creados hoy (recuento cada 10s)</p>
                </div>
              </div>
              {ordersError && (
                <p className="text-[11px] text-red-600 mt-1">{truncate(ordersError, 80)}</p>
              )}
            </div>
          </div>

          <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/70">
            <p className="text-xs font-semibold text-gray-600 uppercase">Mejoras sugeridas</p>
            <ul className="mt-2 space-y-1 text-xs text-gray-700 list-disc list-inside">
              <li>Agregar métrica de latencia real (fetch simple + performance.now).</li>
              <li>Crear monitor cron serverless → Slack/Email si health falla.</li>
              <li>Persistir histórico en `audit_logs` con acción `health_probe`.</li>
              <li>Escuchar canal realtime de `orders` para conteo instantáneo.</li>
            </ul>
          </div>

          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              {[
                { id: '24h', label: 'Últimas 24h' },
                { id: '7d', label: 'Últimos 7 días' }
              ].map(opt => {
                const active = healthRange === opt.id
                return (
                  <button
                    key={opt.id}
                    onClick={() => setHealthRange(opt.id)}
                    className={`px-3 py-2 rounded-lg text-sm font-semibold border ${
                      active ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-200 hover:border-blue-400'
                    }`}
                  >
                    {opt.label}
                  </button>
                )
              })}
              <label className="inline-flex items-center gap-2 text-sm font-semibold text-gray-700 ml-2">
                <input
                  type="checkbox"
                  checked={healthOnlyErrors}
                  onChange={(e) => setHealthOnlyErrors(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                Solo errores (status &gt;= 400 o supabase_ok = false)
              </label>
            </div>
            <p className="text-sm text-gray-600">
              Mostrando últimos {healthLogs?.length || 0} eventos health_probe (limit 200)
            </p>
          </div>

          <div className="overflow-x-auto bg-white rounded-xl border border-gray-100 shadow-sm">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Fecha</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Latencia (ms)</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Path</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">IP</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">User Agent</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Request ID</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {healthLogsLoading && (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-center text-gray-500 text-sm">
                      Cargando health_probe...
                    </td>
                  </tr>
                )}
                {!healthLogsLoading && healthLogsError && (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-center text-red-600 text-sm">
                      {truncate(healthLogsError, 160)}
                    </td>
                  </tr>
                )}
                {!healthLogsLoading && !healthLogsError && filteredHealthLogs().length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-center text-gray-500 text-sm">
                      No hay eventos health_probe para los filtros seleccionados.
                    </td>
                  </tr>
                )}
                {!healthLogsLoading && !healthLogsError && filteredHealthLogs().map((log) => {
                  const md = log.metadata || {}
                  return (
                    <tr key={log.id || log.created_at || Math.random()}>
                      <td className="px-4 py-3 text-sm text-gray-800 whitespace-nowrap">
                        {formatTimestamp(log.created_at || log.timestamp)}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900 whitespace-nowrap">
                        {md.status_code ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-800 whitespace-nowrap">
                        {md.latency_ms ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-800 whitespace-nowrap">
                        {md.path || log.details || '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-800 whitespace-nowrap">
                        {md.ip || '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-800">
                        {truncate(md.user_agent || '', 80) || '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-800 whitespace-nowrap">
                        {md.request_id || '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}

export default withAdmin(AuditLogs)
