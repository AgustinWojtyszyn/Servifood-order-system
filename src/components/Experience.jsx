import { Activity, AlertTriangle, ArrowRight, CheckCircle2, ClipboardList, Clock3, Database, RefreshCw, ShieldCheck, ShieldX, XCircle, Zap } from 'lucide-react'
import { Link, Navigate } from 'react-router-dom'
import { useAppExperience } from '../hooks/useAppExperience'
import { useAuthContext } from '../contexts/AuthContext'
import { timeAgo } from '../utils'

const levelPill = {
  green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  yellow: 'bg-amber-50 text-amber-700 border-amber-200',
  red: 'bg-red-50 text-red-700 border-red-200'
}

const Chip = ({ label, value, ok }) => (
  <div className="inline-flex items-center gap-5 rounded-full border border-gray-200 bg-white px-7 py-5 text-2xl font-semibold">
    {ok ? <CheckCircle2 className="h-8 w-8 text-emerald-600" /> : <XCircle className="h-8 w-8 text-red-600" />}
    <span className="text-4xl text-gray-700">{label}</span>
    <span className="text-4xl text-gray-500 font-bold">{value}</span>
  </div>
)

const Card = ({ title, icon, children }) => {
  const Icon = icon
  return (
    <section className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Icon className="h-5 w-5 text-gray-700" />
        <h2 className="text-base font-bold text-gray-900">{title}</h2>
      </div>
      {children}
    </section>
  )
}

const Experience = () => {
  const { isAdmin } = useAuthContext()
  const {
    loading,
    refreshing,
    error,
    lastRefreshedAt,
    refreshNow,
    health,
    ordersToday,
    actionLatency,
    errorSummary,
    alerts
  } = useAppExperience()

  if (!isAdmin) return <Navigate to="/dashboard" replace />

  const hasRed = alerts.some((a) => a.level === 'red')
  const hasYellow = alerts.some((a) => a.level === 'yellow')
  const overallLevel = hasRed ? 'red' : hasYellow ? 'yellow' : 'green'

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-black text-white flex items-center justify-center shadow-lg">
            <Activity className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm uppercase tracking-wide text-gray-600 font-semibold">Experiencia en vivo</p>
            <h1 className="text-2xl font-extrabold text-gray-900">Estado operativo y técnico</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-gray-600">
              <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 font-semibold ${levelPill[overallLevel]}`}>
                {overallLevel === 'red' ? 'Crítico' : overallLevel === 'yellow' ? 'Atención' : 'Estable'}
              </span>
              {lastRefreshedAt && (
                <span className="text-xs text-gray-500">
                  Actualizado: {timeAgo(lastRefreshedAt)} · {new Date(lastRefreshedAt).toLocaleString('es-AR')}
                </span>
              )}
            </div>
          </div>
        </div>
        <button
          onClick={refreshNow}
          disabled={refreshing}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold shadow-md transition-all ${
            refreshing
              ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
              : 'bg-gray-900 text-white hover:bg-black'
          }`}
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Actualizando…' : 'Actualizar ahora'}
        </button>
      </header>

      {error && <p className="text-sm text-red-600">No se pudo actualizar: {error}</p>}
      {loading && <p className="text-sm text-gray-600">Cargando señales operativas…</p>}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Salud API/DB" icon={Database}>
          <div className="flex flex-wrap gap-2">
            <Chip
              label="postgrest"
              ok={health.postgrest.ok}
              value={health.postgrest.latencyMs != null ? `${health.postgrest.latencyMs} ms` : 'Sin datos'}
            />
            <Chip
              label="rpc"
              ok={health.rpc_create_order_idempotent.ok}
              value={health.rpc_create_order_idempotent.latencyMs != null ? `${health.rpc_create_order_idempotent.latencyMs} ms` : 'Sin datos'}
            />
            <Chip
              label="auth"
              ok={health.auth.ok}
              value={health.auth.latencyMs != null ? `${health.auth.latencyMs} ms` : 'Sin datos'}
            />
          </div>
          <p className="text-xs text-gray-500">
            {health.rpc_create_order_idempotent.detail || 'Chequeo RPC estándar.'}
          </p>
        </Card>

        <Card title="Pedidos de hoy" icon={ClipboardList}>
          <div className="grid grid-cols-2 gap-4 text-xl">
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
              <p className="text-2xl text-gray-600">Total</p>
              <p className="text-5xl font-black text-gray-900">{ordersToday.ordersTodayTotal}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
              <p className="text-2xl text-gray-600">Último pedido</p>
              <p className="text-3xl font-bold text-gray-900">{ordersToday.lastOrderAgo || 'Sin pedidos aún'}</p>
            </div>
            <div className="rounded-xl border border-gray-200 p-5">
              <p className="text-2xl text-gray-600">Almuerzo / Cena</p>
              <p className="text-4xl font-bold text-gray-900">{ordersToday.ordersTodayLunch} / {ordersToday.ordersTodayDinner}</p>
            </div>
            <div className="rounded-xl border border-gray-200 p-5">
              <p className="text-2xl text-gray-600">Pend / Conf / Arch</p>
              <p className="text-4xl font-bold text-gray-900">{ordersToday.ordersTodayPending} / {ordersToday.ordersTodayConfirmed} / {ordersToday.ordersTodayArchived}</p>
            </div>
          </div>
        </Card>

        <Card title="Errores recientes" icon={AlertTriangle}>
          <div className="space-y-3 text-2xl">
            <p className="font-semibold text-gray-900">Últimos 15 min: {errorSummary.errorsLast15mCount}</p>
            <p className="text-gray-700">
              Último error: {errorSummary.lastErrorMessage || 'Sin errores recientes'}
              {errorSummary.lastErrorAgo ? ` (${errorSummary.lastErrorAgo})` : ''}
            </p>
            <div className="space-y-2">
              {errorSummary.topErrors.length === 0 ? (
                <p className="text-2xl text-gray-500">No hay mediciones recientes.</p>
              ) : (
                errorSummary.topErrors.map((entry) => (
                  <p key={entry.message} className="text-2xl text-gray-700">
                    {entry.count}x · {entry.message}
                  </p>
                ))
              )}
            </div>
          </div>
        </Card>

        <Card title="Latencia por acción" icon={Zap}>
          {actionLatency.length === 0 ? (
            <p className="text-2xl text-gray-500">Sin datos aún.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-2xl">
                <thead>
                  <tr className="text-left text-gray-600 border-b border-gray-200">
                    <th className="py-3 pr-4">Acción</th>
                    <th className="py-3 pr-4">Llamadas</th>
                    <th className="py-3 pr-4">p50</th>
                    <th className="py-3">p95</th>
                  </tr>
                </thead>
                <tbody>
                  {actionLatency.map((row) => (
                    <tr key={row.action} className="border-b border-gray-100 last:border-b-0">
                      <td className="py-3 pr-4 font-semibold text-gray-900">{row.label}</td>
                      <td className="py-3 pr-4 text-gray-700">{row.calls}</td>
                      <td className="py-3 pr-4 text-gray-700">{row.p50 != null ? `${row.p50} ms` : 'Sin datos'}</td>
                      <td className="py-3 text-gray-700">{row.p95 != null ? `${row.p95} ms` : 'Sin datos'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <Card title="Alertas" icon={overallLevel === 'red' ? ShieldX : ShieldCheck}>
        {alerts.length === 0 ? (
          <p className="text-sm text-gray-600">Sin alertas activas.</p>
        ) : (
          <div className="space-y-2">
            {alerts.map((alert, idx) => (
              <div key={`${alert.title}-${idx}`} className={`rounded-xl border px-3 py-2 ${levelPill[alert.level]}`}>
                <p className="font-bold">{alert.title}</p>
                <p className="text-sm">{alert.detail}</p>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="grid sm:flex sm:items-center sm:gap-3 space-y-3 sm:space-y-0">
        <Link to="/daily-orders" className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-blue-600 text-white font-semibold shadow-sm hover:bg-blue-700">
          Revisar pedidos <ArrowRight className="h-4 w-4" />
        </Link>
        <Link to="/auditoria" className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 font-semibold hover:bg-gray-50">
          Ver actividad reciente <ArrowRight className="h-4 w-4" />
        </Link>
        <span className="inline-flex items-center gap-2 text-xs text-gray-500">
          <Clock3 className="h-4 w-4" />
          Auto-refresh cada 90s.
        </span>
      </div>
    </div>
  )
}

export default Experience
