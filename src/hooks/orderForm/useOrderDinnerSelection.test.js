import { describe, expect, it } from 'vitest'
import { getNextDinnerSelection } from './useOrderDinnerSelection'

describe('dinner selection', () => {
  it('replaces option 5 salad when selecting a main menu', () => {
    const next = getNextDinnerSelection({ 'option-5': true }, 'main', true)

    expect(next).toEqual({ main: true })
  })

  it('replaces a main menu when selecting option 5 salad', () => {
    const next = getNextDinnerSelection({ main: true }, 'option-5', true)

    expect(next).toEqual({ 'option-5': true })
  })
})
