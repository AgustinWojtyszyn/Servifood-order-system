import { useCallback, useEffect, useMemo, useState } from 'react'
import excelLogo from '../../assets/logoexcel.png'
import whatsappIcon from '../../assets/whatsapp.png'
import { ALL_COMPANY_LIST as COMPANY_LIST } from '../../constants/companyConfig'
import { db } from '../../supabaseClient'
import LoadingState from '../ui/LoadingState'
import { exportCafeteriaOrdersExcel, summarizeCafeteriaOrders } from '../../utils/cafeteria/exportCafeteriaOrdersExcel'
import { shareCafeteriaOrdersWhatsApp } from '../../utils/cafeteria/shareCafeteriaOrdersWhatsApp'
import { getCafeteriaOperationalDate } from '../../cafeteria/cafeteriaTime'
import { confirmAction } from '../../utils/confirm'
import { getUserFriendlyErrorMessage } from '../../utils'

const getOrderItemsLabel = (order) => {
  const items = Array.isArray(order?.items) ? order.items : []
  if (items.length === 0) return 'Sin items'
  return items
    .map((item) => `${item?.name || item?.planId || 'Item'} x${Number(item?.quantity || 0)}`)
    .join(' · ')
}

const AdminCafeteriaSection = ({ adminName }) => {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(false)
  const [deletingId, setDeletingId] = useState('')
  const [error, setError] = useState('')
  const [companyFilter, setCompanyFilter] = useState('all')

  const loadOrders = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { data, error: fetchError } = await db.getCafeteriaOrders({
        deliveryDate: getCafeteriaOperationalDate(),
        statuses: ['pending']
      })
      if (fetchError) {
        setError(getUserFriendlyErrorMessage(fetchError, 'No se pudieron cargar los pedidos de cafeteria.'))
      } else {
        setOrders(Array.isArray(data) ? data : [])
      }
    } catch (err) {
      setError(getUserFriendlyErrorMessage(err, 'No se pudieron cargar los pedidos de cafeteria.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadOrders()
  }, [loadOrders])

  const handleDeleteOrder = async (order) => {
    if (!order?.id || deletingId) return
    const confirmed = await confirmAction({
      title: 'Eliminar pedido de cafeteria',
      message: `Se eliminará el pedido de ${order.admin_name || order.admin_email || 'este usuario'}.`,
      highlight: 'Esta acción no se puede deshacer.',
      confirmText: 'Eliminar pedido'
    })
    if (!confirmed) return

    setDeletingId(order.id)
    setError('')
    try {
      const { error: deleteError } = await db.deleteCafeteriaOrder(order.id)
      if (deleteError) {
        setError(getUserFriendlyErrorMessage(deleteError, 'No se pudo eliminar el pedido de cafeteria.'))
        return
      }
      setOrders((prev) => prev.filter((item) => item.id !== order.id))
    } catch (err) {
      setError(getUserFriendlyErrorMessage(err, 'No se pudo eliminar el pedido de cafeteria.'))
    } finally {
      setDeletingId('')
    }
  }

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
        <button
          type="button"
          onClick={loadOrders}
          disabled={loading}
          className="inline-flex items-center justify-center rounded-xl border-2 border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-700 shadow-sm disabled:opacity-60"
        >
          {loading ? 'Actualizando...' : 'Actualizar'}
        </button>
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
        <div className="mt-4">
          <LoadingState variant="inline" message="Cargando pedidos..." tone="slate" />
        </div>
      )}
      {error && (
        <p className="mt-4 text-red-600 font-semibold">{error}</p>
      )}

      {!loading && !error && (
        <>
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

          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-y-2">
              <thead>
                <tr className="text-left text-xs font-bold uppercase tracking-wide text-gray-500">
                  <th className="px-3 py-2">Pedido</th>
                  <th className="px-3 py-2">Empresa</th>
                  <th className="px-3 py-2">Items</th>
                  <th className="px-3 py-2">Total</th>
                  <th className="px-3 py-2 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-4 text-sm font-semibold text-gray-500">
                      No hay pedidos pendientes para mostrar.
                    </td>
                  </tr>
                ) : filteredOrders.map((order) => (
                  <tr key={order.id} className="bg-white">
                    <td className="px-3 py-3 align-top">
                      <p className="text-sm font-black text-gray-900">{order.admin_name || order.admin_email || 'Sin nombre'}</p>
                      <p className="text-xs font-semibold text-gray-500">{new Date(order.created_at).toLocaleString('es-AR')}</p>
                    </td>
                    <td className="px-3 py-3 align-top text-sm font-semibold text-gray-800">
                      {order.company_name || order.company_slug || 'Sin empresa'}
                    </td>
                    <td className="px-3 py-3 align-top text-sm font-semibold text-gray-700">
                      {getOrderItemsLabel(order)}
                    </td>
                    <td className="px-3 py-3 align-top text-sm font-black text-gray-900">
                      {order.total_items || 0}
                    </td>
                    <td className="px-3 py-3 align-top text-right">
                      <button
                        type="button"
                        onClick={() => handleDeleteOrder(order)}
                        disabled={Boolean(deletingId)}
                        className="inline-flex items-center justify-center rounded-xl border-2 border-red-200 bg-white px-3 py-2 text-sm font-bold text-red-700 disabled:opacity-60"
                      >
                        {deletingId === order.id ? 'Eliminando...' : 'Eliminar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

export default AdminCafeteriaSection
