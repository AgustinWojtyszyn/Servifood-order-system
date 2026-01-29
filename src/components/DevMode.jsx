import { useEffect, useState } from 'react'
import { BarChart2, Activity, RefreshCcw, Trash2, AlertTriangle } from 'lucide-react'
import { supabase } from '../services/supabase'
import { useAuthContext } from '../contexts/AuthContext'
import { Navigate } from 'react-router-dom'
import { formatDate, getTimeAgo } from '../utils'

const WINDOW_SECONDS = 600
const REFRESH_MS = 5000

const DevMode = () => {
  const { isAdmin, user } = useAuthContext()
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

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

  if (!isAdmin || !user || user.id !== 'ae177d76-9f35-44ac-a662-1b1e4146dbe4') {
    return <Navigate to="/dashboard" replace />
  }

  const fmtTs = (ts) => ts ? `${formatDate(ts, { hour12: false })} (${getTimeAgo(ts)})` : '—'
  const ops = data.filter(d => d.kind === 'op')
  const screens = data.filter(d => d.kind === 'screen')
  const totalErrors = ops.reduce((acc, r) => acc + (r.errors || 0), 0)
  const totalCalls = ops.reduce((acc, r) => acc + (r.calls || 0), 0)
  const totalErrRate = totalCalls ? ((totalErrors / totalCalls) * 100).toFixed(1) : '0.0'

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-black text-white flex items-center justify-center shadow-lg">
            <Activity className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm uppercase tracking-wide text-gray-600 font-semibold">Modo Dev</p>
            <h1 className="text-2xl font-extrabold text-gray-900">Métricas en tiempo real (últimos 10 min)</h1>
            <p className="text-sm text-gray-600">Solo visible para: agustinwojtyszyn99@gmail.com</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
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

      {/* Tarjetas resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-gray-100 shadow-sm bg-white p-4">
          <p className="text-xs font-semibold text-gray-500">Ventana</p>
          <p className="text-xl font-extrabold text-gray-900">Últimos 10 minutos</p>
          <p className="text-xs text-gray-600 mt-1">Refresco auto cada 5s</p>
        </div>
        <div className="rounded-2xl border border-gray-100 shadow-sm bg-white p-4">
          <p className="text-xs font-semibold text-gray-500">Llamadas</p>
          <p className="text-xl font-extrabold text-gray-900">{totalCalls}</p>
          <p className="text-xs text-gray-600 mt-1">Operaciones medidas</p>
        </div>
        <div className="rounded-2xl border border-gray-100 shadow-sm bg-white p-4">
          <p className="text-xs font-semibold text-gray-500">Error rate global</p>
          <div className="flex items-center gap-2">
            <span className={`text-xl font-extrabold ${Number(totalErrRate) > 1 ? 'text-red-600' : 'text-green-600'}`}>
              {totalErrRate}%
            </span>
            {Number(totalErrRate) > 1 && (
              <AlertTriangle className="h-5 w-5 text-red-500" />
            )}
          </div>
          <p className="text-xs text-gray-600 mt-1">Basado en llamadas de la ventana</p>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {loading && <p className="text-sm text-gray-600">Cargando...</p>}
      {!loading && !error && data.length === 0 && <p className="text-sm text-gray-600">Sin datos en la ventana.</p>}

      {!loading && !error && data.length > 0 && (
        <div className="space-y-6">
          <div className="bg-white shadow-xl border border-gray-100 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <BarChart2 className="h-6 w-6 text-blue-600" />
              <h2 className="text-xl font-extrabold text-gray-900">Operaciones</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm md:text-base text-left text-gray-900">
                <thead className="text-gray-600 border-b bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Op</th>
                    <th className="px-3 py-2 font-semibold">P50</th>
                    <th className="px-3 py-2 font-semibold">P95</th>
                    <th className="px-3 py-2 font-semibold">Err%</th>
                    <th className="px-3 py-2 font-semibold">Calls</th>
                    <th className="px-3 py-2 font-semibold">RPS</th>
                    <th className="px-3 py-2 font-semibold">Último</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.filter(d => d.kind === 'op').map(row => (
                    <tr key={row.op}>
                      <td className="px-3 py-2 font-semibold text-gray-900">{row.op}</td>
                      <td className="px-3 py-2 text-gray-900">{row.p50_ms?.toFixed?.(1) ?? '—'}</td>
                      <td className="px-3 py-2 text-gray-900">{row.p95_ms?.toFixed?.(1) ?? '—'}</td>
                      <td className="px-3 py-2 text-gray-900">{row.calls ? ((row.errors / row.calls) * 100).toFixed(1) : '0'}%</td>
                      <td className="px-3 py-2 text-gray-900">{row.calls}</td>
                      <td className="px-3 py-2 text-gray-900">{row.rps_window?.toFixed?.(2) ?? '0'}</td>
                      <td className="px-3 py-2 text-gray-700 text-xs md:text-sm">{fmtTs(row.last_ts)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white shadow-xl border border-gray-100 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <BarChart2 className="h-6 w-6 text-green-600" />
              <h2 className="text-xl font-extrabold text-gray-900">Pantallas</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm md:text-base text-left text-gray-900">
                <thead className="text-gray-600 border-b bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Screen</th>
                    <th className="px-3 py-2 font-semibold">RPS</th>
                    <th className="px-3 py-2 font-semibold">Views</th>
                    <th className="px-3 py-2 font-semibold">Último</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.filter(d => d.kind === 'screen').map(row => (
                    <tr key={row.op}>
                      <td className="px-3 py-2 font-semibold text-gray-900">{row.op}</td>
                      <td className="px-3 py-2 text-gray-900">{row.rps_window?.toFixed?.(2) ?? '0'}</td>
                      <td className="px-3 py-2 text-gray-900">{row.calls}</td>
                      <td className="px-3 py-2 text-gray-700 text-xs md:text-sm">{fmtTs(row.last_ts)}</td>
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
