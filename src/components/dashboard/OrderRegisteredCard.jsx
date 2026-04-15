import { ensureArray, getServiceLabel } from '../../utils/dashboard/dashboardHelpers.jsx'

const OrderRegisteredCard = ({ headerOrder, headerSummary, deliveryText, isDeliveringTomorrow }) => {
  if (!headerOrder) return null

  return (
    <div
      className={`rounded-2xl border bg-white px-4 py-4 sm:px-5 ${
        isDeliveringTomorrow
          ? 'border-amber-200 bg-amber-50/70 shadow-lg shadow-amber-200/50 px-5 py-5 sm:px-6 sm:py-6'
          : 'border-slate-200'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h3 className="text-xl sm:text-2xl font-bold text-gray-900">Pedido registrado correctamente</h3>
          <p className="text-sm text-gray-700 font-semibold mt-1">
            Ya registramos tu pedido. Lo vas a recibir en la fecha indicada.
          </p>
          <p
            className={`mt-1 ${
              isDeliveringTomorrow
                ? 'inline-flex items-center rounded-lg bg-amber-100 text-amber-900 px-4 py-2 text-base sm:text-lg font-black'
                : 'text-sm text-gray-600 font-semibold'
            }`}
          >
            {isDeliveringTomorrow ? 'Se entrega mañana' : `Entrega: ${deliveryText}`}
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
          {getServiceLabel(headerOrder?.service)}
        </div>
      </div>
      <p className="text-sm sm:text-base text-gray-800 font-semibold mt-3">
        {headerSummary}
      </p>
      {(() => {
        const optionsList = ensureArray(headerOrder?.custom_responses)
        const optionsSummary = optionsList
          .map((r) => {
            const title = (r?.title || '').toString().trim()
            const raw = r?.answer ?? r?.response ?? ''
            const value = Array.isArray(raw) ? raw.filter(Boolean).join(', ') : String(raw || '').trim()
            if (!title || !value) return null
            return { title, value }
          })
          .filter(Boolean)
        if (optionsSummary.length === 0) return null
        return (
          <div className="text-sm text-gray-700 font-semibold mt-2 space-y-1">
            {optionsSummary.map((opt, idx) => (
              <p key={`${opt.title}-${idx}`}>{opt.title}: {opt.value}</p>
            ))}
          </div>
        )
      })()}
      <p className="text-sm text-gray-600 font-semibold mt-1">
        No tenés que hacer nada más por ahora.
      </p>
    </div>
  )
}

export default OrderRegisteredCard

