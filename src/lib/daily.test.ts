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
  it('keeps 10% of a ₱20,000 paycheck', () => {
    expect(saveFloorCents(2_000_000, 10)).toBe(200_000)
    expect(saveFloorCents(2_000_000, 5)).toBe(100_000)
  })
})

describe('dailyBudget', () => {
  it('splits leftover after bills share and 10% save across 4 days', () => {
    const onHand = 1_450_000
    const result = dailyBudget({
      onHandBeforeTodayLivingCents: onHand,
      incomeCents: 2_000_000,
      savePercent: 10,
      daysUntilPayday: 4,
    })
    expect(result.floorCents).toBe(200_000)
    expect(result.spendableCents).toBe(1_250_000)
    expect(result.dailyMaxCents).toBe(312_500)
  })

  it('uses a higher daily cap when saving only 5%', () => {
    const ten = dailyBudget({
      onHandBeforeTodayLivingCents: 1_450_000,
      incomeCents: 2_000_000,
      savePercent: 10,
      daysUntilPayday: 4,
    })
    const five = dailyBudget({
      onHandBeforeTodayLivingCents: 1_450_000,
      incomeCents: 2_000_000,
      savePercent: 5,
      daysUntilPayday: 4,
    })
    expect(five.dailyMaxCents).toBeGreaterThan(ten.dailyMaxCents)
  })

  it('is zero when on hand is inside the savings floor', () => {
    const result = dailyBudget({
      onHandBeforeTodayLivingCents: 150_000,
      incomeCents: 2_000_000,
      savePercent: 10,
      daysUntilPayday: 4,
    })
    expect(result.dailyMaxCents).toBe(0)
  })
})

describe('livingSpendOnDate', () => {
  it('ignores bill payments and cash check-in', () => {
    const spent = livingSpendOnDate(
      [
        {
          date: '2026-09-12',
          kind: 'expense',
          amountCents: 50_000,
          notes: '',
          categoryId: 'groceries',
        },
        {
          date: '2026-09-12',
          kind: 'expense',
          amountCents: 1_100_000,
          recurringId: 'rent',
          notes: '',
          categoryId: 'housing',
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
      new Set(['rent']),
    )
    expect(spent).toBe(50_000)
  })
})

describe('living pool ignores bills', () => {
  const range = { start: '2026-09-01', end: '2026-09-15' }
  const bills = new Set(['rent'])
  const rows = [
    {
      date: '2026-09-12',
      kind: 'expense' as const,
      amountCents: 50_000,
      notes: '',
      categoryId: 'groceries',
    },
    {
      date: '2026-09-01',
      kind: 'expense' as const,
      amountCents: 1_100_000,
      recurringId: 'rent',
      notes: '',
      categoryId: 'housing',
    },
  ]

  it('counts only groceries in the period', () => {
    expect(livingSpendInRange(rows, range, bills)).toBe(50_000)
  })

  it('keeps daily max after paying the monthly bill', () => {
    const livingExToday = 0
    const pool = livingPoolCents(2_000_000, 550_000, livingExToday)
    const afterBill = dailyBudget({
      onHandBeforeTodayLivingCents: pool,
      incomeCents: 2_000_000,
      savePercent: 10,
      daysUntilPayday: 4,
    })
    expect(pool).toBe(1_450_000)
    expect(afterBill.dailyMaxCents).toBe(312_500)
  })
})
