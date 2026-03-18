import { Edit3, Plus, Save, Trash2, X } from 'lucide-react'

const AdminMenuSection = ({
  editingMenu,
  savingMenu,
  menuItems,
  newMenuItems,
  dinnerMenuEnabled,
  onToggleDinnerMenu,
  onEditMenu,
  onSaveMenu,
  onCancelMenu,
  onMenuItemChange,
  onAddMenuItem,
  onRemoveMenuItem,
  onPrimeSuccess
}) => (
  <div className="card bg-white/95 backdrop-blur-sm shadow-xl border-2 border-white/20">
    <div className="flex flex-col gap-3 mb-4 sm:mb-6">
      <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Gestión del Menú</h2>
      {!editingMenu ? (
        <button
          onClick={onEditMenu}
          className="btn-primary flex items-center justify-center text-sm sm:text-base w-full sm:w-auto"
        >
          <Edit3 className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
          Editar Menú
        </button>
      ) : (
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onPointerDown={() => {
              if (!savingMenu) onPrimeSuccess()
            }}
            onClick={onSaveMenu}
            disabled={savingMenu}
            className="btn-primary flex items-center justify-center text-sm sm:text-base px-4 py-2.5 flex-1"
          >
            <Save className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
            Guardar
          </button>
          <button
            onClick={onCancelMenu}
            className="btn-secondary flex items-center justify-center text-sm sm:text-base px-4 py-2.5 flex-1"
          >
            <X className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
            Cancelar
          </button>
        </div>
      )}
    </div>

    {!editingMenu ? (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {menuItems.map((item, index) => (
          <div key={item.id || index} className="border-2 border-gray-200 rounded-lg p-4 bg-white hover:border-primary-300 transition-colors">
            <h3 className="font-bold text-gray-900 mb-2 text-base">{item.name}</h3>
            {item.description && (
              <p className="text-sm text-gray-600 leading-relaxed">{item.description}</p>
            )}
          </div>
        ))}
      </div>
    ) : (
      <div className="space-y-4">
        <div className="bg-blue-50 border-2 border-blue-300 rounded-xl p-4 mb-4">
          <p className="text-blue-800 font-semibold text-center text-sm leading-relaxed">
            Podés agregar, editar o eliminar opciones del menú. Debe haber al menos un plato.
          </p>
          <div className="mt-3 flex items-center gap-2 justify-center">
            <input
              type="checkbox"
              id="dinner-menu-enabled"
              name="dinnerMenuEnabled"
              checked={dinnerMenuEnabled}
              onChange={(e) => onToggleDinnerMenu(e.target.checked)}
              className="w-5 h-5 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
            />
            <label htmlFor="dinner-menu-enabled" className="text-sm font-bold text-gray-900 cursor-pointer select-none">
              Habilitar este menú también para <span className="font-extrabold">cena</span> (solo whitelist)
            </label>
          </div>
        </div>

        {newMenuItems.map((item, index) => {
          const nameId = `menu-item-name-${index}`
          const descId = `menu-item-description-${index}`
          return (
            <div key={index} className="border-2 border-gray-200 rounded-xl bg-white p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="shrink-0 w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                  {index + 1}
                </div>
                <button
                  onClick={() => onRemoveMenuItem(index)}
                  className="ml-auto p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors shrink-0"
                  title="Eliminar plato"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-3">
                <label htmlFor={nameId} className="sr-only">Nombre del plato</label>
                <input
                  id={nameId}
                  name={nameId}
                  type="text"
                  placeholder="Nombre del plato"
                  value={item.name}
                  onChange={(e) => onMenuItemChange(index, 'name', e.target.value)}
                  className="input-field font-semibold text-base bg-white text-gray-900 w-full"
                  required
                />
                <label htmlFor={descId} className="sr-only">Descripción del plato</label>
                <input
                  id={descId}
                  name={descId}
                  type="text"
                  placeholder="Descripción (opcional)"
                  value={item.description}
                  onChange={(e) => onMenuItemChange(index, 'description', e.target.value)}
                  className="input-field text-sm bg-white text-gray-900 w-full"
                />
              </div>
            </div>
          )
        })}

        <button
          onClick={onAddMenuItem}
          className="w-full flex items-center justify-center gap-2 p-4 rounded-xl bg-gray-900 text-white hover:bg-gray-800 transition-all font-semibold text-sm shadow-sm"
        >
          <Plus className="h-5 w-5" />
          Agregar nuevo plato
        </button>
      </div>
    )}
  </div>
)

export default AdminMenuSection
