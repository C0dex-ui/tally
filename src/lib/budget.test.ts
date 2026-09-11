import { describe, expect, it } from 'vitest'
import {
  monthSummary,
  overLimitCount,
  remaining,
  spendByCategory,
  usagePct,
} from './budget.ts'

const range = { start: '2026-09-01', end: '2026-09-30' }

describe('monthSummary', () => {
  it('subtracts expenses from income and ignores goal events as spend', () => {
    const summary = monthSummary(
      [
        { kind: 'income', amountCents: 400000, date: '2026-09-01' },
        { kind: 'expense', amountCents: 50000, date: '2026-09-10' },
        { kind: 'expense', amountCents: 20000, date: '2026-08-31' },
      ],
      range,
      [
        { amountCents: 10000, date: '2026-09-05' },
        { amountCents: 5000, date: '2026-08-01' },
      ],
    )
    expect(summary).toEqual({
      incomeCents: 400000,
      expenseCents: 50000,
      leftoverCents: 350000,
      savedCents: 10000,
    })
  })
})

describe('spendByCategory', () => {
  it('sums expenses in range by category', () => {
    const map = spendByCategory(
      [
        { kind: 'expense', amountCents: 100, date: '2026-09-02', categoryId: 'g' },
        { kind: 'expense', amountCents: 40, date: '2026-09-03', categoryId: 'g' },
        { kind: 'income', amountCents: 999, date: '2026-09-03', categoryId: 'g' },
        { kind: 'expense', amountCents: 10, date: '2026-10-01', categoryId: 'g' },
      ],
      range,
    )
    expect(map.get('g')).toBe(140)
  })
})

describe('remaining / usagePct', () => {
  it('treats a zero limit as no budget', () => {
    expect(remaining(0, 50)).toBeNull()
    expect(usagePct(0, 50)).toBeNull()
  })

  it('reports overspend as negative remaining', () => {
    expect(remaining(100, 150)).toBe(-50)
    expect(usagePct(100, 50)).toBe(0.5)
  })
})

describe('overLimitCount', () => {
  it('counts only categories that have a limit and exceeded it', () => {
    expect(
      overLimitCount([
        { limitCents: 100, spentCents: 120 },
        { limitCents: 0, spentCents: 999 },
        { limitCents: 50, spentCents: 50 },
      ]),
    ).toBe(1)
  })
})
