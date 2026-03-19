import { Link } from 'react-router-dom'
import { Clock, Plus, RefreshCw } from 'lucide-react'

const DashboardHeader = ({
  user,
  countdownLabel,
  countdownValue,
  countdownTone,
  refreshing,
  onRefresh
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 className="text-4xl sm:text-5xl font-bold text-white drop-shadow-2xl mb-2">Panel Principal</h1>
        <p className="mt-2 text-xl sm:text-2xl text-white font-semibold drop-shadow-lg">
          ¡Hola, {user?.user_metadata?.full_name || user?.email?.split('@')[0]}!
        </p>
        <p className="text-base sm:text-lg text-white/90 mt-1">Aquí está el resumen de tus pedidos</p>
        <div
          className={`mt-3 inline-flex flex-wrap items-center gap-2 px-4 py-3 rounded-xl border-2 shadow-lg ${
            countdownTone === 'urgent'
              ? 'bg-red-500/25 border-red-200/70 text-red-50'
              : countdownTone === 'warn'
              ? 'bg-orange-500/25 border-orange-200/70 text-orange-50'
              : 'bg-white/15 border-white/30 text-white'
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
          className={`inline-flex items-center justify-center font-bold py-3 px-6 text-base rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 ${
            refreshing
              ? 'bg-gray-400 cursor-not-allowed text-white'
              : 'bg-linear-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white'
          }`}
        >
          <RefreshCw className={`h-5 w-5 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Actualizando...' : 'Actualizar'}
        </button>
        <Link to="/order" className="btn-primary inline-flex items-center justify-center w-full sm:w-auto bg-linear-to-r from-secondary-500 to-secondary-600 hover:from-secondary-600 hover:to-secondary-700 text-white font-bold py-3 sm:py-4 px-6 sm:px-8 text-base sm:text-lg rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200">
          <Plus className="h-5 w-5 sm:h-6 sm:w-6 mr-2" />
          Nuevo Pedido
        </Link>
      </div>
    </div>
  )
}

export default DashboardHeader
