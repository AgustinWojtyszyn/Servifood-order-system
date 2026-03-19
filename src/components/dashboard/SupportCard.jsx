import { MessageCircle, Phone } from 'lucide-react'

const SupportCard = () => (
  <div className="card bg-linear-to-br from-green-50 to-emerald-50 shadow-xl border-2 border-green-300">
    <div className="flex flex-col sm:flex-row items-center gap-4">
      <div className="bg-linear-to-r from-green-500 to-green-600 text-white p-4 rounded-xl">
        <MessageCircle className="h-10 w-10" />
      </div>
      <div className="flex-1 text-center sm:text-left">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">¿Necesitas ayuda?</h3>
        <p className="text-gray-700 mb-4">Estamos aquí para ayudarte. ¡Hablemos por WhatsApp! 😊</p>
        <a
          href="https://wa.me/2644405294?text=¡Hola!%20Necesito%20ayuda%20con%20ServiFood%20Catering%20🍽️"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-linear-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
        >
          <Phone className="h-5 w-5" />
          Contactar por WhatsApp
        </a>
        <p className="text-sm text-gray-600 mt-3 font-semibold">
          📱 +54 264 440 5294
        </p>
      </div>
    </div>
  </div>
)

export default SupportCard
