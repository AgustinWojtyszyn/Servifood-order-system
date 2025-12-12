import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar } from 'lucide-react'
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

const MonthlyPanel = ({ user }) => {
  const [dateRange, setDateRange] = useState({ start: '', end: '' })
  const [loading, setLoading] = useState(false)
  const [metrics, setMetrics] = useState(null)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (!user) return
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
    setLoading(true)
    setError(null)
    try {
      // Consulta principal: pedidos en rango
      let { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .gte('delivery_date', dateRange.start)
        .lte('delivery_date', dateRange.end)
      if (ordersError) throw ordersError

      // Filtrar pedidos para excluir fechas futuras
      const today = new Date().toISOString().slice(0, 10)
      const filteredOrders = orders.filter(order => order.delivery_date <= today)

      // Agrupar por ubicación (location)
      const grouped = {}
      for (const order of filteredOrders) {
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
          try {
            items = JSON.parse(p.items)
          } catch {}
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
          try {
            customResponses = JSON.parse(p.custom_responses)
          } catch {}
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
        totalPedidos: filteredOrders.length,
        empresas
      })
    } catch (err) {
      setError('Error al obtener métricas')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
        <Calendar className="inline-block" /> Panel Mensual
      </h2>
      <DateRangePicker value={dateRange} onChange={setDateRange} />
      {loading && <div className="mt-4">Cargando...</div>}
      {error && <div className="mt-4 text-red-600">{error}</div>}
      {metrics && (
        <div className="mt-6">
          <div className="mb-4 font-semibold">Total de pedidos: {metrics.totalPedidos}</div>
          {metrics.empresas.length === 0 ? (
            <div className="text-gray-600">No hay datos para el rango seleccionado.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white rounded shadow">
                <thead>
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
