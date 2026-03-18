import { Calendar } from 'lucide-react'

const MonthlyHeader = ({ showInstructions, onToggleInstructions }) => {
  return (
    <>
      <div className="bg-linear-to-r from-blue-600 to-blue-800 rounded-2xl p-4 md:p-5 text-white shadow-xl mb-3">
        <div className="flex flex-col gap-4">
          <div className="text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
              <Calendar className="h-8 w-8 md:h-10 md:w-10" />
              <h1 className="text-3xl md:text-4xl font-bold">Panel Mensual</h1>
            </div>
            <p className="text-blue-200 text-base md:text-lg">Resumen y métricas de pedidos mensuales</p>
          </div>
        </div>
      </div>
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 mb-2 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-slate-800">
            <Calendar className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-bold">Modo de uso del Panel Mensual</span>
          </div>
          <button
            type="button"
            onClick={onToggleInstructions}
            className="px-3 py-1.5 text-xs font-semibold text-blue-700 border border-blue-200 rounded-md bg-white hover:bg-blue-50 transition-colors"
          >
            {showInstructions ? 'Ocultar' : 'Ver instrucciones'}
          </button>
        </div>
        {showInstructions && (
          <div className="mt-2 rounded-lg bg-white p-3">
            <ol className="list-decimal pl-5 text-slate-800 text-sm space-y-1.5">
              <li>Selecciona el <b>rango de fechas</b> y presiona <b>“Aplicar rango”</b> para ver el resumen de pedidos por empresa.</li>
              <li>La fecha seleccionada corresponde siempre al <b>día de entrega</b> (por ejemplo, si quieres saber los pedidos del martes, selecciona martes).</li>
              <li>Exporta el resumen a Excel con el botón <b>Exportar Excel</b>.</li>
              <li>Los <b>menús principales</b> y las <b>opciones</b> aparecen separados y con cantidades claras.</li>
              <li>Haz clic en una <b>fila</b> para ver el detalle completo de ese día. Usa el botón “Ver detalle” para abrir/cerrar.</li>
              <li>Explora los días desde el resumen, evitando scrolls internos.</li>
            </ol>
          </div>
        )}
      </div>
    </>
  )
}

export default MonthlyHeader
