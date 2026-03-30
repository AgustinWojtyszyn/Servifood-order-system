import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle, Coffee, ArrowRight, X } from 'lucide-react'
import RequireUser from '../RequireUser'
import { CAFETERIA_PLANS } from '../../cafeteria/cafeteriaPlans'
import { buildEmptyQuantities, buildOrderFromQuantities, saveCafeteriaOrder } from '../../cafeteria/cafeteriaStorage'
import { db } from '../../supabaseClient'
import { COMPANY_LIST } from '../../constants/companyConfig'
import { getCafeteriaWindowLabel, isCafeteriaWithinWindow } from '../../cafeteria/cafeteriaTime'

const CafeteriaHome = ({ user, loading }) => {
  const [selectedPlanId, setSelectedPlanId] = useState(null)
  const [previewPlanId, setPreviewPlanId] = useState(null)
  const [quantities, setQuantities] = useState(() => buildEmptyQuantities(CAFETERIA_PLANS))
  const [error, setError] = useState('')
  const [companySlug, setCompanySlug] = useState('')
  const [notes, setNotes] = useState('')
  const navigate = useNavigate()
  const detailsRef = useRef(null)

  const selectedPlan = useMemo(
    () => CAFETERIA_PLANS.find((plan) => plan.id === selectedPlanId) || null,
    [selectedPlanId]
  )

  const previewPlan = useMemo(
    () => CAFETERIA_PLANS.find((plan) => plan.id === previewPlanId) || null,
    [previewPlanId]
  )

  const handleSelect = (planId) => {
    setSelectedPlanId(planId)
    setTimeout(() => {
      detailsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 80)
  }

  const handleConfirm = () => {
    if (!isCafeteriaWithinWindow()) {
      setError(`Pedidos de cafeteria disponibles de ${getCafeteriaWindowLabel()}. La entrega es al dia siguiente.`)
      return
    }
    const order = buildOrderFromQuantities(quantities)
    if (!order.items.length) {
      setError('Selecciona al menos un plan para confirmar.')
      return
    }
    if (!companySlug) {
      setError('Selecciona la empresa para el pedido de cafeteria.')
      return
    }
    const payload = {
      ...order,
      createdAt: new Date().toISOString(),
      userId: user?.id || null,
      company_slug: companySlug,
      company_name: COMPANY_LIST.find((c) => c.slug === companySlug)?.name || '',
      admin_name: user?.user_metadata?.full_name || user?.email || '',
      admin_email: user?.email || '',
      notes: notes || ''
    }
    saveCafeteriaOrder(payload)
    createOrder(payload)
  }

  const createOrder = async (payload) => {
    setError('')
    try {
      const { data, error: createError } = await db.createCafeteriaOrder({
        userId: payload.userId,
        items: payload.items,
        totalItems: payload.totalItems,
        companySlug: payload.company_slug,
        companyName: payload.company_name,
        adminName: payload.admin_name,
        adminEmail: payload.admin_email,
        notes: payload.notes
      })
      if (createError) {
        setError('No se pudo guardar el pedido en el historial. Reintenta.')
        return
      }
      navigate('/cafeteria/order', { replace: true, state: { orderId: data.id, order: payload, created: true } })
    } catch (err) {
      setError('No se pudo guardar el pedido en el historial. Reintenta.')
    }
  }

  const updateQuantity = (planId, delta) => {
    setQuantities((prev) => {
      const next = { ...prev }
      const current = Number(next[planId] || 0)
      next[planId] = Math.max(0, current + delta)
      return next
    })
  }

  const totalSelected = useMemo(() => {
    return Object.values(quantities).reduce((acc, qty) => acc + Number(qty || 0), 0)
  }, [quantities])

  return (
    <RequireUser user={user} loading={loading}>
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 border-2 border-white/40 text-white font-semibold shadow-lg">
            <Coffee className="h-5 w-5" />
            Servicio de cafeteria
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-white drop-shadow-2xl">
            Elegi tu plan de cafeteria
          </h1>
          <p className="text-lg sm:text-xl text-white/90 max-w-3xl mx-auto font-semibold drop-shadow">
            Selecciona el flyer que mejor se ajuste a tu equipo. Antes de confirmar podras ver el detalle completo.
          </p>
          <p className="text-sm sm:text-base text-white/90 font-semibold drop-shadow">
            Pedidos de cafeteria: {getCafeteriaWindowLabel()}. Entrega al dia siguiente.
          </p>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {CAFETERIA_PLANS.map((plan) => {
            const isActive = selectedPlanId === plan.id
            return (
              <div
                key={plan.id}
                className={`group relative overflow-hidden rounded-3xl border-4 shadow-2xl transition-all duration-200 text-left bg-white ${
                  isActive
                    ? 'border-amber-400 ring-4 ring-amber-200/60'
                    : 'border-white/40 hover:border-amber-300'
                }`}
              >
                <img
                  src={plan.image}
                  alt={`Flyer ${plan.name}`}
                  className="h-[420px] sm:h-[460px] w-full object-cover group-hover:scale-[1.02] transition-transform duration-200"
                />
                <div className="p-4 sm:p-5 bg-white">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-lg font-black text-gray-900">{plan.name}</h2>
                    {isActive && <CheckCircle className="h-5 w-5 text-amber-500" />}
                  </div>
                  <p className="text-sm text-gray-600 font-semibold mt-1">{plan.highlight}</p>
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <div className="inline-flex items-center gap-2 rounded-full border-2 border-gray-200 px-3 py-1.5 text-sm font-bold text-gray-800">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation()
                          updateQuantity(plan.id, -1)
                        }}
                        className="h-7 w-7 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700"
                        aria-label={`Quitar ${plan.name}`}
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min="0"
                        value={quantities[plan.id] || 0}
                        onChange={(event) => {
                          event.stopPropagation()
                          const next = Math.max(0, Number(event.target.value || 0))
                          setQuantities((prev) => ({ ...prev, [plan.id]: next }))
                        }}
                        className="w-16 text-center bg-transparent outline-none"
                        aria-label={`Cantidad ${plan.name}`}
                      />
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation()
                          updateQuantity(plan.id, 1)
                        }}
                        className="h-7 w-7 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700"
                        aria-label={`Agregar ${plan.name}`}
                      >
                        +
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPreviewPlanId(plan.id)}
                      className="inline-flex items-center gap-2 rounded-full bg-amber-100 text-amber-800 font-bold text-sm px-4 py-2 hover:bg-amber-200 transition-colors"
                    >
                      Ver detalle
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelect(plan.id)}
                      className="inline-flex items-center gap-2 rounded-full bg-[#0b1f3a] text-white font-bold text-sm px-4 py-2"
                    >
                      Seleccionar
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </section>

        {previewPlan && (
          <div
            className="fixed inset-0 z-[140] flex items-center justify-center p-4 sm:p-8"
            role="dialog"
            aria-modal="true"
          >
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setPreviewPlanId(null)} />
            <div className="relative w-full max-w-6xl bg-white rounded-3xl shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Detalle del flyer</p>
                  <h3 className="text-xl sm:text-2xl font-black text-gray-900">{previewPlan.name}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewPlanId(null)}
                  className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 self-end sm:self-auto mt-3 sm:mt-0"
                  aria-label="Cerrar detalle"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="p-4 sm:p-6">
                <img
                  src={previewPlan.image}
                  alt={`Flyer ${previewPlan.name}`}
                  className="w-full max-h-[92vh] object-contain rounded-2xl"
                />
              </div>
            </div>
          </div>
        )}

        <section ref={detailsRef} className="bg-white/95 border-2 border-white/30 rounded-3xl shadow-2xl p-6 sm:p-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Detalle del plan</p>
              <h3 className="text-2xl sm:text-3xl font-black text-gray-900">
                {selectedPlan ? selectedPlan.name : 'Selecciona un plan'}
              </h3>
            </div>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={totalSelected === 0}
              className="inline-flex items-center gap-2 rounded-full bg-[#0b1f3a] text-white font-bold text-base px-5 py-2.5 shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Confirmar pedido
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          {error && (
            <div className="mt-4 rounded-2xl border-2 border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {error}
            </div>
          )}

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
                Empresa
              </label>
              <select
                value={companySlug}
                onChange={(event) => setCompanySlug(event.target.value)}
                className="w-full rounded-xl border-2 border-gray-200 px-3 py-2 text-sm font-semibold text-gray-800 focus:border-primary-500 focus:outline-none"
              >
                <option value="">Selecciona una empresa</option>
                {COMPANY_LIST.map((company) => (
                  <option key={company.slug} value={company.slug}>{company.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
                Aclaraciones
              </label>
              <input
                type="text"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Ej: entregar en recepcion, sin azucar"
                className="w-full rounded-xl border-2 border-gray-200 px-3 py-2 text-sm font-semibold text-gray-800 focus:border-primary-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="mt-4 text-sm font-semibold text-gray-600">
            Total seleccionado: <span className="text-gray-900 font-black">{totalSelected}</span>
          </div>

          {!selectedPlan && (
            <p className="mt-6 text-gray-600 font-semibold">
              Hace click en cualquiera de los flyers para ver el detalle completo antes de confirmar.
            </p>
          )}

          {selectedPlan && (
            <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="rounded-2xl overflow-hidden border-2 border-gray-200 shadow-sm">
                <img
                  src={selectedPlan.image}
                  alt={`Detalle ${selectedPlan.name}`}
                  className="h-[360px] sm:h-[420px] w-full object-cover"
                />
              </div>
              <div className="space-y-3">
                <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Incluye</p>
                <ul className="space-y-2">
                  {selectedPlan.includes.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-base text-gray-800 font-semibold">
                      <CheckCircle className="h-5 w-5 text-emerald-500 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </section>
      </div>
    </RequireUser>
  )
}

export default CafeteriaHome
