import { describe, expect, it } from 'vitest'
import {
  daysUntil,
  lastNPayPeriods,
  normalizePaydays,
  payPeriodRangeForDate,
} from './payPeriod.ts'

describe('normalizePaydays', () => {
  it('orders two different days', () => {
    expect(normalizePaydays(16, 1)).toEqual([1, 16])
  })
})

describe('payPeriodRangeForDate 1st and 16th', () => {
  it('puts Sep 12 in the first half', () => {
    expect(payPeriodRangeForDate('2026-09-12', 1, 16)).toEqual({
      start: '2026-09-01',
      end: '2026-09-15',
    })
  })

  it('starts the second half on the 16th', () => {
    expect(payPeriodRangeForDate('2026-09-16', 1, 16)).toEqual({
      start: '2026-09-16',
      end: '2026-09-30',
    })
  })

  it('puts Sep 30 in the second half', () => {
    expect(payPeriodRangeForDate('2026-09-30', 1, 16)).toEqual({
      start: '2026-09-16',
      end: '2026-09-30',
    })
  })
})

describe('payPeriodRangeForDate 15th and last day', () => {
  it('before the 15th belongs to the previous last-day paycheck', () => {
    expect(payPeriodRangeForDate('2026-09-12', 15, 31)).toEqual({
      start: '2026-08-31',
      end: '2026-09-14',
    })
  })

  it('the 15th opens a new window through the day before month-end', () => {
    expect(payPeriodRangeForDate('2026-09-15', 15, 31)).toEqual({
      start: '2026-09-15',
      end: '2026-09-29',
    })
  })

  it('month-end payday runs until the next 15th', () => {
    expect(payPeriodRangeForDate('2026-09-30', 15, 31)).toEqual({
      start: '2026-09-30',
      end: '2026-10-14',
    })
  })
})

describe('daysUntil', () => {
  it('counts whole days to next payday', () => {
    expect(daysUntil('2026-09-12', '2026-09-16')).toBe(4)
    expect(daysUntil('2026-09-16', '2026-09-16')).toBe(0)
  })
})

describe('lastNPayPeriods', () => {
  it('walks backward by paycheck window', () => {
    const ranges = lastNPayPeriods('2026-09-12', 1, 16, 3)
    expect(ranges).toEqual([
      { start: '2026-08-01', end: '2026-08-15' },
      { start: '2026-08-16', end: '2026-08-31' },
      { start: '2026-09-01', end: '2026-09-15' },
    ])
  })
})
