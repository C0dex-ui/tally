import { useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { PageHeader } from '../../components/chrome.tsx'
import { AmountField } from '../../components/fields.tsx'
import { ConfirmDialog, MoneyText } from '../../components/display.tsx'
import { useAppState } from '../../context/AppState.tsx'
import {
  addGoal,
  archiveGoal,
  borrowFromFund,
  contributeToGoal,
  updateGoal,
  withdrawFromGoal,
} from '../../db/ops.ts'
import { todayISO, formatShortDate } from '../../lib/dates.ts'
import { centsToMajorString, formatMoney, parseMajorInput } from '../../lib/money.ts'
import {
  DEFAULT_EMERGENCY_USES,
  isEmergencyGoal,
  sortGoalEventsNewestFirst,
  usesForGoal,
} from '../../lib/goals.ts'

const COLORS = ['#2F6B4F', '#3E6B8A', '#C45C3E', '#C9A227', '#6B5B95', '#B4566C']

export function GoalForm() {
  const { id } = useParams()
  const isNew = !id || id === 'new'
  const navigate = useNavigate()
  const { goals, goalEvents, currency } = useAppState()
  const existing = !isNew ? goals.find((g) => g.id === id) : undefined
  const hasEmergency = goals.some((g) => !g.archived && isEmergencyGoal(g))

  const [name, setName] = useState(
    existing?.name ?? (!hasEmergency ? 'Emergency fund' : ''),
  )
  const [target, setTarget] = useState(
    existing ? centsToMajorString(existing.targetCents, currency) : '',
  )
  const [deadline, setDeadline] = useState(existing?.deadline ?? '')
  const [color, setColor] = useState(existing?.color ?? COLORS[0])
  const [move, setMove] = useState('')
  const [notes, setNotes] = useState('')
  const [purpose, setPurpose] = useState('')
  const [customUse, setCustomUse] = useState('')
  const [error, setError] = useState('')
  const [confirm, setConfirm] = useState(false)

  const uses = existing ? usesForGoal(existing) : usesForGoal({ name, allowedUses: [] })
  const events = existing
    ? sortGoalEventsNewestFirst(goalEvents.filter((e) => e.goalId === existing.id))
    : []

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      setError('Give it a name.')
      return
    }
    const cents = parseMajorInput(target, currency)
    if (cents === null || cents <= 0) {
      setError('Enter a target greater than zero.')
      return
    }
    try {
      if (existing) {
        await updateGoal(existing.id, {
          name: name.trim(),
          targetCents: cents,
          deadline: deadline || undefined,
          color,
          allowedUses: existing.allowedUses,
        })
        navigate('/goals')
      } else {
        const newId = await addGoal({
          name: name.trim(),
          targetCents: cents,
          deadline: deadline || undefined,
          color,
        })
        navigate(`/goals/${newId}`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save.')
    }
  }

  async function addUse() {
    if (!existing) return
    const label = customUse.trim()
    if (!label) return
    const next = [...usesForGoal(existing)]
    if (!next.includes(label)) next.push(label)
    await updateGoal(existing.id, { allowedUses: next })
    setCustomUse('')
  }

  async function removeUse(label: string) {
    if (!existing) return
    await updateGoal(existing.id, {
      allowedUses: usesForGoal(existing).filter((u) => u !== label),
    })
  }

  async function moveMoney(dir: 'in' | 'out' | 'borrow') {
    if (!existing) return
    const cents = parseMajorInput(move, currency)
    if (cents === null || cents <= 0) {
      setError('Enter an amount to move.')
      return
    }
    try {
      if (dir === 'in') {
        await contributeToGoal(existing.id, cents, todayISO(), notes)
      } else if (dir === 'borrow') {
        await borrowFromFund(existing.id, cents, todayISO(), purpose, notes)
      } else {
        await withdrawFromGoal(existing.id, cents, todayISO(), purpose, notes)
      }
      setMove('')
      setNotes('')
      setPurpose('')
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update goal.')
    }
  }

  return (
    <>
      <PageHeader title={existing ? existing.name : 'New goal'} backTo="/goals" />
      {existing ? (
        <section className="card" style={{ marginBottom: 16 }}>
          <p className="page-kicker">Saved</p>
          <p className="hero-amount pos">
            <MoneyText cents={existing.savedCents} currency={currency} />
          </p>
          <p className="tiny muted" style={{ marginTop: 4 }}>
            of {formatMoney(existing.targetCents, currency)}
          </p>
          <div style={{ height: 12 }} />
          <AmountField
            id="move"
            label="Amount"
            value={move}
            onChange={setMove}
            currency={currency}
          />
          {isEmergencyGoal(existing) || uses.length > 0 ? (
            <div className="field" style={{ marginTop: 12 }}>
              <span className="label">Used for</span>
              <div className="chips">
                {uses.map((u) => (
                  <button
                    key={u}
                    type="button"
                    className={`chip ${purpose === u ? 'on' : ''}`}
                    onClick={() => setPurpose(u)}
                  >
                    {u}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="field" style={{ marginTop: 12 }}>
              <label htmlFor="purpose">Used for</label>
              <input
                id="purpose"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder="Medical, repair…"
              />
            </div>
          )}
          <div className="field" style={{ marginTop: 12 }}>
            <label htmlFor="g-notes">Note (optional)</label>
            <input id="g-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <div className="btn-row" style={{ marginTop: 12 }}>
            <button type="button" className="btn btn-primary" onClick={() => void moveMoney('in')}>
              Add money
            </button>
            {isEmergencyGoal(existing) ? (
              <button type="button" className="btn btn-secondary" onClick={() => void moveMoney('borrow')}>
                Borrow
              </button>
            ) : (
              <button type="button" className="btn btn-secondary" onClick={() => void moveMoney('out')}>
                Use fund
              </button>
            )}
          </div>
          {isEmergencyGoal(existing) ? (
            <button
              type="button"
              className="btn btn-ghost"
              style={{ marginTop: 8 }}
              onClick={() => void moveMoney('out')}
            >
              Use (don’t pay back)
            </button>
          ) : null}
        </section>
      ) : null}

      {existing ? (
        <section className="card" style={{ marginBottom: 16 }}>
          <h2>Meant for</h2>
          <div className="chips" style={{ marginTop: 8 }}>
            {uses.map((u) => (
              <button key={u} type="button" className="chip on" onClick={() => void removeUse(u)}>
                {u} ×
              </button>
            ))}
          </div>
          <div className="field" style={{ marginTop: 12 }}>
            <label htmlFor="custom-use">Add a use</label>
            <input
              id="custom-use"
              value={customUse}
              onChange={(e) => setCustomUse(e.target.value)}
              placeholder="e.g. School emergency"
            />
          </div>
          <button type="button" className="btn btn-secondary" style={{ marginTop: 8 }} onClick={() => void addUse()}>
            Add to list
          </button>
          {uses.length === 0 ? (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() =>
                void updateGoal(existing.id, { allowedUses: [...DEFAULT_EMERGENCY_USES] })
              }
            >
              Use defaults
            </button>
          ) : null}
        </section>
      ) : null}

      {existing && events.length > 0 ? (
        <section className="card" style={{ marginBottom: 16 }}>
          <h2>Use log</h2>
          {events.map((e) => (
            <div key={e.id} className="list-row">
              <div className="grow">
                <div className="strong">
                  {e.amountCents < 0
                    ? `Used · ${e.purpose || e.notes || 'Unspecified'}`
                    : 'Added'}
                </div>
                <div className="tiny muted">
                  {formatShortDate(e.date)}
                  {e.amountCents < 0 && e.notes ? ` · ${e.notes}` : ''}
                  {e.amountCents > 0 && e.notes ? ` · ${e.notes}` : ''}
                </div>
              </div>
              <MoneyText
                cents={Math.abs(e.amountCents)}
                currency={currency}
                tone={e.amountCents < 0 ? 'out' : 'in'}
              />
            </div>
          ))}
        </section>
      ) : null}

      <form className="stack-lg" onSubmit={(e) => void onSubmit(e)}>
        <div className="field">
          <label htmlFor="g-name">Name</label>
          <input
            id="g-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Emergency fund"
          />
        </div>
        <AmountField
          id="target"
          label="Target"
          value={target}
          onChange={setTarget}
          currency={currency}
        />
        <div className="field">
          <label htmlFor="deadline">Deadline (optional)</label>
          <input
            id="deadline"
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
          />
        </div>
        <div className="field">
          <span className="label">Color</span>
          <div className="chips">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                className={`chip ${color === c ? 'on' : ''}`}
                onClick={() => setColor(c)}
                style={{ background: c, width: 36, minHeight: 36, padding: 0 }}
                aria-label={c}
              />
            ))}
          </div>
        </div>
        {error ? <p className="error">{error}</p> : null}
        <button type="submit" className="btn btn-primary">
          Save
        </button>
        {existing ? (
          <button type="button" className="btn btn-danger" onClick={() => setConfirm(true)}>
            Archive
          </button>
        ) : null}
      </form>
      <ConfirmDialog
        open={confirm}
        title="Archive this goal?"
        body="Hidden from the list. Amounts stay in the backup."
        confirmLabel="Archive"
        danger
        onCancel={() => setConfirm(false)}
        onConfirm={() => {
          if (!existing) return
          void archiveGoal(existing.id).then(() => navigate('/goals'))
        }}
      />
    </>
  )
}
