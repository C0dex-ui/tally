import { describe, expect, it } from 'vitest'
import {
  billPaymentsInPeriod,
  billShareBurden,
  dueDateForPeriod,
  dueDayFromIso,
  monthlyExpenseTotal,
  paycheckBillShare,
  responsibilityCounts,
  safeToSpendCents,
  statusForPeriod,
  unpaidExpenseCents,
} from './responsibilities.ts'
import type { ResponsibilityLike } from './responsibilities.ts'

const sep = { start: '2026-09-01', end: '2026-09-30' }
const custom = { start: '2026-08-15', end: '2026-09-14' }

const rent: ResponsibilityLike = {
  id: 'rent',
  kind: 'expense',
  amountCents: 150000,
  dueDay: 1,
  active: true,
  frequency: 'monthly',
}

const phone: ResponsibilityLike = {
  id: 'phone',
  kind: 'expense',
  amountCents: 8000,
  dueDay: 15,
  active: true,
  frequency: 'monthly',
}

const paycheck: ResponsibilityLike = {
  id: 'pay',
  kind: 'income',
  amountCents: 400000,
  dueDay: 1,
  active: true,
  frequency: 'monthly',
}

describe('dueDateForPeriod', () => {
  it('uses the due day in a calendar month', () => {
    expect(dueDateForPeriod(1, sep)).toBe('2026-09-01')
    expect(dueDateForPeriod(15, sep)).toBe('2026-09-15')
  })

  it('clamps day 31 into February', () => {
    expect(
      dueDateForPeriod(31, { start: '2026-02-01', end: '2026-02-28' }),
    ).toBe('2026-02-28')
  })

  it('picks the due day that lands inside a custom period', () => {
    expect(dueDateForPeriod(1, custom)).toBe('2026-09-01')
    expect(dueDateForPeriod(15, custom)).toBe('2026-08-15')
    expect(dueDateForPeriod(20, custom)).toBe('2026-08-20')
  })
})

describe('statusForPeriod', () => {
  it('is unpaid with no payment or skip', () => {
    expect(statusForPeriod(rent, [], [], sep)).toBe('unpaid')
  })

  it('is paid when a linked transaction is in range', () => {
    expect(
      statusForPeriod(
        rent,
        [{ recurringId: 'rent', date: '2026-09-03' }],
        [],
        sep,
      ),
    ).toBe('paid')
  })

  it('ignores payments outside the period', () => {
    expect(
      statusForPeriod(
        rent,
        [{ recurringId: 'rent', date: '2026-08-31' }],
        [],
        sep,
      ),
    ).toBe('unpaid')
  })

  it('is skipped when a skip matches the period start', () => {
    expect(
      statusForPeriod(
        rent,
        [{ recurringId: 'rent', date: '2026-09-03' }],
        [{ recurringId: 'rent', periodStart: '2026-09-01' }],
        sep,
      ),
    ).toBe('skipped')
  })

  it('is not due in the other half of a 15-day paycheck window', () => {
    const firstHalf = { start: '2026-09-01', end: '2026-09-15' }
    const laterBill = { ...phone, dueDay: 20 }
    expect(statusForPeriod(laterBill, [], [], firstHalf)).toBe('not_due')
    expect(unpaidExpenseCents([laterBill], [], [], firstHalf)).toBe(0)
  })
})

describe('unpaidExpenseCents / safeToSpend', () => {
  it('sums only unpaid active expenses', () => {
    const unpaid = unpaidExpenseCents(
      [rent, phone, paycheck],
      [{ recurringId: 'rent', date: '2026-09-01' }],
      [],
      sep,
    )
    expect(unpaid).toBe(8000)
  })

  it('does not double-count a paid bill in leftover', () => {
    const income = 400000
    const expenses = 150000
    const unpaid = unpaidExpenseCents(
      [rent],
      [{ recurringId: 'rent', date: '2026-09-01' }],
      [],
      sep,
    )
    expect(unpaid).toBe(0)
    expect(safeToSpendCents(income, expenses, unpaid)).toBe(250000)
  })

  it('reserves unpaid bills and ignores unpaid income', () => {
    const unpaid = unpaidExpenseCents([rent, paycheck], [], [], sep)
    expect(unpaid).toBe(150000)
    expect(safeToSpendCents(400000, 4250, unpaid)).toBe(245750)
  })

  it('does not reserve a skipped bill', () => {
    const unpaid = unpaidExpenseCents(
      [rent],
      [],
      [{ recurringId: 'rent', periodStart: '2026-09-01' }],
      sep,
    )
    expect(unpaid).toBe(0)
  })
})

describe('responsibilityCounts', () => {
  it('counts paid, unpaid, and skipped', () => {
    expect(
      responsibilityCounts(
        [rent, phone],
        [{ recurringId: 'rent', date: '2026-09-01' }],
        [{ recurringId: 'phone', periodStart: '2026-09-01' }],
        sep,
      ),
    ).toEqual({ paid: 1, unpaid: 0, skipped: 1, total: 2 })
  })
})

describe('paycheck bill share', () => {
  it('splits ₱11,000 monthly bills across two paydays', () => {
    const bills = [{ ...rent, amountCents: 1_100_000 }]
    const monthly = monthlyExpenseTotal(bills)
    expect(monthly).toBe(1_100_000)
    expect(paycheckBillShare(monthly)).toBe(550_000)
  })

  it('reserves the share, not the full month, when nothing is paid', () => {
    const share = 550_000
    const paid = 0
    const burden = billShareBurden(share, paid)
    expect(safeToSpendCents(2_000_000, 0, burden)).toBe(1_450_000)
  })

  it('does not subtract the share again after the full bill is paid', () => {
    const bills = [{ ...rent, amountCents: 1_100_000 }]
    const range = { start: '2026-09-01', end: '2026-09-15' }
    const paid = billPaymentsInPeriod(
      bills,
      [
        {
          recurringId: 'rent',
          date: '2026-09-01',
          amountCents: 1_100_000,
          kind: 'expense',
        },
      ],
      range,
    )
    expect(paid).toBe(1_100_000)
    const burden = billShareBurden(paycheckBillShare(1_100_000), paid)
    expect(burden).toBe(0)
    expect(safeToSpendCents(2_000_000, 1_100_000, burden)).toBe(900_000)
  })
})

describe('dueDayFromIso', () => {
  it('clamps to 1–28', () => {
    expect(dueDayFromIso('2026-01-31')).toBe(28)
    expect(dueDayFromIso('2026-09-12')).toBe(12)
  })
})
