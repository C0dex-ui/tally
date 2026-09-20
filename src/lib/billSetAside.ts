import { paycheckBillShare } from './responsibilities.ts'

export function setAsideAmountCents(monthlyCents: number): number {
  return paycheckBillShare(monthlyCents)
}

export function setAsideIdsThisPeriod(
  setAsides: { recurringId: string; periodStart: string }[],
  periodStart: string,
): Set<string> {
  return new Set(
    setAsides.filter((row) => row.periodStart === periodStart).map((row) => row.recurringId),
  )
}

export function hasSetAsideThisPeriod(
  setAsides: { recurringId: string; periodStart: string }[],
  recurringId: string,
  periodStart: string,
): boolean {
  return setAsides.some((row) => row.recurringId === recurringId && row.periodStart === periodStart)
}

export function monthlyBillsForAllotment(
  bills: {
    id: string
    active?: boolean
    kind: string
    amountCents: number
    frequency?: string
  }[],
  setAsides: { recurringId: string; periodStart: string }[],
  periodStart: string,
): number {
  const excluded = setAsideIdsThisPeriod(setAsides, periodStart)
  let sum = 0
  for (const item of bills) {
    if (excluded.has(item.id)) continue
    if (!item.active || item.kind !== 'expense') continue
    if ((item.frequency ?? 'monthly') !== 'monthly') continue
    sum += item.amountCents
  }
  return sum
}
