import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'

const migrationFiles = readdirSync(new URL('.', import.meta.url))
  .filter((file) => /^\d+.*\.sql$/.test(file))
  .sort()

const cancellationDefinitions = migrationFiles
  .map((file) => ({
    file,
    source: readFileSync(new URL(file, import.meta.url), 'utf8')
  }))
  .filter(({ source }) =>
    source.toLowerCase().includes('create or replace function public.cancel_own_pending_order')
  )

const latestCancellationDefinition = cancellationDefinitions.at(-1)

describe('latest owner cancellation RPC definition', () => {
  it('keeps the database-side 15 minute cancellation window', () => {
    expect(latestCancellationDefinition).toBeTruthy()
    expect(latestCancellationDefinition.file).toBe('20260911100000_restore_owner_cancel_window.sql')
    expect(latestCancellationDefinition.source).toContain("v_order.created_at < now() - interval '15 minutes'")
    expect(latestCancellationDefinition.source).toContain("raise exception 'order_cancel_window_expired'")
  })

  it('still limits cancellation to the owner pending order and hard-deletes it', () => {
    const source = latestCancellationDefinition.source
    expect(source).toContain('v_order.user_id is distinct from v_uid')
    expect(source).toContain("lower(coalesce(v_order.status, '')) <> 'pending'")
    expect(source).toContain('delete from public.orders')
    expect(source).toContain('user_id = v_uid')
    expect(source).toContain("lower(coalesce(status, '')) = 'pending'")
  })

  it('does not expose the RPC to anonymous callers', () => {
    const source = latestCancellationDefinition.source
    expect(source).toContain('revoke all on function public.cancel_own_pending_order(uuid) from anon')
    expect(source).toContain('grant execute on function public.cancel_own_pending_order(uuid) to authenticated')
  })
})
