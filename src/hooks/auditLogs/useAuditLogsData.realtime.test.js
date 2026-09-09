import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { describe, expect, it } from 'vitest'

const currentDir = dirname(fileURLToPath(import.meta.url))
const source = readFileSync(join(currentDir, 'useAuditLogsData.js'), 'utf8')

describe('useAuditLogsData realtime order count', () => {
  it('subscribes to public.orders postgres changes', () => {
    expect(source).toContain(".channel('audit-orders-count')")
    expect(source).toContain("'postgres_changes'")
    expect(source).toContain("{ event: '*', schema: 'public', table: 'orders' }")
  })

  it('removes the old 10 second polling loop', () => {
    expect(source).not.toContain('}, 10000)')
    expect(source).not.toContain('recuento cada 10s')
  })

  it('debounces realtime bursts and keeps a low-frequency fallback', () => {
    expect(source).toContain('}, 250)')
    expect(source).toContain('}, 60000)')
    expect(source).toContain("setOrdersRealtimeStatus('subscribed')")
    expect(source).toContain("setOrdersRealtimeStatus('fallback')")
  })

  it('refreshes when the tab becomes visible and removes the channel on cleanup', () => {
    expect(source).toContain("document.addEventListener('visibilitychange', handleVisibilityChange)")
    expect(source).toContain('void supabase.removeChannel(channel)')
  })
})
