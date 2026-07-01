import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import DailyClosePanel from './DailyClosePanel.jsx'

const currentDir = dirname(fileURLToPath(import.meta.url))
const source = readFileSync(join(currentDir, 'DailyClosePanel.jsx'), 'utf8')

const buildStatus = (reportStatus) => ({
  overallStatus: { state: 'attention', label: 'Atención', tone: 'warning' },
  reportStatus,
  pendingCount: 0,
  inconsistencyCount: 0,
  totalOrders: 1,
  lastUpdatedLabel: '21:55',
  isExportFiltered: false,
  exportCompany: 'all',
  checklist: [
    {
      id: 'report',
      label: reportStatus.label,
      status: reportStatus.state === 'sent' ? 'ok' : reportStatus.state === 'failed' ? 'error' : 'warning',
      detail: reportStatus.lastRunLabel || 'Sin ejecución'
    }
  ]
})

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

  it.each([
    [{ state: 'sent', label: 'Reporte enviado', tone: 'success' }, 'Reporte automático: Enviado'],
    [{ state: 'pending', label: 'Reporte pendiente', tone: 'warning' }, 'Reporte automático: Pendiente'],
    [{ state: 'failed', label: 'Reporte falló', tone: 'error' }, 'Reporte automático: Falló'],
    [{ state: 'no_record', label: 'Sin ejecución registrada', tone: 'warning' }, 'Reporte automático: Sin registro']
  ])('renders explicit automatic report label for %s', (reportStatus, expectedLabel) => {
    const html = renderToStaticMarkup(React.createElement(DailyClosePanel, {
      status: buildStatus(reportStatus)
    }))

    expect(html).toContain(expectedLabel)
  })
})
