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
  isDraftValid
}) => {
  return (
    <div className="bg-white rounded-xl p-4 md:p-4 shadow-sm border border-slate-200 w-full mb-3">
      <div className="flex items-end gap-3 overflow-x-auto">
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
    </div>
  )
}

export default MonthlyFilters
