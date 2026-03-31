import { Link } from 'react-router-dom'
import { Clock, Edit, Plus, RefreshCw, Trash2 } from 'lucide-react'

const DashboardHeader = ({
  user,
  countdownLabel,
  countdownValue,
  countdownTone,
  refreshing,
  onRefresh,
  headerOrder,
  headerStatus,
  headerSummary,
  canEditOrder,
  onEditOrder,
  onDeleteOrder
}) => {
  const allowEdit = headerOrder && canEditOrder ? canEditOrder(headerOrder) : false

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-4xl sm:text-5xl font-bold text-white drop-shadow-2xl mb-2">Panel Principal</h1>
          <p className="mt-2 text-xl sm:text-2xl text-white font-semibold drop-shadow-lg">
            ¡Hola, {user?.user_metadata?.full_name || user?.email?.split('@')[0]}!
          </p>
          <p className="text-base sm:text-lg text-white/90 mt-1">Aquí está el resumen de tus pedidos</p>
          <div
            className={`mt-3 inline-flex flex-wrap items-center gap-2 px-4 py-3 rounded-xl border ${
              countdownTone === 'urgent'
                ? 'bg-red-500/20 border-red-200/70 text-red-50'
                : countdownTone === 'warn'
                ? 'bg-orange-500/20 border-orange-200/70 text-orange-50'
                : 'bg-white/10 border-white/30 text-white'
            }`}
          >
            <Clock className="h-5 w-5" />
            <span className="text-base sm:text-lg font-bold">Horario pedidos: 09:00 a 22:00</span>
            <span className="text-base sm:text-lg font-bold">• {countdownLabel} {countdownValue}</span>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 mt-4 sm:mt-0 w-full sm:w-auto">
          <button
            onClick={onRefresh}
            disabled={refreshing}
            className={`inline-flex items-center justify-center font-bold py-3 px-6 text-base rounded-xl border transition-all duration-200 ${
              refreshing
                ? 'bg-gray-200 border-gray-200 cursor-not-allowed text-gray-500'
                : 'bg-white text-gray-900 border-white/40 hover:bg-white/90'
            }`}
          >
            <RefreshCw className={`h-5 w-5 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Actualizando...' : 'Actualizar'}
          </button>
          <Link to="/order" className="btn-primary inline-flex items-center justify-center w-full sm:w-auto bg-secondary-600 hover:bg-secondary-700 text-white font-bold py-3 sm:py-4 px-6 sm:px-8 text-base sm:text-lg rounded-xl shadow-sm transition-colors">
            <Plus className="h-5 w-5 sm:h-6 sm:w-6 mr-2" />
            Nuevo Pedido
          </Link>
        </div>
      </div>

      <div className="rounded-2xl border border-white/30 bg-white/10 p-4 sm:p-5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wide text-white/70 font-semibold">Estado del pedido</p>
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-gray-900">
                {headerStatus}
              </span>
              {headerOrder && (
                <span className="text-xs sm:text-sm text-white/90 font-semibold">
                  Pedido #{String(headerOrder.id).slice(-8)}
                </span>
              )}
            </div>
            <p className="text-sm sm:text-base text-white font-semibold">
              {headerSummary}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => headerOrder && onEditOrder && onEditOrder(headerOrder)}
              disabled={!allowEdit}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold border transition-colors ${
                allowEdit
                  ? 'bg-white text-gray-900 border-white hover:bg-white/90'
                  : 'bg-white/40 text-white/70 border-white/30 cursor-not-allowed'
              }`}
            >
              <Edit className="h-4 w-4" />
              Editar
            </button>
            <button
              type="button"
              onClick={() => headerOrder && onDeleteOrder && onDeleteOrder(headerOrder)}
              disabled={!allowEdit}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold border transition-colors ${
                allowEdit
                  ? 'bg-red-600 text-white border-red-600 hover:bg-red-700'
                  : 'bg-red-100/60 text-red-200 border-red-100/60 cursor-not-allowed'
              }`}
            >
              <Trash2 className="h-4 w-4" />
              Eliminar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DashboardHeader
