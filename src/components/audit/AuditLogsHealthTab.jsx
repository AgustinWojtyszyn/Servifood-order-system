import { Activity, RefreshCcw, ServerCrash, BarChart2 } from 'lucide-react'

export default function AuditLogsHealthTab({
  loadHealth,
  loadOrdersCount,
  loadHealthProbes,
  healthLoading,
  healthError,
  health,
  ordersCount,
  ordersError,
  healthRange,
  setHealthRange,
  healthOnlyErrors,
  setHealthOnlyErrors,
  healthLogs,
  healthLogsLoading,
  healthLogsError,
  filteredHealthLogs,
  truncate,
  formatTimestamp
}) {
  return (
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
  )
}

