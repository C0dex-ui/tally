import { inRange, parseISODate, toISODate } from './dates.ts'
import type { Frequency, MoneyKind } from '../db/types.ts'

export const STATUSES = ['paid', 'unpaid', 'skipped', 'not_due'] as const
export type ResponsibilityStatus = (typeof STATUSES)[number]

export interface PeriodRange {
  start: string
  end: string
}

export interface ResponsibilityLike {
  id: string
  kind: MoneyKind
  amountCents: number
  dueDay: number
  active: boolean
  frequency: Frequency
}

export interface DatedRecurring {
  recurringId?: string
  date: string
}

export interface PeriodSkip {
  recurringId: string
  periodStart: string
}

export function clampDueDay(day: number): number {
  return Math.min(28, Math.max(1, Math.trunc(day) || 1))
}

export function ordinal(n: number): string {
  const j = n % 10
  const k = n % 100
  if (j === 1 && k !== 11) return `${n}st`
  if (j === 2 && k !== 12) return `${n}nd`
  if (j === 3 && k !== 13) return `${n}rd`
  return `${n}th`
}

/** Calendar date for `dueDay` that falls inside the period, clamped to month length. */
export function dueDateForPeriod(dueDay: number, range: PeriodRange): string {
  const day = Math.min(31, Math.max(1, Math.trunc(dueDay) || 1))
  if (!range?.start || !range?.end) return range?.start || range?.end || '2026-01-01'
  const start = parseISODate(range.start)
  const end = parseISODate(range.end)
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1)
  const lastMonth = new Date(end.getFullYear(), end.getMonth(), 1)
  while (cursor <= lastMonth) {
    const last = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate()
    const iso = toISODate(
      new Date(cursor.getFullYear(), cursor.getMonth(), Math.min(day, last)),
    )
    if (inRange(iso, range.start, range.end)) return iso
    cursor.setMonth(cursor.getMonth() + 1)
  }
  const last = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate()
  return toISODate(
    new Date(start.getFullYear(), start.getMonth(), Math.min(day, last)),
  )
}

export function isDueInPeriod(dueDay: number, range: PeriodRange): boolean {
  return inRange(dueDateForPeriod(dueDay, range), range.start, range.end)
}

export function statusForPeriod(
  item: { id: string; dueDay: number },
  transactions: DatedRecurring[],
  skips: PeriodSkip[],
  range: PeriodRange,
): ResponsibilityStatus {
  if (
    skips.some(
      (s) => s.recurringId === item.id && inRange(s.periodStart, range.start, range.end),
    )
  ) {
    return 'skipped'
  }
  if (
    transactions.some(
      (t) => t.recurringId === item.id && inRange(t.date, range.start, range.end),
    )
  ) {
    return 'paid'
  }
  if (!isDueInPeriod(item.dueDay, range)) return 'not_due'
  return 'unpaid'
}

export function paymentInPeriod<T extends DatedRecurring>(
  itemId: string,
  transactions: T[],
  range: PeriodRange,
): T | undefined {
  return transactions.find(
    (t) => t.recurringId === itemId && inRange(t.date, range.start, range.end),
  )
}

export function monthlyExpenseTotal(items: ResponsibilityLike[]): number {
  let sum = 0
  for (const item of items) {
    if (!item.active || item.kind !== 'expense') continue
    if ((item.frequency ?? 'monthly') !== 'monthly') continue
    sum += item.amountCents
  }
  return sum
}

export function paycheckBillShare(monthlyTotalCents: number, paychecks = 2): number {
  if (paychecks <= 0) return monthlyTotalCents
  return Math.round(monthlyTotalCents / paychecks)
}

export function billPaymentsInPeriod(
  items: ResponsibilityLike[],
  transactions: (DatedRecurring & { amountCents: number; kind: MoneyKind })[],
  range: PeriodRange,
): number {
  const ids = new Set(
    items
      .filter(
        (i) =>
          i.active &&
          i.kind === 'expense' &&
          (i.frequency ?? 'monthly') === 'monthly',
      )
      .map((i) => i.id),
  )
  let sum = 0
  for (const t of transactions) {
    if (t.kind !== 'expense' || !t.recurringId) continue
    if (!ids.has(t.recurringId)) continue
    if (!inRange(t.date, range.start, range.end)) continue
    sum += t.amountCents
  }
  return sum
}

export function billShareBurden(shareCents: number, billPaidCents: number): number {
  return Math.max(0, shareCents - billPaidCents)
}

export function unpaidExpenseCents(
  items: ResponsibilityLike[],
  transactions: DatedRecurring[],
  skips: PeriodSkip[],
  range: PeriodRange,
): number {
  let sum = 0
  for (const item of items) {
    if (!item.active || item.kind !== 'expense') continue
    if (statusForPeriod(item, transactions, skips, range) === 'unpaid') {
      sum += item.amountCents
    }
  }
  return sum
}

export function safeToSpendCents(
  incomeCents: number,
  expenseCents: number,
  unpaidBillsCents: number,
): number {
  return incomeCents - expenseCents - unpaidBillsCents
}

export function responsibilityCounts(
  items: ResponsibilityLike[],
  transactions: DatedRecurring[],
  skips: PeriodSkip[],
  range: PeriodRange,
): { paid: number; unpaid: number; skipped: number; total: number } {
  let paid = 0
  let unpaid = 0
  let skipped = 0
  for (const item of items) {
    if (!item.active) continue
    const status = statusForPeriod(item, transactions, skips, range)
    if (status === 'not_due') continue
    if (status === 'paid') paid += 1
    else if (status === 'skipped') skipped += 1
    else unpaid += 1
  }
  return { paid, unpaid, skipped, total: paid + unpaid + skipped }
}

const statusRank: Record<ResponsibilityStatus, number> = {
  unpaid: 0,
  skipped: 1,
  paid: 2,
  not_due: 3,
}

export function sortResponsibilities<T extends ResponsibilityLike>(
  items: T[],
  transactions: DatedRecurring[],
  skips: PeriodSkip[],
  range: PeriodRange,
): T[] {
  return [...items].sort((a, b) => {
    const sa = statusForPeriod(a, transactions, skips, range)
    const sb = statusForPeriod(b, transactions, skips, range)
    if (sa !== sb) return statusRank[sa] - statusRank[sb]
    const da = dueDateForPeriod(a.dueDay, range)
    const db = dueDateForPeriod(b.dueDay, range)
    if (da !== db) return da.localeCompare(db)
    return a.id.localeCompare(b.id)
  })
}

export function dueDayFromIso(iso: string): number {
  try {
    return clampDueDay(parseISODate(iso).getDate())
  } catch {
    return 1
  }
}
