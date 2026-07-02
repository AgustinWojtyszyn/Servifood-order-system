const CONFETTI_EVENT = 'order-success-confetti'
const CONFETTI_STORAGE_KEY = 'orderSuccessConfetti'

export const getOrderSuccessConfettiEventName = () => CONFETTI_EVENT
export const getOrderSuccessConfettiStorageKey = () => CONFETTI_STORAGE_KEY

export const triggerOrderSuccessConfetti = () => {
  if (typeof window === 'undefined') return

  try {
    window.sessionStorage.setItem(CONFETTI_STORAGE_KEY, 'pending')
  } catch (_err) {
    // no-op
  }

  window.dispatchEvent(new CustomEvent(CONFETTI_EVENT))
}
