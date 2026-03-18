import { Building2 } from 'lucide-react'

const OrderFormHeader = ({ companyName, isGenneia }) => (
  <div className="text-center">
    <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-white/15 border-2 border-white/30 shadow-lg text-white mb-3">
      <Building2 className="h-5 w-5" />
      <div className="text-left">
        <p className="text-xs font-semibold uppercase tracking-wide">Empresa seleccionada</p>
        <p className="text-base sm:text-lg font-bold">{companyName}</p>
      </div>
    </div>
    <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white drop-shadow-2xl mb-2 sm:mb-3">Nuevo Pedido</h1>
    <p className="text-lg sm:text-xl md:text-2xl text-white font-semibold drop-shadow-lg">Seleccioná tu menú y completa tus datos</p>
    <p className="text-base sm:text-lg text-white/90 mt-1 sm:mt-2">¡Es rápido y fácil!</p>
    <div className="mt-4 mx-auto max-w-2xl">
      <div className="bg-yellow-100 border-l-4 border-yellow-500 p-3 rounded-lg shadow text-yellow-900 text-sm sm:text-base">
        <strong>Importante:</strong> No realices <b>pedidos de prueba</b>. Todos los pedidos se contabilizan para el día siguiente y serán preparados. Si necesitas cancelar un pedido, hazlo desde la aplicación o comunícate por WhatsApp dentro de los <b>15 minutos</b> posteriores a haberlo realizado.
      </div>
      {isGenneia && (
        <div className="mt-3 bg-amber-50 border-l-4 border-amber-500 p-3 rounded-lg shadow text-amber-900 text-sm sm:text-base">
          <strong>Postre Genneia:</strong> Elegí <b>Postre del día</b> solo los <b>lunes y miércoles</b> (entrega martes y jueves). El resto de los días <b>marcá siempre Fruta</b> como opción (martes, jueves y viernes).
        </div>
      )}
    </div>
  </div>
)

export default OrderFormHeader
