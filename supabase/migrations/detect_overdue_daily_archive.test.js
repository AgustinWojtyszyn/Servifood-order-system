import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { describe, expect, it } from 'vitest'

const currentDir = dirname(fileURLToPath(import.meta.url))
const migration = readFileSync(join(currentDir, '20260909151000_detect_overdue_daily_archive.sql'), 'utf8')

describe('overdue daily archive health detection', () => {
  it('flags sent reports that are still not archived after the grace period', () => {
    expect(migration).toContain("lower(coalesce(drr.status, '')) in ('sent', 'sent_empty')")
    expect(migration).toContain("drr.sent_at <= now() - interval '10 minutes'")
    expect(migration).toContain("lower(coalesce(v_run.archive_status, '')) <> 'archived'")
    expect(migration).toContain("'daily_archive_overdue'")
  })

  it('preserves the archive error and SQLSTATE when available', () => {
    expect(migration).toContain("nullif(v_run.archive_error, '')")
    expect(migration).toContain("like '%42883%'")
    expect(migration).toContain("like '%42703%'")
  })

  it('resolves the overdue incident once archive_status becomes archived', () => {
    expect(migration).toContain("set status = 'resolved'")
    expect(migration).toContain("lower(coalesce(drr.archive_status, '')) = 'archived'")
  })

  it('runs automatically every ten minutes without changing order statuses', () => {
    expect(migration).toContain("'system-health-autoarchive-watch'")
    expect(migration).toContain("'*/10 * * * *'")
    expect(migration).not.toMatch(/update\s+public\.orders/i)
    expect(migration).not.toMatch(/delete\s+from\s+public\.orders/i)
  })
})
