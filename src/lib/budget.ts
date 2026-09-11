import { inRange } from './dates.ts'
import type { MoneyKind } from '../db/types.ts'

export interface DatedAmount {
  kind: MoneyKind
  amountCents: number
  date: string
}

export interface DatedCategoryAmount extends DatedAmount {
  categoryId: string
}

export interface DatedGoalEvent {
  amountCents: number
  date: string
}

export function monthSummary(
  transactions: DatedAmount[],
  range: { start: string; end: string },
  goalEvents: DatedGoalEvent[] = [],
): {
  incomeCents: number
  expenseCents: number
  leftoverCents: number
  savedCents: number
} {
  let incomeCents = 0
  let expenseCents = 0
  for (const t of transactions) {
    if (!inRange(t.date, range.start, range.end)) continue
    if (t.kind === 'income') incomeCents += t.amountCents
    else expenseCents += t.amountCents
  }
  let savedCents = 0
  for (const e of goalEvents) {
    if (!inRange(e.date, range.start, range.end)) continue
    savedCents += e.amountCents
  }
  return {
    incomeCents,
    expenseCents,
    leftoverCents: incomeCents - expenseCents,
    savedCents,
  }
}

export function spendByCategory(
  transactions: DatedCategoryAmount[],
  range: { start: string; end: string },
  kind: MoneyKind = 'expense',
): Map<string, number> {
  const map = new Map<string, number>()
  for (const t of transactions) {
    if (t.kind !== kind) continue
    if (!inRange(t.date, range.start, range.end)) continue
    map.set(t.categoryId, (map.get(t.categoryId) ?? 0) + t.amountCents)
  }
  return map
}

export function remaining(
  limitCents: number,
  spentCents: number,
): number | null {
  if (limitCents <= 0) return null
  return limitCents - spentCents
}

export function usagePct(limitCents: number, spentCents: number): number | null {
  if (limitCents <= 0) return null
  return spentCents / limitCents
}

export function overLimitCount(
  rows: { limitCents: number; spentCents: number }[],
): number {
  let n = 0
  for (const r of rows) {
    if (r.limitCents > 0 && r.spentCents > r.limitCents) n += 1
  }
  return n
}
