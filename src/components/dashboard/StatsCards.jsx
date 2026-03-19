import { CheckCircle, Clock } from 'lucide-react'
import foodDeliveryImg from '../../assets/food-delivery (1).png'

const StatsCards = ({ stats }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
      <div className="card bg-linear-to-br from-white to-blue-50 shadow-2xl border-2 border-primary-200 transform hover:scale-105 transition-all duration-200">
        <div className="flex items-center">
          <div className="p-3 sm:p-4 rounded-full bg-linear-to-br from-primary-500 to-primary-700 shadow-lg">
            <div className="relative">
              <div className="flex items-center justify-center">
                <img
                  src={foodDeliveryImg}
                  alt="Entrega de comida"
                  className="h-10 w-10 sm:h-12 sm:w-12 shadow-lg mx-auto shrink-0 object-contain"
                  style={{ display: 'block', margin: '0 auto' }}
                />
              </div>
            </div>
          </div>
          <div className="ml-4 sm:ml-5">
            <p className="text-xs sm:text-sm font-extrabold text-gray-900 uppercase tracking-wider mb-1">PEDIDOS HOY</p>
            <p className="text-4xl sm:text-5xl font-black text-gray-900 drop-shadow">{stats.total}</p>
          </div>
        </div>
      </div>

      <div className="card bg-linear-to-br from-white to-yellow-50 shadow-2xl border-2 border-yellow-200 transform hover:scale-105 transition-all duration-200">
        <div className="flex items-center">
          <div className="p-3 sm:p-4 rounded-full bg-linear-to-br from-yellow-400 to-yellow-600 shadow-lg">
            <Clock className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
          </div>
          <div className="ml-4 sm:ml-5">
            <p className="text-xs sm:text-sm font-extrabold text-gray-900 uppercase tracking-wider mb-1">PENDIENTES</p>
            <p className="text-4xl sm:text-5xl font-black text-yellow-700 drop-shadow">{stats.pending}</p>
          </div>
        </div>
      </div>

      <div className="card bg-linear-to-br from-white to-green-50 shadow-2xl border-2 border-green-200 transform hover:scale-105 transition-all duration-200">
        <div className="flex items-center">
          <div className="p-3 sm:p-4 rounded-full bg-linear-to-br from-green-500 to-green-700 shadow-lg">
            <CheckCircle className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
          </div>
          <div className="ml-4 sm:ml-5">
            <p className="text-xs sm:text-sm font-extrabold text-gray-900 uppercase tracking-wider mb-1">ARCHIVADOS</p>
            <p className="text-4xl sm:text-5xl font-black text-green-600 drop-shadow">{stats.archived}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default StatsCards
