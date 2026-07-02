import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  getOrderSuccessConfettiEventName,
  getOrderSuccessConfettiPendingValue,
  getOrderSuccessConfettiStorageKey
} from '../../utils/order/orderSuccessConfetti'

const CONFETTI_PIECES = Array.from({ length: 270 }, (_, index) => ({
  left: `${2 + ((index * 17) % 96)}%`,
  drift: `${((index % 15) - 7) * 15}px`,
  rotate: `${((index % 13) - 6) * 42}deg`,
  delay: `${Math.floor(index / 90) * 260 + (index % 18) * 14}ms`,
  duration: `${1250 + (index % 10) * 75}ms`,
  size: `${5 + (index % 5)}px`,
  top: `${-12 - (index % 5) * 12}px`
}))

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

const debugConfetti = (message) => {
  if (import.meta.env.DEV) {
    console.debug(message)
  }
}

const OrderSuccessConfetti = () => {
  const [visible, setVisible] = useState(false)
  const [portalTarget, setPortalTarget] = useState(null)
  const timerRef = useRef(null)
  const runningRef = useRef(false)

  const clearPending = useCallback(() => {
    try {
      window.sessionStorage.removeItem(getOrderSuccessConfettiStorageKey())
    } catch (_err) {
      // no-op
    }
  }, [])

  const launch = useCallback(() => {
    clearPending()
    if (prefersReducedMotion() || runningRef.current) return

    runningRef.current = true
    setPortalTarget(document.body)
    setVisible(true)
    debugConfetti('order success confetti fired')
    if (timerRef.current) window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => {
      setVisible(false)
      runningRef.current = false
    }, 2600)
  }, [clearPending])

  useEffect(() => {
    const handleLaunch = () => launch()
    const eventName = getOrderSuccessConfettiEventName()
    window.addEventListener(eventName, handleLaunch)

    try {
      if (window.sessionStorage.getItem(getOrderSuccessConfettiStorageKey()) === getOrderSuccessConfettiPendingValue()) {
        launch()
      }
    } catch (_err) {
      // no-op
    }

    return () => {
      window.removeEventListener(eventName, handleLaunch)
      if (timerRef.current) window.clearTimeout(timerRef.current)
    }
  }, [launch])

  if (!visible || !portalTarget) return null

  return createPortal(
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
    </div>,
    portalTarget
  )
}

export default OrderSuccessConfetti
