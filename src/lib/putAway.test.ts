import { describe, expect, it } from 'vitest'
import { payPeriodsInCalendarMonth } from './payPeriod.ts'
import { plannedMonthlyCents, plannedPaycheckCents } from './putAway.ts'

const rent = {
  id: 'bills',
  kind: 'expense' as const,
  amountCents: 1_800_000,
  dueDay: 20,
  active: true,
  frequency: 'monthly' as const,
}

const emergency = {
  targetCents: 36_000_000,
  savedCents: 0,
  monthlyContributionCents: 1_000_000,
}

describe('planned put away', () => {
  it('logs ₱14,000 this paycheck for ₱18k bills and ₱10k goal', () => {
    expect(plannedMonthlyCents([rent], [emergency])).toBe(2_800_000)
    expect(plannedPaycheckCents([rent], [emergency])).toBe(1_400_000)
  })

  it('ignores archived or finished goals', () => {
    expect(
      plannedPaycheckCents(
        [rent],
        [
          { ...emergency, archived: true },
          { ...emergency, savedCents: 36_000_000 },
        ],
      ),
    ).toBe(900_000)
  })
})

describe('payPeriodsInCalendarMonth', () => {
  it('lists both 1st and 16th terms in September', () => {
    expect(payPeriodsInCalendarMonth('2026-09', 1, 16)).toEqual([
      { start: '2026-09-01', end: '2026-09-15' },
      { start: '2026-09-16', end: '2026-09-30' },
    ])
  })
})
