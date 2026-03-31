import { MessageCircle, Phone } from 'lucide-react'

const SupportCard = () => (
  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 sm:px-5">
    <div className="flex flex-col sm:flex-row items-center gap-4">
      <div className="rounded-full border border-emerald-200 bg-emerald-50 p-3">
        <MessageCircle className="h-6 w-6 text-emerald-700" />
      </div>
      <div className="flex-1 text-center sm:text-left">
        <h3 className="text-xl font-bold text-gray-900 mb-1">¿Necesitas ayuda?</h3>
        <p className="text-sm text-gray-700 mb-3">Estamos aquí para ayudarte por WhatsApp.</p>
        <a
          href="https://wa.me/2644405294?text=¡Hola!%20Necesito%20ayuda%20con%20ServiFood%20Catering"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-2 text-sm font-bold text-white hover:bg-emerald-700 transition-colors"
        >
          <Phone className="h-4 w-4" />
          Contactar por WhatsApp
        </a>
        <p className="text-xs text-gray-600 mt-3 font-semibold">
          +54 264 440 5294
        </p>
      </div>
    </div>
  </div>
)

export default SupportCard
