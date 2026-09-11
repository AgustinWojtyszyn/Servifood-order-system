import { describe, expect, it } from 'vitest'
import { buildSafeIlikeOrFilter } from './postgrestSearch'

describe('buildSafeIlikeOrFilter', () => {
  it('quotes values that contain PostgREST separator characters', () => {
    expect(buildSafeIlikeOrFilter('Doe, Jane (Planta.1)', ['customer_name', 'location']))
      .toBe('customer_name.ilike."%Doe, Jane (Planta.1)%",location.ilike."%Doe, Jane (Planta.1)%"')
  })

  it('escapes quotes and backslashes inside the quoted value', () => {
    expect(buildSafeIlikeOrFilter('A "B" \\ C', ['comments']))
      .toBe('comments.ilike."%A \\"B\\" \\\\ C%"')
  })

  it('does not build a global filter for an empty search', () => {
    expect(buildSafeIlikeOrFilter('   ', ['customer_name'])).toBe('')
  })
})
