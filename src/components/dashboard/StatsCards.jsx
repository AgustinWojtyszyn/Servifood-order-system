import { CheckCircle, Clock } from 'lucide-react'

const StatsCards = ({ stats }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 sm:px-5 sm:py-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Pedidos hoy</p>
        <p className="text-3xl sm:text-4xl font-black text-slate-900">{stats.total}</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 sm:px-5 sm:py-4">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-yellow-600" />
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Pendientes</p>
        </div>
        <p className="text-3xl sm:text-4xl font-black text-slate-900">{stats.pending}</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 sm:px-5 sm:py-4">
        <div className="flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-emerald-600" />
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Archivados</p>
        </div>
        <p className="text-3xl sm:text-4xl font-black text-slate-900">{stats.archived}</p>
      </div>
    </div>
  )
}

export default StatsCards
