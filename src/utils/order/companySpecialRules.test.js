import { describe, expect, it } from 'vitest'
import { hasGenneiaOptionRules, isPostreDeliveryDate } from './companySpecialRules'

describe('company special rules', () => {
  it('applies Genneia beverage and dessert rules to Genneia and DistroCuyo only', () => {
    expect(hasGenneiaOptionRules('genneia')).toBe(true)
    expect(hasGenneiaOptionRules({ slug: 'distro_cuyo' })).toBe(true)
    expect(hasGenneiaOptionRules({ slug: 'padrebueno' })).toBe(false)
    expect(hasGenneiaOptionRules('laja')).toBe(false)
  })

  it('enables postre for Tuesday and Thursday delivery dates', () => {
    expect(isPostreDeliveryDate('2026-07-07')).toBe(true)
    expect(isPostreDeliveryDate('2026-07-09')).toBe(true)
  })

  it('keeps Monday, Wednesday and Friday delivery dates on fruta', () => {
    expect(isPostreDeliveryDate('2026-07-06')).toBe(false)
    expect(isPostreDeliveryDate('2026-07-08')).toBe(false)
    expect(isPostreDeliveryDate('2026-07-10')).toBe(false)
  })
})
