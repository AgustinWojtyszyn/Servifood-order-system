import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar, Download } from 'lucide-react'
import * as XLSX from 'xlsx'
import { supabase } from '../supabaseClient'

// Componente de calendario simple (puedes reemplazarlo por uno ya existente si hay en el proyecto)
function DateRangePicker({ value, onChange }) {
  // value: { start: Date, end: Date }
  // Implementación mínima, reemplazar si ya hay un calendario en el proyecto
  return (
    <div className="flex flex-col gap-2">
      <label>
        Desde:
        <input type="date" value={value.start} onChange={e => onChange({ ...value, start: e.target.value })} />
      </label>
      <label>
        Hasta:
        <input type="date" value={value.end} onChange={e => onChange({ ...value, end: e.target.value })} />
      </label>
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
    if (dateRange.start && dateRange.end) {
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
    // Armar datos planos para Excel, separando menús principales de opciones
    const rows = []
    metrics.empresas.forEach(e => {
      // Menús principales (excluyendo los que son opciones)
      const tiposMenusPrincipales = Object.entries(e.tiposMenus)
        .filter(([nombre]) => !/^OPC(ION|IÓN)\s*\d+/i.test(nombre))
        .map(([k, v]) => `${k}: ${v}`)
        .join('; ')

      // Opciones (solo los que son opciones)
      const tiposSoloOpciones = Object.entries(e.tiposMenus)
        .filter(([nombre]) => /^OPC(ION|IÓN)\s*\d+/i.test(nombre))
        .map(([k, v]) => `${k}: ${v}`)
        .join('; ')

      // Opciones detalladas (de la estructura tiposOpciones, por si hay alguna diferencia)
      const tiposOpcionesDetalladas = Object.entries(e.tiposOpciones)
        .map(([k, v]) => `${k}: ${v}`)
        .join('; ')

      rows.push({
        Empresa: e.empresa,
        Pedidos: e.cantidadPedidos,
        'Menús principales': e.totalMenus - e.totalOpciones, // solo menús principales
        'Opciones (cantidad)': e.totalOpciones,
        Guarniciones: e.totalGuarniciones,
        'Detalle menús principales': tiposMenusPrincipales || '—',
        'Opciones': tiposSoloOpciones || '—',
        'Detalle opciones': tiposOpcionesDetalladas || '—',
        'Tipos de guarniciones': Object.entries(e.tiposGuarniciones).map(([k, v]) => `${k}: ${v}`).join('; ') || '—'
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
      {/* Header */}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 w-full">
            <div className="bg-white rounded-xl p-3 md:p-6 shadow-lg border-2 border-blue-200 w-full">
              <div className="text-center">
                <Calendar className="h-6 w-6 md:h-8 md:w-8 text-blue-600 mx-auto mb-2" />
                <p className="text-xs md:text-sm text-gray-600 font-semibold">Total Pedidos</p>
                <p className="text-2xl md:text-3xl font-bold text-blue-600">{metrics.totalPedidos}</p>
              </div>
            </div>
            {/* Puedes agregar más tarjetas de métricas aquí si lo deseas */}
          </div>
          <div className="mb-2 font-semibold text-center">
            Mostrando los pedidos del <span className="font-bold">{dateRange.start || '...'}</span> al <span className="font-bold">{dateRange.end || '...'}</span>
          </div>
          {metrics.empresas.length === 0 ? (
            <div className="text-gray-600 text-center">No hay datos para el rango seleccionado.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white rounded-xl shadow-lg text-black border-2 border-gray-200">
                <thead className="bg-blue-50">
                  <tr>
                    <th className="px-4 py-2">Empresa</th>
                    <th className="px-4 py-2">Pedidos</th>
                    <th className="px-4 py-2">Menús</th>
                    <th className="px-4 py-2">Opciones</th>
                    <th className="px-4 py-2">Guarniciones</th>
                    <th className="px-4 py-2">Tipos de menú</th>
                    <th className="px-4 py-2">Tipos de opciones</th>
                    <th className="px-4 py-2">Tipos de guarniciones</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.empresas.map(e => (
                    <tr key={e.empresa} className="border-t">
                      <td className="px-4 py-2 font-bold">{e.empresa}</td>
                      <td className="px-4 py-2">{e.cantidadPedidos}</td>
                      <td className="px-4 py-2">{e.totalMenus}</td>
                      <td className="px-4 py-2">{e.totalOpciones}</td>
                      <td className="px-4 py-2">{e.totalGuarniciones}</td>
                      <td className="px-4 py-2">
                        {Object.entries(e.tiposMenus).length === 0 ? '—' : (
                          <ul>
                            {Object.entries(e.tiposMenus).map(([tipo, cant]) => (
                              <li key={tipo}>{tipo}: {cant}</li>
                            ))}
                          </ul>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        {Object.entries(e.tiposOpciones).length === 0 ? '—' : (
                          <ul>
                            {Object.entries(e.tiposOpciones).map(([tipo, cant]) => (
                              <li key={tipo}>{tipo}: {cant}</li>
                            ))}
                          </ul>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        {Object.entries(e.tiposGuarniciones).length === 0 ? '—' : (
                          <ul>
                            {Object.entries(e.tiposGuarniciones).map(([tipo, cant]) => (
                              <li key={tipo}>{tipo}: {cant}</li>
                            ))}
                          </ul>
                        )}
                      </td>
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
