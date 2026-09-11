import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const source = readFileSync(new URL('./DailyOrders.jsx', import.meta.url), 'utf8')

describe('DailyOrders historical date selection', () => {
  it('starts with all statuses visible', () => {
    expect(source).toContain("const [selectedStatus, setSelectedStatus] = useState('all')")
  })

  it('clears list filters before switching operational date', () => {
    expect(source).toContain("setSelectedLocation('all')")
    expect(source).toContain("setSelectedStatus('all')")
    expect(source).toContain("setSelectedDish('all')")
    expect(source).toContain("setSelectedSide('all')")
    expect(source).toContain('handleDeliveryDateChange(nextDate)')
  })

  it('routes date selectors through the unfiltered historical date handler', () => {
    expect(source.match(/onDeliveryDateChange=\{handleOperationalDateChange\}/g)?.length).toBeGreaterThanOrEqual(2)
  })
})
