import { useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { PageHeader } from '../../components/chrome.tsx'
import { AmountField, KindToggle } from '../../components/fields.tsx'
import { CategoryGlyph, ConfirmDialog } from '../../components/display.tsx'
import { useAppState } from '../../context/AppState.tsx'
import { addRecurring, deleteRecurring, updateRecurring } from '../../db/ops.ts'
import { todayISO } from '../../lib/dates.ts'
import { centsToMajorString, parseMajorInput } from '../../lib/money.ts'
import { clampDueDay } from '../../lib/responsibilities.ts'
import type { Frequency, MoneyKind } from '../../db/types.ts'
import { FREQUENCIES } from '../../db/types.ts'

export function ResponsibilityForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { recurring, categories, currency } = useAppState()
  const existing = id ? recurring.find((r) => r.id === id) : undefined
  const [kind, setKind] = useState<MoneyKind>(existing?.kind ?? 'expense')
  const [name, setName] = useState(existing?.name ?? '')
  const [amount, setAmount] = useState(
    existing ? centsToMajorString(existing.amountCents, currency) : '',
  )
  const [categoryId, setCategoryId] = useState(existing?.categoryId ?? '')
  const [dueDay, setDueDay] = useState(String(existing?.dueDay ?? 1))
  const [frequency, setFrequency] = useState<Frequency>(existing?.frequency ?? 'monthly')
  const [nextDate, setNextDate] = useState(existing?.nextDate ?? todayISO())
  const [autoLog, setAutoLog] = useState(existing?.autoLog ?? false)
  const [error, setError] = useState('')
  const [confirm, setConfirm] = useState(false)

  const choices = categories.filter((c) => !c.archived && c.kind === kind)
  const day = clampDueDay(Number(dueDay))

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const cents = parseMajorInput(amount, currency)
    if (!name.trim()) {
      setError('Give it a name.')
      return
    }
    if (cents === null || cents <= 0) {
      setError('Enter an amount greater than zero.')
      return
    }
    const cat = categoryId || choices[0]?.id
    if (!cat) {
      setError('Pick a category.')
      return
    }
    try {
      const payload = {
        name: name.trim(),
        kind,
        amountCents: cents,
        categoryId: cat,
        frequency,
        dueDay: day,
        nextDate: frequency === 'monthly' ? nextDate : nextDate,
        autoLog: frequency === 'monthly' ? false : autoLog,
      }
      if (existing) {
        await updateRecurring(existing.id, payload)
      } else {
        await addRecurring({ ...payload, active: true })
      }
      navigate('/responsibilities')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save.')
    }
  }

  return (
    <>
      <PageHeader
        title={existing ? 'Edit bill' : 'New bill'}
        backTo="/responsibilities"
      />
      <form className="stack-lg" onSubmit={(e) => void onSubmit(e)}>
        <KindToggle
          value={kind}
          onChange={(k) => {
            setKind(k)
            setCategoryId('')
          }}
        />
        <div className="field">
          <label htmlFor="r-name">Name</label>
          <input
            id="r-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Rent, phone, insurance"
          />
        </div>
        <AmountField value={amount} onChange={setAmount} currency={currency} />
        <div className="field">
          <span className="label">Category</span>
          <div className="chips">
            {choices.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`chip ${categoryId === c.id ? 'on' : ''}`}
                onClick={() => setCategoryId(c.id)}
              >
                <CategoryGlyph category={c} />
                {c.name}
              </button>
            ))}
          </div>
        </div>
        <div className="field">
          <label htmlFor="due-day">Due on day of month</label>
          <input
            id="due-day"
            type="number"
            min={1}
            max={28}
            value={dueDay}
            onChange={(e) => setDueDay(e.target.value)}
          />

        </div>
        <div className="field">
          <label htmlFor="freq">Repeats</label>
          <select
            id="freq"
            value={frequency}
            onChange={(e) => setFrequency(e.target.value as Frequency)}
          >
            {FREQUENCIES.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>
        {frequency !== 'monthly' ? (
          <>
            <div className="field">
              <label htmlFor="next">Next date</label>
              <input
                id="next"
                type="date"
                value={nextDate}
                onChange={(e) => setNextDate(e.target.value)}
              />
            </div>
            <label className="list-row" style={{ border: 0 }}>
              <div className="grow">
                <div className="strong">Auto-log when due</div>
              </div>
              <input
                type="checkbox"
                checked={autoLog}
                onChange={(e) => setAutoLog(e.target.checked)}
              />
            </label>
          </>
        ) : null}
        {error ? <p className="error">{error}</p> : null}
        <button type="submit" className="btn btn-primary">
          Save
        </button>
        {existing ? (
          <button type="button" className="btn btn-danger" onClick={() => setConfirm(true)}>
            Delete
          </button>
        ) : null}
      </form>
      <ConfirmDialog
        open={confirm}
        title="Delete this bill?"
        body="Past payments stay in Activity."
        confirmLabel="Delete"
        danger
        onCancel={() => setConfirm(false)}
        onConfirm={() => {
          if (!existing) return
          void deleteRecurring(existing.id).then(() => navigate('/responsibilities'))
        }}
      />
    </>
  )
}
