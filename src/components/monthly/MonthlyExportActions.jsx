import { useState } from 'react'
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
  const [exportType, setExportType] = useState('all')
  if (!metrics) return null
  const isDailyExport = exportType === 'daily'
  const isAllExport = exportType === 'all'
  const isExportDisabled = (isDailyExport || isAllExport) ? !canExportDaily : false

  const handleExport = () => {
    if (exportType === 'daily') return onExportDailyExcel()
    if (exportType === 'summary') return onExportExcel()
    return onExportAllExcel()
  }

  return (
    <div className="flex justify-end mb-2 flex-wrap gap-2 items-center">
      <div className="flex items-center gap-2">
        <div className="text-xs font-semibold text-slate-600">Tipo de exportación</div>
        <select
          value={exportType}
          onChange={(e) => setExportType(e.target.value)}
          className="h-9 px-3 rounded-md border border-slate-300 bg-white text-sm font-semibold text-slate-800"
        >
          <option value="all">Panel completo (resumen + diario)</option>
          <option value="summary">Solo resumen por empresa</option>
          <option value="daily">Solo desglose diario</option>
        </select>
      </div>
      <button
        onClick={handleExport}
        disabled={isExportDisabled}
        className={`flex items-center gap-2 text-white font-semibold h-9 px-4 rounded-lg shadow-sm transition-all duration-200 ${
          isExportDisabled
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-emerald-600 hover:bg-emerald-700'
        }`}
      >
        <img src={excelLogo} alt="" className="h-4 w-4" aria-hidden="true" />
        Exportar Excel
      </button>
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
