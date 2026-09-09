import { describe, expect, it } from 'vitest'
import { safeError } from './error_utils'

describe('safeError', () => {
  it('preserves Supabase error fields instead of [object Object]', () => {
    const message = safeError({
      code: '42883',
      message: 'function public.archive_orders_after_daily_report(date) does not exist',
      details: null,
      hint: 'No function matches the given name and argument types.'
    })

    expect(message).toContain('code=42883')
    expect(message).toContain('archive_orders_after_daily_report')
    expect(message).toContain('hint=No function matches')
    expect(message).not.toContain('[object Object]')
  })

  it('keeps Error messages', () => {
    expect(safeError(new Error('boom'))).toBe('boom')
  })

  it('serializes otherwise unknown objects', () => {
    expect(safeError({ reason: 'unexpected' })).toBe('{"reason":"unexpected"}')
  })

  it('truncates long messages', () => {
    expect(safeError({ message: '1234567890' }, 8)).toBe('message=')
  })
})
