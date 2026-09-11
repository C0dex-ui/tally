import { describe, expect, it } from 'vitest'
import {
  isEmergencyGoal,
  lastUse,
  requireWithdrawPurpose,
  sortGoalEventsNewestFirst,
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
