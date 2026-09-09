const asArray = (value) => Array.isArray(value) ? value : []
const asCount = (value) => Number.isFinite(Number(value)) ? Number(value) : 0

export const normalizeSystemHealthDashboard = (payload = null, error = '') => {
  const errorMessage = String(error || '').trim()
  if (errorMessage) {
    return {
      state: 'unavailable',
      label: 'No disponible',
      tone: 'error',
      checkedAt: '',
      operationalDate: '',
      stalePendingCount: 0,
      stalePendingItems: 0,
      stalePendingDates: [],
      activeIncidentCount: 0,
      activeCriticalCount: 0,
      criticalRpcs: [],
      activeIncidents: [],
      recentIncidents: [],
      error: errorMessage
    }
  }

  const safe = payload && typeof payload === 'object' ? payload : {}
  const rawState = String(safe.state || '').toLowerCase()
  const state = ['ok', 'warning', 'critical'].includes(rawState) ? rawState : 'warning'

  return {
    state,
    label: state === 'ok' ? 'OK' : state === 'critical' ? 'Crítico' : 'Atención',
    tone: state === 'ok' ? 'success' : state === 'critical' ? 'error' : 'warning',
    checkedAt: String(safe.checked_at || ''),
    operationalDate: String(safe.operational_date || ''),
    stalePendingCount: asCount(safe.stale_pending_count),
    stalePendingItems: asCount(safe.stale_pending_items),
    stalePendingDates: asArray(safe.stale_pending_dates),
    activeIncidentCount: asCount(safe.active_incident_count),
    activeCriticalCount: asCount(safe.active_critical_count),
    criticalRpcs: asArray(safe.critical_rpcs),
    activeIncidents: asArray(safe.active_incidents),
    recentIncidents: asArray(safe.recent_incidents),
    error: ''
  }
}

export const getHealthyRpcCount = (checks = []) =>
  asArray(checks).filter((check) => check?.ok === true).length

export const formatHealthDateTime = (value = '') => {
  if (!value) return 'Sin fecha'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)

  return new Intl.DateTimeFormat('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

export const getIncidentStatusLabel = (incident = {}) =>
  String(incident?.status || '').toLowerCase() === 'resolved' ? 'Resuelto' : 'Activo'

export const getIncidentTone = (incident = {}) => {
  if (String(incident?.status || '').toLowerCase() === 'resolved') return 'success'
  return String(incident?.severity || '').toLowerCase() === 'critical' ? 'error' : 'warning'
}
