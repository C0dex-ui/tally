import { describe, expect, it } from 'vitest'
import {
  catchUpForGoal,
  catchUpPaidInRange,
  formatTimeToGoal,
  goalAllotmentCents,
  goalCatchUpThisPeriod,
  isEmergencyGoal,
  lastUse,
  missedMonths,
  paycheckGoalShare,
  repayPaidInRange,
  requireWithdrawPurpose,
  sortGoalEventsNewestFirst,
  timeToGoal,
  usesForGoal,
} from './goals.ts'

describe('isEmergencyGoal', () => {
  it('matches emergency in the name', () => {
    expect(isEmergencyGoal({ name: 'Emergency fund' })).toBe(true)
    expect(isEmergencyGoal({ name: 'Vacation' })).toBe(false)
  })
})

describe('usesForGoal', () => {
  it('defaults emergency uses when none are stored', () => {
    expect(usesForGoal({ name: 'Emergency fund' })).toContain('Medical')
  })

  it('uses a custom list when present', () => {
    expect(usesForGoal({ name: 'Emergency fund', allowedUses: ['Car'] })).toEqual(['Car'])
  })
})

describe('sortGoalEventsNewestFirst', () => {
  it('orders by date then id, newest first', () => {
    const sorted = sortGoalEventsNewestFirst([
      { id: 'a', date: '2026-09-01' },
      { id: 'c', date: '2026-09-12' },
      { id: 'b', date: '2026-09-12' },
    ])
    expect(sorted.map((e) => e.id)).toEqual(['c', 'b', 'a'])
  })
})

describe('lastUse', () => {
  it('returns the newest withdrawal purpose', () => {
    expect(
      lastUse([
        { amountCents: 5000, date: '2026-09-10', notes: 'Payday stash', purpose: '' },
        { amountCents: -2000, date: '2026-09-11', notes: '', purpose: 'Medical' },
        { amountCents: -500, date: '2026-09-03', notes: 'Repair', purpose: 'Urgent repair' },
      ]),
    ).toEqual({ date: '2026-09-11', purpose: 'Medical', amountCents: 2000 })
  })
})

describe('requireWithdrawPurpose', () => {
  it('rejects a blank purpose', () => {
    expect(() => requireWithdrawPurpose('  ')).toThrow(/used the fund for/)
  })
})

describe('paycheckGoalShare', () => {
  it('splits ₱10,000 a month across two paychecks', () => {
    expect(paycheckGoalShare(1_000_000)).toBe(500_000)
  })
})

describe('goalAllotmentCents', () => {
  it('reserves ₱5,000 and caps at what is still needed', () => {
    expect(
      goalAllotmentCents([
        {
          targetCents: 36_000_000,
          savedCents: 0,
          monthlyContributionCents: 1_000_000,
        },
      ]),
    ).toBe(500_000)
    expect(
      goalAllotmentCents([
        {
          targetCents: 36_000_000,
          savedCents: 35_800_000,
          monthlyContributionCents: 1_000_000,
        },
      ]),
    ).toBe(200_000)
  })
})

describe('timeToGoal', () => {
  it('takes 36 months / 72 paydays for ₱360k at ₱10k a month', () => {
    const eta = timeToGoal({
      remainingCents: 36_000_000,
      monthlyCents: 1_000_000,
      fromISO: '2026-09-20',
    })
    expect(eta).toMatchObject({ months: 36, paydays: 72, years: 3 })
    expect(eta?.reachISO).toBe('2029-09-20')
    expect(formatTimeToGoal(eta)).toBe('3 years · 72 paydays')
  })
})

describe('missedMonths', () => {
  it('keeps ₱2,000 due after an ₱8,000 July', () => {
    const rows = missedMonths({
      monthlyCents: 1_000_000,
      startedOn: '2026-07-01',
      today: '2026-09-20',
      contributions: [
        { amountCents: 800_000, date: '2026-07-05' },
        { amountCents: 1_000_000, date: '2026-08-05' },
      ],
    })
    expect(rows).toEqual([
      {
        month: '2026-07',
        expectedCents: 1_000_000,
        putCents: 800_000,
        stillDueCents: 200_000,
      },
    ])
  })

  it('ignores the open current month', () => {
    expect(
      missedMonths({
        monthlyCents: 1_000_000,
        startedOn: '2026-09-01',
        today: '2026-09-20',
        contributions: [{ amountCents: 500_000, date: '2026-09-01' }],
      }),
    ).toEqual([])
  })
})

describe('catchUpForGoal', () => {
  it('minuses leftover only for catch-up paid this paycheck', () => {
    const goal = { monthlyContributionCents: 1_000_000, startedOn: '2026-07-01' }
    const events = [
      { amountCents: 800_000, date: '2026-07-05' },
      { amountCents: 1_000_000, date: '2026-08-05' },
      { amountCents: 700_000, date: '2026-09-16' },
    ]
    expect(
      catchUpForGoal(goal, events, { start: '2026-09-16', end: '2026-09-30' }),
    ).toBe(200_000)
  })

  it('is zero when the miss is still unpaid', () => {
    expect(
      catchUpPaidInRange(
        [{ amountCents: 800_000, date: '2026-07-05' }],
        { start: '2026-09-16', end: '2026-09-30' },
        [
          {
            month: '2026-07',
            expectedCents: 1_000_000,
            putCents: 800_000,
            stillDueCents: 200_000,
          },
        ],
      ),
    ).toBe(0)
  })

  it('does not treat a repay as a short-month catch-up', () => {
    const goal = { monthlyContributionCents: 1_000_000, startedOn: '2026-07-01' }
    const events = [
      { amountCents: 800_000, date: '2026-07-05' },
      { amountCents: 1_000_000, date: '2026-08-05' },
      { amountCents: 200_000, date: '2026-09-16', notes: 'Repay Medical' },
    ]
    expect(
      catchUpForGoal(goal, events, { start: '2026-09-16', end: '2026-09-30' }),
    ).toBe(0)
  })
})

describe('repayPaidInRange', () => {
  it('minuses leftover for a ₱2,000 repay this paycheck', () => {
    expect(
      repayPaidInRange(
        [{ amountCents: 200_000, date: '2026-09-16', notes: 'Repay Medical' }],
        { start: '2026-09-16', end: '2026-09-30' },
      ),
    ).toBe(200_000)
  })

  it('is zero when the borrow is still unpaid', () => {
    expect(
      repayPaidInRange(
        [{ amountCents: -200_000, date: '2026-09-10', notes: '' }],
        { start: '2026-09-16', end: '2026-09-30' },
      ),
    ).toBe(0)
  })

  it('adds repay on top of a short-month catch-up without double-counting', () => {
    expect(
      goalCatchUpThisPeriod(
        [{ id: 'ef', monthlyContributionCents: 1_000_000, startedOn: '2026-07-01' }],
        [
          { goalId: 'ef', amountCents: 800_000, date: '2026-07-05' },
          { goalId: 'ef', amountCents: 1_000_000, date: '2026-08-05' },
          { goalId: 'ef', amountCents: 200_000, date: '2026-09-16' },
          { goalId: 'ef', amountCents: 200_000, date: '2026-09-16', notes: 'Repay Medical' },
        ],
        { start: '2026-09-16', end: '2026-09-30' },
      ),
    ).toBe(400_000)
  })
})
