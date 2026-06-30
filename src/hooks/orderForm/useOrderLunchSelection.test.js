import { describe, expect, it } from 'vitest'
import { getNextLunchSelection } from './useOrderLunchSelection'

describe('lunch selection', () => {
  it('replaces a main menu when selecting option 5 salad', () => {
    const next = getNextLunchSelection({ main: true }, 'option-5', true)

    expect(next).toEqual({ 'option-5': true })
  })

  it('replaces option 5 salad when selecting another main menu', () => {
    const next = getNextLunchSelection({ 'option-5': true }, 'main', true)

    expect(next).toEqual({ main: true })
  })

  it('allows option 5 salad as the only selected lunch item', () => {
    const next = getNextLunchSelection({}, 'option-5', true)

    expect(Object.values(next).filter(Boolean)).toHaveLength(1)
    expect(next['option-5']).toBe(true)
  })
})
