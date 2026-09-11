import { describe, expect, it } from 'vitest'
import {
  addDays,
  addMonthsClamped,
  inRange,
  lastNMonthRanges,
  monthRangeForDate,
  parseISODate,
  toISODate,
} from './dates.ts'

describe('toISODate / parseISODate', () => {
  it('round-trips local calendar dates', () => {
    expect(toISODate(parseISODate('2026-09-12'))).toBe('2026-09-12')
  })
})

describe('addMonthsClamped', () => {
  it('clamps Jan 31 into February', () => {
    expect(addMonthsClamped('2026-01-31', 1)).toBe('2026-02-28')
    expect(addMonthsClamped('2028-01-31', 1)).toBe('2028-02-29')
  })
})

describe('monthRangeForDate', () => {
  it('uses the calendar month when start day is 1', () => {
    expect(monthRangeForDate('2026-09-12', 1)).toEqual({
      start: '2026-09-01',
      end: '2026-09-30',
    })
  })

  it('wraps a custom start day backward if we have not reached it yet', () => {
    expect(monthRangeForDate('2026-09-12', 15)).toEqual({
      start: '2026-08-15',
      end: '2026-09-14',
    })
  })

  it('starts a new period on the start day', () => {
    expect(monthRangeForDate('2026-09-15', 15)).toEqual({
      start: '2026-09-15',
      end: '2026-10-14',
    })
  })
})

describe('inRange', () => {
  it('is inclusive on both ends', () => {
    expect(inRange('2026-09-01', '2026-09-01', '2026-09-30')).toBe(true)
    expect(inRange('2026-09-30', '2026-09-01', '2026-09-30')).toBe(true)
    expect(inRange('2026-08-31', '2026-09-01', '2026-09-30')).toBe(false)
  })
})

describe('lastNMonthRanges', () => {
  it('returns oldest-first consecutive periods', () => {
    const ranges = lastNMonthRanges('2026-09-12', 1, 3)
    expect(ranges).toEqual([
      { start: '2026-07-01', end: '2026-07-31' },
      { start: '2026-08-01', end: '2026-08-31' },
      { start: '2026-09-01', end: '2026-09-30' },
    ])
  })
})

describe('addDays', () => {
  it('crosses month boundaries', () => {
    expect(addDays('2026-09-30', 1)).toBe('2026-10-01')
  })
})
