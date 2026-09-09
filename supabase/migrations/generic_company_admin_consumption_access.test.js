import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const migration = readFileSync(
  new URL('./20260909143000_generic_company_admin_consumption_access.sql', import.meta.url),
  'utf8'
)

describe('generic company-admin consumption access', () => {
  it('derives report access from company_admins as well as legacy report permissions', () => {
    expect(migration).toContain('from public.company_admins ca')
    expect(migration).toContain("up.permission = 'consumption_report_viewer'")
    expect(migration).toContain("and public.has_consumption_report_access(c.slug)")
  })

  it('exposes every authorized company through the admin access context', () => {
    expect(migration).toContain("'consumption_report_companies', v_consumption_report_companies")
    expect(migration).toContain("'can_view_consumption_report', jsonb_array_length(v_consumption_report_companies) > 0")
    expect(migration).not.toContain("where c.slug in ('igarreta', 'isemar')")
  })

  it('creates a generic scoped consumption report RPC', () => {
    expect(migration).toContain('create or replace function public.get_company_consumption_report')
    expect(migration).toContain('with allowed_companies as (')
    expect(migration).toContain("o.status in ('pending', 'archived', 'post_report_extra')")
    expect(migration).toContain('grant execute on function public.get_company_consumption_report(date, date) to authenticated')
  })
})
