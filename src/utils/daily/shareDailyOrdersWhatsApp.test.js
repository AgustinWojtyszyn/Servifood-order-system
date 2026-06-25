import { describe, expect, it } from 'vitest'
import {
  buildWhatsAppShareUrl,
  normalizeWhatsAppLineBreaks
} from './shareDailyOrdersWhatsApp'

describe('share daily orders whatsapp', () => {
  it('preserva saltos de línea reales en la URL de WhatsApp', () => {
    const message = '*REPORTE*\n\n*Fecha:* 25/06/2026\n- Genneia: 13 pedidos'
    const normalized = normalizeWhatsAppLineBreaks(message)
    const url = buildWhatsAppShareUrl(message)

    expect(normalized).toContain('\r\n\r\n')
    expect(url).toContain('%0D%0A%0D%0A')
    expect(url).toContain('-%20Genneia%3A%2013%20pedidos')
    expect(url).not.toContain('*REPORTE*%20*Fecha')
  })
})
