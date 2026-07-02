import { useEffect, useRef, useState } from 'react'
import { ChefHat } from 'lucide-react'

const CONFETTI_PIECES = Array.from({ length: 240 }, (_, index) => ({
  left: `${2 + ((index * 17) % 96)}%`,
  drift: `${((index % 15) - 7) * 15}px`,
  rotate: `${((index % 13) - 6) * 42}deg`,
  delay: `${(index % 30) * 24}ms`,
  duration: `${1500 + (index % 10) * 85}ms`,
  size: `${5 + (index % 5)}px`,
  top: `${-28 - (index % 6) * 18}px`
}))

const OrderSuccessConfetti = () => {
  const [visible, setVisible] = useState(false)
  const launchedRef = useRef(false)

  useEffect(() => {
    if (launchedRef.current) return undefined
    launchedRef.current = true

    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduceMotion) return undefined

    setVisible(true)
    const timer = window.setTimeout(() => setVisible(false), 3300)
    return () => window.clearTimeout(timer)
  }, [])

  if (!visible) return null

  return (
    <div className="order-success-confetti" aria-hidden="true">
      {CONFETTI_PIECES.map(({ left, drift, rotate, delay, duration, size, top }, index) => (
        <span
          key={`${left}-${delay}-${index}`}
          className="order-success-confetti__piece"
          style={{
            left,
            top,
            '--confetti-drift': drift,
            '--confetti-rotate': rotate,
            '--confetti-size': size,
            animationDelay: delay,
            animationDuration: duration
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
