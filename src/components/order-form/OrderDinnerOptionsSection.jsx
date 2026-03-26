import { CheckCircle, Settings } from 'lucide-react'

const OrderDinnerOptionsSection = ({
  options,
  customResponsesDinner,
  setCustomResponsesDinner,
  isDinnerOverrideValue,
  clearDinnerMenuSelections,
  dinnerSpecial,
  dinnerSpecialChoice,
  onDinnerSpecialSelect
}) => {
  const hasDinnerSpecial = dinnerSpecial && Array.isArray(dinnerSpecial.options) && dinnerSpecial.options.length > 0
  if ((!options || options.length === 0) && !hasDinnerSpecial) return null

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
        {hasDinnerSpecial && (
          <div className="border-2 border-amber-300 rounded-xl p-4 bg-linear-to-br from-amber-50 to-white">
            <p className="text-base sm:text-lg font-bold text-amber-900 mb-3">
              {dinnerSpecial.title || 'Opción de cena'}
            </p>
            <div className="space-y-2">
              {dinnerSpecial.options.map((opt, index) => {
                const isSelected = dinnerSpecialChoice === opt
                return (
                  <button
                    key={index}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => onDinnerSpecialSelect(opt)}
                    className={`w-full text-left p-3 border-2 rounded-lg transition-all
                      focus:outline-none focus:ring-2 focus:ring-amber-400
                      ${isSelected ? 'border-amber-500 bg-amber-100' : 'border-amber-200 hover:border-amber-300 hover:bg-amber-50'}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-base sm:text-lg text-gray-900 font-semibold">{opt}</span>
                      {isSelected && (
                        <CheckCircle className="h-6 w-6 text-amber-600 shrink-0" />
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
            {dinnerSpecialChoice && (
              <p className="mt-3 text-sm text-amber-900/80 font-semibold">
                Si elegís esta opción, no podés seleccionar otro menú u opción.
              </p>
            )}
          </div>
        )}

        {options.map((option) => {
          const isBlocked = Boolean(dinnerSpecialChoice)
          return (
          <div key={option.id} className={`border-2 border-gray-200 rounded-xl p-4 bg-linear-to-br from-white to-amber-50 ${isBlocked ? 'opacity-60 pointer-events-none' : ''}`}>
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
        )})}
      </div>
    </div>
  )
}

export default OrderDinnerOptionsSection
