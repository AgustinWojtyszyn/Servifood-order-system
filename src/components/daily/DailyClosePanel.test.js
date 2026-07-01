import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { describe, expect, it } from 'vitest'

const currentDir = dirname(fileURLToPath(import.meta.url))
const source = readFileSync(join(currentDir, 'DailyClosePanel.jsx'), 'utf8')

describe('DailyClosePanel structure', () => {
  it('keeps the checklist collapsed behind a compact toggle', () => {
    expect(source).toContain('useState(false)')
    expect(source).toContain('Ver checklist')
    expect(source).toContain('Ocultar checklist')
    expect(source).toContain('aria-expanded={expanded}')
  })

  it('does not duplicate the primary header actions', () => {
    expect(source).not.toContain('Exportar Excel')
    expect(source).not.toContain('WhatsApp')
    expect(source).not.toContain('Exportar / Imprimir PDF')
    expect(source).not.toContain('Archivar pendientes')
    expect(source).not.toContain('Actualizar')
  })
})
