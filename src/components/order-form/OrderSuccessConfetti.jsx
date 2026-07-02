import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation } from 'react-router-dom'
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

const debugConfetti = (message) => {
  if (import.meta.env.DEV) {
    console.debug(message)
  }
}

const OrderSuccessConfetti = () => {
  const location = useLocation()
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
    if (runningRef.current) return

    runningRef.current = true
    setPortalTarget(document.body)
    setVisible(true)
    debugConfetti('order success confetti fired')
    if (timerRef.current) window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => {
      setVisible(false)
      runningRef.current = false
    }, 2600)
  }, [])

  const launchPending = useCallback(() => {
    try {
      if (window.sessionStorage.getItem(getOrderSuccessConfettiStorageKey()) !== getOrderSuccessConfettiPendingValue()) {
        return
      }
      clearPending()
      launch()
    } catch (_err) {
      // no-op
    }
  }, [clearPending, launch])

  useEffect(() => {
    const handleLaunch = () => launchPending()
    const eventName = getOrderSuccessConfettiEventName()
    window.addEventListener(eventName, handleLaunch)

    launchPending()

    return () => {
      window.removeEventListener(eventName, handleLaunch)
      if (timerRef.current) window.clearTimeout(timerRef.current)
    }
  }, [launchPending])

  useEffect(() => {
    launchPending()
  }, [location.pathname, launchPending])

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
            '--confetti-duration': duration,
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
