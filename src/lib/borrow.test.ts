import { describe, expect, it } from 'vitest'
import { outstandingBorrows, outstandingTotal, paidBorrows } from './borrow.ts'
import type { FundBorrow } from '../db/types.ts'

function row(partial: Partial<FundBorrow> & Pick<FundBorrow, 'id' | 'remainingCents'>): FundBorrow {
  return {
    goalId: 'ef',
    amountCents: 1000,
    purpose: 'Medical',
    date: '2026-09-12',
    notes: '',
    ...partial,
  }
}

describe('fund borrows', () => {
  it('sums what is still owed back', () => {
    const rows = [
      row({ id: 'a', remainingCents: 5000, date: '2026-09-10' }),
      row({ id: 'b', remainingCents: 0, date: '2026-09-11' }),
      row({ id: 'c', remainingCents: 2000, date: '2026-09-12' }),
    ]
    expect(outstandingTotal(rows)).toBe(7000)
    expect(outstandingBorrows(rows).map((b) => b.id)).toEqual(['c', 'a'])
    expect(paidBorrows(rows).map((b) => b.id)).toEqual(['b'])
  })
})
