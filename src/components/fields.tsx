import type { MoneyKind } from '../db/types.ts'
import { Icon } from './Icon.tsx'

export function KindToggle({
  value,
  onChange,
}: {
  value: MoneyKind
  onChange: (kind: MoneyKind) => void
}) {
  return (
    <div className="seg" role="tablist" aria-label="Income or expense">
      <button
        type="button"
        className={value === 'expense' ? 'on' : ''}
        onClick={() => onChange('expense')}
      >
        Expense
      </button>
      <button
        type="button"
        className={value === 'income' ? 'on' : ''}
        onClick={() => onChange('income')}
      >
        Income
      </button>
    </div>
  )
}

export function AmountField({
  id = 'amount',
  label = 'Amount',
  value,
  onChange,
  currency,
}: {
  id?: string
  label?: string
  value: string
  onChange: (next: string) => void
  currency: string
}) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        inputMode="decimal"
        autoComplete="off"
        placeholder="0.00"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-describedby={`${id}-currency`}
      />
      <span id={`${id}-currency`} className="sr-only">
        {currency}
      </span>
    </div>
  )
}

export function PaydaySelect({
  id,
  label,
  value,
  onChange,
}: {
  id: string
  label: string
  value: number
  onChange: (day: number) => void
}) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      >
        {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
          <option key={d} value={d}>
            {d}
          </option>
        ))}
        <option value={31}>Last day of month</option>
      </select>
    </div>
  )
}

export function MonthSwitcher({
  label,
  onPrev,
  onNext,
  onReset,
}: {
  label: string
  onPrev: () => void
  onNext: () => void
  onReset: () => void
}) {
  return (
    <div className="month-switch">
      <button type="button" className="icon-btn" onClick={onPrev} aria-label="Previous period">
        <Icon name="chevronLeft" />
      </button>
      <button type="button" className="linkish" onClick={onReset} aria-label="Jump to this period">
        <b>{label}</b>
      </button>
      <button type="button" className="icon-btn" onClick={onNext} aria-label="Next period">
        <Icon name="chevronRight" />
      </button>
    </div>
  )
}
