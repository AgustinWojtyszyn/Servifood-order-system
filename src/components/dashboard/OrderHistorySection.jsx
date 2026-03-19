const OrderHistorySection = ({
  orders,
  formatDate,
  summarizeOrderItems,
  getCustomSideFromResponses,
  serviceBadge
}) => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const pastOrders = (Array.isArray(orders) ? orders : []).filter(order => {
    const orderDate = new Date(order.created_at)
    orderDate.setHours(0, 0, 0, 0)
    return orderDate.getTime() < today.getTime()
  })

  if (pastOrders.length === 0) return null

  return (
    <div className="card bg-white/95 backdrop-blur-sm shadow-xl border-2 border-white/20">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 drop-shadow">
          Historial de pedidos (días anteriores)
        </h2>
        <span className="text-sm text-gray-600 font-semibold">
          {pastOrders.length} pedido(s)
        </span>
      </div>

      <div className="space-y-3">
        {pastOrders.slice(0, 20).map(order => {
          const summary = summarizeOrderItems(order.items)
          const customSide = getCustomSideFromResponses(order.custom_responses)
          const service = (order.service || 'lunch').toLowerCase()
          return (
            <div
              key={order.id}
              className="flex flex-col gap-2 p-3 sm:p-4 border-2 border-gray-200 rounded-xl bg-white/95"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-900 text-sm sm:text-base truncate">
                      Pedido #{order.id.slice(-8)}
                    </p>
                    {serviceBadge(service)}
                  </div>
                  <p className="text-xs sm:text-sm text-gray-600 truncate flex items-center gap-2">
                    {order.location} • {formatDate(order.created_at)} • {service === 'dinner' ? 'Cena' : 'Almuerzo'}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {(() => {
                    const status = order.displayStatus || order.status
                    return (
                      <span className="inline-flex px-2 sm:px-3 py-1 text-[11px] sm:text-xs font-semibold rounded-full bg-gray-100 text-gray-800 border border-gray-300">
                        {status === 'archived' ? 'Archivado' :
                         status === 'pending' ? 'Pendiente' :
                         'Cancelado'}
                      </span>
                    )
                  })()}
                  <span className="inline-flex px-2 sm:px-3 py-1 text-[11px] sm:text-xs font-semibold rounded-full bg-blue-50 text-blue-800 border border-blue-200">
                    {order.total_items || (order.items?.length || 0)} items
                  </span>
                </div>
              </div>

              <div className="text-xs sm:text-sm text-gray-900 space-y-1" title={summary.title}>
                {summary.principal.map((item, idx) => (
                  <div key={`${order.id}-history-principal-${idx}`} className="font-semibold wrap-break-word">
                    {item.name} (x{item.qty})
                  </div>
                ))}
                {summary.principalRemaining > 0 && (
                  <div className="text-[11px] sm:text-xs font-semibold text-gray-700">
                    +{summary.principalRemaining} menú(es) principal(es) más
                  </div>
                )}
                {summary.others.map((o, idx) => (
                  <div key={idx} className="wrap-break-word">
                    {o.name} (x{o.qty})
                  </div>
                ))}
                {summary.remaining > 0 && (
                  <div className="text-[11px] sm:text-xs font-semibold text-gray-700">
                    +{summary.remaining} más...
                  </div>
                )}
                {customSide && (
                  <div className="text-[11px] sm:text-xs italic font-semibold mt-1">
                    Guarnición: {customSide}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default OrderHistorySection
