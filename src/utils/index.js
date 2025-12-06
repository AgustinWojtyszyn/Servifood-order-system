// Utilidad para concatenar clases (classNames)
export function cn(...args) {
  return args.filter(Boolean).join(' ')
}
import DOMPurify from 'dompurify'

// Utilidades de validación y sanitización
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input
  return DOMPurify.sanitize(input, { ALLOWED_TAGS: [] }).trim()
}

export const sanitizeHtml = (html) => {
  if (typeof html !== 'string') return html
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u'],
    ALLOWED_ATTR: []
  })
}

// Utilidades de formato
export const formatDate = (dateString, options = {}) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    ...options
  })
}

export const formatCurrency = (amount, currency = 'ARS') => {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency
  }).format(amount)
}

// Utilidades de validación
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export const validatePassword = (password) => {
  return password && password.length >= 6
}

export const validatePhone = (phone) => {
  const phoneRegex = /^\+?[\d\s\-\(\)]{8,}$/
  return phoneRegex.test(phone)
}

// Utilidades de debounce y throttle
export const debounce = (func, wait) => {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

export const throttle = (func, limit) => {
  let inThrottle
  return function executedFunction(...args) {
    if (!inThrottle) {
      func.apply(this, args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}

// Utilidades de localStorage con error handling
export const safeLocalStorage = {
  get: (key, defaultValue = null) => {
    try {
      const item = localStorage.getItem(key)
      return item ? JSON.parse(item) : defaultValue
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error)
      return defaultValue
    }
  },

  set: (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
      return true
    } catch (error) {
      console.warn(`Error writing localStorage key "${key}":`, error)
      return false
    }
  },

  remove: (key) => {
    try {
      localStorage.removeItem(key)
      return true
    } catch (error) {
      console.warn(`Error removing localStorage key "${key}":`, error)
      return false
    }
  }
}

// Utilidades de sessionStorage
export const safeSessionStorage = {
  get: (key, defaultValue = null) => {
    try {
      const item = sessionStorage.getItem(key)
      return item ? JSON.parse(item) : defaultValue
    } catch (error) {
      console.warn(`Error reading sessionStorage key "${key}":`, error)
      return defaultValue
    }
  },

  set: (key, value) => {
    try {
      sessionStorage.setItem(key, JSON.stringify(value))
      return true
    } catch (error) {
      console.warn(`Error writing sessionStorage key "${key}":`, error)
      return false
    }
  },

  remove: (key) => {
    try {
      sessionStorage.removeItem(key)
      return true
    } catch (error) {
      console.warn(`Error removing sessionStorage key "${key}":`, error)
      return false
    }
  }
}

// Utilidades de arrays y objetos
export const groupBy = (array, key) => {
  return array.reduce((result, item) => {
    const groupKey = item[key]
    if (!result[groupKey]) {
      result[groupKey] = []
    }
    result[groupKey].push(item)
    return result
  }, {})
}

export const sortBy = (array, key, direction = 'asc') => {
  return [...array].sort((a, b) => {
    if (a[key] < b[key]) return direction === 'asc' ? -1 : 1
    if (a[key] > b[key]) return direction === 'asc' ? 1 : -1
    return 0
  })
}

// Utilidades de strings
export const capitalize = (str) => {
  if (!str) return str
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

export const truncate = (str, length = 100, suffix = '...') => {
  if (!str || str.length <= length) return str
  return str.substring(0, length - suffix.length) + suffix
}

// Utilidades de números
export const clamp = (num, min, max) => {
  return Math.min(Math.max(num, min), max)
}

export const roundTo = (num, decimals = 2) => {
  return Number(Math.round(num + 'e' + decimals) + 'e-' + decimals)
}

// Utilidades de tiempo
export const sleep = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export const isOrderEditable = (createdAt, minutesLimit = 10) => {
  const now = new Date()
  const created = new Date(createdAt)
  const diffInMinutes = (now - created) / (1000 * 60)
  return diffInMinutes <= minutesLimit
}

export const getTimeAgo = (dateString) => {
  const now = new Date()
  const date = new Date(dateString)
  const diffInSeconds = Math.floor((now - date) / 1000)

  const intervals = [
    { label: 'año', seconds: 31536000 },
    { label: 'mes', seconds: 2592000 },
    { label: 'día', seconds: 86400 },
    { label: 'hora', seconds: 3600 },
    { label: 'minuto', seconds: 60 },
    { label: 'segundo', seconds: 1 }
  ]

  for (const interval of intervals) {
    const count = Math.floor(diffInSeconds / interval.seconds)
    if (count >= 1) {
      return `hace ${count} ${interval.label}${count !== 1 ? 's' : ''}`
    }
  }

  return 'ahora mismo'
}

// Utilidades de errores
export const handleError = (error, context = '') => {
  console.error(`Error${context ? ` in ${context}` : ''}:`, error)

  // Aquí podrías enviar errores a un servicio de logging
  // logErrorToService(error, context)

  return {
    message: error.message || 'Ha ocurrido un error inesperado',
    code: error.code || 'UNKNOWN_ERROR',
    context
  }
}

// Utilidades de performance
export const measurePerformance = async (label, asyncFn) => {
  const start = performance.now()
  try {
    const result = await asyncFn()
    const end = performance.now()
    console.log(`${label} tomó ${roundTo(end - start, 2)}ms`)
    return result
  } catch (error) {
    const end = performance.now()
    console.error(`${label} falló después de ${roundTo(end - start, 2)}ms:`, error)
    throw error
  }
}
