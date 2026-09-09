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

  it('filters recent incidents by all, active and resolved states', () => {
    expect(panelSource).toContain("const [incidentFilter, setIncidentFilter] = useState('all')")
    expect(panelSource).toContain("{ id: 'all', label: 'Todos'")
    expect(panelSource).toContain("{ id: 'active', label: 'Activos'")
    expect(panelSource).toContain("{ id: 'resolved', label: 'Resueltos'")
    expect(panelSource).toContain('aria-label="Filtrar incidentes"')
    expect(panelSource).toContain('aria-pressed={active}')
  })

  it('renders resolved incidents in a more compact layout', () => {
    expect(panelSource).toContain("isResolved ? 'p-2.5' : 'p-3'")
    expect(panelSource).toContain("isResolved ? 'text-[13px]' : 'text-sm'")
    expect(panelSource).toContain("isResolved ? 'mt-1.5 text-[11px] leading-4' : 'mt-2 text-xs'")
  })

  it('refreshes health periodically and manually', () => {
    expect(panelSource).toContain('setInterval(() => loadHealth({ silent: true }), 60000)')
    expect(panelSource).toContain('onClick={() => loadHealth()}')
    expect(panelSource).toContain('Revisar')
  })
})
