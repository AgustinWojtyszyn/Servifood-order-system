import { useEffect, useMemo, useState } from 'react'
import {
  BarChart2,
  Activity,
  RefreshCcw,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  BellPlus,
  FileText,
  PauseCircle,
  ExternalLink
} from 'lucide-react'
import { supabase } from '../services/supabase'
import { useAuthContext } from '../contexts/AuthContext'
import { Navigate, useNavigate } from 'react-router-dom'
import { formatDate, getTimeAgo } from '../utils'

const WINDOW_SECONDS = 600
const REFRESH_MS = 5000
const VIEW_KEY = 'dashboardView'

const DevMode = () => {
  const { isAdmin, user } = useAuthContext()
  const navigate = useNavigate()
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [view, setView] = useState(() => {
    if (typeof window === 'undefined') return 'simple'
    return localStorage.getItem(VIEW_KEY) || 'simple'
  })
  const [showAllOps, setShowAllOps] = useState(false)

  const fetchMetrics = async (silent = false) => {
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
    fetchMetrics()
    const id = setInterval(() => fetchMetrics(true), REFRESH_MS)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(VIEW_KEY, view)
    }
  }, [view])

  if (!isAdmin || !user || user.id !== 'ae177d76-9f35-44ac-a662-1b1e4146dbe4') {
    return <Navigate to="/dashboard" replace />
  }

  const fmtTs = (ts) => ts ? `${formatDate(ts, { hour12: false })} (${getTimeAgo(ts)})` : '—'

  const ops = useMemo(() => data.filter(d => d.kind === 'op'), [data])
  const screens = useMemo(() => data.filter(d => d.kind === 'screen'), [data])

  const totalErrors = useMemo(() => ops.reduce((acc, r) => acc + (r.errors || 0), 0), [ops])
  const totalCalls = useMemo(() => ops.reduce((acc, r) => acc + (r.calls || 0), 0), [ops])
  const totalErrRate = totalCalls ? ((totalErrors / totalCalls) * 100).toFixed(1) : '0.0'
  const totalRps = useMemo(() => ops.reduce((acc, r) => acc + (r.rps_window || 0), 0), [ops])
  const activeOps = useMemo(() => ops.filter(r => (r.rps_window || 0) > 0.05).length, [ops])
  const activeScreens = useMemo(() => screens.filter(r => (r.rps_window || 0) > 0.02).length, [screens])

  const statusFor = (row) => {
    const err = row.calls ? (row.errors / row.calls) * 100 : 0
    if (err > 3 || (row.p95_ms || 0) > 900) return 'bad'
    if (err >= 1 || (row.p95_ms || 0) > 600) return 'warn'
    return 'ok'
  }

  const overallStatus = useMemo(() => {
    const maxP95 = ops.reduce((max, r) => Math.max(max, r.p95_ms || 0), 0)
    if (Number(totalErrRate) > 3 || maxP95 > 900) return 'bad'
    if (Number(totalErrRate) >= 1 || maxP95 > 600) return 'warn'
    return 'ok'
  }, [ops, totalErrRate])

  const palette = {
    ok: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', bar: 'bg-emerald-500' },
    warn: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', bar: 'bg-amber-500' },
    bad: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', bar: 'bg-red-500' }
  }

  const statusBadge = (state, label) => {
    const paletteState = palette[state] || palette.ok
    const Icon = state === 'ok' ? CheckCircle2 : state === 'warn' ? AlertTriangle : XCircle
    return (
      <span className={`inline-flex items-center gap-1 rounded-full ${paletteState.bg} ${paletteState.text} px-2 py-1 text-xs font-semibold`}>
        <Icon className="h-4 w-4" /> {label}
      </span>
    )
  }

  const sortedOps = useMemo(() => {
    const severity = { bad: 2, warn: 1, ok: 0 }
    return [...ops].sort((a, b) => {
      const sa = severity[statusFor(a)]
      const sb = severity[statusFor(b)]
      if (sa !== sb) return sb - sa
      const errA = a.calls ? a.errors / a.calls : 0
      const errB = b.calls ? b.errors / b.calls : 0
      if (errA !== errB) return errB - errA
      return (b.rps_window || 0) - (a.rps_window || 0)
    })
  }, [ops])

  const visibleOps = useMemo(() => {
    const cleaned = sortedOps.filter(r => (r.rps_window || 0) > 0 || (r.calls || 0) >= 3)
    if (view === 'simple' && !showAllOps) return cleaned.slice(0, 5)
    return showAllOps ? sortedOps : cleaned
  }, [sortedOps, view, showAllOps])

  const visibleScreens = useMemo(() => {
    const cleaned = screens.filter(r => (r.rps_window || 0) > 0 || (r.calls || 0) >= 3)
    return view === 'simple' ? cleaned.slice(0, 5) : cleaned
  }, [screens, view])

  const handleCreateAlert = () => {
    alert('Define un umbral: Error% > 3% o P95 > 900ms. (Conecta aquí tu proveedor de alertas).')
  }

  const handlePauseDeploys = () => {
    alert('Pausar despliegues: coordina con tu pipeline CI/CD. (Acción sugerida).')
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-black text-white flex items-center justify-center shadow-lg">
            <Activity className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm uppercase tracking-wide text-gray-600 font-semibold">Monitor en vivo</p>
            <h1 className="text-2xl font-extrabold text-gray-900">Salud del servicio (últimos 10 min)</h1>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>Auto-refresco cada 5s</span>
              <span className="text-gray-300">•</span>
              {statusBadge(overallStatus, overallStatus === 'ok' ? 'Estable' : overallStatus === 'warn' ? 'Atención' : 'Incidencia')}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-full bg-gray-100 p-1 text-sm">
            {['simple', 'tecnica'].map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1 rounded-full ${view === v ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
              >
                {v === 'simple' ? 'Vista simple' : 'Vista técnica'}
              </button>
            ))}
          </div>
          <button
            onClick={fetchMetrics}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold border border-gray-200 hover:bg-gray-50"
            title="Refrescar"
          >
            <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refrescar
          </button>
          <button
            onClick={async () => {
              const { error } = await supabase.rpc('clear_metrics', { p_older_than_days: 7 })
              if (error) alert('No se pudo limpiar: ' + error.message)
              else fetchMetrics()
            }}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold border border-red-200 text-red-700 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
            Limpiar &gt;7 días
          </button>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-4">
        <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          <div className={`relative overflow-hidden rounded-2xl border ${palette[overallStatus].border} bg-white shadow-sm`}>
            <span className={`absolute inset-x-0 top-0 h-1 ${palette[overallStatus].bar}`} />
            <div className="p-4 space-y-1">
              <p className="text-sm text-gray-600">Salud del servicio</p>
              <div className="flex items-center gap-2">
                <p className="text-3xl font-bold text-gray-900">{overallStatus === 'ok' ? 'Estable' : overallStatus === 'warn' ? 'Atención' : 'Incidencia'}</p>
                {statusBadge(overallStatus, overallStatus === 'ok' ? 'OK' : overallStatus === 'warn' ? 'Atención' : 'Revisar')}
              </div>
              <p className="text-xs text-gray-500">Reglas: Error% &gt; 3% o P95 &gt; 900ms = Incidencia.</p>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <span className="absolute inset-x-0 top-0 h-1 bg-slate-800" />
            <div className="p-4 space-y-1">
              <p className="text-sm text-gray-600">Tráfico</p>
              <div className="flex items-end gap-2">
                <p className="text-3xl font-bold text-gray-900">{totalRps.toFixed(2)} RPS</p>
                <p className="text-xs text-gray-500 mb-1">en ventana</p>
              </div>
              <p className="text-xs text-gray-500">Endpoints activos: {activeOps} · Pantallas activas: {activeScreens}</p>
            </div>
          </div>

          <div className={`relative overflow-hidden rounded-2xl border ${Number(totalErrRate) > 3 ? 'border-red-200' : Number(totalErrRate) > 1 ? 'border-amber-200' : 'border-emerald-200'} bg-white shadow-sm`}>
            <span className={`absolute inset-x-0 top-0 h-1 ${Number(totalErrRate) > 3 ? 'bg-red-500' : Number(totalErrRate) > 1 ? 'bg-amber-500' : 'bg-emerald-500'}`} />
            <div className="p-4 space-y-1">
              <p className="text-sm text-gray-600">Errores</p>
              <div className="flex items-center gap-2">
                <p className={`text-3xl font-bold ${Number(totalErrRate) > 1 ? 'text-red-600' : 'text-emerald-700'}`}>{totalErrRate}%</p>
                <p className="text-xs text-gray-500">{totalErrors} errores de {totalCalls} llamadas</p>
              </div>
              <p className="text-xs text-gray-500">Atención si supera 1% · Incidencia si supera 3%.</p>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm sm:col-span-2 xl:col-span-1">
            <span className="absolute inset-x-0 top-0 h-1 bg-indigo-500" />
            <div className="p-4 space-y-1">
              <p className="text-sm text-gray-600">Pantallas con más uso</p>
              {visibleScreens.slice(0, 1).map(screen => (
                <div key={screen.op} className="flex items-center justify-between">
                  <p className="text-base font-semibold text-gray-900">{screen.op}</p>
                  <p className="text-sm text-gray-600">{screen.rps_window?.toFixed?.(2) ?? '0'} RPS</p>
                </div>
              ))}
              <p className="text-xs text-gray-500">Top {visibleScreens.length} en esta vista.</p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 shadow-sm rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <BellPlus className="h-5 w-5 text-gray-700" />
            <p className="text-sm font-semibold text-gray-900">Acciones rápidas</p>
          </div>
          <button
            onClick={handleCreateAlert}
            className="w-full inline-flex items-center justify-between rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50"
          >
            Crear alerta <ExternalLink className="h-4 w-4" />
          </button>
          <button
            onClick={() => navigate('/auditoria')}
            className="w-full inline-flex items-center justify-between rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50"
          >
            Ver logs en tiempo real <FileText className="h-4 w-4" />
          </button>
          {overallStatus === 'bad' && (
            <button
              onClick={handlePauseDeploys}
              className="w-full inline-flex items-center justify-between rounded-xl border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
            >
              Pausar despliegues <PauseCircle className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {loading && <p className="text-sm text-gray-600">Cargando...</p>}
      {!loading && !error && data.length === 0 && <p className="text-sm text-gray-600">Sin datos en la ventana.</p>}

      {!loading && !error && data.length > 0 && (
        <div className="space-y-6">
          <div className="bg-white shadow-xl border border-gray-100 rounded-2xl p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <BarChart2 className="h-6 w-6 text-blue-600" />
                <h2 className="text-xl font-extrabold text-gray-900">Rendimiento por endpoint</h2>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <span className="flex items-center gap-1">{statusBadge('ok', 'Estable')}</span>
                <span className="flex items-center gap-1">{statusBadge('warn', 'Atención')}</span>
                <span className="flex items-center gap-1">{statusBadge('bad', 'Incidencia')}</span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm text-left text-gray-900">
                <thead className="text-gray-600 border-b bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Endpoint</th>
                    {view === 'tecnica' && <th className="px-3 py-2 font-semibold">P50</th>}
                    <th className="px-3 py-2 font-semibold">P95</th>
                    <th className="px-3 py-2 font-semibold">Error %</th>
                    <th className="px-3 py-2 font-semibold">RPS</th>
                    {view === 'tecnica' && <th className="px-3 py-2 font-semibold">Calls</th>}
                    <th className="px-3 py-2 font-semibold">Estado</th>
                    <th className="px-3 py-2 font-semibold">Último</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {visibleOps.map(row => {
                    const state = statusFor(row)
                    const paletteState = palette[state]
                    const errPct = row.calls ? ((row.errors / row.calls) * 100).toFixed(1) : '0'
                    return (
                      <tr key={row.op} className="hover:bg-gray-50">
                        <td className="px-3 py-2 font-semibold text-gray-900">{row.op}</td>
                        {view === 'tecnica' && <td className="px-3 py-2 text-gray-900">{row.p50_ms?.toFixed?.(1) ?? '—'}</td>}
                        <td className="px-3 py-2 text-gray-900">{row.p95_ms?.toFixed?.(1) ?? '—'}</td>
                        <td className="px-3 py-2 text-gray-900">{errPct}%</td>
                        <td className="px-3 py-2 text-gray-900">{row.rps_window?.toFixed?.(2) ?? '0'}</td>
                        {view === 'tecnica' && <td className="px-3 py-2 text-gray-900">{row.calls}</td>}
                        <td className="px-3 py-2">
                          <span className={`inline-flex items-center gap-1 rounded-full ${paletteState.bg} ${paletteState.text} px-2 py-1 text-xs font-semibold`}>
                            {state === 'ok' ? <CheckCircle2 className="h-4 w-4" /> : state === 'warn' ? <AlertTriangle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                            {state === 'ok' ? 'Estable' : state === 'warn' ? 'Atención' : 'Incidencia'}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-gray-700 text-xs">{fmtTs(row.last_ts)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between mt-3">
              <p className="text-xs text-gray-500">
                Se ocultan endpoints con RPS 0 y &lt;3 hits. Orden: severidad → error% → RPS.
              </p>
              {view === 'simple' && (
                <button
                  onClick={() => setShowAllOps(!showAllOps)}
                  className="text-sm font-semibold text-gray-900 underline"
                >
                  {showAllOps ? 'Ver menos' : 'Ver todos'}
                </button>
              )}
            </div>
          </div>

          <div className="bg-white shadow-xl border border-gray-100 rounded-2xl p-4">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <BarChart2 className="h-6 w-6 text-green-600" />
                <h2 className="text-xl font-extrabold text-gray-900">Pantallas con más uso</h2>
              </div>
              <p className="text-xs text-gray-500">Top {view === 'simple' ? 5 : visibleScreens.length}</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm text-left text-gray-900">
                <thead className="text-gray-600 border-b bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Pantalla</th>
                    <th className="px-3 py-2 font-semibold">RPS</th>
                    <th className="px-3 py-2 font-semibold">Views</th>
                    <th className="px-3 py-2 font-semibold">Último</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {visibleScreens.map(row => (
                    <tr key={row.op} className="hover:bg-gray-50">
                      <td className="px-3 py-2 font-semibold text-gray-900">{row.op}</td>
                      <td className="px-3 py-2 text-gray-900">{row.rps_window?.toFixed?.(2) ?? '0'}</td>
                      <td className="px-3 py-2 text-gray-900">{row.calls}</td>
                      <td className="px-3 py-2 text-gray-700 text-xs">{fmtTs(row.last_ts)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DevMode
