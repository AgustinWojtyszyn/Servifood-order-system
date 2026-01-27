import { useState, useEffect } from 'react'
import DatePicker, { registerLocale, setDefaultLocale } from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { useNavigate } from 'react-router-dom'
import { Calendar, Download, Package, TrendingUp, User, BarChart2 } from 'lucide-react'
import * as XLSX from 'xlsx'
import { supabase, db } from '../supabaseClient'
import RequireUser from './RequireUser'
import { es } from 'date-fns/locale'
import { useRef } from 'react'

// Configurar calendario en español
registerLocale('es', es)
setDefaultLocale('es')

// Componente de calendario simple (puedes reemplazarlo por uno ya existente si hay en el proyecto)
function DateRangePicker({ value, onChange }) {
  // value: { start: string, end: string }
  // Usar fechas locales puras para evitar desfase
  const parseDate = (str) => {
    if (!str) return null
    // str: yyyy-MM-dd
    const [year, month, day] = str.split('-').map(Number)
    return new Date(year, month - 1, day)
  }
  const startDate = parseDate(value.start)
  const endDate = parseDate(value.end)
  return (
    <div className="flex flex-col gap-2 md:flex-row md:gap-6">
      <div className="flex flex-col">
        <label className="font-semibold mb-1">Desde:</label>
        <DatePicker
          selected={startDate}
          locale="es"
          onChange={date => {
            const iso = date ? date.toISOString().slice(0, 10) : ''
            // Si la fecha de fin es menor, ajusta
            if (endDate && date && date > endDate) {
              onChange({ start: iso, end: iso })
            } else {
              onChange({ ...value, start: iso })
            }
          }}
          dateFormat="yyyy-MM-dd"
          className="border rounded px-3 py-2 text-base"
          placeholderText="Desde"
          // Permitir cualquier fecha (pasada, presente o futura)
          isClearable
        />
      </div>
      <div className="flex flex-col">
        <label className="font-semibold mb-1">Hasta:</label>
        <DatePicker
          selected={endDate}
          locale="es"
          onChange={date => {
            const iso = date ? date.toISOString().slice(0, 10) : ''
            // Si la fecha de inicio es mayor, ajusta
            if (startDate && date && date < startDate) {
              onChange({ start: iso, end: iso })
            } else {
              onChange({ ...value, end: iso })
            }
          }}
          dateFormat="yyyy-MM-dd"
          className="border rounded px-3 py-2 text-base"
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


const MonthlyPanel = ({ user, loading }) => {
  const COUNTABLE_STATUSES = ['completed', 'delivered', 'archived', 'pending']
  const [draftRange, setDraftRange] = useState({ start: '', end: '' })
  const [dateRange, setDateRange] = useState({ start: '', end: '' }) // rango aplicado
  const [metricsLoading, setMetricsLoading] = useState(false)
  const [metrics, setMetrics] = useState(null)
  const [error, setError] = useState(null)
  const [dailyData, setDailyData] = useState(null)
  const [showDailyTable, setShowDailyTable] = useState(false)
  const fetchId = useRef(0)
  const navigate = useNavigate()

  const palette = ['#2563eb', '#fb8c00', '#10b981', '#a855f7', '#ef4444', '#0ea5e9', '#f59e0b', '#22d3ee']
  const maxDailyCount = dailyData?.daily_breakdown ? Math.max(...dailyData.daily_breakdown.map(x => x.count || 0), 1) : 1
  const isDraftValid = draftRange.start && draftRange.end && draftRange.start <= draftRange.end

  useEffect(() => {
    // Control de acceso: solo admin
    if (!user?.id) return
    if (user.role !== 'admin' && user.user_metadata?.role !== 'admin') {
      navigate('/dashboard')
    }
  }, [user, navigate])

  useEffect(() => {
    // Solo buscar si el rango aplicado es válido
    if (dateRange.start && dateRange.end && dateRange.start <= dateRange.end) {
      fetchMetrics(dateRange)
    }
    // eslint-disable-next-line
  }, [dateRange])

  async function fetchMetrics(range) {
    const currentRange = range || dateRange
    if (!currentRange?.start || !currentRange?.end || currentRange.start > currentRange.end) return

    const reqId = ++fetchId.current
    setMetricsLoading(true)
    setMetrics(null)
    setDailyData(null)
    setError(null)
    try {
      // Consulta principal: filtrar por delivery_date; si es null, por created_at
      const startUtc = `${currentRange.start}T00:00:00.000Z`
      const endUtc = `${currentRange.end}T23:59:59.999Z`
      let { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .or(
          [
            `and(delivery_date.gte.${currentRange.start},delivery_date.lte.${currentRange.end})`,
            `and(delivery_date.is.null,created_at.gte.${startUtc},created_at.lte.${endUtc})`
          ].join(',')
        )
      if (ordersError) throw ordersError

      // Aplicar mismos criterios de estados que el desglose diario
      orders = Array.isArray(orders) ? orders.filter(o => COUNTABLE_STATUSES.includes(o.status)) : []

      // Agrupar por ubicación (location) usando todos los pedidos del rango
      const grouped = {}
      for (const order of orders) {
        const empresa = order.location || 'Sin ubicación'
        if (!grouped[empresa]) grouped[empresa] = []
        grouped[empresa].push(order)
      }

      // Métricas por empresa
      const empresas = Object.keys(grouped).map(empresa => {
        const pedidos = grouped[empresa]
        let totalMenus = 0
        let tiposMenus = {}
        let totalGuarniciones = 0
        let tiposGuarniciones = {}
        let totalOpciones = 0
        let tiposOpciones = {}

        pedidos.forEach(p => {
          // Procesar items (menús principales y opciones)
          let items = []
          if (Array.isArray(p.items)) {
            items = p.items
          } else if (typeof p.items === 'string') {
            try {
              items = JSON.parse(p.items)
            } catch {}
          }
          items.forEach(item => {
            totalMenus += item.quantity || 1
            // Contar por nombre de menú
            const nombre = (item.name || '').trim()
            tiposMenus[nombre] = (tiposMenus[nombre] || 0) + (item.quantity || 1)
            // Si el nombre es "OPCIÓN X", contarlo como opción
            if (/^OPC(ION|IÓN)\s*\d+/i.test(nombre)) {
              totalOpciones += item.quantity || 1
              tiposOpciones[nombre] = (tiposOpciones[nombre] || 0) + (item.quantity || 1)
            }
          })

          // Procesar guarniciones desde custom_responses
          let customResponses = []
          if (Array.isArray(p.custom_responses)) {
            customResponses = p.custom_responses
          } else if (typeof p.custom_responses === 'string') {
            try {
              customResponses = JSON.parse(p.custom_responses)
            } catch {}
          }
          customResponses.forEach(resp => {
            // Si hay respuesta de guarnición
            if (resp.response) {
              totalGuarniciones++
              const tipo = (resp.response || '').trim()
              tiposGuarniciones[tipo] = (tiposGuarniciones[tipo] || 0) + 1
            }
            // Si hay opciones (array)
            if (Array.isArray(resp.options)) {
              resp.options.forEach(opt => {
                totalGuarniciones++
                const tipo = (opt || '').trim()
                tiposGuarniciones[tipo] = (tiposGuarniciones[tipo] || 0) + 1
              })
            }
          })
        })
        return {
          empresa,
          cantidadPedidos: pedidos.length,
          totalMenus,
          totalOpciones,
          totalGuarniciones,
          tiposMenus,
          tiposOpciones,
          tiposGuarniciones
        }
      })

      // Para consistencia, usar el total del desglose diario
      setMetrics({
        totalPedidos: 0,
        empresas
      })

      // Desglose diario del rango (fuente histórica real)
      const { data: breakdown, error: breakdownError } = await db.getDailyBreakdown({ start: currentRange.start, end: currentRange.end })
      if (breakdownError) throw breakdownError
      // Evitar condiciones de carrera: solo actualizar si es la petición vigente
      if (reqId === fetchId.current) {
        setDailyData(breakdown)
        setShowDailyTable(false) // requiere confirmación para desplegar
      }

      // Actualizar totalPedidos desde breakdown para consistencia
      if (reqId === fetchId.current) {
        setMetrics(prev => prev ? { ...prev, totalPedidos: breakdown.range_totals.count } : prev)
      }
    } catch (err) {
      // Ocultar mensaje al usuario y solo registrar en consola
      console.error('Error al obtener métricas', err)
      setError(null)
    } finally {
      if (reqId === fetchId.current) {
        setMetricsLoading(false)
      }
    }
  }

  // Exportar a Excel
  const handleExportExcel = () => {
    if (!metrics || !metrics.empresas) return
    // Exportación robusta: separar menús principales y opciones, y mostrar cantidades claras
    const rows = []
    metrics.empresas.forEach(e => {
      // Menús principales (excluyendo los que son opciones)
      const tiposMenusPrincipales = Object.entries(e.tiposMenus)
        .filter(([nombre]) => nombre && !/^OPC(ION|IÓN)\s*\d+/i.test(nombre) && nombre.trim() !== '')
        .reduce((acc, [k, v]) => acc + v, 0)

      // Opciones (solo los que son opciones)
      const opciones = {};
      for (let i = 1; i <= 6; i++) {
        const key = `OPCIÓN ${i}`;
        // Buscar tanto 'OPCIÓN X' como 'OPCION X' (sin tilde)
        const cantidad = Object.entries(e.tiposMenus).reduce((acc, [nombre, v]) => {
          if (new RegExp(`^OPC(ION|IÓN)\\s*${i}$`, 'i').test(nombre)) {
            return acc + v;
          }
          return acc;
        }, 0);
        opciones[key] = cantidad;
      }

      // Guarniciones
      const tiposGuarniciones = Object.entries(e.tiposGuarniciones)
        .map(([k, v]) => `${k}: ${v}`)
        .join('; ')

      // Exportar una sola fila por empresa, cada opción en su columna
      rows.push({
        Empresa: e.empresa,
        'Pedidos': e.cantidadPedidos,
        'Menús principales': tiposMenusPrincipales || 0,
        'OPCIÓN 1': opciones['OPCIÓN 1'] || 0,
        'OPCIÓN 2': opciones['OPCIÓN 2'] || 0,
        'OPCIÓN 3': opciones['OPCIÓN 3'] || 0,
        'OPCIÓN 4': opciones['OPCIÓN 4'] || 0,
        'OPCIÓN 5': opciones['OPCIÓN 5'] || 0,
        'OPCIÓN 6': opciones['OPCIÓN 6'] || 0,
        'Guarniciones': tiposGuarniciones || '—',
        'Total menús': e.totalMenus - e.totalOpciones,
        'Total opciones': e.totalOpciones,
        'Total guarniciones': e.totalGuarniciones
      })
    })
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Resumen')
    const fileName = `panel-mensual-${dateRange.start || 'inicio'}-a-${dateRange.end || 'fin'}.xlsx`
    XLSX.writeFile(wb, fileName)
  }

  // Exportar desglose diario del rango
  const handleExportDailyExcel = () => {
    if (!dailyData || !dailyData.daily_breakdown) return
    const rows = dailyData.daily_breakdown.map(d => {
      const guarnStr = Object.entries(d.tipos_guarniciones || {})
        .map(([k, v]) => `${k}: ${v}`)
        .join('; ')
      return {
        Fecha: d.date,
        Pedidos: d.count,
        'Menús principales': d.menus_principales || 0,
        'OPCIÓN 1': d.opciones?.['OPCIÓN 1'] || 0,
        'OPCIÓN 2': d.opciones?.['OPCIÓN 2'] || 0,
        'OPCIÓN 3': d.opciones?.['OPCIÓN 3'] || 0,
        'OPCIÓN 4': d.opciones?.['OPCIÓN 4'] || 0,
        'OPCIÓN 5': d.opciones?.['OPCIÓN 5'] || 0,
        'OPCIÓN 6': d.opciones?.['OPCIÓN 6'] || 0,
        'Total opciones': d.total_opciones || 0,
        'Guarniciones (tipo: cantidad)': guarnStr || '—',
        'Total guarniciones': d.total_guarniciones || 0
      }
    })
    // Totales del rango (sumados desde el desglose)
    rows.push({
      Fecha: 'Totales',
      Pedidos: dailyData.range_totals.count,
      'Menús principales': dailyData.range_totals.menus_principales,
      'OPCIÓN 1': '',
      'OPCIÓN 2': '',
      'OPCIÓN 3': '',
      'OPCIÓN 4': '',
      'OPCIÓN 5': '',
      'OPCIÓN 6': '',
      'Total opciones': dailyData.range_totals.total_opciones,
      'Guarniciones (tipo: cantidad)': '',
      'Total guarniciones': dailyData.range_totals.total_guarniciones
    })
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Desglose Diario')
    const fileName = `desglose-diario-${dateRange.start || 'inicio'}-a-${dateRange.end || 'fin'}.xlsx`
    XLSX.writeFile(wb, fileName)
  }

  return (
    <RequireUser user={user} loading={loading}>
    <div className="w-full space-y-6 px-2 sm:px-4 md:px-6 md:max-w-7xl md:mx-auto" style={{overflowY: 'visible', overflowX: 'hidden', minHeight: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: '120px'}}>
      {/* Título arriba de los tips */}
      <div className="bg-linear-to-r from-blue-600 to-blue-800 rounded-2xl p-4 md:p-8 text-white shadow-2xl mb-6">
        <div className="flex flex-col gap-4">
          <div className="text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
              <Calendar className="h-8 w-8 md:h-10 md:w-10" />
              <h1 className="text-2xl md:text-4xl font-bold">Panel Mensual</h1>
            </div>
            <p className="text-blue-100 text-base md:text-lg">Resumen y métricas de pedidos mensuales</p>
          </div>
        </div>
      </div>
      {/* Modo de uso */}
      <div className="bg-blue-50 border-l-4 border-blue-400 rounded-xl p-5 mb-6 shadow flex items-start gap-4">
        <span className="text-blue-600 mt-1"><Calendar className="h-6 w-6" /></span>
        <div>
          <div className="font-bold text-blue-900 mb-2 text-lg">Modo de uso del Panel Mensual</div>
          <ol className="list-decimal pl-6 text-blue-900 text-base space-y-1">
            <li>Selecciona el <b>rango de fechas</b> y presiona <b>“Aplicar rango”</b> para ver el resumen de pedidos por empresa.</li>
            <li>La fecha seleccionada corresponde siempre al <b>día de entrega</b> (por ejemplo, si quieres saber los pedidos del martes, selecciona martes).</li>
            <li>Exporta el resumen a Excel con el botón <b>Exportar Excel</b>.</li>
            <li>Los <b>menús principales</b> y las <b>opciones</b> aparecen separados y con cantidades claras.</li>
            <li>Próximamente: haz click en las filas para ver detalles adicionales.</li>
          </ol>
        </div>
      </div>

      {/* Selector de fechas */}
      <div className="bg-white rounded-xl p-4 md:p-6 shadow-lg border-2 border-blue-200 w-full mb-4">
        <div className="flex flex-col gap-3">
          <DateRangePicker value={draftRange} onChange={setDraftRange} />
          <div className="flex justify-end">
            <button
              onClick={() => {
                if (!isDraftValid) return
                const applied = { ...draftRange }
                setDateRange(applied)
                fetchMetrics(applied)
              }}
              disabled={!isDraftValid}
              className={`px-4 py-2 rounded-lg font-bold text-white shadow transition-all duration-200 ${
                isDraftValid
                  ? 'bg-blue-600 hover:bg-blue-700 hover:shadow-lg'
                  : 'bg-gray-400 cursor-not-allowed'
              }`}
            >
              Aplicar rango
            </button>
          </div>
        </div>
      </div>

      {/* Exportar a Excel */}
      {metrics && (
        <div className="flex justify-end mb-2">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-xl shadow transition-all duration-200"
          >
            <Download className="h-5 w-5" />
            Exportar Excel
          </button>
          {dailyData?.daily_breakdown && (
            <button
              onClick={handleExportDailyExcel}
              className="ml-2 flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-xl shadow transition-all duration-200"
            >
              <Download className="h-5 w-5" />
              Exportar rango (diario)
            </button>
          )}
        </div>
      )}
      {/* Métricas y tabla */}
      {metricsLoading && <div className="mt-4 text-center text-blue-700 font-bold">Cargando métricas...</div>}
      {/* Error suprimido visualmente para no bloquear la vista */}
      {metrics && (
        <div className="space-y-6">
          {/* Gráficos rápidos (siempre visibles cuando hay datos) */}
          {dailyData?.daily_breakdown && (
            <div className="bg-white rounded-xl p-4 md:p-6 shadow-lg border-2 border-blue-200 w-full">
              <div className="flex items-center gap-2 mb-3">
                <BarChart2 className="h-5 w-5 text-blue-600" />
                <div className="font-bold text-blue-900 text-lg">Pedidos por día (rango)</div>
              </div>
              <p className="text-sm text-gray-700 mb-3">
                {dailyData.daily_breakdown.length} días en el rango seleccionado.
              </p>
              <div className="h-72 flex items-end gap-2 overflow-x-auto px-1 mt-1">
                {dailyData.daily_breakdown.map((d, idx) => {
                  const heightPx = Math.max((d.count / maxDailyCount) * 220, 8)
                  const height = `${heightPx}px`
                  const color = palette[idx % palette.length]
                  return (
                    <div key={d.date} className="flex flex-col items-center flex-1 min-w-[46px]">
                      <div
                        className="w-full rounded-t-md transition-all"
                        style={{
                          background: color,
                          height,
                          minHeight: '6px'
                        }}
                        title={`${d.date}: ${d.count} pedidos`}
                      />
                      <div className="text-[11px] text-gray-600 mt-1 whitespace-nowrap">{d.date.slice(5)}</div>
                      <div className="text-xs font-semibold text-gray-800">{d.count}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Desglose diario del rango */}
          {dailyData?.daily_breakdown && (
            <div className="bg-white rounded-xl p-4 md:p-6 shadow-lg border-2 border-blue-200 w-full">
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="h-5 w-5 text-blue-600" />
                <div className="font-bold text-blue-900 text-lg">Desglose diario del rango</div>
              </div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-gray-700">
                  {dailyData.daily_breakdown.length} días en el rango seleccionado.
                </p>
                <button
                  onClick={() => setShowDailyTable(prev => !prev)}
                  className="px-3 py-2 rounded-lg text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all shadow disabled:opacity-60"
                >
                  {showDailyTable ? 'Ocultar tabla' : 'Ver tabla diaria'}
                </button>
              </div>

              {showDailyTable && (
                <div className="overflow-x-auto">
                  <table className="min-w-full bg-white rounded-xl shadow-lg text-black border-2 border-blue-200">
                    <thead className="bg-blue-50">
                      <tr>
                        <th className="px-4 py-2 text-left">Fecha (YYYY-MM-DD)</th>
                        <th className="px-4 py-2 text-right">Cantidad de pedidos</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dailyData.daily_breakdown.map(d => (
                        <tr key={d.date} className="border-t hover:bg-blue-50 transition-all">
                          <td className="px-4 py-2">{d.date}</td>
                          <td className="px-4 py-2 text-right">{d.count}</td>
                        </tr>
                      ))}
                      <tr className="border-t bg-blue-100">
                        <td className="px-4 py-2 font-semibold">Totales del rango</td>
                        <td className="px-4 py-2 text-right font-semibold">{dailyData.range_totals.count}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Tarjetas de métricas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 w-full">
            <div className="bg-white rounded-xl p-3 md:p-6 shadow-lg border-2 border-blue-200 w-full">
              <div className="text-center">
                <Calendar className="h-6 w-6 md:h-8 md:w-8 text-blue-600 mx-auto mb-2" />
                <p className="text-xs md:text-sm text-gray-600 font-semibold">Total Pedidos</p>
                <p className="text-2xl md:text-3xl font-bold text-blue-600">{metrics.totalPedidos}</p>
              </div>
            </div>
            <div className="bg-white rounded-xl p-3 md:p-6 shadow-lg border-2 border-green-200 w-full">
              <div className="text-center">
                <Package className="h-6 w-6 md:h-8 md:w-8 text-green-600 mx-auto mb-2" />
                <p className="text-xs md:text-sm text-gray-600 font-semibold">Total Menús</p>
                <p className="text-2xl md:text-3xl font-bold text-green-600">{metrics.empresas.reduce((acc, e) => acc + (e.totalMenus - e.totalOpciones), 0)}</p>
              </div>
            </div>
            <div className="bg-white rounded-xl p-3 md:p-6 shadow-lg border-2 border-yellow-200 w-full">
              <div className="text-center">
                <TrendingUp className="h-6 w-6 md:h-8 md:w-8 text-yellow-600 mx-auto mb-2" />
                <p className="text-xs md:text-sm text-gray-600 font-semibold">Total Opciones</p>
                <p className="text-2xl md:text-3xl font-bold text-yellow-600">{metrics.empresas.reduce((acc, e) => acc + e.totalOpciones, 0)}</p>
              </div>
            </div>
            <div className="bg-white rounded-xl p-3 md:p-6 shadow-lg border-2 border-purple-200 w-full">
              <div className="text-center">
                <svg
                  viewBox="0 0 24 24"
                  className="h-6 w-6 md:h-8 md:w-8 text-purple-600 mx-auto mb-2"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M6 9l1.2 10.2c.1 1 1 1.8 2 1.8h5.6c1 0 1.9-.8 2-1.8L18 9" />
                  <path d="M5 9h14" />
                  <path d="M8 9L9 4.5" />
                  <path d="M11 9l-.3-5" />
                  <path d="M13 9l.3-5" />
                  <path d="M16 9L15 4.5" />
                  <path d="M9 14h6" />
                </svg>
                <p className="text-xs md:text-sm text-gray-600 font-semibold">Total Guarniciones</p>
                <p className="text-2xl md:text-3xl font-bold text-purple-600">{metrics.empresas.reduce((acc, e) => acc + e.totalGuarniciones, 0)}</p>
              </div>
            </div>
          </div>
          <div className="mb-2 font-semibold text-center">
            Mostrando los pedidos del <span className="font-bold">{dateRange.start || '...'}</span> al <span className="font-bold">{dateRange.end || '...'}</span>
          </div>
          {metrics.empresas.length === 0 ? (
            <div className="text-gray-600 text-center">No hay datos para el rango seleccionado.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white rounded-xl shadow-lg text-black border-2 border-blue-200">
                <thead className="bg-blue-50">
                  <tr>
                    <th className="px-4 py-2">Empresa</th>
                    <th className="px-4 py-2">Pedidos</th>
                    <th className="px-4 py-2">Menús principales</th>
                    <th className="px-4 py-2">Opciones</th>
                    <th className="px-4 py-2">Guarniciones</th>
                    <th className="px-4 py-2">Total menús</th>
                    <th className="px-4 py-2">Total opciones</th>
                    <th className="px-4 py-2">Total guarniciones</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.empresas.map(e => (
                    <tr key={e.empresa} className="border-t hover:bg-blue-50 transition-all">
                      <td className="px-4 py-2 font-bold">{e.empresa}</td>
                      <td className="px-4 py-2">{e.cantidadPedidos}</td>
                      <td className="px-4 py-2">{Object.entries(e.tiposMenus).filter(([nombre]) => nombre && !/^OPC(ION|IÓN)\s*\d+/i.test(nombre) && nombre.trim() !== '').map(([k, v]) => (<span key={k} className="inline-block bg-blue-100 text-blue-800 rounded px-2 py-1 m-1 text-xs font-semibold">{k}: {v}</span>))}</td>
                      <td className="px-4 py-2">{Object.entries(e.tiposMenus).filter(([nombre]) => /^OPC(ION|IÓN)\s*\d+/i.test(nombre)).map(([k, v]) => (<span key={k} className="inline-block bg-yellow-100 text-yellow-800 rounded px-2 py-1 m-1 text-xs font-semibold">{k}: {v}</span>))}</td>
                      <td className="px-4 py-2">{Object.entries(e.tiposGuarniciones).map(([k, v]) => (<span key={k} className="inline-block bg-purple-100 text-purple-800 rounded px-2 py-1 m-1 text-xs font-semibold">{k}: {v}</span>))}</td>
                      <td className="px-4 py-2 text-center">{e.totalMenus - e.totalOpciones}</td>
                      <td className="px-4 py-2 text-center">{e.totalOpciones}</td>
                      <td className="px-4 py-2 text-center">{e.totalGuarniciones}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
    </RequireUser>
  )
}

export default MonthlyPanel
