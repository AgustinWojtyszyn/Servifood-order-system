import { useEffect, useRef, useState } from 'react'
import { ChefHat } from 'lucide-react'

const CONFETTI_PIECES = [
  ['8%', '-18px', '12deg', '0ms'], ['14%', '16px', '-18deg', '70ms'], ['20%', '-8px', '32deg', '130ms'],
  ['27%', '22px', '-26deg', '40ms'], ['33%', '-24px', '18deg', '110ms'], ['39%', '12px', '-34deg', '0ms'],
  ['46%', '-18px', '24deg', '90ms'], ['52%', '18px', '-12deg', '150ms'], ['58%', '-10px', '36deg', '30ms'],
  ['64%', '24px', '-30deg', '120ms'], ['70%', '-22px', '16deg', '50ms'], ['76%', '14px', '-24deg', '160ms'],
  ['82%', '-16px', '28deg', '20ms'], ['88%', '20px', '-16deg', '100ms'], ['94%', '-12px', '22deg', '60ms']
]

const OrderSuccessConfetti = () => {
  const [visible, setVisible] = useState(false)
  const launchedRef = useRef(false)

  useEffect(() => {
    if (launchedRef.current) return undefined
    launchedRef.current = true

    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduceMotion) return undefined

    setVisible(true)
    const timer = window.setTimeout(() => setVisible(false), 1700)
    return () => window.clearTimeout(timer)
  }, [])

  if (!visible) return null

  return (
    <div className="order-success-confetti" aria-hidden="true">
      {CONFETTI_PIECES.map(([left, drift, rotate, delay], index) => (
        <span
          key={`${left}-${index}`}
          className="order-success-confetti__piece"
          style={{
            left,
            '--confetti-drift': drift,
            '--confetti-rotate': rotate,
            animationDelay: delay
          }}
        />
      ))}
    </div>
  )
}

const OrderSuccessScreen = () => (
  <div className="relative p-3 sm:p-6 flex items-center justify-center min-h-dvh">
    <OrderSuccessConfetti />
    <div className="max-w-2xl mx-auto text-center px-4">
      <div className="bg-white/95 backdrop-blur-sm border-2 border-green-300 rounded-2xl p-6 sm:p-8 shadow-2xl">
        <div className="flex justify-center mb-3 sm:mb-4">
          <div className="p-3 sm:p-4 rounded-full bg-green-100">
            <ChefHat className="h-10 w-10 sm:h-12 sm:w-12 text-green-600" />
          </div>
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-green-900 mb-2">¡Pedido creado exitosamente!</h2>
        <p className="text-base sm:text-lg text-green-700">Tu pedido ha sido registrado y será procesado pronto.</p>
        <p className="text-xs sm:text-sm text-green-600 mt-2">Redirigiendo al dashboard...</p>
      </div>
    </div>
  </div>
)

export default OrderSuccessScreen
