import { useMemo, useState } from 'react'
import { CheckCircle2, AlertTriangle, XCircle, Clock3, Activity, ClipboardList, ArrowRight, ChevronDown, ChevronRight } from 'lucide-react'
import { useAppExperience } from '../hooks/useAppExperience'
import { useAuthContext } from '../contexts/AuthContext'
import { Link } from 'react-router-dom'

const statePalette = {
  green: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', bar: 'bg-emerald-500', icon: CheckCircle2 },
  amber: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', bar: 'bg-amber-500', icon: AlertTriangle },
  red: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', bar: 'bg-red-500', icon: XCircle }
}

const stateLabel = {
  green: 'Todo fluido',
  amber: 'Algo lento',
  red: 'Problemas'
}

const ActionCard = ({ title, value, desc, state = 'green' }) => {
  const palette = statePalette[state]
  const Icon = palette.icon
  return (
    <div className={`relative overflow-hidden rounded-2xl border ${palette.border} bg-white shadow-sm`}>
      <span className={`absolute inset-x-0 top-0 h-1 ${palette.bar}`} />
      <div className="p-4 space-y-2">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Icon className={`h-4 w-4 ${palette.text}`} />
          <span>{title}</span>
        </div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-600">{desc}</p>
      </div>
    </div>
  )
}

const ProblemRow = ({ state, message }) => {
  const palette = statePalette[state] || statePalette.green
  const Icon = palette.icon
  return (
    <div className="flex items-start gap-3 rounded-xl bg-white border border-gray-100 px-3 py-2">
      <span className={`mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full ${palette.bg}`}>
        <Icon className={`h-4 w-4 ${palette.text}`} />
      </span>
      <p className="text-sm text-gray-800">{message}</p>
    </div>
  )
}

const Experience = () => {
  const { totals, problems, speedLabel, loading, error, refetch, rawOps } = useAppExperience()
  const { isAdmin, user } = useAuthContext()
  const [devOpen, setDevOpen] = useState(false)
  const state = totals.state || 'green'
  const palette = statePalette[state]

  const problemsToShow = useMemo(() => problems && problems.length > 0 ? problems : [{
    state: 'green',
    message: 'No se detectaron problemas recientes.'
  }], [problems])

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-black text-white flex items-center justify-center shadow-lg">
            <Activity className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm uppercase tracking-wide text-gray-600 font-semibold">Experiencia en vivo</p>
            <h1 className="text-2xl font-extrabold text-gray-900">Cómo se siente usar la app</h1>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span className={`inline-flex items-center gap-1 rounded-full ${palette.bg} ${palette.text} px-2 py-1 font-semibold`}>
                {stateLabel[state]}
              </span>
              <span className="text-gray-400">•</span>
              <button onClick={() => refetch()} className="text-blue-700 font-semibold hover:underline">
                Actualizar ahora
              </button>
            </div>
          </div>
        </div>
        {error && <p className="text-sm text-red-600">No se pudo cargar: {error}</p>}
        {loading && <p className="text-sm text-gray-600">Actualizando…</p>}
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <ActionCard
          title="Velocidad de la app"
          value={speedLabel.title}
          desc={speedLabel.text}
          state={state}
        />
        <ActionCard
          title="Uso reciente"
          value={totals.actions ? `Se registraron ${totals.actions} acciones` : 'Sin actividad'}
          desc="en los últimos 10 minutos"
          state={totals.actions > 0 ? 'green' : 'amber'}
        />
        <ActionCard
          title="Errores reales"
          value={totals.errors ? `${totals.errors} acciones fallidas` : '0 acciones fallidas'}
          desc={totals.errors ? 'Detectados en los últimos 60 minutos.' : 'No hubo fallos en la última hora.'}
          state={totals.errors >= 2 ? 'red' : totals.errors === 1 ? 'amber' : 'green'}
        />
      </div>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-gray-700" />
          <h2 className="text-lg font-bold text-gray-900">Últimos problemas detectados</h2>
        </div>
        <div className="space-y-2">
          {problemsToShow.map((p) => (
            <ProblemRow key={p.key || p.message} state={p.state} message={p.message} />
          ))}
        </div>
      </section>

      <div className="grid sm:flex sm:items-center sm:gap-3 space-y-3 sm:space-y-0">
        <Link to="/dashboard" className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-blue-600 text-white font-semibold shadow-sm hover:bg-blue-700">
          Revisar pedidos <ArrowRight className="h-4 w-4" />
        </Link>
        <Link to="/auditoria" className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 font-semibold hover:bg-gray-50">
          Ver actividad reciente <ArrowRight className="h-4 w-4" />
        </Link>
        {isAdmin && (user?.id === 'ae177d76-9f35-44ac-a662-1b1e4146dbe4' || user?.email === 'agustinwojtyszyn99@gmail.com') && (
          <Link to="/dev-mode" className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 font-semibold hover:bg-gray-50">
            Ver detalles técnicos <ArrowRight className="h-4 w-4" />
          </Link>
        )}
      </div>

      {isAdmin && (
        <div className="border border-gray-200 rounded-2xl bg-white shadow-sm">
          <button
            onClick={() => setDevOpen(!devOpen)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-gray-900"
          >
            <span className="inline-flex items-center gap-2">
              {devOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              Modo DEV (datos crudos)
            </span>
            <span className="text-gray-500">Solo admins</span>
          </button>
          {devOpen && (
            <div className="overflow-auto px-4 pb-4">
              <table className="min-w-full text-xs text-left text-gray-900">
                <thead className="bg-gray-50 text-gray-600 border-b">
                  <tr>
                    <th className="px-2 py-2 font-semibold">action_type</th>
                    <th className="px-2 py-2 font-semibold">op</th>
                    <th className="px-2 py-2 font-semibold">p95_ms</th>
                    <th className="px-2 py-2 font-semibold">calls</th>
                    <th className="px-2 py-2 font-semibold">errors</th>
                    <th className="px-2 py-2 font-semibold">last_ts</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(rawOps || []).slice(0, 12).map((row, idx) => (
                    <tr key={row.op + idx}>
                      <td className="px-2 py-2 text-gray-800">{row.action_type || '—'}</td>
                      <td className="px-2 py-2 text-gray-800">{row.op}</td>
                      <td className="px-2 py-2 text-gray-800">{row.p95_ms?.toFixed?.(0) ?? '—'}</td>
                      <td className="px-2 py-2 text-gray-800">{row.calls}</td>
                      <td className="px-2 py-2 text-gray-800">{row.errors}</td>
                      <td className="px-2 py-2 text-gray-700">{row.last_ts || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {rawOps?.length > 12 && <p className="text-xs text-gray-500 mt-2">Mostrando 12 de {rawOps.length} filas.</p>}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default Experience
