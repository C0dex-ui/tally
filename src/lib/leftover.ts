export function whatsLeftFromCapital(input: {
  capitalCents: number
  billAllotmentCents: number
  livingAfterCountCents: number
  goalAllotmentCents?: number
  catchUpCents?: number
}): number {
  return (
    input.capitalCents -
    input.billAllotmentCents -
    (input.goalAllotmentCents ?? 0) -
    (input.catchUpCents ?? 0) -
    input.livingAfterCountCents
  )
}

export function capitalFromLeftover(input: {
  leftoverCents: number
  billAllotmentCents: number
  livingAfterCountCents: number
  goalAllotmentCents?: number
  catchUpCents?: number
}): number {
  return (
    input.leftoverCents +
    input.billAllotmentCents +
    (input.goalAllotmentCents ?? 0) +
    (input.catchUpCents ?? 0) +
    input.livingAfterCountCents
  )
}

export function hasPeriodCapital(
  stored: { capitalCents?: number; capitalPeriodStart?: string },
  periodStart: string,
): boolean {
  return (
    stored.capitalPeriodStart === periodStart &&
    stored.capitalCents != null &&
    Number.isFinite(stored.capitalCents)
  )
}
