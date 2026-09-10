import { describe, expect, it } from 'vitest'
import { filterOrderableMenuItems, getMenuDisplay } from './menuDisplay'

const fullMenu = [
  { id: 'main', name: 'Menú principal', description: 'Milanesa con puré', slotIndex: 0 },
  { id: 'option-1', name: 'Opción 1', description: 'Pollo al horno', slotIndex: 1 },
  { id: 'option-2', name: 'Opción 2', description: 'Tarta de verdura', slotIndex: 2 },
  { id: 'option-3', name: 'Opción 3', description: 'Omelette', slotIndex: 3 },
  { id: 'option-4', name: 'Opción 4', description: 'Bife del día', slotIndex: 4 },
  { id: 'option-5', name: 'Opción 5', description: 'Ensalada mix de hojas', slotIndex: 5 },
  { id: 'option-6', name: 'Opción 6', description: 'Celíaco', slotIndex: 6 }
]

const labelsFor = (items, company) =>
  items.map((item, index) => getMenuDisplay(item, index, company).label)

describe('menu contract through option 6', () => {
  it('keeps Opción 1 through Opción 6 for regular companies', () => {
    const companySlugs = [
      'administracion_servifood',
      'ccp',
      'distro_cuyo',
      'genneia',
      'greif',
      'laja',
      'losberros',
      'molinos',
      'padrebueno',
      'placo'
    ]

    for (const companySlug of companySlugs) {
      const result = filterOrderableMenuItems(fullMenu, companySlug)
      expect(result).toHaveLength(7)
      expect(labelsFor(result, companySlug)).toEqual([
        'Menú principal',
        'Opción 1',
        'Opción 2',
        'Opción 3',
        'Opción 4',
        'Opción 5',
        'Opción 6'
      ])
    }
  })

  it('does not let legacy semantic settings truncate numbered slots 4 to 6', () => {
    const companyConfig = {
      slug: 'laja',
      menuItems: [
        { key: 'menu_principal', enabled: true },
        { key: 'opcion_1', enabled: true },
        { key: 'opcion_2', enabled: true },
        { key: 'opcion_3', enabled: true },
        { key: 'otros_menus', enabled: false },
        { key: 'dieta', enabled: false },
        { key: 'celiacos', enabled: false },
        { key: 'bife_lomo', enabled: false },
        { key: 'bife_pollo', enabled: false }
      ]
    }

    const result = filterOrderableMenuItems(fullMenu, companyConfig)

    expect(result.map((item) => item.id)).toEqual([
      'main',
      'option-1',
      'option-2',
      'option-3',
      'option-4',
      'option-5',
      'option-6'
    ])
  })

  it('keeps EPSE continuous through Opción 5 after removing its excluded source slot', () => {
    const result = filterOrderableMenuItems(fullMenu, 'epse')

    expect(result.map((item) => item.id)).toEqual([
      'main',
      'option-1',
      'option-2',
      'option-3',
      'option-5',
      'option-6'
    ])
    expect(labelsFor(result, 'epse')).toEqual([
      'Menú principal',
      'Opción 1',
      'Opción 2',
      'Opción 3',
      'Opción 4',
      'Opción 5'
    ])
  })

  it.each(['igarreta', 'isemar'])(
    'keeps %s continuous through Opción 5 and uses the daily salad description',
    (companySlug) => {
      const result = filterOrderableMenuItems(fullMenu, companySlug)
      const display = result.map((item, index) => getMenuDisplay(item, index, companySlug))

      expect(result.map((item) => item.id)).toEqual([
        'main',
        'option-1',
        'option-2',
        'option-3',
        'option-5',
        'option-6'
      ])
      expect(display.map((item) => item.label)).toEqual([
        'Menú principal',
        'Opción 1',
        'Opción 2',
        'Opción 3',
        'Opción 4',
        'Opción 5'
      ])
      expect(display[4].dish).toBe('Ensalada mix de hojas')
      expect(display[5].dish).toBe('Celíaco')
    }
  )
})
