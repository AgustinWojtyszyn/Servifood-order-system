import { useState } from 'react'
import { X, ChevronLeft, ChevronRight, BookOpen } from 'lucide-react'
import { useOverlayLock } from '../contexts/OverlayLockContext'

const Tutorial = ({ isOpen, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0)
  useOverlayLock(isOpen)

  const handleClose = () => {
    setCurrentStep(0) // Reiniciar al paso 1 cuando se cierra
    onClose()
  }

  const steps = [
    {
      title: '¡Bienvenido a ServiFood!',
      content: 'Esta es tu plataforma para gestionar pedidos de comida de manera fácil y rápida. Te guiaremos por las funciones principales.',
      image: '🍽️'
    },
    {
      title: 'Panel Principal',
      content: 'En el panel principal puedes ver un resumen de todos tus pedidos: totales, pendientes y completados. Aquí también verás tus pedidos más recientes.',
      image: '📈'
    },
    {
      title: 'Crear Nuevo Pedido',
      content: 'Hacé clic en "Nuevo Pedido" para crear un pedido. Seleccioná los platos del menú, completá tus datos y elegí la fecha de entrega. Recordá: solo 1 menú principal y 1 ensalada por pedido.',
      image: '📝'
    },
    {
      title: 'Gestionar Pedidos',
      content: 'Podés marcar pedidos como entregados haciendo clic en el botón verde de verificación. Los pedidos completados aparecerán en su propia sección.',
      image: '⚙️'
    },
    {
      title: 'Panel de Administrador (Solo Admin)',
      content: 'Si sos administrador, podés gestionar usuarios, cambiar roles y editar el menú de platos disponibles. También podés agregar o eliminar opciones del menú.',
      image: '🔐'
    },
    {
      title: '¡Listo para comenzar!',
      content: 'Ya conocés las funciones básicas. Podés volver a ver este tutorial en cualquier momento desde el menú de ayuda.',
      image: '🚀'
    }
  ]

  if (!isOpen) return null

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      handleClose()
    }
  }

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-gradient-to-br from-primary-700 via-primary-800 to-primary-900 rounded-2xl shadow-2xl max-w-2xl w-full mx-4 overflow-hidden border-4 border-white/20">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-900 to-primary-800 p-6 text-white relative border-b-4 border-secondary-500">
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-2 bg-white/90 text-gray-900 hover:bg-white rounded-lg transition-colors border border-gray-200 shadow-sm"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="lucide lucide-x h-5 w-5 text-gray-900"
              aria-hidden="true"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
          <div className="flex items-center gap-3">
            <BookOpen className="h-8 w-8" />
            <div>
              <h2 className="text-2xl font-bold">Tutorial de ServiFood</h2>
              <p className="text-primary-100 text-sm">Paso {currentStep + 1} de {steps.length}</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-8 bg-white/95 backdrop-blur-sm">
          <div className="text-center mb-6">
            <div className="text-6xl mb-4">{steps[currentStep].image}</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">
              {steps[currentStep].title}
            </h3>
            <p className="text-gray-600 text-lg leading-relaxed">
              {steps[currentStep].content}
            </p>
          </div>

          {/* Progress Dots */}
          <div className="flex justify-center gap-2 mb-6">
            {steps.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentStep(index)}
                className={`h-2 rounded-full transition-all ${
                  index === currentStep 
                    ? 'w-8 bg-primary-600' 
                    : 'w-2 bg-gray-300 hover:bg-gray-400'
                }`}
              />
            ))}
          </div>

          {/* Navigation */}
          <div className="flex justify-between items-center gap-4">
            <button
              onClick={handlePrev}
              disabled={currentStep === 0}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${
                currentStep === 0
                  ? 'text-gray-400 cursor-not-allowed bg-gray-100'
                  : 'text-white hover:shadow-lg transform hover:scale-105'
              }`}
              style={currentStep === 0 ? {} : {background: 'linear-gradient(to right, #1a237e, #283593)'}}
              onMouseEnter={(e) => currentStep !== 0 && (e.currentTarget.style.background = 'linear-gradient(to right, #283593, #303f9f)')}
              onMouseLeave={(e) => currentStep !== 0 && (e.currentTarget.style.background = 'linear-gradient(to right, #1a237e, #283593)')}
            >
              <ChevronLeft className="h-5 w-5" />
              Anterior
            </button>

            <button
              onClick={handleNext}
              className="flex items-center gap-2 px-6 py-3 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
              style={{background: 'linear-gradient(to right, #1a237e, #283593)'}}
              onMouseEnter={(e) => e.currentTarget.style.background = 'linear-gradient(to right, #283593, #303f9f)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'linear-gradient(to right, #1a237e, #283593)'}
            >
              {currentStep === steps.length - 1 ? 'Finalizar' : 'Siguiente'}
              {currentStep < steps.length - 1 && <ChevronRight className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Tutorial
