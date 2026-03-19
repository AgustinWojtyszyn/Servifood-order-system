import { CheckCircle, Eye } from 'lucide-react'

const ArchivedOrdersSection = ({
  isAdmin,
  orders,
  formatDate,
  onViewOrder
}) => {
  const archivedOrders = (Array.isArray(orders) ? orders : []).filter(
    o => (o.displayStatus || o.status) === 'archived'
  )

  if (!isAdmin || archivedOrders.length === 0) return null

  return (
    <div className="card bg-white/95 backdrop-blur-sm shadow-xl border-2 border-white/20">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-bold text-gray-900 drop-shadow">Pedidos Archivados</h2>
        <span className="text-sm text-gray-600 font-semibold">
          {archivedOrders.length} archivado(s)
        </span>
      </div>

      <div className="space-y-4">
        {archivedOrders.slice(0, 10).map((order) => (
          <div key={order.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 p-3 sm:p-4 border-2 border-green-200 bg-green-50 rounded-xl transition-all">
            <div className="flex flex-col sm:flex-row sm:items-center flex-1 min-w-0 gap-2 sm:gap-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-full bg-green-100 shrink-0">
                  <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm sm:text-base truncate">
                    {isAdmin ? `${order.user_name} - ` : ''}Pedido #{order.id.slice(-8)}
                  </p>
                  <p className="text-xs sm:text-sm text-gray-600 truncate">
                    {order.location} • {formatDate(order.created_at)}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex flex-row flex-wrap items-center gap-2 sm:gap-3 justify-end sm:justify-start mt-2 sm:mt-0">
              {isAdmin && (
                <button
                  onClick={() => onViewOrder(order.id)}
                  className="flex items-center gap-1 p-2 rounded-lg transition-colors bg-blue-600 text-white hover:bg-blue-700"
                  title="Ver pedido"
                >
                  <Eye className="h-4 w-4" />
                  <span className="hidden sm:inline text-xs font-semibold">Ver pedido</span>
                </button>
              )}
              <span className="inline-flex px-2 sm:px-3 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 whitespace-nowrap">
                Archivado
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default ArchivedOrdersSection
