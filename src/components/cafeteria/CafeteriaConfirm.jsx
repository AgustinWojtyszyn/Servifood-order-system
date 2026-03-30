import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { CheckCircle, Coffee, Save, Trash2 } from 'lucide-react'
import RequireUser from '../RequireUser'
import { CAFETERIA_PLANS } from '../../cafeteria/cafeteriaPlans'
import {
  buildEmptyQuantities,
  buildOrderFromQuantities,
  loadCafeteriaOrder,
  normalizeQuantities,
  saveCafeteriaOrder
} from '../../cafeteria/cafeteriaStorage'
import { db } from '../../supabaseClient'
import { COMPANY_LIST } from '../../constants/companyConfig'
import { getCafeteriaWindowLabel, isCafeteriaWithinWindow } from '../../cafeteria/cafeteriaTime'

const CafeteriaConfirm = ({ user, loading }) => {
  const location = useLocation()
  const navigate = useNavigate()
  const redirectSeconds = 5
  const orderId = location.state?.orderId || null
  const mode = location.state?.mode || (orderId ? 'manage' : 'created')
  const isManageMode = mode === 'manage'
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
  const [message, setMessage] = useState('')
  const [history, setHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState('')

  const planRows = useMemo(() => {
    return CAFETERIA_PLANS.map((plan) => ({ plan, quantity: Number(quantities[plan.id] || 0) }))
  }, [quantities])

  const handleQuantity = (planId, delta) => {
    setQuantities((prev) => {
      const next = { ...prev }
      const current = Number(next[planId] || 0)
      next[planId] = Math.max(0, current + delta)
      return next
    })
  }

  const handleSaveChanges = () => {
    if (!isCafeteriaWithinWindow()) {
      setMessage(`Pedidos de cafetería disponibles de ${getCafeteriaWindowLabel()}. La entrega es al día siguiente.`)
      return
    }
    const order = buildOrderFromQuantities(quantities)
    if (!order.items.length) {
      setMessage('No hay planes seleccionados para guardar.')
      return
    }
    if (!companySlug) {
      setMessage('Selecciona la empresa para guardar el pedido.')
      return
    }
    const payload = {
      ...order,
      createdAt: initialOrder?.createdAt || new Date().toISOString(),
      userId: initialOrder?.userId || user?.id || null,
      company_slug: companySlug,
      company_name: COMPANY_LIST.find((c) => c.slug === companySlug)?.name || '',
      admin_name: initialOrder?.admin_name || user?.user_metadata?.full_name || user?.email || '',
      admin_email: initialOrder?.admin_email || user?.email || '',
      notes: notes || ''
    }
    saveCafeteriaOrder(payload)
    persistOrder(payload)
  }

  const persistOrder = async (payload) => {
    if (!orderId) {
      setMessage('Cambios guardados localmente.')
      return
    }
    try {
      const { error } = await db.updateCafeteriaOrder(orderId, {
        items: payload.items,
        totalItems: payload.totalItems,
        companySlug: payload.company_slug,
        companyName: payload.company_name,
        notes: payload.notes
      })
      if (error) {
        setMessage('No se pudo guardar en el historial. Reintenta.')
        return
      }
      setMessage('Cambios guardados correctamente.')
    } catch (err) {
      setMessage('No se pudo guardar en el historial. Reintenta.')
    }
  }

  const handleDeleteOrder = async () => {
    if (!orderId) {
      setMessage('No hay pedido para eliminar.')
      return
    }
    try {
      const { error } = await db.deleteCafeteriaOrder(orderId)
      if (error) {
        setMessage('No se pudo eliminar el pedido.')
        return
      }
      setMessage('Pedido eliminado.')
      navigate('/cafeteria')
    } catch (err) {
      setMessage('No se pudo eliminar el pedido.')
    }
  }

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
    if (isManageMode) return
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
  }, [navigate, redirectSeconds, isManageMode])

  useEffect(() => {
    if (!isManageMode || !user?.id) return
    const loadHistory = async () => {
      setHistoryLoading(true)
      setHistoryError('')
      try {
        const { data, error } = await db.getCafeteriaOrders()
        if (error) {
          setHistoryError('No se pudo cargar el historial.')
        } else {
          const scoped = (Array.isArray(data) ? data : []).filter((order) => {
            if (order?.user_id && user?.id) return order.user_id === user.id
            if (order?.admin_email && user?.email) return order.admin_email === user.email
            return true
          })
          const sorted = scoped.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
          setHistory(sorted)
        }
      } catch (err) {
        setHistoryError('No se pudo cargar el historial.')
      } finally {
        setHistoryLoading(false)
      }
    }
    loadHistory()
  }, [isManageMode, user?.id, user?.email])

  return (
    <RequireUser user={user} loading={loading}>
      <div className="max-w-5xl mx-auto space-y-6">
        <section className="bg-white/95 border-2 border-white/30 rounded-3xl shadow-2xl p-6 sm:p-10">
          <div className="text-center space-y-4">
            <div className="mx-auto h-20 w-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-inner">
              <CheckCircle className="h-12 w-12" />
            </div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 border-2 border-emerald-200 text-emerald-700 font-semibold">
              <Coffee className="h-5 w-5" />
              {isManageMode ? 'Gestionar pedido de cafetería' : 'Confirmación de cafetería'}
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-gray-900">
              {isManageMode ? 'Pedido actual' : 'Pedido confirmado'}
            </h1>
            {isManageMode ? (
              <p className="text-base sm:text-lg text-gray-600 font-semibold">
                Edita o elimina el pedido actual cuando lo necesites.
              </p>
            ) : (
              <p className="text-base sm:text-lg text-gray-600 font-semibold">
                Tu solicitud quedó registrada. Te vamos a redirigir a cafetería en {secondsLeft} segundos.
              </p>
            )}
            {!isManageMode && (
              <button
                onClick={() => navigate('/cafeteria')}
                className="inline-flex items-center justify-center rounded-full bg-[#0b1f3a] text-white font-bold text-base px-6 py-3 shadow-md"
              >
                Volver ahora
              </button>
            )}
          </div>

          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-2xl border-2 border-gray-200 bg-white p-4 text-center">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Empresa</p>
              {isManageMode ? (
                <select
                  value={companySlug}
                  onChange={(event) => setCompanySlug(event.target.value)}
                  className="w-full mt-2 rounded-xl border-2 border-gray-200 px-3 py-2 text-sm font-semibold text-gray-800 focus:border-primary-500 focus:outline-none"
                >
                  <option value="">Selecciona una empresa</option>
                  {COMPANY_LIST.map((company) => (
                    <option key={company.slug} value={company.slug}>{company.name}</option>
                  ))}
                </select>
              ) : (
                <p className="text-lg font-black text-gray-900 mt-1">
                  {COMPANY_LIST.find((c) => c.slug === companySlug)?.name || 'Sin empresa'}
                </p>
              )}
            </div>
            <div className="rounded-2xl border-2 border-gray-200 bg-white p-4 text-center">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Notas</p>
              {isManageMode ? (
                <input
                  type="text"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Ej: entregar en recepción, sin azúcar"
                  className="w-full mt-2 rounded-xl border-2 border-gray-200 px-3 py-2 text-sm font-semibold text-gray-800 focus:border-primary-500 focus:outline-none"
                />
              ) : (
                <p className="text-sm font-semibold text-gray-700 mt-1">
                  {notes || 'Sin aclaraciones'}
                </p>
              )}
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
                {planRows.filter(({ quantity }) => quantity > 0 || isManageMode).map(({ plan, quantity }) => (
                  <div key={plan.id} className="rounded-2xl border-2 border-gray-200 overflow-hidden">
                    <img
                      src={plan.image}
                      alt={`Flyer ${plan.name}`}
                      className="h-40 w-full object-cover"
                    />
                    <div className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-bold text-gray-900">{plan.name}</p>
                          <p className="text-xs text-gray-600 font-semibold">{plan.highlight}</p>
                        </div>
                        <span className="text-sm font-bold text-amber-700 bg-amber-100 px-3 py-1 rounded-full">
                          {quantity} u
                        </span>
                      </div>
                      {isManageMode && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleQuantity(plan.id, -1)}
                            className="h-8 w-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="0"
                            value={quantity}
                            onChange={(event) => {
                              const next = Math.max(0, Number(event.target.value || 0))
                              setQuantities((prev) => ({ ...prev, [plan.id]: next }))
                            }}
                            className="w-16 text-center bg-transparent outline-none font-bold text-gray-900"
                            aria-label={`Cantidad ${plan.name}`}
                          />
                          <button
                            onClick={() => handleQuantity(plan.id, 1)}
                            className="h-8 w-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold"
                          >
                            +
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {isManageMode && (
            <div className="mt-6 space-y-4">
              {message && (
                <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                  {message}
                </div>
              )}
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={handleSaveChanges}
                  className="inline-flex items-center gap-2 rounded-full bg-emerald-600 text-white font-bold text-base px-5 py-2.5 shadow-md"
                >
                  <Save className="h-4 w-4" />
                  Guardar cambios
                </button>
                <button
                  onClick={handleDeleteOrder}
                  className="inline-flex items-center gap-2 rounded-full bg-red-600 text-white font-bold text-base px-5 py-2.5 shadow-md"
                >
                  <Trash2 className="h-4 w-4" />
                  Eliminar pedido
                </button>
              </div>
            </div>
          )}
        </section>

        {isManageMode && (
          <section className="bg-white/95 border-2 border-white/30 rounded-3xl shadow-2xl p-6 sm:p-8">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Historial</p>
                <h3 className="text-2xl sm:text-3xl font-black text-gray-900">Pedidos de cafetería</h3>
              </div>
            </div>

            {historyLoading && (
              <p className="mt-4 text-gray-600 font-semibold">Cargando historial...</p>
            )}
            {historyError && (
              <p className="mt-4 text-red-600 font-semibold">{historyError}</p>
            )}
            {!historyLoading && !historyError && history.length === 0 && (
              <p className="mt-4 text-gray-600 font-semibold">Aún no hay pedidos registrados.</p>
            )}

            <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
              {history.map((order) => (
                <div key={order.id} className="border-2 border-gray-200 rounded-2xl p-4 bg-white">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Pedido</p>
                      <p className="text-base font-black text-gray-900">#{String(order.id).slice(0, 8)}</p>
                    </div>
                    <span className="text-sm font-bold text-amber-700 bg-amber-100 px-3 py-1 rounded-full">
                      {order.total_items || 0} unidades
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-gray-700 font-semibold">
                    Empresa: {order.company_name || order.company_slug || 'Sin empresa'}
                  </p>
                  <p className="text-sm text-gray-600 font-semibold">
                    Admin: {order.admin_name || order.admin_email || 'Sin nombre'}
                  </p>
                  <p className="mt-2 text-sm text-gray-600 font-semibold">
                    {new Date(order.created_at).toLocaleString('es-AR')}
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate('/cafeteria/confirm', { state: { orderId: order.id, mode: 'manage' } })}
                    className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#0b1f3a] text-white font-bold text-sm px-4 py-2"
                  >
                    Ver / Editar
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </RequireUser>
  )
}

export default CafeteriaConfirm
