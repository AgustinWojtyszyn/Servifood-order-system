import DatePicker, { registerLocale, setDefaultLocale } from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { es } from 'date-fns/locale'

registerLocale('es', es)
setDefaultLocale('es')

function DateRangePicker({ value, onChange }) {
  const parseDate = (str) => {
    if (!str) return null
    const [year, month, day] = str.split('-').map(Number)
    return new Date(year, month - 1, day)
  }
  const startDate = parseDate(value.start)
  const endDate = parseDate(value.end)
  return (
    <div className="flex items-end gap-3 flex-nowrap">
      <div className="flex flex-col min-w-[170px]">
        <label className="text-xs font-semibold text-slate-600 mb-1">Desde</label>
        <DatePicker
          selected={startDate}
          locale="es"
          onChange={date => {
            const iso = date ? date.toISOString().slice(0, 10) : ''
            if (endDate && date && date > endDate) {
              onChange({ start: iso, end: iso })
            } else {
              onChange({ ...value, start: iso })
            }
          }}
          dateFormat="dd/MM/yyyy"
          className="w-36 border border-slate-300 rounded-md px-2.5 py-1.5 text-sm bg-white"
          placeholderText="Desde"
          isClearable
        />
      </div>
      <div className="flex flex-col min-w-[170px]">
        <label className="text-xs font-semibold text-slate-600 mb-1">Hasta</label>
        <DatePicker
          selected={endDate}
          locale="es"
          onChange={date => {
            const iso = date ? date.toISOString().slice(0, 10) : ''
            if (startDate && date && date < startDate) {
              onChange({ start: iso, end: iso })
            } else {
              onChange({ ...value, end: iso })
            }
          }}
          dateFormat="dd/MM/yyyy"
          className="w-36 border border-slate-300 rounded-md px-2.5 py-1.5 text-sm bg-white"
          placeholderText="Hasta"
          minDate={null}
          maxDate={null}
          isClearable
        />
      </div>
      {startDate && endDate && startDate > endDate && (
        <div className="text-red-600 text-xs mt-1">La fecha de inicio no puede ser mayor que la de fin.</div>
      )}
    </div>
  )
}

const MonthlyFilters = ({
  draftRange,
  onDraftRangeChange,
  dateRange,
  onClearRange,
  onApplyRange,
  isDraftValid,
  empresas,
  allValue,
  draftEmpresas,
  onToggleDraftEmpresa,
  onApplyEmpresas,
  onClearEmpresas,
  isEmpresasDirty
}) => {
  const hasEmpresas = Array.isArray(empresas) && empresas.length > 0
  const isEmpresasDisabled = !hasEmpresas
  const isAllSelected = draftEmpresas?.includes(allValue)
  const selectedCount = isAllSelected ? empresas?.length || 0 : (draftEmpresas?.length || 0)

  return (
    <div className="bg-white rounded-xl p-4 md:p-4 shadow-sm border border-slate-200 w-full mb-3">
      <div className="flex flex-col gap-3">
        <div className="flex items-end gap-3 flex-wrap">
          <DateRangePicker value={draftRange} onChange={onDraftRangeChange} />
          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={onClearRange}
              disabled={!dateRange.start && !dateRange.end && !draftRange.start && !draftRange.end}
              className={`h-9 px-3 rounded-md font-semibold text-blue-700 border border-blue-200 shadow-sm transition-all duration-200 ${
                dateRange.start || dateRange.end || draftRange.start || draftRange.end
                  ? 'bg-white hover:bg-blue-50 hover:border-blue-400'
                  : 'bg-gray-200 cursor-not-allowed text-gray-500 border-gray-200'
              }`}
            >
              Limpiar rango
            </button>
            <button
              onClick={onApplyRange}
              disabled={!isDraftValid}
              className={`h-9 px-3 rounded-md font-semibold text-white shadow-sm transition-all duration-200 ${
                isDraftValid
                  ? 'bg-blue-600 hover:bg-blue-700 hover:shadow-md'
                  : 'bg-gray-400 cursor-not-allowed'
              }`}
            >
              Aplicar rango
            </button>
          </div>
        </div>

        <div className="border-t border-slate-200 pt-3">
          <div className="flex items-center justify-between gap-3 mb-2">
            <div>
              <div className="text-xs font-semibold text-slate-600">Empresas</div>
              <div className="text-xs text-slate-500">
                {hasEmpresas ? `${selectedCount} seleccionada(s)` : 'Aplica un rango para ver empresas.'}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClearEmpresas}
                disabled={isEmpresasDisabled}
                className={`h-9 px-3 rounded-md font-semibold text-blue-700 border border-blue-200 shadow-sm transition-all duration-200 ${
                  isEmpresasDisabled
                    ? 'bg-gray-200 cursor-not-allowed text-gray-500 border-gray-200'
                    : 'bg-white hover:bg-blue-50 hover:border-blue-400'
                }`}
              >
                Limpiar empresas
              </button>
              <button
                type="button"
                onClick={onApplyEmpresas}
                disabled={isEmpresasDisabled || !isEmpresasDirty}
                className={`h-9 px-3 rounded-md font-semibold text-white shadow-sm transition-all duration-200 ${
                  !isEmpresasDisabled && isEmpresasDirty
                    ? 'bg-blue-600 hover:bg-blue-700 hover:shadow-md'
                    : 'bg-gray-400 cursor-not-allowed'
                }`}
              >
                Aplicar empresas
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 max-h-28 overflow-y-auto border border-slate-200 rounded-lg p-2 bg-slate-50">
            <label className={`flex items-center gap-2 text-xs font-semibold px-2 py-1 rounded-md border ${
              isAllSelected ? 'border-blue-300 bg-white text-blue-700' : 'border-transparent text-slate-600'
            } ${isEmpresasDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
              <input
                type="checkbox"
                disabled={isEmpresasDisabled}
                checked={Boolean(isAllSelected)}
                onChange={() => onToggleDraftEmpresa(allValue)}
              />
              Todas las empresas
            </label>
            {hasEmpresas && empresas.map(empresa => {
              const checked = draftEmpresas?.includes(empresa)
              return (
                <label
                  key={empresa}
                  className={`flex items-center gap-2 text-xs font-semibold px-2 py-1 rounded-md border ${
                    checked ? 'border-blue-300 bg-white text-blue-700' : 'border-transparent text-slate-600'
                  } ${isEmpresasDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <input
                    type="checkbox"
                    disabled={isEmpresasDisabled}
                    checked={Boolean(checked)}
                    onChange={() => onToggleDraftEmpresa(empresa)}
                  />
                  {empresa}
                </label>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

export default MonthlyFilters
