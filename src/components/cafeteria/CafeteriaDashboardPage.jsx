import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Coffee } from 'lucide-react'
import RequireUser from '../RequireUser'
import LoadingState from '../ui/LoadingState'
import { useCafeteriaPendingOrder } from '../../hooks/useCafeteriaPendingOrder'
import { CAFETERIA_PLANS } from '../../cafeteria/cafeteriaPlans'
import { getCafeteriaWindowLabel } from '../../cafeteria/cafeteriaTime'
import { db } from '../../supabaseClient'
import { confirmAction } from '../../utils/confirm'
import { getUserFriendlyErrorMessage } from '../../utils'

const formatDeliveryDate = (deliveryDate, createdAt) => {
  const rawDate = deliveryDate || createdAt
  if (!rawDate) return '-'
  const base = new Date(`${String(rawDate).slice(0, 10)}T00:00:00`)
  if (Number.isNaN(base.getTime())) return '-'
  return base.toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

const planNameById = new Map(CAFETERIA_PLANS.map((plan) => [plan.id, plan.name]))

const CafeteriaDashboardPage = ({ user, loading }) => {
  const navigate = useNavigate()
  const { pendingOrder, loading: pendingLoading, error, refresh } = useCafeteriaPendingOrder(user)
  const [actionError, setActionError] = useState('')
  const [deleting, setDeleting] = useState(false)

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

  const status = String(pendingOrder?.status || '').toLowerCase()
  const statusLabel = status === 'pending'
    ? 'Pendiente'
    : status === 'archived'
      ? 'Archivado'
      : status === 'cancelled'
        ? 'Cancelado'
        : 'Estado desconocido'
  const statusClassName = status === 'pending'
    ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
    : status === 'archived'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : status === 'cancelled'
        ? 'bg-red-50 text-red-700 border-red-200'
        : 'bg-slate-100 text-slate-700 border-slate-300'
  const deliveryDate = formatDeliveryDate(pendingOrder?.delivery_date, pendingOrder?.created_at)
  const deliveryWindow = getCafeteriaWindowLabel()

  const handleDeleteOrder = async () => {
    if (!pendingOrder?.id || deleting) return
    const confirmed = await confirmAction({
      title: 'Eliminar pedido de cafeteria',
      message: 'Se eliminará tu pedido pendiente de cafeteria.',
      highlight: 'Esta acción no se puede deshacer.',
      confirmText: 'Eliminar pedido'
    })
    if (!confirmed) return

    setDeleting(true)
    setActionError('')
    try {
      const { error: deleteError } = await db.deleteCafeteriaOrder(pendingOrder.id)
      if (deleteError) {
        setActionError(getUserFriendlyErrorMessage(deleteError, 'No pudimos eliminar el pedido. Intentá nuevamente.'))
        return
      }
      await refresh()
    } catch (err) {
      setActionError(getUserFriendlyErrorMessage(err, 'No pudimos eliminar el pedido. Intentá nuevamente.'))
    } finally {
      setDeleting(false)
    }
  }

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
            <LoadingState variant="inline" message="Cargando pedido..." tone="slate" />
          )}
          {!pendingLoading && error && (
            <p className="text-sm font-semibold text-red-600">{error}</p>
          )}
          {!pendingLoading && actionError && (
            <p className="text-sm font-semibold text-red-600">{actionError}</p>
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
                    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold border ${statusClassName}`}
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
                <button
                  type="button"
                  onClick={handleDeleteOrder}
                  disabled={deleting}
                  className="inline-flex items-center gap-2 rounded-full bg-red-600 text-white font-bold text-sm px-5 py-2.5 disabled:opacity-60"
                >
                  {deleting ? 'Eliminando...' : 'Eliminar pedido'}
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
                className="inline-flex items-center justify-center rounded-full bg-emerald-600 text-white font-black text-base sm:text-lg px-7 py-3"
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
