import { useState } from 'react'
import { AmountField } from '../../components/fields.tsx'
import { useAppState } from '../../context/AppState.tsx'
import { setCashOnHand } from '../../db/ops.ts'
import { centsToMajorString, formatMoney, parseMajorInput } from '../../lib/money.ts'

export function CashCheckIn({
  onHandCents,
}: {
  onHandCents: number
}) {
  const { currency, range } = useAppState()
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  function openSheet() {
    setValue(onHandCents > 0 ? centsToMajorString(onHandCents, currency) : '')
    setError('')
    setOpen(true)
  }

  async function save() {
    const cents = parseMajorInput(value, currency)
    if (cents === null) {
      setError('Enter what you have left.')
      return
    }
    setSaving(true)
    setError('')
    try {
      await setCashOnHand(cents, range)
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
        Cash left
      </button>
      {open ? (
        <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="cash-title">
          <div className="sheet">
            <h2 id="cash-title">Cash left</h2>
            <p className="tiny muted" style={{ margin: '0 0 12px' }}>
              Now {formatMoney(Math.max(0, onHandCents), currency)}
            </p>
            <AmountField
              id="cash-left"
              label="I actually have"
              value={value}
              onChange={setValue}
              currency={currency}
            />
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
