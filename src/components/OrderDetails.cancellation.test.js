import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const source = readFileSync(new URL('./OrderDetails.jsx', import.meta.url), 'utf8')

describe('OrderDetails cancellation UX', () => {
  it('describes owner cancellation as a deletion instead of an archive', () => {
    expect(source).toContain('Esta acción cancela y elimina el pedido. No quedará archivado.')
    expect(source).not.toContain('El pedido quedará archivado para conservar el historial.')
  })

  it('leaves the deleted order detail instead of faking an archived state', () => {
    expect(source).toContain("navigate('/dashboard', { replace: true })")
    expect(source).not.toContain("setOrder((prev) => prev ? { ...prev, status: 'archived' } : prev)")
  })
})
