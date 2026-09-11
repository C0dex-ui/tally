export const POCKET_CATEGORY_ID = 'pocket'
export const CASH_CHECK_IN_NOTES = 'Cash check-in'

export function isCashCheckIn(t: {
  notes: string
  categoryId: string
  kind: string
}): boolean {
  return t.kind === 'expense' && t.notes === CASH_CHECK_IN_NOTES
}

/** How much to put in the pocket lump so books match cash counted. */
export function pocketCentsForCashOnHand(
  incomeCents: number,
  expensesExceptPocketCents: number,
  cashOnHandCents: number,
): { pocketCents: number; extraCents: number } {
  const books = incomeCents - expensesExceptPocketCents
  const gap = books - cashOnHandCents
  if (gap >= 0) return { pocketCents: gap, extraCents: 0 }
  return { pocketCents: 0, extraCents: -gap }
}

export function amountChips(currency: string): number[] {
  if (currency === 'PHP' || currency === 'JPY' || currency === 'IDR') {
    return [20, 50, 100, 500, 1000]
  }
  if (currency === 'USD' || currency === 'CAD' || currency === 'AUD' || currency === 'EUR' || currency === 'GBP') {
    return [1, 5, 10, 20]
  }
  return [20, 50, 100, 500]
}
