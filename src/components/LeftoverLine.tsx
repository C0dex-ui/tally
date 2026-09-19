import { useAppState } from '../context/AppState.tsx'
import { formatMoney } from '../lib/money.ts'

export function LeftoverLine() {
  const {
    hasCapital,
    whatsLeftCents,
    dailyMaxCents,
    currency,
    periodMode,
    daysUntilPayday,
  } = useAppState()

  if (!hasCapital || whatsLeftCents == null) {
    return <p className="tiny muted">Set cash left this {periodMode === 'pay' ? 'paycheck' : 'month'}</p>
  }

  const left = formatMoney(whatsLeftCents, currency)
  const daily = formatMoney(dailyMaxCents, currency)
  return (
    <p className="tiny muted">
      What’s left {left}
      {periodMode === 'pay'
        ? ` · ${daily}/day · ${daysUntilPayday}d`
        : ''}
    </p>
  )
}
