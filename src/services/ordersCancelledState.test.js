import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const canonicalService = readFileSync(new URL('./orders/ordersService.js', import.meta.url), 'utf8')
const compatibilityService = readFileSync(new URL('./orders.js', import.meta.url), 'utf8')
const legacyHook = readFileSync(new URL('../hooks/useOrders.js', import.meta.url), 'utf8')

describe('orders cancelled state model', () => {
  it('does not persist cancelled as an orders status', () => {
    const directCancelledWrite = /\.update\(\{[^}]*status:\s*['"]cancelled['"]/s

    expect(canonicalService).not.toMatch(directCancelledWrite)
    expect(compatibilityService).not.toMatch(directCancelledWrite)
    expect(canonicalService).not.toContain('deleteAllPendingOrders:')
    expect(canonicalService).not.toContain('cancelPreviousDaysPendingOrders:')
  })

  it('keeps admin cancellation routed through the audited hard-delete RPC', () => {
    expect(canonicalService).toContain("status === 'cancelled'")
    expect(canonicalService).toContain("'admin_cancel_order_with_reason'")
  })

  it('does not expose cancelled as a persisted-order statistic', () => {
    expect(compatibilityService).not.toContain("order.status === 'cancelled'")
    expect(legacyHook).not.toContain('cancelled: 0')
  })
})
