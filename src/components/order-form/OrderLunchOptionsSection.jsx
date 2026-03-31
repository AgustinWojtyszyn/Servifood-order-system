import { CheckCircle, Settings } from 'lucide-react'

const OrderLunchOptionsSection = ({ options, companyName, onCustomResponse }) => {
  if (!options || options.length === 0) return null

  return (
    <div className="card bg-white/95 backdrop-blur-sm shadow-xl border-2 border-white/20">
      <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
        <div className="bg-linear-to-r from-purple-600 to-purple-700 text-white p-2 sm:p-3 rounded-xl">
          <Settings className="h-5 w-5 sm:h-6 sm:w-6" />
        </div>
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Opciones Adicionales</h2>
          <p style={{ fontWeight: '900' }} className="text-xs sm:text-sm text-gray-900 mt-1">Personaliza tu pedido</p>
          <p className="text-[11px] sm:text-xs text-gray-600 font-semibold">
            Solo mostramos las opciones activas para {companyName}.
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {options.map((option) => (
          <div key={option.id} className="border-2 border-gray-200 rounded-xl p-4 bg-linear-to-br from-white to-gray-50">
            <label
              className="block text-sm text-gray-900 mb-3"
              style={{ fontWeight: '900' }}
              htmlFor={option.type === 'text' ? `custom-option-${option.id}` : undefined}
            >
              {option.title}
              {option.required && <span className="text-red-600 ml-1">*</span>}
            </label>
            {option.helperPostreContent && (
              <div className="mb-3 text-sm font-semibold text-amber-800 bg-amber-50 border border-amber-300 rounded-lg p-2">
                {option.helperPostreContent}
              </div>
            )}

            {option.type === 'multiple_choice' && option.choices && (
              <div className="space-y-2">
                {option.choices.map((choice, index) => (
                  <button
                    key={index}
                    type="button"
                    disabled={choice.isDisabled}
                    aria-pressed={choice.isSelected}
                    onClick={() => {
                      if (choice.isDisabled) return
                      onCustomResponse(option.id, choice.value, 'multiple_choice')
                    }}
                    className={`w-full text-left p-3 border-2 rounded-lg transition-all
                      focus:outline-none focus:ring-2 focus:ring-blue-400
                      ${choice.isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/60'}
                      ${choice.isDisabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span
                        className={`text-sm ${choice.isDisabled ? 'text-gray-400' : 'text-gray-900'}`}
                        style={{ fontWeight: '900' }}
                      >
                        {choice.value}
                        {choice.showUnavailableLabel && ' (no disponible hoy)'}
                      </span>
                      {choice.isSelected && (
                        <CheckCircle className="h-6 w-6 text-blue-600 shrink-0" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {option.type === 'checkbox' && option.choices && (
              <div className="space-y-2">
                {option.choices.map((choice, index) => (
                  <button
                    key={index}
                    type="button"
                    aria-pressed={choice.isChecked}
                    onClick={() => onCustomResponse(option.id, choice.value, 'checkbox')}
                    className={`w-full text-left p-3 border-2 rounded-lg transition-all
                      focus:outline-none focus:ring-2 focus:ring-blue-400
                      ${choice.isChecked ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/60'}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm text-gray-900" style={{ fontWeight: '900' }}>{choice.value}</span>
                      {choice.isChecked && (
                        <CheckCircle className="h-6 w-6 text-blue-600 shrink-0" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {option.type === 'text' && (
              <textarea
                id={`custom-option-${option.id}`}
                name={`custom-option-${option.id}`}
                value={option.textValue}
                onChange={(e) => onCustomResponse(option.id, e.target.value, 'text')}
                rows={3}
                disabled={option.isDisabled}
                className="input-field"
                placeholder="Escribe tu respuesta aquí..."
                style={{ fontWeight: '600' }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default OrderLunchOptionsSection
