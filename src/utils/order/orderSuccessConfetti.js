const CONFETTI_EVENT = 'order-success-confetti'
const CONFETTI_STORAGE_KEY = 'orderSuccessConfetti'
const CONFETTI_PENDING_VALUE = '1'

export const getOrderSuccessConfettiEventName = () => CONFETTI_EVENT
export const getOrderSuccessConfettiStorageKey = () => CONFETTI_STORAGE_KEY
export const getOrderSuccessConfettiPendingValue = () => CONFETTI_PENDING_VALUE

const debugConfetti = (message) => {
  if (import.meta.env.DEV) {
    console.debug(message)
  }
}

export const triggerOrderSuccessConfetti = () => {
  if (typeof window === 'undefined') return

  try {
    window.sessionStorage.setItem(CONFETTI_STORAGE_KEY, CONFETTI_PENDING_VALUE)
  } catch (_err) {
    // no-op
  }

  debugConfetti('order success confetti requested')
  window.dispatchEvent(new CustomEvent(CONFETTI_EVENT))
}
