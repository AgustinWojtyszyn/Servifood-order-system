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

      // Agrupar por ubicación (location)
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
        totalPedidos: orders.length,
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {metrics.empresas.map(e => (
              <div key={e.empresa} className="bg-white rounded shadow p-4">
                <div className="font-bold text-lg mb-2">{e.empresa}</div>
                <div>Pedidos: {e.cantidadPedidos}</div>
                <div>Menús principales: {e.totalMenus}</div>
                <div>Opciones: {e.totalOpciones}</div>
                <div>Guarniciones: {e.totalGuarniciones}</div>
                <div className="mt-2">
                  <div className="font-semibold">Tipos de menú:</div>
                  <ul className="list-disc ml-6">
                    {Object.entries(e.tiposMenus).map(([tipo, cant]) => (
                      <li key={tipo}>{tipo}: {cant}</li>
                    ))}
                  </ul>
                </div>
                <div className="mt-2">
                  <div className="font-semibold">Tipos de opciones:</div>
                  <ul className="list-disc ml-6">
                    {Object.entries(e.tiposOpciones).map(([tipo, cant]) => (
                      <li key={tipo}>{tipo}: {cant}</li>
                    ))}
                  </ul>
                </div>
                <div className="mt-2">
                  <div className="font-semibold">Tipos de guarniciones:</div>
                  <ul className="list-disc ml-6">
                    {Object.entries(e.tiposGuarniciones).map(([tipo, cant]) => (
                      <li key={tipo}>{tipo}: {cant}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default MonthlyPanel
