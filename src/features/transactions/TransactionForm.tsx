import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { PageHeader } from '../../components/chrome.tsx'
import { AmountField, KindToggle } from '../../components/fields.tsx'
import { CategoryGlyph, ConfirmDialog } from '../../components/display.tsx'
import { useAppState } from '../../context/AppState.tsx'
import {
  addTransaction,
  deleteTransaction,
  updateTransaction,
} from '../../db/ops.ts'
import { todayISO } from '../../lib/dates.ts'
import { centsToMajorString, parseMajorInput } from '../../lib/money.ts'
import { amountChips } from '../../lib/cash.ts'
import { BILL_CATEGORY_IDS } from '../../db/seed.ts'
import type { MoneyKind } from '../../db/types.ts'

const LAST_EXPENSE_KEY = 'tally.lastExpenseCategory'

export function TransactionForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { transactions, categories, currency } = useAppState()
  const existing = id ? transactions.find((t) => t.id === id) : undefined

  const [kind, setKind] = useState<MoneyKind>(existing?.kind ?? 'expense')
  const [amount, setAmount] = useState(
    existing ? centsToMajorString(existing.amountCents, currency) : '',
  )
  const [date, setDate] = useState(existing?.date ?? todayISO())
  const [categoryId, setCategoryId] = useState(existing?.categoryId ?? '')
  const [payee, setPayee] = useState(existing?.payee ?? '')
  const [notes, setNotes] = useState(existing?.notes ?? '')
  const [details, setDetails] = useState(Boolean(existing?.payee || existing?.notes))
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [saving, setSaving] = useState(false)
  const [hydrated, setHydrated] = useState(!id)

  useEffect(() => {
    if (!existing || hydrated) return
    setKind(existing.kind)
    setAmount(centsToMajorString(existing.amountCents, currency))
    setDate(existing.date)
    setCategoryId(existing.categoryId)
    setPayee(existing.payee)
    setNotes(existing.notes)
    setDetails(Boolean(existing.payee || existing.notes))
    setHydrated(true)
  }, [existing, hydrated, currency])

  const choices = useMemo(
    () =>
      categories.filter((c) => {
        if (c.archived || c.kind !== kind) return false
        if (
          kind === 'expense' &&
          (BILL_CATEGORY_IDS as readonly string[]).includes(c.id) &&
          c.id !== existing?.categoryId
        ) {
          return false
        }
        return true
      }),
    [categories, kind, existing?.categoryId],
  )

  useEffect(() => {
    if (existing || categoryId || kind !== 'expense') return
    const last = localStorage.getItem(LAST_EXPENSE_KEY)
    if (last && choices.some((c) => c.id === last)) setCategoryId(last)
    else if (choices.some((c) => c.id === 'pocket')) setCategoryId('pocket')
  }, [existing, categoryId, kind, choices])

  function onKind(next: MoneyKind) {
    setKind(next)
    const stillValid = categories.some(
      (c) => !c.archived && c.kind === next && c.id === categoryId,
    )
    if (!stillValid) setCategoryId('')
  }

  function addChip(n: number) {
    const current = parseMajorInput(amount, currency) ?? 0
    const bump = parseMajorInput(String(n), currency) ?? 0
    setAmount(centsToMajorString(current + bump, currency))
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const cents = parseMajorInput(amount, currency)
    if (cents === null || cents <= 0) {
      setError('Enter an amount greater than zero.')
      return
    }
    const cat = categoryId || choices[0]?.id
    if (!cat) {
      setError('Pick a category.')
      return
    }
    setSaving(true)
    setError('')
    try {
      if (existing) {
        await updateTransaction(existing.id, {
          kind,
          amountCents: cents,
          date,
          categoryId: cat,
          payee,
          notes,
        })
      } else {
        await addTransaction({
          kind,
          amountCents: cents,
          date,
          categoryId: cat,
          payee,
          notes,
        })
        if (kind === 'expense') localStorage.setItem(LAST_EXPENSE_KEY, cat)
      }
      navigate(-1)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save.')
    } finally {
      setSaving(false)
    }
  }

  const chips = amountChips(currency)

  return (
    <>
      <PageHeader title={existing ? 'Edit transaction' : 'Add transaction'} backTo="/" />
      <form className="stack-lg" onSubmit={(e) => void onSubmit(e)}>
        <KindToggle value={kind} onChange={onKind} />
        <AmountField value={amount} onChange={setAmount} currency={currency} />
        <div className="chips">
          {chips.map((n) => (
            <button key={n} type="button" className="chip" onClick={() => addChip(n)}>
              +{n}
            </button>
          ))}
        </div>
        <div className="field">
          <span className="label">Category</span>
          <div className="chips pack">
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
        {details ? (
          <>
            <div className="field">
              <label htmlFor="date">Date</label>
              <input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="payee">{kind === 'income' ? 'Source' : 'Payee'}</label>
              <input
                id="payee"
                value={payee}
                onChange={(e) => setPayee(e.target.value)}
                placeholder={kind === 'income' ? 'Work, refund…' : 'Optional'}
              />
            </div>
            <div className="field">
              <label htmlFor="notes">Notes</label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional"
              />
            </div>
          </>
        ) : (
          <button type="button" className="btn btn-ghost" onClick={() => setDetails(true)}>
            Date, payee, notes
          </button>
        )}
        {error ? <p className="error">{error}</p> : null}
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </button>
        {existing ? (
          <button
            type="button"
            className="btn btn-danger"
            onClick={() => setConfirmDelete(true)}
          >
            Delete
          </button>
        ) : null}
      </form>
      <ConfirmDialog
        open={confirmDelete}
        title="Delete this transaction?"
        body="This cannot be undone."
        confirmLabel="Delete"
        danger
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          if (!existing) return
          void deleteTransaction(existing.id).then(() => navigate('/transactions'))
        }}
      />
    </>
  )
}
