import { useEffect, useMemo, useState } from 'react'
import excelLogo from '../../assets/logoexcel.png'
import whatsappIcon from '../../assets/whatsapp.png'
import { COMPANY_LIST } from '../../constants/companyConfig'
import { db } from '../../supabaseClient'
import { exportCafeteriaOrdersExcel, summarizeCafeteriaOrders } from '../../utils/cafeteria/exportCafeteriaOrdersExcel'
import { shareCafeteriaOrdersWhatsApp } from '../../utils/cafeteria/shareCafeteriaOrdersWhatsApp'

const AdminCafeteriaSection = ({ adminName }) => {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [companyFilter, setCompanyFilter] = useState('all')

  useEffect(() => {
    const loadOrders = async () => {
      setLoading(true)
      setError('')
      try {
        const { data, error: fetchError } = await db.getCafeteriaOrders()
        if (fetchError) {
          setError('No se pudo cargar los pedidos de cafeteria.')
        } else {
          setOrders(Array.isArray(data) ? data : [])
        }
      } catch (_err) {
        setError('No se pudo cargar los pedidos de cafeteria.')
      } finally {
        setLoading(false)
      }
    }
    loadOrders()
  }, [])

  const filteredOrders = useMemo(() => {
    if (companyFilter === 'all') return orders
    return orders.filter((order) => (order.company_slug || order.company_name || '').toLowerCase() === companyFilter.toLowerCase())
  }, [orders, companyFilter])

  const summary = useMemo(() => summarizeCafeteriaOrders(filteredOrders), [filteredOrders])

  return (
    <div className="card bg-white/95 backdrop-blur-sm shadow-xl border-2 border-white/20">
      <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">Cafeteria - Exportacion</h2>
          <p className="text-sm text-gray-600 font-semibold">Admin solicitante: {adminName || 'Sin nombre'}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Empresa</label>
          <select
            value={companyFilter}
            onChange={(event) => setCompanyFilter(event.target.value)}
            className="w-full rounded-xl border-2 border-gray-200 px-3 py-2 text-sm font-semibold text-gray-800 focus:border-primary-500 focus:outline-none"
          >
            <option value="all">Todas las empresas</option>
            {COMPANY_LIST.map((company) => (
              <option key={company.slug} value={company.slug}>{company.name}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col justify-end">
          <button
            type="button"
            onClick={() => exportCafeteriaOrdersExcel(filteredOrders, companyFilter)}
            disabled={filteredOrders.length === 0}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 text-white font-bold px-4 py-2.5 shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <img src={excelLogo} alt="" className="h-5 w-5" aria-hidden="true" />
            Exportar Excel ({filteredOrders.length})
          </button>
        </div>
        <div className="flex flex-col justify-end">
          <button
            type="button"
            onClick={() => shareCafeteriaOrdersWhatsApp(filteredOrders, companyFilter)}
            disabled={filteredOrders.length === 0}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#25D366] text-white font-bold px-4 py-2.5 shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <img src={whatsappIcon} alt="" className="h-5 w-5" aria-hidden="true" />
            Enviar por WhatsApp
          </button>
        </div>
      </div>

      {loading && (
        <p className="mt-4 text-gray-600 font-semibold">Cargando pedidos...</p>
      )}
      {error && (
        <p className="mt-4 text-red-600 font-semibold">{error}</p>
      )}

      {!loading && !error && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-2xl border-2 border-gray-200 p-4 bg-white">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Pedidos</p>
            <p className="text-2xl font-black text-gray-900">{summary.totalOrders}</p>
          </div>
          <div className="rounded-2xl border-2 border-gray-200 p-4 bg-white">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Basico</p>
            <p className="text-2xl font-black text-gray-900">{summary.totalsByPlan.basico}</p>
          </div>
          <div className="rounded-2xl border-2 border-gray-200 p-4 bg-white">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Medium</p>
            <p className="text-2xl font-black text-gray-900">{summary.totalsByPlan.medium}</p>
          </div>
          <div className="rounded-2xl border-2 border-gray-200 p-4 bg-white">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Premium</p>
            <p className="text-2xl font-black text-gray-900">{summary.totalsByPlan.premium}</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminCafeteriaSection
