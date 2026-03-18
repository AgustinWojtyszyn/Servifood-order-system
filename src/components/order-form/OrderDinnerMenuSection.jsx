import { CheckCircle, ShoppingCart } from 'lucide-react'

const OrderDinnerMenuSection = ({ items, total, onToggleItem }) => (
  <div className="card bg-white/95 backdrop-blur-sm shadow-xl border-2 border-amber-300">
    <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
      <div className="bg-amber-500 text-white p-2 sm:p-3 rounded-xl">
        <ShoppingCart className="h-5 w-5 sm:h-6 sm:w-6" />
      </div>
      <div>
        <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900">Menú de cena</h2>
        <p className="text-sm sm:text-base text-gray-700 font-semibold mt-1">Selecciona tu plato para la cena (whitelist).</p>
      </div>
    </div>
    <div className="space-y-3">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          disabled={item.isDisabled}
          aria-pressed={!!item.isSelected}
          onClick={() => {
            if (item.isDisabled) return
            onToggleItem(item.id, !item.isSelected)
          }}
          className={`w-full text-left p-4 border-2 rounded-xl transition-all
            focus:outline-none focus:ring-2 focus:ring-blue-400
            ${item.isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/60'}
            ${item.isDisabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <p className="text-base sm:text-lg font-semibold text-gray-900">{item.name}</p>
              {item.description && <p className="text-sm sm:text-base text-gray-700">{item.description}</p>}
            </div>
            {item.isSelected && (
              <CheckCircle className="h-7 w-7 text-blue-600 shrink-0" />
            )}
          </div>
        </button>
      ))}
    </div>
    <div className="border-t border-gray-200 pt-3 sm:pt-4 mt-3">
      <div className="flex justify-between items-center text-lg sm:text-xl font-semibold">
        <span>Total de items (cena):</span>
        <span>{total}</span>
      </div>
    </div>
  </div>
)

export default OrderDinnerMenuSection
