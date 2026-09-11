import { describe, expect, it } from 'vitest'
import { createOrdersService } from './ordersService'

const createCancellationSupabaseMock = ({ rpcResult, fallbackResult = { data: [{ id: 'order-1' }], error: null } }) => {
  const calls = []

  const deleteBuilder = {
    delete() {
      calls.push(['delete'])
      return this
    },
    eq(column, value) {
      calls.push(['eq', column, value])
      return this
    },
    select() {
      calls.push(['select'])
      return Promise.resolve(fallbackResult)
    }
  }

  return {
    calls,
    supabase: {
      rpc(name, args) {
        calls.push(['rpc', name, args])
        return Promise.resolve(rpcResult)
      },
      from(table) {
        calls.push(['from', table])
        return deleteBuilder
      }
    }
  }
}

describe('cancelOwnPendingOrder fallback', () => {
  it('does not bypass an expired 15-minute cancellation window', async () => {
    const rpcResult = {
      data: null,
      error: {
        status: 400,
        code: 'P0001',
        message: 'order_cancel_window_expired'
      }
    }
    const { supabase, calls } = createCancellationSupabaseMock({ rpcResult })
    const service = createOrdersService({ supabase })

    await expect(service.cancelOwnPendingOrder({ orderId: 'order-1' })).resolves.toEqual(rpcResult)

    expect(calls).toEqual([
      ['rpc', 'cancel_own_pending_order', { order_id: 'order-1' }]
    ])
  })

  it('does not fallback for a generic 404 error', async () => {
    const rpcResult = {
      data: null,
      error: {
        status: 404,
        code: 'PGRST116',
        message: 'The result contains 0 rows'
      }
    }
    const { supabase, calls } = createCancellationSupabaseMock({ rpcResult })
    const service = createOrdersService({ supabase })

    await expect(service.cancelOwnPendingOrder({ orderId: 'order-1' })).resolves.toEqual(rpcResult)

    expect(calls).toEqual([
      ['rpc', 'cancel_own_pending_order', { order_id: 'order-1' }]
    ])
  })

  it('uses the compatibility delete only when PostgREST reports the RPC is missing', async () => {
    const rpcResult = {
      data: null,
      error: {
        status: 404,
        code: 'PGRST202',
        message: 'Could not find the function public.cancel_own_pending_order in the schema cache'
      }
    }
    const fallbackResult = { data: [{ id: 'order-1' }], error: null }
    const { supabase, calls } = createCancellationSupabaseMock({ rpcResult, fallbackResult })
    const service = createOrdersService({ supabase })

    await expect(service.cancelOwnPendingOrder({ orderId: 'order-1' })).resolves.toEqual(fallbackResult)

    expect(calls).toEqual([
      ['rpc', 'cancel_own_pending_order', { order_id: 'order-1' }],
      ['from', 'orders'],
      ['delete'],
      ['eq', 'id', 'order-1'],
      ['eq', 'status', 'pending'],
      ['select']
    ])
  })
})
