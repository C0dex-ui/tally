import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FundTabs } from './FundTabs.tsx'
import { EmptyState, MoneyText } from '../../components/display.tsx'
import { useAppState } from '../../context/AppState.tsx'
import { repayBorrow } from '../../db/ops.ts'
import { formatMonthKey, todayISO } from '../../lib/dates.ts'
import { formatMoney } from '../../lib/money.ts'
import {
  isEmergencyGoal,
  missedForGoal,
  missedTotal,
} from '../../lib/goals.ts'
import { outstandingBorrows, outstandingTotal } from '../../lib/borrow.ts'

export function MissedPage() {
  const { goals, goalEvents, fundBorrows, currency, today } = useAppState()
  const [payingId, setPayingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const active = [...goals.filter((g) => !g.archived)].sort((a, b) => {
    const ae = isEmergencyGoal(a) ? 0 : 1
    const be = isEmergencyGoal(b) ? 0 : 1
    if (ae !== be) return ae - be
    return a.name.localeCompare(b.name)
  })
  const rows = active
    .map((g) => {
      const events = goalEvents.filter((e) => e.goalId === g.id)
      const missed = missedForGoal(g, events, today)
      return { goal: g, missed, due: missedTotal(missed) }
    })
    .filter((r) => r.due > 0)
  const openBorrows = outstandingBorrows(fundBorrows)
  const borrowDue = outstandingTotal(fundBorrows)
  const due = rows.reduce((s, r) => s + r.due, 0) + borrowDue

  async function putBack(id: string, remainingCents: number) {
    setPayingId(id)
    setError('')
    try {
      await repayBorrow(id, remainingCents, todayISO())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not put back.')
    } finally {
      setPayingId(null)
    }
  }

  return (
    <div className="stack-lg">
      <FundTabs />
      <div>
        <p className="page-kicker">Still to restore</p>
        <h1 className="page-title">Missed</h1>
      </div>

      {active.length === 0 && openBorrows.length === 0 ? (
        <EmptyState
          icon="target"
          title="No savings goals yet"
          body="Set a monthly amount first."
          action={
            <Link to="/goals/new" className="btn btn-primary">
              New goal
            </Link>
          }
        />
      ) : rows.length === 0 && openBorrows.length === 0 ? (
        <EmptyState
          icon="check"
          title="Caught up"
          body="Closed months met the monthly amount. Nothing left to restore."
        />
      ) : (
        <>
          <section className="card">
            <p className="page-kicker">Still to restore</p>
            <p className="hero-amount neg">{formatMoney(due, currency)}</p>
            <p className="tiny muted" style={{ marginTop: 8 }}>
              Catch-up and put-back reduce remaining cash only in the paycheck you record them.
            </p>
          </section>
          {openBorrows.length > 0 ? (
            <section className="card">
              <h2>Borrowed to put back</h2>
              {openBorrows.map((row) => (
                <div key={row.id}>
                  <div className="list-row">
                    <div className="grow">
                      <div className="strong">{row.purpose}</div>
                      <div className="tiny muted">Marked complete on Borrowed when you restore it.</div>
                    </div>
                    <MoneyText cents={row.remainingCents} currency={currency} tone="out" />
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ minHeight: 40, marginBottom: 12 }}
                    disabled={payingId === row.id}
                    onClick={() => void putBack(row.id, row.remainingCents)}
                  >
                    {payingId === row.id ? 'Saving…' : 'Put back'}
                  </button>
                </div>
              ))}
            </section>
          ) : null}
          {rows.map(({ goal, missed, due: goalDue }) => (
            <section key={goal.id} className="card">
              <div className="row-between">
                <h2>{goal.name}</h2>
                <MoneyText cents={goalDue} currency={currency} tone="out" />
              </div>
              {missed.map((m) => (
                <div key={m.month} className="list-row">
                  <div className="grow">
                    <div className="strong">{formatMonthKey(m.month)}</div>
                    <div className="tiny muted">
                      Put {formatMoney(m.putCents, currency)} of{' '}
                      {formatMoney(m.expectedCents, currency)}
                    </div>
                  </div>
                  <MoneyText cents={m.stillDueCents} currency={currency} tone="out" />
                </div>
              ))}
              <Link
                to={`/goals/${goal.id}`}
                className="btn btn-primary"
                style={{ marginTop: 8 }}
              >
                Add catch-up
              </Link>
            </section>
          ))}
          {error ? <p className="error">{error}</p> : null}
        </>
      )}
    </div>
  )
}
