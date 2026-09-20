import { useState, type FormEvent } from 'react'
import { BillTabs } from './BillTabs.tsx'
import { AmountField } from '../../components/fields.tsx'
import { EmptyState, MoneyText } from '../../components/display.tsx'
import { useAppState } from '../../context/AppState.tsx'
import { addUtang, archiveUtang } from '../../db/ops.ts'
import { formatShortDate, todayISO } from '../../lib/dates.ts'
import { formatMoney, parseMajorInput } from '../../lib/money.ts'

export function UtangPage() {
  const { utangs, currency } = useAppState()
  const open = [...utangs.filter((u) => !u.archived)].sort(
    (a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id),
  )
  const owed = open.reduce((s, u) => s + u.amountCents, 0)
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function onAdd(e: FormEvent) {
    e.preventDefault()
    const cents = parseMajorInput(amount, currency)
    if (cents === null || cents <= 0) {
      setError('Enter how much you owe.')
      return
    }
    setSaving(true)
    setError('')
    try {
      await addUtang(name, cents, todayISO())
      setName('')
      setAmount('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="stack-lg">
      <BillTabs />
      <div>
        <p className="page-kicker">Audit log</p>
        <h1 className="page-title">Utang</h1>
      </div>

      <section className="card">
        <p className="page-kicker">Outstanding</p>
        <p className={`hero-amount ${owed > 0 ? 'neg' : 'pos'}`}>{formatMoney(owed, currency)}</p>
        <p className="tiny muted" style={{ marginTop: 8 }}>
          Personal amounts owed. Does not change remaining cash.
        </p>
      </section>

      <form className="card" onSubmit={(e) => void onAdd(e)}>
        <h2>Add</h2>
        <div className="field" style={{ marginTop: 8 }}>
          <label htmlFor="utang-name">Who</label>
          <input
            id="utang-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name"
          />
        </div>
        <AmountField
          id="utang-amount"
          label="Amount"
          value={amount}
          onChange={setAmount}
          currency={currency}
        />
        {error ? <p className="error">{error}</p> : null}
        <button type="submit" className="btn btn-primary" style={{ marginTop: 12 }} disabled={saving}>
          {saving ? 'Saving…' : 'Add to log'}
        </button>
      </form>

      {open.length === 0 ? (
        <EmptyState icon="wallet" title="No utang logged" body="Add the person and the amount owed." />
      ) : (
        <section className="card">
          <h2>Log</h2>
          {open.map((row) => (
            <div key={row.id}>
              <div className="list-row">
                <div className="grow">
                  <div className="strong">{row.name}</div>
                  <div className="tiny muted">{formatShortDate(row.date)}</div>
                </div>
                <MoneyText cents={row.amountCents} currency={currency} tone="out" />
              </div>
              <button
                type="button"
                className="btn btn-ghost"
                style={{ minHeight: 40, marginBottom: 8 }}
                onClick={() => void archiveUtang(row.id)}
              >
                Remove
              </button>
            </div>
          ))}
        </section>
      )}
    </div>
  )
}
