import { useEffect, useMemo, useState } from 'react'
import { ClipboardList, RefreshCcw, Search, ShieldCheck } from 'lucide-react'
import { auditService } from '../services/audit'
import { formatDate, getTimeAgo, truncate } from '../utils'
import { withAdmin } from '../contexts/AuthContext'

const ACTION_LABELS = {
  role_transfer: 'Transferencia de rol',
  role_changed: 'Cambio de rol',
  user_created: 'Alta de usuario',
  user_invited: 'Invitación de usuario',
  user_deleted: 'Eliminación de usuario',
  member_removed: 'Baja de miembro',
  login_as: 'Ingreso como otro usuario',
  permission_updated: 'Actualización de permisos'
}

const ACTION_FILTERS = [
  { id: 'role', label: 'Cambios de rol', actions: ['role_transfer', 'role_changed'] },
  { id: 'create', label: 'Altas de usuarios', actions: ['user_created', 'user_invited'] },
  { id: 'delete', label: 'Bajas / eliminaciones', actions: ['user_deleted', 'member_removed'] },
  { id: 'perm', label: 'Permisos', actions: ['permission_updated'] }
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
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [activeFilters, setActiveFilters] = useState([])

  useEffect(() => {
    loadLogs()
  }, [])

  const loadLogs = async () => {
    setLoading(true)
    setError(null)
    const { data, error } = await auditService.getAuditLogs()
    if (error) setError(error.message || 'No se pudieron cargar los registros')
    setLogs(data || [])
    setLoading(false)
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

  const missingTable = error && /audit_logs/i.test(error)

  return (
    <div className="max-w-6xl mx-auto space-y-6">
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
              y cambios de permisos.
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
    </div>
  )
}

export default withAdmin(AuditLogs)
