import { Clock } from 'lucide-react'

const OrderHoursBanner = () => (
  <div className="bg-blue-50 border-2 border-blue-300 rounded-xl p-3 sm:p-4 shadow-lg">
    <div className="flex items-start gap-3">
      <Clock className="h-5 w-5 text-blue-600 shrink-0" />
      <div>
        <p className="text-sm sm:text-base text-blue-800 font-medium">
          Horario de pedidos: <strong>09:00 a 22:00</strong> (hora Buenos Aires)
        </p>
        <p className="text-xs sm:text-sm text-blue-700 mt-1">
          Si necesitas realizar cambios, presiona el botón <strong>"¿Necesitas ayuda?"</strong>
        </p>
      </div>
    </div>
  </div>
)

export default OrderHoursBanner
