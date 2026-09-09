import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const source = readFileSync(
  new URL('./index.ts', import.meta.url),
  'utf8'
)

describe('daily Igarreta + ISEMAR report contract', () => {
  it('uses the verified Marianela recipient and allows env override', () => {
    expect(source).toContain("IGARRETA_ISEMAR_REPORT_RECIPIENTS")
    expect(source).toContain("'marianelaborras@gmail.com'")
    expect(source).not.toContain("'mborras@imasa.com.ar'")
  })

  it('labels the combined report consistently', () => {
    expect(source).toContain('Reporte diario de consumo - Igarreta + ISEMAR')
    expect(source).toContain('Reporte diario de consumo Igarreta + ISEMAR -')
    expect(source).toContain('consumo_igarreta_isemar_')
  })
})
