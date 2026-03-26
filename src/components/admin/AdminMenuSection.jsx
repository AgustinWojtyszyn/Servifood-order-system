import { useMemo, useState } from 'react'
import { Edit3, Plus, Save, Trash2, X, Calendar, Minus, CheckCircle } from 'lucide-react'

const AdminMenuSection = ({
  selectedDates,
  menuItemsByDate,
  draftMenuItemsByDate,
  editingMenuByDate,
  savingMenuByDate,
  loadingMenuByDate,
  dinnerMenuEnabled,
  onToggleDinnerMenu,
  onAddDate,
  onRemoveDate,
  onSaveAllMenus,
  onEditMenu,
  onSaveMenu,
  onCancelMenu,
  onMenuItemChange,
  onAddMenuItem,
  onRemoveMenuItem,
  onPrimeSuccess
}) => {
  const [weekBaseDate, setWeekBaseDate] = useState(() => {
    const now = new Date()
    const base = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    base.setDate(base.getDate() + 1)
    return base
  })

  const orderedDates = useMemo(() => {
    const list = Array.isArray(selectedDates) ? [...selectedDates] : []
    return list.sort()
  }, [selectedDates])

  const normalizeDate = (value) => {
    if (!value) return null
    if (value instanceof Date) return new Date(value.getFullYear(), value.getMonth(), value.getDate())
    const parsed = new Date(`${value}T00:00:00`)
    return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate())
  }

  const toISODate = (date) => {
    if (!(date instanceof Date)) return ''
    const yyyy = date.getFullYear()
    const mm = String(date.getMonth() + 1).padStart(2, '0')
    const dd = String(date.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
  }

  const startOfWeek = useMemo(() => {
    const base = normalizeDate(weekBaseDate) || normalizeDate(new Date())
    return base
  }, [weekBaseDate])

  const weekDays = useMemo(() => {
    const start = new Date(startOfWeek)
    return Array.from({ length: 7 }, (_, index) => {
      const d = new Date(start)
      d.setDate(start.getDate() + index)
      return d
    })
  }, [startOfWeek])

  const selectedCount = orderedDates.length
  const loadedCount = orderedDates.filter(date => (menuItemsByDate?.[date] || []).length > 0).length
  const isSavingAny = orderedDates.some(date => Boolean(savingMenuByDate?.[date]))

  const formatDateLabel = (dateISO) => {
    try {
      return new Intl.DateTimeFormat('es-AR', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      }).format(new Date(`${dateISO}T00:00:00`))
    } catch (err) {
      return dateISO
    }
  }

  const handleToggleDate = (dateISO) => {
    if (!dateISO) return
    if (orderedDates.includes(dateISO)) {
      onRemoveDate(dateISO)
    } else {
      onAddDate(dateISO)
    }
  }

  const formatDayLabel = (date) => {
    try {
      return new Intl.DateTimeFormat('es-AR', { weekday: 'short' })
        .format(date)
        .replace('.', '')
        .toUpperCase()
    } catch (err) {
      return toISODate(date)
    }
  }

  const formatDayNumber = (date) => {
    try {
      return new Intl.DateTimeFormat('es-AR', { day: '2-digit' }).format(date)
    } catch (err) {
      return String(date.getDate()).padStart(2, '0')
    }
  }

  const formatMonthLabel = (date) => {
    try {
      return new Intl.DateTimeFormat('es-AR', { month: 'short' })
        .format(date)
        .replace('.', '')
        .toUpperCase()
    } catch (err) {
      return ''
    }
  }

  const formatMonthFull = (date) => {
    try {
      const raw = new Intl.DateTimeFormat('es-AR', { month: 'long' }).format(date)
      return raw.charAt(0).toUpperCase() + raw.slice(1)
    } catch (err) {
      return ''
    }
  }

  return (
    <div className="card bg-white/95 backdrop-blur-sm shadow-xl border-2 border-white/20">
      <div className="flex flex-col gap-4 mb-5 sm:mb-7">
        <div className="flex flex-col gap-1">
          <p className="text-xs uppercase tracking-[0.18em] text-primary-600 font-bold">Panel Admin</p>
          <h2 className="text-2xl sm:text-3xl font-black text-gray-900">Planificación semanal del menú</h2>
          <p className="text-sm sm:text-base text-gray-600">
            Seleccioná uno o varios días de entrega para cargar el menú. Cada día se edita y se guarda por separado.
          </p>
        </div>

        <div className="bg-secondary-50 border-2 border-secondary-300 text-black rounded-2xl px-5 py-4 shadow-sm">
          <p className="text-base sm:text-lg font-black uppercase tracking-wide text-black">
            Los usuarios realizan su pedido el día anterior, por lo que este menú corresponde al día de entrega
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex-1 bg-gray-900 text-white rounded-2xl px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-white/70">Resumen de selección</p>
              <p className="text-lg sm:text-xl font-bold">
                {selectedCount} día{selectedCount === 1 ? '' : 's'} seleccionado{selectedCount === 1 ? '' : 's'}
              </p>
            </div>
            <div className="sm:ml-auto flex items-center gap-3 text-xs sm:text-sm">
              <span className="px-3 py-1 rounded-full bg-white/15 border border-white/20">
                {loadedCount} con menú cargado
              </span>
              <span className="px-3 py-1 rounded-full bg-white/15 border border-white/20">
                {formatMonthFull(startOfWeek)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-gray-400">
            <Calendar className="h-3.5 w-3.5" />
            <label htmlFor="week-picker" className="sr-only">Cambiar inicio de entregas</label>
            <span className="uppercase tracking-wide">Inicio</span>
            <input
              id="week-picker"
              type="date"
              value={toISODate(weekBaseDate)}
              onChange={(e) => setWeekBaseDate(normalizeDate(e.target.value))}
              className="input-field text-[11px] bg-gray-50 text-gray-600 border border-gray-200/60 w-32 sm:w-36"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {weekDays.map((date) => {
            const dateISO = toISODate(date)
            const isSelected = orderedDates.includes(dateISO)
            const hasMenu = (menuItemsByDate?.[dateISO] || []).length > 0
            const baseStyles = 'rounded-2xl border-2 px-4 py-4 text-left transition-all relative overflow-hidden'
            const selectedStyles = isSelected
              ? 'border-primary-700 bg-primary-100 text-gray-900 shadow-lg shadow-primary-900/10 ring-1 ring-primary-500/30'
              : 'border-gray-200 bg-gray-50 text-gray-900 hover:border-primary-300 hover:bg-primary-50/60 hover:shadow-md hover:-translate-y-0.5'
            return (
              <button
                key={dateISO}
                onClick={() => handleToggleDate(dateISO)}
                className={`${baseStyles} ${selectedStyles}`}
                type="button"
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold ${isSelected ? 'text-gray-900' : 'text-gray-500'}`}>
                    {formatDayLabel(date)}
                  </span>
                  {hasMenu && (
                    <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-emerald-100 text-emerald-700">
                      MENÚ
                    </span>
                  )}
                </div>
                <div className="mt-3 flex items-end gap-2">
                  <span className="text-2xl font-black">{formatDayNumber(date)}</span>
                  <span className={`text-xs font-semibold ${isSelected ? 'text-gray-900' : 'text-gray-500'}`}>
                    {formatMonthLabel(date)}
                  </span>
                </div>
                {isSelected && (
                  <span className="absolute top-3 right-3 text-primary-700">
                    <CheckCircle className="h-5 w-5" />
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {orderedDates.length > 0 && (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-2">
              {orderedDates.map(date => (
                <div key={date} className="flex items-center gap-2 bg-gray-100 text-gray-900 px-3 py-1.5 rounded-full text-xs font-semibold">
                  <span>{date}</span>
                  <button
                    onClick={() => onRemoveDate(date)}
                    className="p-1 rounded-full hover:bg-gray-200"
                    title="Quitar día"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex justify-end">
              <button
                onPointerDown={() => {
                  if (!isSavingAny && orderedDates.length > 0) onPrimeSuccess()
                }}
                onClick={onSaveAllMenus}
                disabled={orderedDates.length === 0 || isSavingAny}
                className="btn-primary text-black flex items-center justify-center text-sm sm:text-base px-4 py-2.5"
                type="button"
              >
                <Save className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                Guardar todos
              </button>
            </div>
          </div>
        )}
      </div>

      {orderedDates.length === 0 && (
        <div className="text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-lg p-4">
          Seleccioná al menos un día para editar su menú.
        </div>
      )}

      <div className="space-y-6">
        {orderedDates.map((menuDate) => {
          const editingMenu = !!editingMenuByDate?.[menuDate]
          const savingMenu = !!savingMenuByDate?.[menuDate]
          const loadingMenu = !!loadingMenuByDate?.[menuDate]
          const menuItems = menuItemsByDate?.[menuDate] || []
          const draftItems = draftMenuItemsByDate?.[menuDate] || []
          const dateLabel = formatDateLabel(menuDate)
          const dinnerToggleId = `dinner-menu-enabled-${menuDate}`

          return (
            <div key={menuDate} className="border-2 border-gray-200 rounded-2xl bg-white p-4 sm:p-5">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">Día seleccionado</p>
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900">{dateLabel}</h3>
                  <p className="text-xs text-gray-500">{menuDate}</p>
                </div>
                <div className="sm:ml-auto flex flex-col sm:flex-row gap-2">
                  {!editingMenu ? (
                    <button
                      onClick={() => onEditMenu(menuDate)}
                      className="btn-primary flex items-center justify-center text-sm sm:text-base px-4 py-2.5"
                    >
                      <Edit3 className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                      Editar Menú
                    </button>
                  ) : (
                    <>
                      <button
                        onPointerDown={() => {
                          if (!savingMenu) onPrimeSuccess()
                        }}
                        onClick={() => onSaveMenu(menuDate)}
                        disabled={savingMenu}
                        className="btn-primary text-black flex items-center justify-center text-sm sm:text-base px-4 py-2.5"
                      >
                        <Save className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                        Guardar
                      </button>
                      <button
                        onClick={() => onCancelMenu(menuDate)}
                        className="btn-secondary flex items-center justify-center text-sm sm:text-base px-4 py-2.5"
                      >
                        <X className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                        Cancelar
                      </button>
                    </>
                  )}
                </div>
              </div>

              {loadingMenu && (
                <div className="text-sm text-gray-600 mb-4">Cargando menú...</div>
              )}

              {!editingMenu ? (
                menuItems.length === 0 ? (
                  <div className="text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-lg p-4">
                    No hay platos cargados para este día.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {menuItems.map((item, index) => (
                      <div key={item.id || index} className="border-2 border-gray-200 rounded-lg p-4 bg-white hover:border-primary-300 transition-colors">
                        <h4 className="font-bold text-gray-900 mb-2 text-base">{item.name}</h4>
                        {item.description && (
                          <p className="text-sm text-gray-600 leading-relaxed">{item.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )
              ) : (
                <div className="space-y-4">
                  <div className="bg-blue-50 border-2 border-blue-300 rounded-xl p-4 mb-4">
                    <p className="text-blue-800 font-semibold text-center text-sm leading-relaxed">
                      Podés agregar, editar o eliminar opciones del menú. Debe haber al menos un plato.
                    </p>
                    <div className="mt-3 flex items-center gap-2 justify-center">
                      <input
                        type="checkbox"
                        id={dinnerToggleId}
                        name={dinnerToggleId}
                        checked={dinnerMenuEnabled}
                        onChange={(e) => onToggleDinnerMenu(e.target.checked)}
                        className="w-5 h-5 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                      />
                      <label htmlFor={dinnerToggleId} className="text-sm font-bold text-gray-900 cursor-pointer select-none">
                        Habilitar este menú también para <span className="font-extrabold">cena</span> (solo whitelist)
                      </label>
                    </div>
                  </div>

                  {draftItems.map((item, index) => {
                    const nameId = `menu-item-name-${menuDate}-${index}`
                    const descId = `menu-item-description-${menuDate}-${index}`
                    return (
                      <div key={index} className="border-2 border-gray-200 rounded-xl bg-white p-4">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="shrink-0 w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                            {index + 1}
                          </div>
                          <button
                            onClick={() => onRemoveMenuItem(menuDate, index)}
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
                            onChange={(e) => onMenuItemChange(menuDate, index, 'name', e.target.value)}
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
                            onChange={(e) => onMenuItemChange(menuDate, index, 'description', e.target.value)}
                            className="input-field text-sm bg-white text-gray-900 w-full"
                          />
                        </div>
                      </div>
                    )
                  })}

                  <button
                    onClick={() => onAddMenuItem(menuDate)}
                    className="w-full flex items-center justify-center gap-2 p-4 rounded-xl bg-gray-900 text-white hover:bg-gray-800 transition-all font-semibold text-sm shadow-sm"
                  >
                    <Plus className="h-5 w-5" />
                    Agregar nuevo plato
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default AdminMenuSection
