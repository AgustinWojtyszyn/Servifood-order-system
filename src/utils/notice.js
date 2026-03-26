export const notify = (payload) => {
  if (typeof window === 'undefined') return
  const detail = typeof payload === 'string'
    ? { message: payload }
    : (payload || {})
  window.dispatchEvent(new CustomEvent('app-notice', { detail }))
}

export const notifySuccess = (message, options = {}) =>
  notify({ message, variant: 'success', ...options })

export const notifyError = (message, options = {}) =>
  notify({ message, variant: 'error', ...options })

export const notifyWarning = (message, options = {}) =>
  notify({ message, variant: 'warning', ...options })

export const notifyInfo = (message, options = {}) =>
  notify({ message, variant: 'info', ...options })
