import { CheckCircle, Settings } from 'lucide-react'

const OrderDinnerOptionsSection = ({
  options,
  customResponsesDinner,
  setCustomResponsesDinner,
  isDinnerOverrideValue,
  clearDinnerMenuSelections
}) => {
  if (!options || options.length === 0) return null

  return (
    <div className="card bg-white/95 backdrop-blur-sm shadow-xl border-2 border-amber-200">
      <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
        <div className="bg-amber-500 text-white p-2 sm:p-3 rounded-xl">
          <Settings className="h-5 w-5 sm:h-6 sm:w-6" />
        </div>
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900">Opciones adicionales (cena)</h2>
          <p className="text-sm sm:text-base text-gray-700 font-semibold">Mismo catálogo, responde para la cena.</p>
        </div>
      </div>

      <div className="space-y-6">
        {options.map((option) => (
          <div key={option.id} className="border-2 border-gray-200 rounded-xl p-4 bg-linear-to-br from-white to-amber-50">
            <label
              className="block text-base sm:text-lg text-gray-900 mb-3 font-bold"
              htmlFor={option.type === 'text' ? `dinner-custom-option-${option.id}` : undefined}
            >
              {option.title}
              {option.required && <span className="text-red-600 ml-1">*</span>}
            </label>

            {option.type === 'multiple_choice' && option.options && (
              <div className="space-y-2">
                {option.options.map((opt, index) => {
                  const isSelected = customResponsesDinner[option.id] === opt
                  return (
                    <button
                      key={index}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => {
                        const value = opt
                        if (isDinnerOverrideValue(value)) {
                          clearDinnerMenuSelections()
                        }
                        setCustomResponsesDinner(prev => {
                          if (isDinnerOverrideValue(value)) {
                            const next = {}
                            Object.entries(prev || {}).forEach(([k, v]) => {
                              if (!isDinnerOverrideValue(v)) next[k] = v
                            })
                            next[option.id] = value
                            return next
                          }
                          return { ...prev, [option.id]: prev[option.id] === value ? null : value }
                        })
                      }}
                      className={`w-full text-left p-3 border-2 rounded-lg transition-all
                        focus:outline-none focus:ring-2 focus:ring-blue-400
                        ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/60'}`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-base sm:text-lg text-gray-900 font-semibold">{opt}</span>
                        {isSelected && (
                          <CheckCircle className="h-6 w-6 text-blue-600 shrink-0" />
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}

            {option.type === 'checkbox' && option.options && (
              <div className="space-y-2">
                {option.options.map((opt, index) => {
                  const list = customResponsesDinner[option.id] || []
                  const isChecked = list.includes(opt)
                  return (
                    <button
                      key={index}
                      type="button"
                      aria-pressed={isChecked}
                      onClick={() => {
                        setCustomResponsesDinner(prev => {
                          const current = prev[option.id] || []
                          return {
                            ...prev,
                            [option.id]: isChecked
                              ? current.filter(v => v !== opt)
                              : [...current, opt]
                          }
                        })
                      }}
                      className={`w-full text-left p-3 border-2 rounded-lg transition-all
                        focus:outline-none focus:ring-2 focus:ring-blue-400
                        ${isChecked ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/60'}`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-base sm:text-lg text-gray-900 font-semibold">{opt}</span>
                        {isChecked && (
                          <CheckCircle className="h-6 w-6 text-blue-600 shrink-0" />
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}

            {option.type === 'text' && (
              <textarea
                id={`dinner-custom-option-${option.id}`}
                value={customResponsesDinner[option.id] || ''}
                onChange={(e) => setCustomResponsesDinner(prev => ({ ...prev, [option.id]: e.target.value }))}
                className="input-field"
                placeholder="Escribe tu respuesta para la cena..."
                style={{ fontWeight: '600' }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default OrderDinnerOptionsSection
