import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { describe, expect, it } from 'vitest'

const currentDir = dirname(fileURLToPath(import.meta.url))
const source = readFileSync(join(currentDir, 'AuditLogsHealthTab.jsx'), 'utf8')

describe('AuditLogsHealthTab system health integration', () => {
  it('surfaces the persistent incident dashboard in the audit health tab', () => {
    expect(source).toContain("import SystemHealthPanel from '../daily/SystemHealthPanel'")
    expect(source).toContain('<SystemHealthPanel enabled defaultExpanded />')
  })

  it('shows incident history immediately without requiring an extra click', () => {
    expect(source).toContain('defaultExpanded')
  })

  it('keeps the old lightweight probe as complementary telemetry', () => {
    expect(source).toContain('Telemetría rápida')
    expect(source).toContain('Complementa el historial operativo de arriba.')
    expect(source).toContain('Qué mide este bloque')
  })

  it('does not present the old future-work list as the primary health experience', () => {
    expect(source).not.toContain('Mejoras sugeridas')
    expect(source).not.toContain('Crear monitor cron serverless')
    expect(source).not.toContain('Persistir histórico en `audit_logs` con acción `health_probe`')
  })
})
