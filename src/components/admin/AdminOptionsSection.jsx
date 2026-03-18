import { ArrowDown, ArrowUp, Edit3, Plus, Settings, Trash2 } from 'lucide-react'
import AdminDetailsModal from './AdminDetailsModal'
import AdminForm from './AdminForm'
import { getCompanyBadgeClass, getCompanyLabel } from '../../utils/admin/adminFormatters'

const AdminOptionsSection = ({
  editingOptions,
  newOption,
  customOptions,
  dessertOption,
  dessertOverrideEnabled,
  dessertOverrideDate,
  loadingDessertOverride,
  showDessertConfirm,
  onDessertOverrideDateChange,
  onToggleDessertOverride,
  onCloseDessertConfirm,
  onConfirmDessertDisable,
  onCreateOption,
  onEditOption,
  onToggleOption,
  onMoveOption,
  onDeleteOption,
  onFieldChange,
  onToggleDay,
  onOptionChoiceChange,
  onAddOptionChoice,
  onRemoveOptionChoice,
  onSaveOption,
  onCancelOption
}) => (
  <div className="card bg-white/95 backdrop-blur-sm shadow-xl border-2 border-white/20">
    <div className="flex flex-col gap-3 mb-4 sm:mb-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Opciones Personalizables</h2>
        <p className="text-sm text-gray-600 mt-1">Agrega preguntas, encuestas u opciones adicionales para los pedidos</p>
      </div>
      {!editingOptions && (
        <button
          onClick={onCreateOption}
          className="flex items-center justify-center text-sm sm:text-base w-full sm:w-auto px-4 py-3 rounded-xl bg-gray-900 text-white font-semibold shadow-sm hover:bg-gray-800 transition-all"
        >
          <Plus className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
          Nueva Opción
        </button>
      )}
    </div>

    {dessertOption && !editingOptions && (
      <div className="mb-4 sm:mb-6 border-2 border-amber-200 bg-amber-50 rounded-xl p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-amber-800">Postre bloqueado en fines de semana por defecto</p>
            <p className="text-sm text-amber-900/80">Si un sábado o domingo hay postre, habilítalo para la fecha.</p>
            {dessertOverrideEnabled && (
              <span className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-green-900 bg-green-100 border border-green-300 px-3 py-1 rounded-full">
                ● Postre habilitado
              </span>
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <input
              type="date"
              value={dessertOverrideDate}
              onChange={(e) => onDessertOverrideDateChange(e.target.value)}
              className="input-field bg-white text-gray-900"
            />
            <button
              onClick={() => onToggleDessertOverride()}
              disabled={loadingDessertOverride}
              className={`px-4 py-3 rounded-lg font-semibold text-sm shadow-sm border ${
                dessertOverrideEnabled
                  ? 'bg-red-600 text-white border-red-700 hover:bg-red-500'
                  : 'bg-green-600 text-white border-green-700 hover:bg-green-500'
              }`}
            >
              {loadingDessertOverride
                ? 'Guardando...'
                : dessertOverrideEnabled
                  ? 'Deshabilitar postre'
                  : 'Habilitar postre'}
            </button>
          </div>
        </div>
      </div>
    )}

    <AdminDetailsModal
      open={showDessertConfirm}
      loading={loadingDessertOverride}
      onCancel={onCloseDessertConfirm}
      onConfirm={onConfirmDessertDisable}
    />

    {!editingOptions && customOptions.length > 0 && (
      <div className="space-y-4 pr-2">
        {customOptions.map((option, index) => (
          <div key={option.id} className="border-2 border-gray-200 rounded-xl p-4 bg-white hover:border-primary-300 transition-all min-w-0">
            <div className="mb-3">
              <h3 className="font-bold text-base sm:text-lg text-gray-900 mb-2 wrap-break-word">{option.title}</h3>
              <div className="flex flex-wrap gap-2">
                <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                  option.type === 'multiple_choice' ? 'bg-blue-100 text-blue-800' :
                  option.type === 'checkbox' ? 'bg-purple-100 text-purple-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {option.type === 'multiple_choice' ? 'Opción Múltiple' :
                   option.type === 'checkbox' ? 'Casillas' : 'Texto'}
                </span>
                <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${getCompanyBadgeClass(option.company)}`}>
                  {getCompanyLabel(option.company)}
                </span>
                {option.required && (
                  <span className="text-xs px-2.5 py-1 rounded-full bg-red-100 text-red-800 font-semibold">
                    Requerido
                  </span>
                )}
                <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                  option.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                }`}>
                  {option.active ? 'Activo' : 'Inactivo'}
                </span>
              </div>
            </div>

            {(option.type === 'multiple_choice' || option.type === 'checkbox') && option.options && (
              <div className="overflow-x-auto pb-2 mb-4 -mx-2 px-2">
                <div className="flex gap-2 min-w-max">
                  {option.options.map((opt, i) => (
                    <span key={i} className="text-xs sm:text-sm px-3 py-1.5 bg-gray-100 rounded-full text-gray-700 font-medium whitespace-nowrap">
                      {opt}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2 pt-3 border-t border-gray-200">
              <div className="flex gap-2 order-2 sm:order-1">
                <button
                  onClick={() => onMoveOption(index, 'up')}
                  disabled={index === 0}
                  className="flex-1 sm:flex-none px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed border border-gray-300 flex items-center justify-center gap-1"
                  title="Subir"
                >
                  <ArrowUp className="h-4 w-4" />
                  <span className="text-xs font-medium">Subir</span>
                </button>
                <button
                  onClick={() => onMoveOption(index, 'down')}
                  disabled={index === customOptions.length - 1}
                  className="flex-1 sm:flex-none px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed border border-gray-300 flex items-center justify-center gap-1"
                  title="Bajar"
                >
                  <ArrowDown className="h-4 w-4" />
                  <span className="text-xs font-medium">Bajar</span>
                </button>
              </div>

              <div className="flex gap-2 order-1 sm:order-2 sm:ml-auto">
                <button
                  onClick={() => onEditOption(option)}
                  className="flex-1 sm:flex-none px-4 py-2 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-700 font-semibold text-sm flex items-center gap-1"
                  title="Editar opción"
                >
                  <Edit3 className="h-4 w-4" />
                  <span className="hidden sm:inline">Editar</span>
                </button>
                <button
                  onClick={() => onToggleOption(option.id, option.active)}
                  className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    option.active
                      ? 'bg-green-100 text-green-700 hover:bg-green-200'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {option.active ? 'Desactivar' : 'Activar'}
                </button>

                <button
                  onClick={() => onDeleteOption(option.id)}
                  className="shrink-0 px-4 py-2 rounded-lg bg-red-100 hover:bg-red-200 text-red-600 font-semibold text-sm flex items-center gap-1"
                  title="Eliminar"
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Eliminar</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    )}

    {customOptions.length === 0 && !editingOptions && (
      <div className="text-center py-12">
        <Settings className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-gray-900 mb-2">No hay opciones personalizadas</h3>
        <p className="text-gray-600 mb-6">Creá opciones adicionales para tus pedidos</p>
      </div>
    )}

    {editingOptions && (
      <AdminForm
        newOption={newOption}
        onFieldChange={onFieldChange}
        onToggleDay={onToggleDay}
        onOptionChoiceChange={onOptionChoiceChange}
        onAddOptionChoice={onAddOptionChoice}
        onRemoveOptionChoice={onRemoveOptionChoice}
        onSave={onSaveOption}
        onCancel={onCancelOption}
      />
    )}
  </div>
)

export default AdminOptionsSection
