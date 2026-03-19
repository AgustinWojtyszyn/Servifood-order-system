import { CheckCircle, Settings } from 'lucide-react'

const EditOrderCustomOptionsSection = ({
  options,
  customResponses,
  onCustomResponse
}) => {
  const activeOptions = Array.isArray(options) ? options.filter(opt => opt.active) : []
  if (activeOptions.length === 0) return null

  return (
    <div className="card bg-white/95 backdrop-blur-sm shadow-xl border-2 border-white/20">
      <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
        <div className="bg-linear-to-r from-purple-600 to-purple-700 text-white p-2 sm:p-3 rounded-xl">
          <Settings className="h-5 w-5 sm:h-6 sm:w-6" />
        </div>
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Opciones Adicionales</h2>
          <p style={{ fontWeight: '900' }} className="text-xs sm:text-sm text-gray-900 mt-1">Personaliza tu pedido</p>
        </div>
      </div>

      <div className="space-y-6">
        {activeOptions.map((option) => (
          <div key={option.id} className="border-2 border-gray-200 rounded-xl p-4 bg-linear-to-br from-white to-gray-50">
            <label
              className="block text-sm text-gray-900 mb-3"
              style={{ fontWeight: '900' }}
              htmlFor={option.type === 'text' ? `custom-option-${option.id}` : undefined}
            >
              {option.title}
              {option.required && <span className="text-red-600 ml-1">*</span>}
            </label>

            {option.type === 'multiple_choice' && option.options && (
              <div className="space-y-2">
                {option.options.map((opt, index) => {
                  const isSelected = customResponses[option.id] === opt
                  return (
                    <button
                      key={index}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => onCustomResponse(option.id, opt, 'multiple_choice')}
                      className={`w-full text-left p-3 border-2 rounded-lg transition-all
                        focus:outline-none focus:ring-2 focus:ring-blue-400
                        ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/60'}`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm text-gray-900" style={{ fontWeight: '900' }}>{opt}</span>
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
                  const isChecked = (customResponses[option.id] || []).includes(opt)
                  return (
                    <button
                      key={index}
                      type="button"
                      aria-pressed={isChecked}
                      onClick={() => onCustomResponse(option.id, opt, 'checkbox')}
                      className={`w-full text-left p-3 border-2 rounded-lg transition-all
                        focus:outline-none focus:ring-2 focus:ring-blue-400
                        ${isChecked ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/60'}`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm text-gray-900" style={{ fontWeight: '900' }}>{opt}</span>
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
                id={`custom-option-${option.id}`}
                name={`custom-option-${option.id}`}
                value={customResponses[option.id] || ''}
                onChange={(e) => onCustomResponse(option.id, e.target.value, 'text')}
                rows={3}
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

export default EditOrderCustomOptionsSection
