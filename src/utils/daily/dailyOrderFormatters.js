import { LOCATION_BADGE_COLOR, STATUS_COLORS, STATUS_LABELS } from './dailyOrderConstants'

export const normalizeDishName = (dishName) => {
  if (!dishName) return dishName
  return dishName.replace(/Menú Principal/gi, 'Plato Principal')
}

export const getTomorrowDate = () => {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  return tomorrow.toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

export const formatTime = (dateString) => {
  return new Date(dateString).toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

export const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export const getStatusColor = (status) => {
  if (status === 'archived') return STATUS_COLORS.archived
  return STATUS_COLORS.pending
}

export const getStatusText = (status) => {
  if (status === 'archived') return STATUS_LABELS.archived
  return STATUS_LABELS.pending
}

export const getLocationBadgeColor = () => LOCATION_BADGE_COLOR
