import { goalAllotmentCents, remainingGoalCents } from './goals.ts'
import { monthlyExpenseTotal, paycheckBillShare } from './responsibilities.ts'

export function plannedGoalMonthlyCents(
  goals: {
    targetCents: number
    savedCents: number
    monthlyContributionCents?: number
    archived?: boolean
  }[],
): number {
  return goals
    .filter((g) => !g.archived && remainingGoalCents(g) > 0)
    .reduce((s, g) => s + Math.max(0, g.monthlyContributionCents ?? 0), 0)
}

export function plannedMonthlyCents(
  bills: Parameters<typeof monthlyExpenseTotal>[0],
  goals: Parameters<typeof plannedGoalMonthlyCents>[0],
): number {
  return monthlyExpenseTotal(bills) + plannedGoalMonthlyCents(goals)
}

export function plannedPaycheckCents(
  bills: Parameters<typeof monthlyExpenseTotal>[0],
  goals: Parameters<typeof goalAllotmentCents>[0],
): number {
  return paycheckBillShare(monthlyExpenseTotal(bills)) + goalAllotmentCents(goals)
}

export function setAsideThisPeriodCents(
  setAsides: { periodStart: string; amountCents: number }[],
  periodStart: string,
): number {
  return setAsides
    .filter((row) => row.periodStart === periodStart)
    .reduce((sum, row) => sum + row.amountCents, 0)
}
