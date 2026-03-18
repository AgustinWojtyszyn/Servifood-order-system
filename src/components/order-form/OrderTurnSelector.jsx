import { CheckCircle, Clock } from 'lucide-react'

const OrderTurnSelector = ({
  selectedTurns,
  onToggleLunch,
  onToggleDinner
}) => (
    <div className="card bg-white/95 backdrop-blur-sm shadow-xl border-2 border-amber-200">
      <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
        <div className="bg-amber-500 text-white p-2 sm:p-3 rounded-xl">
          <Clock className="h-5 w-5 sm:h-6 sm:w-6" />
        </div>
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Turnos del pedido</h2>
          <p className="text-xs sm:text-sm text-gray-700 font-semibold mt-1">Selecciona qué turnos querés pedir hoy.</p>
        </div>
      </div>
      <div className="space-y-3">
        <button
          type="button"
          aria-pressed={selectedTurns.lunch}
          onClick={onToggleLunch}
          className={`w-full text-left p-4 border-2 rounded-xl transition-all
            focus:outline-none focus:ring-2 focus:ring-blue-400
            ${selectedTurns.lunch ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/60'}`}
        >
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm sm:text-base text-gray-900 font-semibold">Almuerzo</span>
            {selectedTurns.lunch && (
              <CheckCircle className="h-7 w-7 text-blue-600 shrink-0" />
            )}
          </div>
        </button>
        <button
          type="button"
          aria-pressed={selectedTurns.dinner}
          onClick={onToggleDinner}
          className={`w-full text-left p-4 border-2 rounded-xl transition-all
            focus:outline-none focus:ring-2 focus:ring-blue-400
            ${selectedTurns.dinner ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/60'}`}
        >
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm sm:text-base text-gray-900 font-semibold">Cena (solo whitelist)</span>
            {selectedTurns.dinner && (
              <CheckCircle className="h-7 w-7 text-blue-600 shrink-0" />
            )}
          </div>
        </button>
        <p className="text-xs text-gray-600">Puedes pedir uno o ambos. Si marcas ambos, se abrirá el formulario de cena completo debajo.</p>
      </div>
    </div>
  )

export default OrderTurnSelector
