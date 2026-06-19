import { describe, expect, it } from 'vitest'
import {
  hasDinnerOverrideInResponses,
  isDinnerOverrideValue
} from './orderBusinessRules'
import { canChooseCustomSide, isMainMenuOption, isSaladOption } from './orderCustomSideRules'

describe('dinner business rules', () => {
  it('detects dinner override values from response text', () => {
    expect(isDinnerOverrideValue('Opción cena veggie')).toBe(true)
    expect(isDinnerOverrideValue(['Agua', 'MP cena'])).toBe(true)
    expect(isDinnerOverrideValue('Bebida')).toBe(false)
  })

  it('detects dinner override responses by title or response', () => {
    expect(hasDinnerOverrideInResponses([
      { title: 'Opción de cena', response: 'Veggie' }
    ])).toBe(true)
    expect(hasDinnerOverrideInResponses([
      { title: 'Bebida', response: 'Agua' }
    ])).toBe(false)
  })
})

describe('custom side rules', () => {
  it('blocks main menu and salad-like options from custom side selection', () => {
    expect(isMainMenuOption({ slotIndex: 0 })).toBe(true)
    expect(isSaladOption({ name: 'Ensalada completa' })).toBe(true)
    expect(canChooseCustomSide({ slotIndex: 0, name: 'Milanesa' })).toBe(false)
    expect(canChooseCustomSide({ slotIndex: 2, name: 'Ensalada' })).toBe(false)
  })

  it('allows custom side for non-main non-salad options', () => {
    expect(canChooseCustomSide({ slotIndex: 2, name: 'Pollo al horno' })).toBe(true)
  })
})
