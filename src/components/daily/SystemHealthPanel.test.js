import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { describe, expect, it } from 'vitest'

const currentDir = dirname(fileURLToPath(import.meta.url))
const panelSource = readFileSync(join(currentDir, 'SystemHealthPanel.jsx'), 'utf8')
const dailyOrdersSource = readFileSync(join(currentDir, '..', 'DailyOrders.jsx'), 'utf8')

describe('SystemHealthPanel contract', () => {
  it('is only mounted for global admins from daily orders', () => {
    expect(dailyOrdersSource).toContain("import SystemHealthPanel from './daily/SystemHealthPanel'")
    expect(dailyOrdersSource).toContain('<SystemHealthPanel enabled={isGlobalAdmin} />')
  })

  it('shows current health, stale pending checks and RPC checks', () => {
    expect(panelSource).toContain('Salud del sistema')
    expect(panelSource).toContain('Pendientes vencidos:')
    expect(panelSource).toContain('RPC críticas:')
    expect(panelSource).toContain('Incidentes activos:')
    expect(panelSource).toContain('Chequeos críticos')
  })

  it('keeps a visible retrospective incident history', () => {
    expect(panelSource).toContain('Estado actual + incidentes históricos. No desaparecen al resolverlos.')
    expect(panelSource).toContain('Incidentes recientes')
    expect(panelSource).toContain('Resolución:')
    expect(panelSource).toContain('Código:')
    expect(panelSource).toContain('Pedidos afectados:')
  })

  it('refreshes health periodically and manually', () => {
    expect(panelSource).toContain('setInterval(() => loadHealth({ silent: true }), 60000)')
    expect(panelSource).toContain('onClick={() => loadHealth()}')
    expect(panelSource).toContain('Revisar')
  })
})
