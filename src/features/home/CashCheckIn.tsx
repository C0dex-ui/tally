import { useState } from 'react'
import { AmountField } from '../../components/fields.tsx'
import { useAppState } from '../../context/AppState.tsx'
import { setPeriodCapital } from '../../db/ops.ts'
import { capitalFromLeftover } from '../../lib/leftover.ts'
import { centsToMajorString, formatMoney, parseMajorInput } from '../../lib/money.ts'

export function CashCheckIn() {
  const {
    currency,
    range,
    today,
    hasCapital,
    whatsLeftCents,
    billAllotmentCents,
    goalAllotmentCents,
    catchUpCents,
    livingAfterCountCents,
    periodMode,
  } = useAppState()
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const entered = parseMajorInput(value, currency)
  const preview =
    entered == null
      ? null
      : hasCapital
        ? {
            leftoverCents: entered,
            capitalCents: capitalFromLeftover({
              leftoverCents: entered,
              billAllotmentCents,
              goalAllotmentCents,
              catchUpCents,
              livingAfterCountCents,
            }),
          }
        : {
            leftoverCents: entered - billAllotmentCents,
            capitalCents: entered,
          }

  function openSheet() {
    setValue(
      hasCapital && whatsLeftCents != null
        ? centsToMajorString(whatsLeftCents, currency)
        : '',
    )
    setError('')
    setOpen(true)
  }

  async function save() {
    const cents = parseMajorInput(value, currency)
    if (cents === null || cents < 0) {
      setError(hasCapital ? 'Enter the remaining amount.' : 'Enter cash on hand.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const capitalCents = hasCapital
        ? capitalFromLeftover({
            leftoverCents: cents,
            billAllotmentCents,
            goalAllotmentCents,
            catchUpCents,
            livingAfterCountCents,
          })
        : cents
      await setPeriodCapital({
        capitalCents,
        date: today,
        periodStart: range.start,
        keepCountDate: hasCapital,
      })
      setOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <button type="button" className="btn btn-secondary" style={{ marginTop: 4 }} onClick={openSheet}>
        Cash on hand
      </button>
      {open ? (
        <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="cash-title">
          <div className="sheet">
            <h2 id="cash-title">Cash on hand</h2>
            <p className="tiny muted" style={{ margin: '0 0 12px' }}>
              {hasCapital
                ? `Currently ${formatMoney(whatsLeftCents ?? 0, currency)} after bills and goals`
                : 'Enter cash on hand this paycheck. Bills and goals are reserved next.'}
            </p>
            <AmountField
              id="cash-left"
              label={hasCapital ? 'Remaining' : 'Amount on hand'}
              value={value}
              onChange={setValue}
              currency={currency}
            />
            {preview ? (
              <p className="tiny muted" style={{ marginTop: 8 }}>
                Remaining {formatMoney(preview.leftoverCents, currency)}
                {periodMode === 'pay' && billAllotmentCents > 0
                  ? ` · bills ${formatMoney(billAllotmentCents, currency)}`
                  : ''}
                {periodMode === 'pay' && goalAllotmentCents > 0
                  ? ` · goals ${formatMoney(goalAllotmentCents, currency)}`
                  : ''}
                {periodMode === 'pay' && catchUpCents > 0
                  ? ` · catch-up ${formatMoney(catchUpCents, currency)}`
                  : ''}
              </p>
            ) : null}
            {error ? <p className="error">{error}</p> : null}
            <div className="btn-row" style={{ marginTop: 16 }}>
              <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={saving}
                onClick={() => void save()}
              >
                {saving ? 'Saving…' : 'Update'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
