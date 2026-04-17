import { CheckCircle } from 'lucide-react'
import { formatDayLabel, formatDayNumber, formatMonthLabel, toISODate } from '../../../utils/admin/adminMenuSectionFormatters'

const AdminMenuWeekDateCard = ({ date, isSelected, hasMenu, onToggleDate }) => {
  const dateISO = toISODate(date)
  const baseStyles = 'rounded-2xl border-2 px-4 py-4 text-left transition-all relative overflow-hidden'
  const selectedStyles = isSelected
    ? 'border-primary-700 bg-primary-100 text-gray-900 shadow-lg shadow-primary-900/10 ring-1 ring-primary-500/30'
    : 'border-gray-200 bg-gray-50 text-gray-900 hover:border-primary-300 hover:bg-primary-50/60 hover:shadow-md hover:-translate-y-0.5'

  return (
    <button
      onClick={() => onToggleDate?.(dateISO)}
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
}

export default AdminMenuWeekDateCard
