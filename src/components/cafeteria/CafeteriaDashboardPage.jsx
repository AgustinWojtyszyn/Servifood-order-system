import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Coffee } from 'lucide-react'
import RequireUser from '../RequireUser'
import { useCafeteriaPendingOrder } from '../../hooks/useCafeteriaPendingOrder'
import { CAFETERIA_PLANS } from '../../cafeteria/cafeteriaPlans'
import { getCafeteriaWindowLabel } from '../../cafeteria/cafeteriaTime'

const formatDeliveryDate = (createdAt) => {
  if (!createdAt) return '-'
  const base = new Date(createdAt)
  if (Number.isNaN(base.getTime())) return '-'
  base.setDate(base.getDate() + 1)
  return base.toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

const planNameById = new Map(CAFETERIA_PLANS.map((plan) => [plan.id, plan.name]))

const CafeteriaDashboardPage = ({ user, loading }) => {
  const navigate = useNavigate()
  const { pendingOrder, loading: pendingLoading, error } = useCafeteriaPendingOrder(user)

  const itemsSummary = useMemo(() => {
    if (!pendingOrder?.items) return []
    return (pendingOrder.items || []).map((item) => {
      const name = item?.name || planNameById.get(item?.planId) || 'Item'
      const qty = Number(item?.quantity || 0)
      return { name, qty }
    }).filter((item) => item.qty > 0)
  }, [pendingOrder])

  const totalItems = useMemo(() => {
    if (!pendingOrder) return 0
    if (Number.isFinite(Number(pendingOrder.total_items))) return Number(pendingOrder.total_items)
    return itemsSummary.reduce((acc, item) => acc + item.qty, 0)
  }, [pendingOrder, itemsSummary])

  const statusLabel = pendingOrder?.status === 'pending' ? 'Pendiente' : 'Confirmado'
  const deliveryDate = formatDeliveryDate(pendingOrder?.created_at)
  const deliveryWindow = getCafeteriaWindowLabel()

  return (
    <RequireUser user={user} loading={loading}>
      <div className="w-[90%] mx-auto space-y-8">
        <header className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 border-2 border-white/40 text-white font-semibold shadow-lg">
            <Coffee className="h-5 w-5" />
            Cafetería
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-white drop-shadow-2xl">
            Panel de cafetería
          </h1>
        </header>

        <section className="bg-white/95 px-6 py-10 sm:px-8 sm:py-12 w-full">
          {pendingLoading && (
            <p className="text-sm font-semibold text-gray-600">Cargando pedido...</p>
          )}
          {!pendingLoading && error && (
            <p className="text-sm font-semibold text-red-600">{error}</p>
          )}
          {!pendingLoading && !error && pendingOrder && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Pedido actual</p>
                  <h2 className="text-2xl sm:text-3xl font-black text-gray-900">
                    {pendingOrder.company_name || 'Empresa sin definir'}
                  </h2>
                  <p className="mt-1 text-sm text-gray-700 font-semibold">
                    Entrega: {deliveryDate} · {deliveryWindow}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold border ${
                      statusLabel === 'Pendiente'
                        ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}
                  >
                    {statusLabel}
                  </span>
                  <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-bold border border-slate-200 bg-slate-50 text-slate-700">
                    Total items: {totalItems}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Resumen de items</p>
                {itemsSummary.length === 0 ? (
                  <p className="text-sm text-gray-600">Sin items registrados.</p>
                ) : (
                  <div className="space-y-1">
                    {itemsSummary.map((item, idx) => (
                      <div key={`${item.name}-${idx}`} className="text-sm text-gray-900 font-semibold">
                        {item.name} x{item.qty}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => navigate('/cafeteria/order')}
                  className="inline-flex items-center gap-2 rounded-full bg-slate-900 text-white font-bold text-sm px-5 py-2.5"
                >
                  Editar pedido
                </button>
              </div>
            </div>
          )}

          {!pendingLoading && !error && !pendingOrder && (
            <div className="w-full flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Pedido actual</p>
                <h2 className="text-4xl sm:text-5xl font-black text-gray-900">
                  No tenés pedidos activos
                </h2>
                <p className="text-base sm:text-lg text-gray-700 font-semibold">
                  Elegí un plan de desayuno y pedí en segundos
                </p>
                <p className="text-sm sm:text-base text-gray-600 font-semibold">
                  Elegís un plan → indicás cantidad → confirmás
                </p>
              </div>

              <button
                type="button"
                onClick={() => navigate('/cafeteria/new')}
                className="inline-flex items-center justify-center rounded-full bg-emerald-600 text-white font-bold text-base sm:text-lg px-7 py-3"
              >
                Hacer pedido
              </button>
            </div>
          )}
        </section>
      </div>
    </RequireUser>
  )
}

export default CafeteriaDashboardPage
