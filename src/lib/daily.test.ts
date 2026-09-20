import { describe, expect, it } from 'vitest'
import {
  dailyBudget,
  livingPoolCents,
  livingSpendInRange,
  livingSpendOnDate,
  saveFloorCents,
} from './daily.ts'
import { CASH_CHECK_IN_NOTES, POCKET_CATEGORY_ID } from './cash.ts'

describe('saveFloorCents', () => {
  it('keeps 10% of leftover, not of a paycheck', () => {
    expect(saveFloorCents(566_700, 10)).toBe(56_670)
    expect(saveFloorCents(566_700, 5)).toBe(28_335)
    expect(saveFloorCents(566_700, 0)).toBe(0)
  })
})

describe('dailyBudget', () => {
  it('splits leftover after a 10% cushion across 4 days', () => {
    const leftover = 1_450_000
    const result = dailyBudget({
      leftoverBeforeTodayCents: leftover,
      savePercent: 10,
      daysUntilPayday: 4,
    })
    expect(result.floorCents).toBe(145_000)
    expect(result.spendableCents).toBe(1_305_000)
    expect(result.dailyMaxCents).toBe(326_250)
  })

  it('uses the full leftover when saving 0%', () => {
    const leftover = 1_450_000
    const result = dailyBudget({
      leftoverBeforeTodayCents: leftover,
      savePercent: 0,
      daysUntilPayday: 4,
    })
    expect(result.floorCents).toBe(0)
    expect(result.spendableCents).toBe(leftover)
    expect(result.dailyMaxCents).toBe(362_500)
  })

  it('uses a higher daily cap when saving only 5%', () => {
    const ten = dailyBudget({
      leftoverBeforeTodayCents: 1_450_000,
      savePercent: 10,
      daysUntilPayday: 4,
    })
    const five = dailyBudget({
      leftoverBeforeTodayCents: 1_450_000,
      savePercent: 5,
      daysUntilPayday: 4,
    })
    expect(five.dailyMaxCents).toBeGreaterThan(ten.dailyMaxCents)
  })

  it('is zero when leftover is empty', () => {
    const result = dailyBudget({
      leftoverBeforeTodayCents: 0,
      savePercent: 10,
      daysUntilPayday: 4,
    })
    expect(result.dailyMaxCents).toBe(0)
  })
})

describe('livingSpendOnDate', () => {
  it('counts only food, gasoline, and others', () => {
    const spent = livingSpendOnDate(
      [
        {
          date: '2026-09-12',
          kind: 'expense',
          amountCents: 50_000,
          notes: '',
          categoryId: 'food',
        },
        {
          date: '2026-09-12',
          kind: 'expense',
          amountCents: 30_000,
          notes: '',
          categoryId: 'gasoline',
        },
        {
          date: '2026-09-12',
          kind: 'expense',
          amountCents: 20_000,
          notes: '',
          categoryId: 'electric',
        },
        {
          date: '2026-09-12',
          kind: 'expense',
          amountCents: 1_100_000,
          recurringId: 'pldt',
          notes: '',
          categoryId: 'pldt',
        },
        {
          date: '2026-09-12',
          kind: 'expense',
          amountCents: 20_000,
          notes: CASH_CHECK_IN_NOTES,
          categoryId: POCKET_CATEGORY_ID,
        },
      ],
      '2026-09-12',
    )
    expect(spent).toBe(80_000)
  })
})

describe('living pool ignores bills', () => {
  const range = { start: '2026-09-01', end: '2026-09-15' }
  const rows = [
    {
      date: '2026-09-12',
      kind: 'expense' as const,
      amountCents: 50_000,
      notes: '',
      categoryId: 'food',
    },
    {
      date: '2026-09-01',
      kind: 'expense' as const,
      amountCents: 1_100_000,
      recurringId: 'pldt',
      notes: '',
      categoryId: 'pldt',
    },
  ]

  it('counts only food in the period', () => {
    expect(livingSpendInRange(rows, range)).toBe(50_000)
  })

  it('keeps leftover after paying the monthly bill', () => {
    const livingExToday = 0
    const pool = livingPoolCents(2_000_000, 550_000, livingExToday)
    const afterBill = dailyBudget({
      leftoverBeforeTodayCents: pool,
      savePercent: 10,
      daysUntilPayday: 4,
    })
    expect(pool).toBe(1_450_000)
    expect(afterBill.dailyMaxCents).toBe(326_250)
  })
})
