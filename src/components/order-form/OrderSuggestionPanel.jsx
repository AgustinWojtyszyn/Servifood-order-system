import { X } from 'lucide-react'

const OrderSuggestionPanel = ({
  suggestionVisible,
  suggestion,
  suggestionMode,
  suggestionSummary,
  suggestionLoading,
  onRepeat,
  onDismiss
}) => {
  if (!suggestionVisible || !suggestion) return null

  return (
    <div className={`bg-white border-2 rounded-xl p-4 sm:p-5 shadow-xl flex flex-col gap-3 ${
      suggestionMode === 'repeat' ? 'border-blue-300' : 'border-green-300'
    }`}>
      <div className="flex justify-between items-start gap-3">
        <div>
          {suggestionMode === 'repeat' ? (
            <>
              <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Repetir pedido</p>
              <h3 className="text-lg sm:text-xl font-bold text-gray-900">
                Has seleccionado: <span className="text-blue-700">{suggestionSummary || '-'}</span>
              </h3>
            </>
          ) : (
            <>
              <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">Sugerencias inteligentes</p>
              <h3 className="text-lg sm:text-xl font-bold text-gray-900">
                La ultima vez pediste: <span className="text-green-700">{suggestionSummary || '-'}</span>
              </h3>
            </>
          )}
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="text-gray-500 hover:text-gray-700"
          aria-label="Cerrar sugerencia"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      {suggestionMode === 'repeat' ? (
        <p className="text-sm text-gray-700">en los ultimos 3 dias. Deseas repetir el pedido?</p>
      ) : (
        <p className="text-sm text-gray-700">Quieres repetirlo?</p>
      )}
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onRepeat}
          className={`px-4 py-2 rounded-lg text-white font-bold shadow ${
            suggestionMode === 'repeat' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'
          }`}
        >
          Repetir pedido
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold shadow"
        >
          No, hacer uno nuevo
        </button>
      </div>
      {suggestionLoading && (
        <p className="text-xs text-gray-500">Cargando sugerencia...</p>
      )}
    </div>
  )
}

export default OrderSuggestionPanel
