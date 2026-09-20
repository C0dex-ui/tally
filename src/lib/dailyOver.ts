export function overCents(spentCents: number, dailyMaxCents: number): number {
  return Math.max(0, spentCents - Math.max(0, dailyMaxCents))
}

export function dailyOverRowId(date: string): string {
  return `over-${date}`
}
