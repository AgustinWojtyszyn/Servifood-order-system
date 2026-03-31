import { Link } from 'react-router-dom'
import { Edit, Trash2 } from 'lucide-react'

const WeeklyOrdersSection = ({
  weeklyOrders,
  formatWeeklyDate,
  getServiceLabel,
  getMainMenuLabel,
  getStatusLabel,
  onEditOrder,
  onDeleteOrder,
  canEditOrder
}) => {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 sm:px-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Tus pedidos de esta semana</h2>
      </div>

      {weeklyOrders.length === 0 ? (
        <div className="space-y-4">
          <p className="text-gray-600 font-semibold">Sin pedidos esta semana.</p>
          <Link to="/order" className="btn-primary inline-flex items-center justify-center w-full sm:w-auto bg-linear-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold py-3 px-6 text-base rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200">
            Hacer pedido
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {weeklyOrders.map((order) => {
            const status = order.displayStatus || order.status
            const showActions = status === 'pending' && (canEditOrder ? canEditOrder(order) : true)
            return (
              <div
                key={order.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-xl border border-slate-200 px-3 py-3 sm:px-4"
              >
                <p className="text-sm sm:text-base text-gray-900 font-semibold wrap-break-word">
                  {formatWeeklyDate(order.delivery_date)} · {getServiceLabel(order.service)} · {getMainMenuLabel(order)}
                </p>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  {showActions && (
                    <>
                      <button
                        type="button"
                        onClick={() => onEditOrder && onEditOrder(order)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                        title="Editar pedido"
                      >
                        <Edit className="h-3.5 w-3.5" />
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteOrder && onDeleteOrder(order)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full bg-red-600 text-white hover:bg-red-700 transition-colors"
                        title="Eliminar pedido"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Eliminar
                      </button>
                    </>
                  )}
                  <span className={`inline-flex px-2 sm:px-3 py-1 text-xs font-semibold rounded-full whitespace-nowrap self-start sm:self-auto ${
                    status === 'archived' ? 'bg-green-100 text-green-800' :
                    status === 'cancelled' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {getStatusLabel(status)}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default WeeklyOrdersSection
