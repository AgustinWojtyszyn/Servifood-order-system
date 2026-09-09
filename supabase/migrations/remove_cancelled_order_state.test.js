import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { describe, expect, it } from 'vitest'

const currentDir = dirname(fileURLToPath(import.meta.url))
const migration = readFileSync(
  join(currentDir, '20260909154000_remove_cancelled_order_state.sql'),
  'utf8'
)

describe('remove cancelled order state migration', () => {
  it('removes legacy cancelled rows and prevents the status from being persisted again', () => {
    expect(migration).toContain("delete from public.orders\nwhere status = 'cancelled'")
    expect(migration).toContain('add constraint orders_status_check')
    expect(migration).not.toContain("'cancelled',\n    'preparing'")
  })

  it('turns admin cancellation into a hard delete while preserving audit history', () => {
    expect(migration).toContain('create or replace function public.admin_cancel_order_with_reason')
    expect(migration).toContain("'persisted_status', null")
    expect(migration).toContain('delete from public.orders\n  where id = p_order_id')
  })

  it('keeps discount history when an empty order is deleted', () => {
    expect(migration).toContain('on delete set null')
    expect(migration).toContain("'deleted_after_discount', v_delete_empty_order")
    expect(migration).toContain('if v_delete_empty_order then')
    expect(migration).toContain('delete from public.orders where id = v_order.id')
  })
})
