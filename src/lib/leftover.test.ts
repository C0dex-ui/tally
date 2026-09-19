import { describe, expect, it } from 'vitest'
import { dailyBudget } from './daily.ts'
import {
  capitalFromLeftover,
  hasPeriodCapital,
  whatsLeftFromCapital,
} from './leftover.ts'

describe('whatsLeftFromCapital', () => {
  it('reserves half of ₱4,666 bills from ₱8,000 cash', () => {
    expect(
      whatsLeftFromCapital({
        capitalCents: 800_000,
        billAllotmentCents: 233_300,
        livingAfterCountCents: 0,
      }),
    ).toBe(566_700)
  })

  it('does not change leftover when rent is paid', () => {
    const before = whatsLeftFromCapital({
      capitalCents: 800_000,
      billAllotmentCents: 233_300,
      livingAfterCountCents: 0,
    })
    const afterPay = whatsLeftFromCapital({
      capitalCents: 800_000,
      billAllotmentCents: 233_300,
      livingAfterCountCents: 0,
    })
    expect(afterPay).toBe(before)
  })

  it('uses the worked example: ₱8,000 cash, ₱12,000 bills, ₱800 food → ₱1,200', () => {
    expect(
      whatsLeftFromCapital({
        capitalCents: 800_000,
        billAllotmentCents: 600_000,
        livingAfterCountCents: 80_000,
      }),
    ).toBe(120_000)
  })

  it('reserves ₱5,000 goal share from leftover', () => {
    expect(
      whatsLeftFromCapital({
        capitalCents: 800_000,
        billAllotmentCents: 0,
        goalAllotmentCents: 500_000,
        livingAfterCountCents: 0,
      }),
    ).toBe(300_000)
  })

  it('does not reserve an unpaid miss', () => {
    expect(
      whatsLeftFromCapital({
        capitalCents: 800_000,
        billAllotmentCents: 0,
        goalAllotmentCents: 500_000,
        catchUpCents: 0,
        livingAfterCountCents: 0,
      }),
    ).toBe(300_000)
  })

  it('does not reserve an unpaid borrow', () => {
    expect(
      whatsLeftFromCapital({
        capitalCents: 800_000,
        billAllotmentCents: 0,
        goalAllotmentCents: 500_000,
        catchUpCents: 0,
        livingAfterCountCents: 0,
      }),
    ).toBe(300_000)
  })

  it('subtracts ₱2,000 catch-up only when paid this period', () => {
    expect(
      whatsLeftFromCapital({
        capitalCents: 800_000,
        billAllotmentCents: 0,
        goalAllotmentCents: 500_000,
        catchUpCents: 200_000,
        livingAfterCountCents: 0,
      }),
    ).toBe(100_000)
  })
})

describe('capitalFromLeftover', () => {
  it('raises capital when leftover goes from ₱5,667 to ₱8,000', () => {
    expect(
      capitalFromLeftover({
        leftoverCents: 800_000,
        billAllotmentCents: 233_300,
        livingAfterCountCents: 0,
      }),
    ).toBe(1_033_300)
  })

  it('adds living back when leftover is set to ₱8,000 after a ₱500 grocery', () => {
    expect(
      capitalFromLeftover({
        leftoverCents: 800_000,
        billAllotmentCents: 233_300,
        livingAfterCountCents: 50_000,
      }),
    ).toBe(1_083_300)
  })

  it('round-trips with whatsLeftFromCapital', () => {
    const leftover = 120_000
    const capital = capitalFromLeftover({
      leftoverCents: leftover,
      billAllotmentCents: 600_000,
      livingAfterCountCents: 80_000,
    })
    expect(
      whatsLeftFromCapital({
        capitalCents: capital,
        billAllotmentCents: 600_000,
        livingAfterCountCents: 80_000,
      }),
    ).toBe(leftover)
  })

  it('round-trips with goal share and catch-up', () => {
    const leftover = 100_000
    const capital = capitalFromLeftover({
      leftoverCents: leftover,
      billAllotmentCents: 0,
      goalAllotmentCents: 500_000,
      catchUpCents: 200_000,
      livingAfterCountCents: 0,
    })
    expect(
      whatsLeftFromCapital({
        capitalCents: capital,
        billAllotmentCents: 0,
        goalAllotmentCents: 500_000,
        catchUpCents: 200_000,
        livingAfterCountCents: 0,
      }),
    ).toBe(leftover)
  })
})

describe('hasPeriodCapital', () => {
  it('is false in a new pay period', () => {
    expect(
      hasPeriodCapital(
        { capitalCents: 800_000, capitalPeriodStart: '2026-09-01' },
        '2026-09-16',
      ),
    ).toBe(false)
  })

  it('is true only for this period’s count', () => {
    expect(
      hasPeriodCapital(
        { capitalCents: 800_000, capitalPeriodStart: '2026-09-01' },
        '2026-09-01',
      ),
    ).toBe(true)
  })
})

describe('dailyBudget from leftover', () => {
  it('splits ₱5,667 leftover over 5 days after a 10% cushion', () => {
    const result = dailyBudget({
      leftoverBeforeTodayCents: 566_700,
      savePercent: 10,
      daysUntilPayday: 5,
    })
    expect(result.floorCents).toBe(56_670)
    expect(result.dailyMaxCents).toBe(102_006)
  })

  it('raises the daily cap when leftover is raised to ₱8,000', () => {
    const low = dailyBudget({
      leftoverBeforeTodayCents: 566_700,
      savePercent: 10,
      daysUntilPayday: 5,
    })
    const high = dailyBudget({
      leftoverBeforeTodayCents: 800_000,
      savePercent: 10,
      daysUntilPayday: 5,
    })
    expect(high.dailyMaxCents).toBeGreaterThan(low.dailyMaxCents)
  })
})
