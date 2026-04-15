import { formatDate, getTimeAgo } from '..'
import { ACTION_LABELS } from './auditLogConstants'

export const friendlyAction = (action) =>
  ACTION_LABELS[action] || (action ? action.replace(/_/g, ' ') : 'Acción')

export const formatTimestamp = (value) => {
  if (!value) return 'Sin fecha'
  const readable = formatDate(value, { hour12: false })
  return `${readable} (${getTimeAgo(value)})`
}

