import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Coffee, ClipboardList } from 'lucide-react'
import RequireUser from '../RequireUser'
import { useCafeteriaPendingOrder } from '../../hooks/useCafeteriaPendingOrder'

const CafeteriaDashboardPage = ({ user, loading }) => {
  const navigate = useNavigate()
  const { pendingOrder, loading: pendingLoading, error } = useCafeteriaPendingOrder(user)

  const statusLabel = useMemo(() => {
    if (pendingLoading) return 'Cargando estado...'
    if (error) return 'No se pudo cargar el estado.'
    return pendingOrder ? 'Tenés un pedido pendiente' : 'No tenés pedido pendiente'
  }, [pendingLoading, error, pendingOrder])

  return (
    <RequireUser user={user} loading={loading}>
      <div className="max-w-5xl mx-auto space-y-8">
        <header className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 border-2 border-white/40 text-white font-semibold shadow-lg">
            <Coffee className="h-5 w-5" />
            Cafetería
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-white drop-shadow-2xl">
            Panel de cafetería
          </h1>
          <p className="text-lg sm:text-xl text-white/90 max-w-3xl mx-auto font-semibold drop-shadow">
            {statusLabel}
          </p>
        </header>

        <section className="bg-white/95 border-2 border-white/30 rounded-3xl shadow-2xl p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Estado actual</p>
              <h2 className="text-2xl sm:text-3xl font-black text-gray-900">
                {pendingOrder ? 'Pedido pendiente' : 'Sin pedido activo'}
              </h2>
              <p className="mt-2 text-sm sm:text-base text-gray-700 font-semibold">
                {pendingOrder
                  ? 'Podés ver o modificar tu pedido actual.'
                  : 'Podés crear un nuevo pedido de cafetería.'}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {pendingOrder ? (
                <button
                  type="button"
                  onClick={() => navigate('/cafeteria/order')}
                  className="inline-flex items-center gap-2 rounded-full bg-[#0b1f3a] text-white font-bold text-base px-5 py-2.5 shadow-md"
                >
                  Ver pedido actual
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => navigate('/cafeteria/new')}
                  className="inline-flex items-center gap-2 rounded-full bg-emerald-600 text-white font-bold text-base px-5 py-2.5 shadow-md"
                >
                  Hacer pedido
                </button>
              )}
            </div>
          </div>
        </section>

        <section className="bg-white/95 border-2 border-white/30 rounded-3xl shadow-2xl p-6 sm:p-8">
          <div className="flex items-center gap-2 text-gray-800">
            <ClipboardList className="h-5 w-5" />
            <h3 className="text-xl font-black">Información</h3>
          </div>
          <p className="mt-2 text-sm sm:text-base text-gray-700 font-semibold">
            Desde acá podés gestionar tu pedido actual o crear uno nuevo. El historial completo y la edición detallada
            están disponibles solo dentro del pedido.
          </p>
        </section>
      </div>
    </RequireUser>
  )
}

export default CafeteriaDashboardPage
