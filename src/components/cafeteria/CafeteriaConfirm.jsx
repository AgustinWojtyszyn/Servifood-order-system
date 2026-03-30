import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { CheckCircle, Coffee } from 'lucide-react'
import RequireUser from '../RequireUser'
import { CAFETERIA_PLANS } from '../../cafeteria/cafeteriaPlans'
import { buildEmptyQuantities, loadCafeteriaOrder, normalizeQuantities } from '../../cafeteria/cafeteriaStorage'
import { db } from '../../supabaseClient'
import { COMPANY_LIST } from '../../constants/companyConfig'

const CafeteriaConfirm = ({ user, loading }) => {
  const location = useLocation()
  const navigate = useNavigate()
  const redirectSeconds = 5
  const orderId = location.state?.orderId || null
  const initialOrder = location.state?.order || loadCafeteriaOrder()
  const [quantities, setQuantities] = useState(() => {
    if (initialOrder?.items) {
      return normalizeQuantities(CAFETERIA_PLANS, initialOrder.items)
    }
    return buildEmptyQuantities(CAFETERIA_PLANS)
  })
  const [loadingOrder, setLoadingOrder] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [companySlug, setCompanySlug] = useState(initialOrder?.company_slug || '')
  const [notes, setNotes] = useState(initialOrder?.notes || '')
  const [secondsLeft, setSecondsLeft] = useState(redirectSeconds)

  const planRows = useMemo(() => {
    return CAFETERIA_PLANS.map((plan) => ({ plan, quantity: Number(quantities[plan.id] || 0) }))
  }, [quantities])

  useEffect(() => {
    if (!orderId || initialOrder?.items) return
    const loadOrder = async () => {
      setLoadingOrder(true)
      setLoadError('')
      try {
        const { data, error } = await db.getCafeteriaOrderById(orderId)
        if (error || !data) {
          setLoadError('No se pudo cargar el pedido.')
        } else {
          setQuantities(normalizeQuantities(CAFETERIA_PLANS, data.items || []))
          setCompanySlug(data.company_slug || '')
          setNotes(data.notes || '')
        }
      } catch (err) {
        setLoadError('No se pudo cargar el pedido.')
      } finally {
        setLoadingOrder(false)
      }
    }
    loadOrder()
  }, [orderId, initialOrder])

  useEffect(() => {
    setSecondsLeft(redirectSeconds)
    const timeoutId = setTimeout(() => {
      navigate('/cafeteria')
    }, redirectSeconds * 1000)
    const intervalId = setInterval(() => {
      setSecondsLeft((prev) => (prev > 1 ? prev - 1 : 1))
    }, 1000)
    return () => {
      clearTimeout(timeoutId)
      clearInterval(intervalId)
    }
  }, [navigate, redirectSeconds])

  return (
    <RequireUser user={user} loading={loading}>
      <div className="min-h-full flex items-center justify-center">
        <div className="w-full max-w-4xl bg-white/95 border-2 border-white/30 rounded-3xl shadow-2xl p-6 sm:p-10">
          <div className="text-center space-y-4">
            <div className="mx-auto h-20 w-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-inner">
              <CheckCircle className="h-12 w-12" />
            </div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 border-2 border-emerald-200 text-emerald-700 font-semibold">
              <Coffee className="h-5 w-5" />
              Confirmación de cafetería
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-gray-900">
              Pedido confirmado
            </h1>
            <p className="text-base sm:text-lg text-gray-600 font-semibold">
              Tu solicitud quedó registrada. Te vamos a redirigir a cafetería en {secondsLeft} segundos.
            </p>
            <button
              onClick={() => navigate('/cafeteria')}
              className="inline-flex items-center justify-center rounded-full bg-[#0b1f3a] text-white font-bold text-base px-6 py-3 shadow-md"
            >
              Volver ahora
            </button>
          </div>

          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-2xl border-2 border-gray-200 bg-white p-4 text-center">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Empresa</p>
              <p className="text-lg font-black text-gray-900 mt-1">
                {COMPANY_LIST.find((c) => c.slug === companySlug)?.name || 'Sin empresa'}
              </p>
            </div>
            <div className="rounded-2xl border-2 border-gray-200 bg-white p-4 text-center">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Notas</p>
              <p className="text-sm font-semibold text-gray-700 mt-1">
                {notes || 'Sin aclaraciones'}
              </p>
            </div>
            <div className="rounded-2xl border-2 border-gray-200 bg-white p-4 text-center">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Total de items</p>
              <p className="text-2xl font-black text-emerald-600 mt-1">
                {planRows.reduce((acc, row) => acc + row.quantity, 0)}
              </p>
            </div>
          </div>

          <div className="mt-6">
            {loadingOrder && (
              <p className="text-gray-600 font-semibold text-center">Cargando pedido...</p>
            )}
            {loadError && (
              <p className="text-red-600 font-semibold text-center">{loadError}</p>
            )}
            {!loadingOrder && !loadError && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {planRows.filter(({ quantity }) => quantity > 0).map(({ plan, quantity }) => (
                  <div key={plan.id} className="rounded-2xl border-2 border-gray-200 overflow-hidden">
                    <img
                      src={plan.image}
                      alt={`Flyer ${plan.name}`}
                      className="h-40 w-full object-cover"
                    />
                    <div className="p-4 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-gray-900">{plan.name}</p>
                        <p className="text-xs text-gray-600 font-semibold">{plan.highlight}</p>
                      </div>
                      <span className="text-sm font-bold text-amber-700 bg-amber-100 px-3 py-1 rounded-full">
                        {quantity} u
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </RequireUser>
  )
}

export default CafeteriaConfirm
