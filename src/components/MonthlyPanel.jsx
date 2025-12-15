import { useState, useEffect } from 'react'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { useNavigate } from 'react-router-dom'
import { Calendar, Download, Package, TrendingUp, User } from 'lucide-react'
import * as XLSX from 'xlsx'
import { supabase } from '../supabaseClient'

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


const InternalLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-700 via-primary-800 to-primary-900">
    <div className="text-center">
      <div className="animate-spin rounded-full h-16 w-16 border-4 border-white/30 border-t-white mx-auto mb-4"></div>
      <p className="text-white text-base font-medium">Cargando...</p>
    </div>
  </div>
)

const MonthlyPanel = ({ user, loading }) => {
  const [dateRange, setDateRange] = useState({ start: '', end: '' })
  const [metricsLoading, setMetricsLoading] = useState(false)
  const [metrics, setMetrics] = useState(null)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  // Loader global: si no hay user o loading global, mostrar loader
  if (loading || !user) {
    return <InternalLoader />
  }

  useEffect(() => {
    // Control de acceso: solo admin
    if (user.role !== 'admin' && user.user_metadata?.role !== 'admin') {
      navigate('/dashboard')
    }
  }, [user, navigate])

  useEffect(() => {
    // Solo buscar si el rango es válido
    if (dateRange.start && dateRange.end && dateRange.start <= dateRange.end) {
      fetchMetrics()
    }
    // eslint-disable-next-line
  }, [dateRange])

  async function fetchMetrics() {
    setMetricsLoading(true)
    setError(null)
    try {
      // Consulta principal: pedidos en rango
      let { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .gte('delivery_date', dateRange.start)
        .lte('delivery_date', dateRange.end)
      if (ordersError) throw ordersError

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

      setMetrics({
        totalPedidos: orders.length,
        empresas
      })
    } catch (err) {
      setError('Error al obtener métricas')
    } finally {
      setMetricsLoading(false)
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

  return (
    <div className="w-full space-y-6 px-2 sm:px-4 md:px-6 md:max-w-7xl md:mx-auto" style={{overflowY: 'visible', overflowX: 'hidden', minHeight: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: '120px'}}>
      {/* Título arriba de los tips */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-2xl p-4 md:p-8 text-white shadow-2xl mb-6">
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
            <li>Selecciona el <b>rango de fechas</b> para ver el resumen de pedidos por empresa.</li>
            <li>La fecha seleccionada corresponde siempre al <b>día de entrega</b> (por ejemplo, si quieres saber los pedidos del martes, selecciona martes).</li>
            <li>Exporta el resumen a Excel con el botón <b>Exportar Excel</b>.</li>
            <li>Los <b>menús principales</b> y las <b>opciones</b> aparecen separados y con cantidades claras.</li>
            <li>Próximamente: haz click en las filas para ver detalles adicionales.</li>
          </ol>
        </div>
      </div>

      {/* Selector de fechas */}
      <div className="bg-white rounded-xl p-4 md:p-6 shadow-lg border-2 border-blue-200 w-full mb-4">
        <DateRangePicker value={dateRange} onChange={setDateRange} />
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
        </div>
      )}
      {/* Métricas y tabla */}
      {metricsLoading && <div className="mt-4 text-center text-blue-700 font-bold">Cargando métricas...</div>}
      {error && <div className="mt-4 text-center text-red-600 font-bold">{error}</div>}
      {metrics && (
        <div className="space-y-6">
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
                <User className="h-6 w-6 md:h-8 md:w-8 text-purple-600 mx-auto mb-2" />
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
  )
}

export default MonthlyPanel
