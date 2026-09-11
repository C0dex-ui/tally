import { isCashCheckIn } from './cash.ts'
import { inRange } from './dates.ts'
import type { MoneyKind } from '../db/types.ts'

type SpendRow = {
  date: string
  kind: MoneyKind
  amountCents: number
  recurringId?: string
  notes: string
  categoryId: string
}

export function isLivingPurchase(
  t: SpendRow,
  monthlyBillIds: Set<string>,
): boolean {
  if (t.kind !== 'expense') return false
  if (isCashCheckIn(t)) return false
  if (t.recurringId && monthlyBillIds.has(t.recurringId)) return false
  return true
}

export const SAVE_PERCENTS = [5, 8, 10] as const
export type SavePercent = (typeof SAVE_PERCENTS)[number]

export function clampSavePercent(n: number): SavePercent {
  if (n === 5 || n === 8 || n === 10) return n
  return 10
}

export function saveFloorCents(incomeCents: number, savePercent: number): number {
  const p = clampSavePercent(savePercent)
  return Math.round((Math.max(0, incomeCents) * p) / 100)
}

export function daysForDailyCap(daysUntilPayday: number): number {
  return Math.max(1, Math.trunc(daysUntilPayday) || 1)
}

export function dailyBudget(input: {
  onHandBeforeTodayLivingCents: number
  incomeCents: number
  savePercent: number
  daysUntilPayday: number
}): {
  floorCents: number
  spendableCents: number
  days: number
  dailyMaxCents: number
} {
  const floorCents = saveFloorCents(input.incomeCents, input.savePercent)
  const spendableCents = Math.max(0, input.onHandBeforeTodayLivingCents - floorCents)
  const days = daysForDailyCap(input.daysUntilPayday)
  const dailyMaxCents = Math.floor(spendableCents / days)
  return { floorCents, spendableCents, days, dailyMaxCents }
}

export function livingSpendOnDate(
  transactions: SpendRow[],
  dateISO: string,
  monthlyBillIds: Set<string>,
): number {
  let sum = 0
  for (const t of transactions) {
    if (t.date !== dateISO) continue
    if (!isLivingPurchase(t, monthlyBillIds)) continue
    sum += t.amountCents
  }
  return sum
}

export function livingSpendInRange(
  transactions: SpendRow[],
  range: { start: string; end: string },
  monthlyBillIds: Set<string>,
): number {
  let sum = 0
  for (const t of transactions) {
    if (!inRange(t.date, range.start, range.end)) continue
    if (!isLivingPurchase(t, monthlyBillIds)) continue
    sum += t.amountCents
  }
  return sum
}

export function livingPoolCents(
  incomeCents: number,
  billShareCents: number,
  livingSpendExceptTodayCents: number,
): number {
  return incomeCents - billShareCents - livingSpendExceptTodayCents
}
