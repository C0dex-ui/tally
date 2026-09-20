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

export const DAILY_SPEND_CATEGORY_IDS = ['food', 'gasoline', 'others'] as const

export function isDailySpend(t: SpendRow): boolean {
  if (t.kind !== 'expense') return false
  if (isCashCheckIn(t)) return false
  return (DAILY_SPEND_CATEGORY_IDS as readonly string[]).includes(t.categoryId)
}

export function isLivingPurchase(t: SpendRow): boolean {
  return isDailySpend(t)
}

export const SAVE_PERCENTS = [0, 5, 8, 10] as const
export type SavePercent = (typeof SAVE_PERCENTS)[number]

export function clampSavePercent(n: number): SavePercent {
  if (n === 0 || n === 5 || n === 8 || n === 10) return n
  return 10
}

export function saveFloorCents(poolCents: number, savePercent: number): number {
  const p = clampSavePercent(savePercent)
  return Math.round((Math.max(0, poolCents) * p) / 100)
}

export function daysForDailyCap(daysUntilPayday: number): number {
  return Math.max(1, Math.trunc(daysUntilPayday) || 1)
}

export function dailyBudget(input: {
  leftoverBeforeTodayCents: number
  savePercent: number
  daysUntilPayday: number
}): {
  floorCents: number
  spendableCents: number
  days: number
  dailyMaxCents: number
} {
  const leftover = input.leftoverBeforeTodayCents
  const floorCents = saveFloorCents(leftover, input.savePercent)
  const spendableCents = Math.max(0, leftover - floorCents)
  const days = daysForDailyCap(input.daysUntilPayday)
  const dailyMaxCents = Math.floor(spendableCents / days)
  return { floorCents, spendableCents, days, dailyMaxCents }
}

export function livingSpendOnDate(
  transactions: SpendRow[],
  dateISO: string,
): number {
  let sum = 0
  for (const t of transactions) {
    if (t.date !== dateISO) continue
    if (!isDailySpend(t)) continue
    sum += t.amountCents
  }
  return sum
}

export function livingSpendInRange(
  transactions: SpendRow[],
  range: { start: string; end: string },
): number {
  let sum = 0
  for (const t of transactions) {
    if (!inRange(t.date, range.start, range.end)) continue
    if (!isDailySpend(t)) continue
    sum += t.amountCents
  }
  return sum
}

export function livingSpendOnOrAfter(
  transactions: SpendRow[],
  fromISO: string,
  range: { start: string; end: string },
): number {
  let sum = 0
  for (const t of transactions) {
    if (!inRange(t.date, range.start, range.end)) continue
    if (t.date < fromISO) continue
    if (!isDailySpend(t)) continue
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
