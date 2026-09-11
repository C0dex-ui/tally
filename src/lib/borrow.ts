import type { FundBorrow } from '../db/types.ts'

export function outstandingBorrows(rows: FundBorrow[]): FundBorrow[] {
  return rows
    .filter((b) => b.remainingCents > 0)
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))
}

export function paidBorrows(rows: FundBorrow[]): FundBorrow[] {
  return rows
    .filter((b) => b.remainingCents <= 0)
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))
}

export function outstandingTotal(rows: FundBorrow[]): number {
  return outstandingBorrows(rows).reduce((s, b) => s + b.remainingCents, 0)
}
