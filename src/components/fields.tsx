import { useLayoutEffect, useRef, type ChangeEvent } from 'react'
import type { MoneyKind } from '../db/types.ts'
import { formatMajorGrouped } from '../lib/money.ts'
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
  const inputRef = useRef<HTMLInputElement>(null)
  const caretRef = useRef<number | null>(null)

  useLayoutEffect(() => {
    const el = inputRef.current
    if (el == null || caretRef.current == null) return
    el.setSelectionRange(caretRef.current, caretRef.current)
    caretRef.current = null
  }, [value])

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const el = e.target
    const start = el.selectionStart ?? el.value.length
    const digitsLeft = el.value.slice(0, start).replace(/,/g, '').length
    const next = formatMajorGrouped(el.value, currency)
    let pos = 0
    let seen = 0
    while (pos < next.length && seen < digitsLeft) {
      if (next[pos] !== ',') seen += 1
      pos += 1
    }
    caretRef.current = pos
    onChange(next)
  }

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        ref={inputRef}
        inputMode="decimal"
        autoComplete="off"
        placeholder="0.00"
        value={value}
        onChange={handleChange}
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
