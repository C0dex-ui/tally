export function currencyFractionDigits(currency: string): number {
  try {
    return (
      new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
      }).resolvedOptions().maximumFractionDigits ?? 2
    )
  } catch {
    return 2
  }
}

export function majorToCents(major: number, currency = 'USD'): number {
  const digits = currencyFractionDigits(currency)
  const parsed = parseMajorInput(major.toFixed(digits + 1), currency)
  return parsed ?? 0
}

function stringToMinor(raw: string, digits: number): number | null {
  const m = /^(\d+)(?:\.(\d*))?$/.exec(raw)
  if (!m) return null
  const whole = m[1] ?? '0'
  const frac = m[2] ?? ''
  const padded = (frac + '0'.repeat(digits)).slice(0, digits)
  const extra = frac.slice(digits)
  let minor = Number(whole) * 10 ** digits + Number(padded || '0')
  if (extra !== '' && extra[0] >= '5') minor += 1
  if (!Number.isFinite(minor)) return null
  return minor
}

export function centsToMajor(cents: number, currency = 'USD'): number {
  return cents / 10 ** currencyFractionDigits(currency)
}

export function centsToMajorString(cents: number, currency = 'USD'): string {
  const digits = currencyFractionDigits(currency)
  return centsToMajor(cents, currency).toFixed(digits)
}

/** Parse a user-typed major-unit amount. Empty/invalid returns null. */
export function parseMajorInput(raw: string, currency = 'USD'): number | null {
  const cleaned = raw.trim().replace(/,/g, '')
  if (cleaned === '' || cleaned === '.' || cleaned === '-' || cleaned === '-.') {
    return null
  }
  if (cleaned.startsWith('-')) return null
  if (!Number.isFinite(Number(cleaned))) return null
  return stringToMinor(cleaned, currencyFractionDigits(currency))
}

export function formatMoney(
  cents: number,
  currency = 'USD',
  opts?: { signed?: boolean },
): string {
  const digits = currencyFractionDigits(currency)
  const value = cents / 10 ** digits
  const formatted = new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
  }).format(Math.abs(value))
  if (cents < 0) return `−${formatted}`
  if (opts?.signed && cents > 0) return `+${formatted}`
  return formatted
}

export const CURRENCIES = [
  'USD',
  'EUR',
  'GBP',
  'CAD',
  'AUD',
  'MXN',
  'JPY',
  'INR',
  'PHP',
  'BRL',
] as const
