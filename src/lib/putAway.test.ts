import { describe, expect, it } from 'vitest'
import { payPeriodsInCalendarMonth } from './payPeriod.ts'
import { plannedMonthlyCents, plannedPaycheckCents, setAsideThisPeriodCents } from './putAway.ts'

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

describe('put away audit', () => {
  const period = '2026-09-16'
  const pldt = {
    id: 'pldt',
    kind: 'expense' as const,
    amountCents: 170_000,
    dueDay: 18,
    active: true,
    frequency: 'monthly' as const,
  }
  const wifi = {
    id: 'wifi',
    kind: 'expense' as const,
    amountCents: 100_000,
    dueDay: 10,
    active: true,
    frequency: 'monthly' as const,
  }
  const filler = {
    id: 'filler',
    kind: 'expense' as const,
    amountCents: 2_634_700,
    dueDay: 1,
    active: true,
    frequency: 'monthly' as const,
  }
  const bills = [pldt, wifi, filler]

  it('audits ₱850 / ₱14,523.50 after PLDT is set aside', () => {
    expect(plannedPaycheckCents(bills, [])).toBe(1_452_350)
    expect(
      setAsideThisPeriodCents([{ periodStart: period, amountCents: 85_000 }], period),
    ).toBe(85_000)
  })

  it('adds only the numerator when a second bill is set aside', () => {
    const target = plannedPaycheckCents(bills, [])
    expect(target).toBe(1_452_350)
    expect(
      setAsideThisPeriodCents(
        [
          { periodStart: period, amountCents: 85_000 },
          { periodStart: period, amountCents: 50_000 },
        ],
        period,
      ),
    ).toBe(135_000)
    expect(plannedPaycheckCents(bills, [])).toBe(target)
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
