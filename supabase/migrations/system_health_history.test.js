import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { describe, expect, it } from 'vitest'

const currentDir = dirname(fileURLToPath(import.meta.url))
const migration = readFileSync(join(currentDir, '20260909150000_system_health_history.sql'), 'utf8')

describe('system health history migration', () => {
  it('persists incidents and exposes an admin-only dashboard', () => {
    expect(migration).toContain('create table if not exists public.system_health_events')
    expect(migration).toContain('create or replace function public.get_system_health_dashboard')
    expect(migration).toContain("if not public.is_admin() then")
    expect(migration).toContain('grant execute on function public.get_system_health_dashboard(integer) to authenticated')
    expect(migration).toContain('alter table public.system_health_events enable row level security')
  })

  it('records report and autoarchive failures without deleting resolved history', () => {
    expect(migration).toContain('create or replace function public.capture_daily_report_health_event()')
    expect(migration).toContain("'daily_archive_failed'")
    expect(migration).toContain("'daily_report_failed'")
    expect(migration).toContain("set status = 'resolved'")
    expect(migration).not.toContain('delete from public.system_health_events')
  })

  it('keeps the 2026-09-08 missing RPC incident retroactively', () => {
    expect(migration).toContain("'daily-archive:2026-09-08:rpc-missing'")
    expect(migration).toContain('function public.archive_orders_after_daily_report(date) does not exist')
    expect(migration).toContain("'42883'")
    expect(migration).toContain("drr.report_date = date '2026-09-08'")
  })

  it('keeps the 561-order historical pending recovery retroactively', () => {
    expect(migration).toContain("'stale-pending:2026-09-04-2026-09-09:manual-recovery'")
    expect(migration).toContain('561')
    expect(migration).toContain("jsonb_build_object('delivery_date', '2026-09-04', 'orders', 146)")
    expect(migration).toContain("jsonb_build_object('delivery_date', '2026-09-09', 'orders', 209)")
  })

  it('detects stale pending orders against the operational delivery date', () => {
    expect(migration).toContain("v_operational_date date := ((now() at time zone 'America/Argentina/Buenos_Aires')::date + 1)")
    expect(migration).toContain("o.status = 'pending'")
    expect(migration).toContain('o.delivery_date < v_operational_date')
    expect(migration).toContain("'stale_pending_orders'")
  })

  it('checks critical RPCs and schedules background health refreshes', () => {
    expect(migration).toContain("archive_orders_after_daily_report(date)")
    expect(migration).toContain("get_daily_report_run_status(date,text)")
    expect(migration).toContain("get_company_consumption_report(date,date)")
    expect(migration).toContain("'system-health-hourly'")
    expect(migration).toContain("'10 * * * *'")
  })

  it('never mutates order status while checking health', () => {
    expect(migration).not.toMatch(/update\s+public\.orders/i)
    expect(migration).not.toMatch(/delete\s+from\s+public\.orders/i)
  })
})
