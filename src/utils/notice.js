const DEFAULT_TIMEOUT_MS = {
  success: 4200,
  info: 4200,
  warning: 5500,
  error: 6500
}

const DEFAULT_TITLES = {
  success: 'Listo',
  info: 'Aviso',
  warning: 'Atención',
  error: 'No se pudo completar'
}

const recentNotices = new Map()
const DEDUPE_WINDOW_MS = 1200

const normalizeVariant = (variant = 'info') => {
  if (variant === 'success' || variant === 'error' || variant === 'warning' || variant === 'info') {
    return variant
  }
  return 'info'
}

const normalizeMessage = (message, variant) => {
  const fallback = variant === 'error'
    ? 'Ocurrió un error. Intentá de nuevo.'
    : 'Operación procesada.'

  const rawMessage = message instanceof Error
    ? message.message
    : typeof message === 'string'
      ? message
      : ''

  let normalized = rawMessage
    .replace(/^[✓✔]\s*/, '')
    .replace(/\s+/g, ' ')
    .trim()

  if (!normalized) return fallback

  if (variant === 'error') {
    normalized = normalized
      .replace(/^Error inesperado al\s+/i, 'No se pudo ')
      .replace(/^Error al\s+/i, 'No se pudo ')
      .replace(/^Error de\s+/i, 'No se pudo ')
      .replace(/^Error\s*:\s*/i, '')
  }

  return normalized
}

export const notify = (payload) => {
  if (typeof window === 'undefined') return
  const input = typeof payload === 'string'
    ? { message: payload }
    : (payload || {})

  const variant = normalizeVariant(input.variant)
  const detail = {
    ...input,
    variant,
    message: normalizeMessage(input.message, variant),
    title: input.title || DEFAULT_TITLES[variant],
    timeoutMs: input.timeoutMs ?? DEFAULT_TIMEOUT_MS[variant]
  }

  const dedupeKey = `${detail.variant}:${detail.title}:${detail.message}`
  const now = Date.now()
  const lastSeen = recentNotices.get(dedupeKey)
  if (lastSeen && now - lastSeen < DEDUPE_WINDOW_MS) return
  recentNotices.set(dedupeKey, now)

  for (const [key, timestamp] of recentNotices) {
    if (now - timestamp > DEFAULT_TIMEOUT_MS.error) recentNotices.delete(key)
  }

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
