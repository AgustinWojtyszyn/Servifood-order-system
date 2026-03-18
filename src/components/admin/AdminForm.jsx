import { Plus, Save, X } from 'lucide-react'
import { COMPANY_LIST } from '../../constants/companyConfig'

const AdminForm = ({
  newOption,
  onFieldChange,
  onToggleDay,
  onOptionChoiceChange,
  onAddOptionChoice,
  onRemoveOptionChoice,
  onSave,
  onCancel
}) => {
  if (!newOption) return null

  return (
    <div className="border-2 border-primary-300 rounded-xl p-4 sm:p-6 bg-primary-50">
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <h3 className="text-lg sm:text-xl font-bold text-gray-900">Nueva Opción Personalizable</h3>
        <button
          onClick={onCancel}
          className="p-2 hover:bg-red-100 rounded-lg text-red-600 shrink-0"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor="new-option-title" className="block text-sm font-bold text-gray-900 mb-2">
            Título/Pregunta *
          </label>
          <input
            id="new-option-title"
            name="new-option-title"
            type="text"
            value={newOption.title}
            onChange={(e) => onFieldChange('title', e.target.value)}
            className="input-field w-full bg-white text-gray-900"
            placeholder="Ej: ¿Prefieres alguna bebida?"
            autoComplete="off"
          />
        </div>

        <div>
          <label htmlFor="new-option-type" className="block text-sm font-bold text-gray-900 mb-2">
            Tipo de Respuesta *
          </label>
          <select
            id="new-option-type"
            name="new-option-type"
            value={newOption.type}
            onChange={(e) => onFieldChange('type', e.target.value)}
            className="input-field w-full bg-white text-gray-900 text-sm sm:text-base"
          >
            <option value="multiple_choice">Opción Múltiple (una respuesta)</option>
            <option value="checkbox">Casillas (múltiples respuestas)</option>
            <option value="text">Texto Libre</option>
          </select>
        </div>

        <div>
          <label htmlFor="new-option-company" className="block text-sm font-bold text-gray-900 mb-2">
            Empresa / alcance *
          </label>
          <select
            id="new-option-company"
            name="new-option-company"
            value={newOption.company || ''}
            onChange={(e) => onFieldChange('company', e.target.value)}
            className="input-field w-full bg-white text-gray-900 text-sm sm:text-base"
          >
            <option value="">Visible para todas las empresas</option>
            {COMPANY_LIST.map(company => (
              <option key={company.slug} value={company.slug}>
                Solo {company.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-600 mt-1">
            Las preguntas se mostrarán únicamente en el flujo de la empresa elegida.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2">
              Aplicar a
            </label>
            <div className="flex flex-wrap gap-2 text-gray-900">
              {[
                { value: 'both', label: 'Ambos' },
                { value: 'lunch', label: 'Solo almuerzo' },
                { value: 'dinner', label: 'Solo cena' }
              ].map(opt => (
                <label key={opt.value} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold cursor-pointer text-gray-900">
                  <input
                    type="radio"
                    name="meal-scope"
                    value={opt.value}
                    checked={newOption.meal_scope === opt.value}
                    onChange={() => onFieldChange('meal_scope', opt.value)}
                    className="text-primary-600 focus:ring-primary-500"
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2">
              Feriados
            </label>
            <div className="flex flex-col gap-2 text-gray-900">
              <label className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold cursor-pointer text-gray-900">
                <input
                  type="checkbox"
                  checked={newOption.only_holidays}
                  onChange={(e) => onFieldChange('only_holidays', e.target.checked)}
                  disabled={newOption.exclude_holidays}
                  className="text-primary-600 focus:ring-primary-500"
                />
                Solo feriados
              </label>
              <label className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold cursor-pointer text-gray-900">
                <input
                  type="checkbox"
                  checked={newOption.exclude_holidays}
                  onChange={(e) => onFieldChange('exclude_holidays', e.target.checked)}
                  disabled={newOption.only_holidays}
                  className="text-primary-600 focus:ring-primary-500"
                />
                Excluir feriados
              </label>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-900 mb-2">
            Días de la semana (dejar vacío = todos)
          </label>
          <div className="grid grid-cols-7 gap-2 text-center text-gray-900">
            {[1, 2, 3, 4, 5, 6, 7].map(day => {
              const labels = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
              const active = Array.isArray(newOption.days_of_week) && newOption.days_of_week.includes(day)
              return (
                <button
                  type="button"
                  key={day}
                  onClick={() => onToggleDay(day)}
                  className={`rounded-lg border px-0 py-2 text-sm font-bold ${
                    active ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-black border-gray-200'
                  }`}
                >
                  {labels[day - 1]}
                </button>
              )
            })}
          </div>
        </div>

        {(newOption.type === 'multiple_choice' || newOption.type === 'checkbox') && (
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2">
              Opciones de Respuesta
            </label>
            <div className="space-y-2">
              {newOption.options.map((opt, index) => (
                <div key={index} className="flex gap-2">
                  <label htmlFor={`option-choice-${index}`} className="sr-only">
                    Opción {index + 1}
                  </label>
                  <input
                    id={`option-choice-${index}`}
                    name={`option-choice-${index}`}
                    type="text"
                    value={opt}
                    onChange={(e) => onOptionChoiceChange(index, e.target.value)}
                    className="input-field flex-1 bg-white text-gray-900"
                    placeholder={`Opción ${index + 1}`}
                  />
                  {newOption.options.length > 1 && (
                    <button
                      onClick={() => onRemoveOptionChoice(index)}
                      className="p-2.5 text-red-600 hover:bg-red-100 rounded-lg shrink-0"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={onAddOptionChoice}
                className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-all font-medium"
              >
                <Plus className="h-4 w-4" />
                Agregar opción
              </button>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 bg-white rounded-lg p-3 border border-gray-200">
          <input
            type="checkbox"
            id="new-option-required"
            checked={newOption.required}
            onChange={(e) => onFieldChange('required', e.target.checked)}
            className="w-5 h-5 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
          />
          <label htmlFor="new-option-required" className="text-sm font-bold text-gray-900 cursor-pointer select-none">
            Campo requerido
          </label>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <button
            onClick={onSave}
            className="btn-primary flex-1 flex items-center justify-center py-3"
          >
            <Save className="h-5 w-5 mr-2" />
            Guardar Opción
          </button>
          <button
            onClick={onCancel}
            className="btn-secondary flex-1 py-3"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}

export default AdminForm
