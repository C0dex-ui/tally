import { describe, expect, it } from 'vitest'
import { whatsLeftFromCapital } from './leftover.ts'
import {
  hasSetAsideThisPeriod,
  monthlyBillsForAllotment,
  setAsideAmountCents,
  setAsideIdsThisPeriod,
} from './billSetAside.ts'
import { paycheckBillShare } from './responsibilities.ts'

const pldt = {
  id: 'pldt',
  active: true,
  kind: 'expense' as const,
  amountCents: 170_000,
  frequency: 'monthly' as const,
}

const rent = {
  id: 'rent',
  active: true,
  kind: 'expense' as const,
  amountCents: 1_000_000,
  frequency: 'monthly' as const,
}

const period = '2026-09-16'

describe('set aside this paycheck', () => {
  it('takes half of ₱1,700', () => {
    expect(setAsideAmountCents(170_000)).toBe(85_000)
    expect(setAsideAmountCents(170_000)).toBe(paycheckBillShare(170_000))
  })

  it('drops that bill from this paycheck’s leftover share', () => {
    const before = monthlyBillsForAllotment([pldt, rent], [], period)
    expect(paycheckBillShare(before)).toBe(585_000)

    const after = monthlyBillsForAllotment(
      [pldt, rent],
      [{ recurringId: 'pldt', periodStart: period }],
      period,
    )
    expect(after).toBe(1_000_000)
    expect(paycheckBillShare(after)).toBe(500_000)
    expect(setAsideIdsThisPeriod([{ recurringId: 'pldt', periodStart: period }], period).has('pldt')).toBe(
      true,
    )
  })

  it('keeps leftover the same when cash drops by the half and the bill leaves the share', () => {
    const capital = 1_600_000
    const share = paycheckBillShare(monthlyBillsForAllotment([pldt], [], period))
    const before = whatsLeftFromCapital({
      capitalCents: capital,
      billAllotmentCents: share,
      livingAfterCountCents: 0,
    })
    const amount = setAsideAmountCents(pldt.amountCents)
    const after = whatsLeftFromCapital({
      capitalCents: capital - amount,
      billAllotmentCents: paycheckBillShare(
        monthlyBillsForAllotment([pldt], [{ recurringId: 'pldt', periodStart: period }], period),
      ),
      livingAfterCountCents: 0,
    })
    expect(amount).toBe(85_000)
    expect(after).toBe(before)
  })

  it('blocks a second tap this paycheck and undo puts the share back', () => {
    const rows = [{ recurringId: 'pldt', periodStart: period }]
    expect(hasSetAsideThisPeriod(rows, 'pldt', period)).toBe(true)
    expect(hasSetAsideThisPeriod(rows, 'pldt', '2026-10-01')).toBe(false)

    const capitalAfter = 1_600_000 - 85_000
    const undone = whatsLeftFromCapital({
      capitalCents: capitalAfter + 85_000,
      billAllotmentCents: paycheckBillShare(monthlyBillsForAllotment([pldt], [], period)),
      livingAfterCountCents: 0,
    })
    expect(undone).toBe(
      whatsLeftFromCapital({
        capitalCents: 1_600_000,
        billAllotmentCents: 85_000,
        livingAfterCountCents: 0,
      }),
    )
  })
})
