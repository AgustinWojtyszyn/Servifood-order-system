import { ChefHat } from 'lucide-react'

const OrderSuccessScreen = () => (
  <div className="p-3 sm:p-6 flex items-center justify-center min-h-dvh">
    <div className="max-w-2xl mx-auto text-center px-4">
      <div className="bg-white/95 backdrop-blur-sm border-2 border-green-300 rounded-2xl p-6 sm:p-8 shadow-2xl">
        <div className="flex justify-center mb-3 sm:mb-4">
          <div className="p-3 sm:p-4 rounded-full bg-green-100">
            <ChefHat className="h-10 w-10 sm:h-12 sm:w-12 text-green-600" />
          </div>
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-green-900 mb-2">¡Pedido creado exitosamente!</h2>
        <p className="text-base sm:text-lg text-green-700">Tu pedido ha sido registrado y será procesado pronto.</p>
        <p className="text-xs sm:text-sm text-green-600 mt-2">Redirigiendo al panel principal...</p>
      </div>
    </div>
  </div>
)

export default OrderSuccessScreen
