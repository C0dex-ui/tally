import { useState } from 'react'
import { Link } from 'react-router-dom'
import { BillTabs } from './BillTabs.tsx'
import { EmptyState, MoneyText } from '../../components/display.tsx'
import { useAppState } from '../../context/AppState.tsx'
import { setAsideBill, undoSetAsideBill } from '../../db/ops.ts'
import { formatPeriodLabel, payPeriodsInCalendarMonth } from '../../lib/payPeriod.ts'
import {
  goalPaycheckSetAside,
  isEmergencyGoal,
  monthKey,
  remainingGoalCents,
} from '../../lib/goals.ts'
import { hasSetAsideThisPeriod, setAsideAmountCents } from '../../lib/billSetAside.ts'
import { plannedMonthlyCents, plannedPaycheckCents, setAsideThisPeriodCents } from '../../lib/putAway.ts'
import { centsToMajorString, formatMoney } from '../../lib/money.ts'

export function PutAwayPage() {
  const {
    recurring,
    goals,
    currency,
    range,
    payday1,
    payday2,
    periodMode,
    billSetAsides,
    hasCapital,
  } = useAppState()
  const bills = recurring
    .filter((r) => r.active && r.kind === 'expense' && (r.frequency ?? 'monthly') === 'monthly')
    .sort((a, b) => a.name.localeCompare(b.name))
  const plannedGoals = [...goals.filter((g) => !g.archived && remainingGoalCents(g) > 0)].sort(
    (a, b) => {
      const ae = isEmergencyGoal(a) ? 0 : 1
      const be = isEmergencyGoal(b) ? 0 : 1
      if (ae !== be) return ae - be
      return a.name.localeCompare(b.name)
    },
  )
  const monthly = plannedMonthlyCents(bills, plannedGoals)
  const paycheck = plannedPaycheckCents(bills, plannedGoals)
  const parked = setAsideThisPeriodCents(billSetAsides, range.start)
  const done = paycheck > 0 && parked >= paycheck
  const terms = payPeriodsInCalendarMonth(monthKey(range.start), payday1, payday2)
  const empty = bills.length === 0 && plannedGoals.length === 0
  const canSetAside = periodMode === 'pay' && hasCapital

  return (
    <div className="stack-lg">
      <BillTabs />
      <div>
        <p className="page-kicker">This paycheck</p>
        <h1 className="page-title">Put away</h1>
      </div>

      {empty ? (
        <EmptyState
          icon="bill"
          title="No monthly bills or goals yet"
          body="Monthly bills and goal contributions appear here. Everyday spending is excluded."
          action={
            <Link to="/responsibilities/new" className="btn btn-primary">
              Add a bill
            </Link>
          }
        />
      ) : (
        <>
          <section className="card">
            <p className="page-kicker">Set aside this paycheck</p>
            <PutAwayAudit parked={parked} target={paycheck} currency={currency} done={done} />
            <p className="tiny muted" style={{ marginTop: 8 }}>
              This paycheck · to complete {formatMoney(monthly, currency)} this month
            </p>
            <p className="tiny muted">Monthly bills and goal contributions only. Everyday spending is excluded.</p>
          </section>

          {periodMode === 'pay' && terms.length > 0 ? (
            <section className="card">
              <h2>This month</h2>
              {terms.map((term) => {
                const current = term.start === range.start
                return (
                  <div key={term.start} className="list-row">
                    <div className="grow">
                      <div className="strong">{formatPeriodLabel(term)}</div>
                      <div className="tiny muted">{current ? 'This paycheck' : 'Other paycheck'}</div>
                    </div>
                    {current ? (
                      <PutAwayAudit
                        parked={parked}
                        target={paycheck}
                        currency={currency}
                        done={done}
                        compact
                      />
                    ) : (
                      <MoneyText cents={paycheck} currency={currency} tone="out" />
                    )}
                  </div>
                )
              })}
            </section>
          ) : null}

          {bills.length > 0 ? (
            <section className="card">
              <h2>Bills</h2>
              {bills.map((item) => (
                <PutAwayBillRow
                  key={item.id}
                  item={item}
                  currency={currency}
                  periodStart={range.start}
                  setAside={hasSetAsideThisPeriod(billSetAsides, item.id, range.start)}
                  canSetAside={canSetAside}
                />
              ))}
            </section>
          ) : null}

          {plannedGoals.length > 0 ? (
            <section className="card">
              <h2>Goals</h2>
              {plannedGoals.map((g) => (
                <div key={g.id} className="list-row">
                  <div className="grow">
                    <div className="strong ellipsis">{g.name}</div>
                    <div className="tiny muted">
                      {formatMoney(goalPaycheckSetAside(g), currency)} this paycheck ·{' '}
                      {formatMoney(g.monthlyContributionCents, currency)}/mo
                    </div>
                  </div>
                  <MoneyText cents={goalPaycheckSetAside(g)} currency={currency} tone="out" />
                </div>
              ))}
            </section>
          ) : null}
        </>
      )}
    </div>
  )
}

function PutAwayAudit({
  parked,
  target,
  currency,
  done,
  compact,
}: {
  parked: number
  target: number
  currency: string
  done: boolean
  compact?: boolean
}) {
  return (
    <p className={`putaway-audit${done ? ' done' : ''}${compact ? ' compact' : ''}`}>
      <b>{centsToMajorString(parked, currency)}</b>
      <span>/</span>
      <span>{centsToMajorString(target, currency)}</span>
    </p>
  )
}

function PutAwayBillRow({
  item,
  currency,
  periodStart,
  setAside,
  canSetAside,
}: {
  item: { id: string; name: string; amountCents: number }
  currency: string
  periodStart: string
  setAside: boolean
  canSetAside: boolean
}) {
  const [error, setError] = useState('')
  const halfCents = setAsideAmountCents(item.amountCents)

  async function onSetAside() {
    setError('')
    try {
      await setAsideBill(item.id, periodStart)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not set aside.')
    }
  }

  async function onUndoSetAside() {
    setError('')
    try {
      await undoSetAsideBill(item.id, periodStart)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not undo.')
    }
  }

  return (
    <div>
      <div className="list-row">
        <div className="grow">
          <div className="strong ellipsis">{item.name}</div>
          <div className="tiny muted">
            {setAside
              ? 'Set aside this paycheck'
              : `${formatMoney(halfCents, currency)} this paycheck · still to park`}
          </div>
        </div>
        <MoneyText cents={halfCents} currency={currency} tone="out" />
      </div>
      {canSetAside ? (
        setAside ? (
          <div className="row-between" style={{ paddingBottom: 8 }}>
            <p className="tiny muted">Set aside this paycheck</p>
            <button
              type="button"
              className="btn btn-ghost"
              style={{ width: 'auto', minHeight: 40 }}
              onClick={() => void onUndoSetAside()}
            >
              Undo
            </button>
          </div>
        ) : (
          <div style={{ paddingBottom: 8 }}>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ minHeight: 40 }}
              onClick={() => void onSetAside()}
            >
              Set aside {formatMoney(halfCents, currency)}
            </button>
          </div>
        )
      ) : null}
      {error ? <p className="error" style={{ paddingBottom: 8 }}>{error}</p> : null}
    </div>
  )
}
