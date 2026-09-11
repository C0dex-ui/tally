export const DEFAULT_EMERGENCY_USES = [
  'Medical',
  'Lost income',
  'Urgent repair',
  'Family emergency',
  'Other',
] as const

export function isEmergencyGoal(goal: { name: string }): boolean {
  return /emergency/i.test(goal.name)
}

export function usesForGoal(goal: { name: string; allowedUses?: string[] }): string[] {
  if (goal.allowedUses && goal.allowedUses.length > 0) return goal.allowedUses
  if (isEmergencyGoal(goal)) return [...DEFAULT_EMERGENCY_USES]
  return []
}

export function sortGoalEventsNewestFirst<T extends { date: string; id: string }>(
  events: T[],
): T[] {
  return [...events].sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date)
    return b.id.localeCompare(a.id)
  })
}

export function lastUse(
  events: {
    amountCents: number
    date: string
    purpose?: string
    notes: string
    id?: string
  }[],
): { date: string; purpose: string; amountCents: number } | undefined {
  const used = [...events.filter((e) => e.amountCents < 0)].sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date)
    return (b.id ?? '').localeCompare(a.id ?? '')
  })
  const e = used[0]
  if (!e) return undefined
  const purpose = (e.purpose || e.notes || 'Unspecified').trim()
  return { date: e.date, purpose, amountCents: Math.abs(e.amountCents) }
}

export function requireWithdrawPurpose(purpose: string): string {
  const trimmed = purpose.trim()
  if (!trimmed) throw new Error('Say what you used the fund for.')
  return trimmed
}
