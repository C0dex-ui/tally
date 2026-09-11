import { describe, expect, it } from 'vitest'
import { advanceNextDate, catchUpDates, isDue } from './recurring.ts'

describe('advanceNextDate', () => {
  it('advances weekly, monthly, and yearly', () => {
    expect(advanceNextDate('2026-09-12', 'weekly')).toBe('2026-09-19')
    expect(advanceNextDate('2026-09-12', 'monthly')).toBe('2026-10-12')
    expect(advanceNextDate('2026-09-12', 'yearly')).toBe('2027-09-12')
  })
})

describe('isDue', () => {
  it('is due on or before today when active', () => {
    expect(isDue('2026-09-12', '2026-09-12', true)).toBe(true)
    expect(isDue('2026-09-11', '2026-09-12', true)).toBe(true)
    expect(isDue('2026-09-13', '2026-09-12', true)).toBe(false)
    expect(isDue('2026-09-11', '2026-09-12', false)).toBe(false)
  })
})

describe('catchUpDates', () => {
  it('posts every missed monthly occurrence and returns the next date', () => {
    const result = catchUpDates('2026-06-01', 'monthly', '2026-09-12')
    expect(result.dates).toEqual([
      '2026-06-01',
      '2026-07-01',
      '2026-08-01',
      '2026-09-01',
    ])
    expect(result.nextDate).toBe('2026-10-01')
  })

  it('returns no dates when next is in the future', () => {
    const result = catchUpDates('2026-10-01', 'monthly', '2026-09-12')
    expect(result.dates).toEqual([])
    expect(result.nextDate).toBe('2026-10-01')
  })
})
