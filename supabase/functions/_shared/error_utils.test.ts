import { assertEquals, assertStringIncludes } from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { safeError } from './error_utils.ts'

Deno.test('safeError preserves Supabase error fields instead of [object Object]', () => {
  const message = safeError({
    code: '42883',
    message: 'function public.archive_orders_after_daily_report(date) does not exist',
    details: null,
    hint: 'No function matches the given name and argument types.'
  })

  assertStringIncludes(message, 'code=42883')
  assertStringIncludes(message, 'archive_orders_after_daily_report')
  assertStringIncludes(message, 'hint=No function matches')
  assertEquals(message.includes('[object Object]'), false)
})

Deno.test('safeError keeps Error messages', () => {
  assertEquals(safeError(new Error('boom')), 'boom')
})

Deno.test('safeError serializes otherwise unknown objects', () => {
  assertEquals(safeError({ reason: 'unexpected' }), '{"reason":"unexpected"}')
})

Deno.test('safeError truncates long messages', () => {
  assertEquals(safeError({ message: '1234567890' }, 8), 'message=')
})
