import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { describe, expect, it } from 'vitest'

const currentDir = dirname(fileURLToPath(import.meta.url))
const migration = readFileSync(join(currentDir, '20260909152000_reconcile_recovered_archive_health.sql'), 'utf8')

describe('recovered archive health reconciliation', () => {
  it('resolves archive incidents once no pending orders remain for the report date', () => {
    expect(migration).toContain('create or replace function public.reconcile_recovered_daily_archive_health_events()')
    expect(migration).toContain("e.event_type in ('daily_archive_failed', 'daily_archive_overdue')")
    expect(migration).toContain("o.status = 'pending'")
    expect(migration).toContain('o.delivery_date = e.report_date')
    expect(migration).toContain("set status = 'resolved'")
  })

  it('preserves original report failures instead of rewriting daily_report_runs', () => {
    expect(migration).not.toMatch(/update\s+public\.daily_report_runs/i)
    expect(migration).not.toMatch(/delete\s+from\s+public\.daily_report_runs/i)
    expect(migration).toContain('Se conserva el fallo original como evidencia histórica')
  })

  it('does not create duplicate overdue incidents after an explicit archive failure', () => {
    expect(migration).toContain("elsif lower(coalesce(v_run.archive_status, '')) = 'failed' then")
    expect(migration).toContain('ese incidente se conserva como registro principal')
  })

  it('prevents a recovered failed run from reopening while no pending orders exist', () => {
    expect(migration).toContain('v_pending_count integer := 0')
    expect(migration).toContain("case when v_pending_count > 0 then 'active' else 'resolved' end")
    expect(migration).toContain("when v_pending_count = 0 then 'El fallo se conserva como evidencia, pero ya no quedan pedidos pending para esa fecha.'")
  })

  it('runs reconciliation immediately after migration', () => {
    expect(migration).toContain('select public.refresh_overdue_daily_archive_health_events();')
    expect(migration).toContain('select public.reconcile_recovered_daily_archive_health_events();')
  })
})
