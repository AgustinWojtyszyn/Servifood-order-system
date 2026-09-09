import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { describe, expect, it } from 'vitest'

const currentDir = dirname(fileURLToPath(import.meta.url))
const migration = readFileSync(join(currentDir, '20260909161000_enable_orders_realtime.sql'), 'utf8')

describe('orders realtime publication migration', () => {
  it('adds public.orders to supabase_realtime only when missing', () => {
    expect(migration).toContain("pubname = 'supabase_realtime'")
    expect(migration).toContain("schemaname = 'public'")
    expect(migration).toContain("tablename = 'orders'")
    expect(migration).toContain('alter publication supabase_realtime add table public.orders')
  })
})
