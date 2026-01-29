import { useEffect, useState } from 'react'
import { BarChart2, Activity, X, RefreshCcw } from 'lucide-react'
import { useAuthContext } from '../contexts/AuthContext'
import { supabase } from '../services/supabase'

const WINDOW_SECONDS = 600
const REFRESH_MS = 5000

const DevPanel = () => {
  const { isAdmin } = useAuthContext()
  const [open, setOpen] = useState(false)
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchMetrics = async () => {
    setLoading(true)
    setError(null)
    const { data, error } = await supabase.rpc('get_metrics_summary', {
      p_window_seconds: WINDOW_SECONDS,
      p_limit: 30
    })
    if (error) setError(error.message)
    setData(data || [])
    setLoading(false)
  }

  useEffect(() => {
    if (!isAdmin || !open) return
    fetchMetrics()
    const id = setInterval(fetchMetrics, REFRESH_MS)
    return () => clearInterval(id)
  }, [isAdmin, open])

  if (!isAdmin) return null

  // Ubicamos arriba del botón de soporte para que no se solapen (margen extra)
  return (
    <div className="fixed bottom-24 right-4 z-50">
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="px-3 py-2 rounded-xl bg-black text-white shadow-lg flex items-center gap-2"
        >
          <Activity className="h-4 w-4" /> Modo Dev
        </button>
      ) : (
        <div className="w-[360px] bg-white shadow-2xl border border-gray-200 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 bg-black text-white">
            <div className="flex items-center gap-2">
              <BarChart2 className="h-4 w-4" />
              <span className="text-sm font-semibold">Modo Dev (últimos 10 min)</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={fetchMetrics} className="p-1 hover:bg-white/10 rounded" title="Refrescar">
                <RefreshCcw className="h-4 w-4" />
              </button>
              <button onClick={() => setOpen(false)} className="p-1 hover:bg-white/10 rounded" title="Cerrar">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="p-3 space-y-2 max-h-96 overflow-auto">
            {loading && <p className="text-sm text-gray-600">Cargando métricas...</p>}
            {error && <p className="text-sm text-red-600">{error}</p>}
            {!loading && !error && data.length === 0 && <p className="text-sm text-gray-600">Sin datos en la ventana.</p>}
            {!loading && !error && data.length > 0 && (
              <>
                <h4 className="text-xs font-semibold text-gray-500">Operaciones</h4>
                <table className="w-full text-xs text-left mb-2">
                  <thead>
                    <tr className="text-gray-500">
                      <th>Op</th><th>P50</th><th>P95</th><th>Err%</th><th>Calls</th><th>RPS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.filter(d => d.kind === 'op').map((row) => (
                      <tr key={row.op}>
                        <td className="font-semibold">{row.op}</td>
                        <td>{row.p50_ms?.toFixed?.(1) ?? '—'}</td>
                        <td>{row.p95_ms?.toFixed?.(1) ?? '—'}</td>
                        <td>{row.calls ? ((row.errors / row.calls) * 100).toFixed(1) : '0'}%</td>
                        <td>{row.calls}</td>
                        <td>{row.rps_window?.toFixed?.(2) ?? '0'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <h4 className="text-xs font-semibold text-gray-500">Pantallas</h4>
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="text-gray-500">
                      <th>Screen</th><th>RPS</th><th>Views</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.filter(d => d.kind === 'screen').map((row) => (
                      <tr key={row.op}>
                        <td className="font-semibold">{row.op}</td>
                        <td>{row.rps_window?.toFixed?.(2) ?? '0'}</td>
                        <td>{row.calls}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
            <button
              onClick={async () => {
                const { error } = await supabase.rpc('clear_metrics', { p_older_than_days: 7 })
                if (error) alert('No se pudo limpiar: ' + error.message)
                else fetchMetrics()
              }}
              className="mt-2 w-full text-xs font-semibold text-red-700 border border-red-200 rounded-lg py-2 hover:bg-red-50"
            >
              Limpiar métricas &gt;7 días
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default DevPanel
