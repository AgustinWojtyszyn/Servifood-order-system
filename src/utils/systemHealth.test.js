import { describe, expect, it } from 'vitest'
import {
  formatIncidentMessage,
  getCanonicalRecentIncidents,
  getHealthyRpcCount,
  getIncidentStatusLabel,
  getIncidentTone,
  normalizeSystemHealthDashboard
} from './systemHealth'

describe('systemHealth utilities', () => {
  it('normalizes a healthy dashboard payload', () => {
    const health = normalizeSystemHealthDashboard({
      state: 'ok',
      checked_at: '2026-09-09T13:00:00Z',
      operational_date: '2026-09-10',
      stale_pending_count: 0,
      stale_pending_items: 0,
      active_incident_count: 0,
      active_critical_count: 0,
      critical_rpcs: [{ ok: true }, { ok: true }, { ok: true }],
      recent_incidents: [{ id: 'incident-1', status: 'resolved' }]
    })

    expect(health).toMatchObject({
      state: 'ok',
      label: 'OK',
      tone: 'success',
      operationalDate: '2026-09-10',
      stalePendingCount: 0,
      activeIncidentCount: 0
    })
    expect(health.recentIncidents).toHaveLength(1)
  })

  it('keeps critical stale pending information', () => {
    const health = normalizeSystemHealthDashboard({
      state: 'critical',
      stale_pending_count: 561,
      stale_pending_items: 563,
      stale_pending_dates: [{ delivery_date: '2026-09-09', orders: 209, items: 208 }],
      active_incident_count: 1,
      active_critical_count: 1
    })

    expect(health.state).toBe('critical')
    expect(health.stalePendingCount).toBe(561)
    expect(health.stalePendingItems).toBe(563)
    expect(health.stalePendingDates[0].delivery_date).toBe('2026-09-09')
  })

  it('reports unavailable state when the RPC fails', () => {
    const health = normalizeSystemHealthDashboard(null, 'RPC unavailable')
    expect(health).toMatchObject({
      state: 'unavailable',
      tone: 'error',
      error: 'RPC unavailable'
    })
  })

  it('counts healthy critical RPC checks', () => {
    expect(getHealthyRpcCount([{ ok: true }, { ok: false }, { ok: true }])).toBe(2)
  })

  it('formats active and resolved incidents consistently', () => {
    expect(getIncidentStatusLabel({ status: 'resolved' })).toBe('Resuelto')
    expect(getIncidentStatusLabel({ status: 'active' })).toBe('Activo')
    expect(getIncidentTone({ status: 'resolved', severity: 'critical' })).toBe('success')
    expect(getIncidentTone({ status: 'active', severity: 'critical' })).toBe('error')
  })

  it('replaces legacy object string messages with a readable fallback', () => {
    expect(formatIncidentMessage({
      event_type: 'daily_archive_failed',
      message: '[object Object]'
    })).toBe('El autoarchivado registró un error en la ejecución original; el detalle técnico no quedó serializado correctamente.')
  })

  it('extracts a readable message when the payload arrives as an object', () => {
    expect(formatIncidentMessage({
      event_type: 'daily_archive_failed',
      message: { code: '42883', message: 'function missing' }
    })).toBe('function missing')
  })

  it('keeps explicit missing-RPC evidence untouched', () => {
    expect(formatIncidentMessage({
      event_type: 'daily_archive_failed',
      message: 'function public.archive_orders_after_daily_report(date) does not exist'
    })).toBe('function public.archive_orders_after_daily_report(date) does not exist')
  })

  it('hides an overdue warning when the same report date has an explicit archive failure', () => {
    const incidents = getCanonicalRecentIncidents([
      { id: 'overdue', event_type: 'daily_archive_overdue', report_date: '2026-09-09' },
      { id: 'failed', event_type: 'daily_archive_failed', report_date: '2026-09-09' },
      { id: 'stale', event_type: 'stale_pending_orders', report_date: '2026-09-09' }
    ])

    expect(incidents.map((incident) => incident.id)).toEqual(['failed', 'stale'])
  })

  it('keeps an overdue warning when no terminal archive failure exists', () => {
    const incidents = getCanonicalRecentIncidents([
      { id: 'overdue', event_type: 'daily_archive_overdue', report_date: '2026-09-10' }
    ])

    expect(incidents.map((incident) => incident.id)).toEqual(['overdue'])
  })
})
