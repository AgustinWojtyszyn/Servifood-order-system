import { useState } from 'react'
import { X, ChevronLeft, ChevronRight, CheckCircle } from 'lucide-react'
import { useOverlayLock } from '../contexts/OverlayLockContext'
import { ADMIN_TUTORIAL_STEPS } from './adminTutorial/adminTutorialSteps'

const AdminTutorial = ({ isOpen, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0)
  useOverlayLock(isOpen)

  if (!isOpen) return null

  const handleClose = () => {
    setCurrentStep(0) // Reiniciar al paso 1 cuando se cierra
    onClose()
  }

  const steps = ADMIN_TUTORIAL_STEPS

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const goToStep = (index) => {
    setCurrentStep(index)
  }

  const CurrentIcon = steps[currentStep].icon

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-linear-to-r from-primary-600 to-primary-700 text-white p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-3 rounded-lg">
                <CurrentIcon className="h-8 w-8" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Tutorial de Administrador</h2>
                <p className="text-primary-100">Paso {currentStep + 1} de {steps.length}</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 rounded-lg transition-colors bg-white text-gray-900 hover:bg-gray-100 border-2 border-gray-200 shadow-sm"
              title="Cerrar tutorial"
            >
              <X className="h-6 w-6 text-gray-900" />
            </button>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full bg-white/20 rounded-full h-2 mt-4">
            <div 
              className="bg-white h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <h3 className="text-3xl font-bold text-gray-900 mb-6">
            {steps[currentStep].title}
          </h3>
          <div className="text-base">
            {steps[currentStep].content}
          </div>
        </div>

        {/* Step Indicators */}
        <div className="px-6 py-4 bg-gray-100 border-t-2 border-gray-300">
          <div className="flex justify-center gap-2">
            {steps.map((_, index) => (
              <button
                key={index}
                onClick={() => goToStep(index)}
                className={`h-3 rounded-full transition-all shadow-sm ${
                  index === currentStep 
                    ? 'bg-blue-600 w-8 shadow-md' 
                    : index < currentStep
                    ? 'bg-green-500 w-3'
                    : 'bg-gray-400 w-3'
                }`}
                title={`Ir al paso ${index + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between p-6 bg-white border-t-2 border-gray-300">
          <button
            onClick={prevStep}
            disabled={currentStep === 0}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-bold transition-all shadow-md ${
              currentStep === 0
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-gray-800 hover:bg-gray-900 text-white hover:shadow-lg transform hover:scale-105'
            }`}
          >
            <ChevronLeft className="h-5 w-5" />
            Anterior
          </button>

          <div className="text-sm text-gray-700 font-bold bg-gray-100 px-4 py-2 rounded-lg border-2 border-gray-300">
            {currentStep + 1} / {steps.length}
          </div>

          {currentStep === steps.length - 1 ? (
            <button
              onClick={handleClose}
              className="flex items-center gap-2 px-6 py-3 rounded-lg font-bold bg-green-600 hover:bg-green-700 text-white transition-all shadow-md hover:shadow-lg transform hover:scale-105"
            >
              ¡Entendido!
              <CheckCircle className="h-5 w-5" />
            </button>
          ) : (
            <button
              onClick={nextStep}
              className="flex items-center gap-2 px-6 py-3 rounded-lg font-bold bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-md hover:shadow-lg transform hover:scale-105"
            >
              Siguiente
              <ChevronRight className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default AdminTutorial
