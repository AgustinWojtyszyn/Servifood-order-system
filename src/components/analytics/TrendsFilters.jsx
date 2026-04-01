import { Calendar, Filter } from 'lucide-react'

const TrendsFilters = ({
  companies = [],
  company,
  onCompanyChange,
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  onApply,
  onClear,
  isDirty,
  isLoading,
  isRangeValid
}) => {
  return (
    <div className="bg-white rounded-xl p-4 md:p-5 shadow-sm border border-slate-200 w-full">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2 text-slate-800">
          <Filter className="h-4 w-4 text-blue-600" />
          <span className="text-sm font-bold">Filtros</span>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <label className="text-xs font-semibold text-slate-600">Empresa</label>
            <select
              value={company}
              onChange={(e) => onCompanyChange(e.target.value)}
              className="mt-1 w-full border border-slate-300 rounded-md px-2.5 py-2 text-sm bg-white"
            >
              <option value="all">Todas</option>
              {companies.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 text-blue-600" />
              Desde
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => onDateFromChange(e.target.value)}
              className="mt-1 w-full border border-slate-300 rounded-md px-2.5 py-2 text-sm bg-white"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 text-blue-600" />
              Hasta
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => onDateToChange(e.target.value)}
              className="mt-1 w-full border border-slate-300 rounded-md px-2.5 py-2 text-sm bg-white"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 md:justify-end">
          {!isRangeValid && (
            <div className="text-xs text-red-600 font-semibold mr-auto">
              La fecha de inicio no puede ser mayor que la fecha fin.
            </div>
          )}
          <button
            type="button"
            onClick={onClear}
            disabled={isLoading}
            className={`h-9 px-3 rounded-md font-semibold text-blue-700 border border-blue-200 shadow-sm transition-all duration-200 ${
              isLoading ? 'bg-gray-200 cursor-not-allowed text-gray-500 border-gray-200' : 'bg-white hover:bg-blue-50 hover:border-blue-400'
            }`}
          >
            Limpiar filtros
          </button>
          <button
            type="button"
            onClick={onApply}
            disabled={!isDirty || isLoading || !isRangeValid}
            className={`h-9 px-4 rounded-md font-semibold text-white shadow-sm transition-all duration-200 ${
              isDirty && !isLoading && isRangeValid
                ? 'bg-blue-600 hover:bg-blue-700 hover:shadow-md'
                : 'bg-gray-400 cursor-not-allowed'
            }`}
          >
            Aplicar filtros
          </button>
        </div>
      </div>
    </div>
  )
}

export default TrendsFilters
