import { Download, Printer } from 'lucide-react'

const MonthlyExportActions = ({
  metrics,
  canExportDaily,
  dailyDataForView,
  onExportAllExcel,
  onExportExcel,
  onExportDailyExcel,
  onPrintPdf,
  excelLogo
}) => {
  if (!metrics) return null

  return (
    <div className="flex justify-end mb-2 flex-wrap gap-2">
      <button
        onClick={onExportAllExcel}
        disabled={!canExportDaily}
        className={`flex items-center gap-2 text-white font-semibold h-9 px-4 rounded-lg shadow-sm transition-all duration-200 ${
          canExportDaily
            ? 'bg-slate-800 hover:bg-slate-900'
            : 'bg-gray-400 cursor-not-allowed'
        }`}
      >
        <img src={excelLogo} alt="" className="h-4 w-4" aria-hidden="true" />
        Exportar panel (todo)
      </button>
      <button
        onClick={onExportExcel}
        className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold h-9 px-4 rounded-lg shadow-md transition-all duration-200"
      >
        <Download className="h-4 w-4" />
        Exportar Excel
      </button>
      {dailyDataForView?.daily_breakdown && (
        <button
          onClick={onExportDailyExcel}
          className="flex items-center gap-2 bg-slate-700 hover:bg-slate-800 text-white font-semibold h-9 px-4 rounded-lg shadow-sm transition-all duration-200"
        >
          <img src={excelLogo} alt="" className="h-4 w-4" aria-hidden="true" />
          Exportar rango (diario)
        </button>
      )}
      <button
        onClick={onPrintPdf}
        className="flex items-center gap-2 bg-gray-900 hover:bg-black text-white font-semibold h-9 px-4 rounded-lg shadow-sm transition-all duration-200"
      >
        <Printer className="h-4 w-4" />
        Imprimir / PDF
      </button>
    </div>
  )
}

export default MonthlyExportActions
