import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const migration = readFileSync(
  new URL('./20260909133000_close_empty_orders_after_discount.sql', import.meta.url),
  'utf8'
)

describe('close empty orders after discount migration', () => {
  it('clears custom responses when no operational units remain', () => {
    expect(migration).toContain("if greatest(coalesce(p_menu_total_after, 0), 0) = 0 then")
    expect(migration).toContain("return '[]'::jsonb")
  })

  it('cancels active orders emptied by a discount', () => {
    expect(migration).toContain("if v_order.status in ('pending', 'post_report_extra') then")
    expect(migration).toContain("v_new_status := 'cancelled'")
    expect(migration).toContain('status = v_new_status')
  })

  it('keeps traceability of the automatic close', () => {
    expect(migration).toContain("'status_before', v_before->>'status'")
    expect(migration).toContain("'status_after', v_order.status")
    expect(migration).toContain("'closed_after_discount'")
  })
})
