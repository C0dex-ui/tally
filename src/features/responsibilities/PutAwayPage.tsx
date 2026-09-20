import { Link } from 'react-router-dom'
import { BillTabs } from './BillTabs.tsx'
import { EmptyState, MoneyText } from '../../components/display.tsx'
import { useAppState } from '../../context/AppState.tsx'
import { formatPeriodLabel, payPeriodsInCalendarMonth } from '../../lib/payPeriod.ts'
import {
  goalPaycheckSetAside,
  isEmergencyGoal,
  monthKey,
  remainingGoalCents,
} from '../../lib/goals.ts'
import { paycheckBillShare } from '../../lib/responsibilities.ts'
import { plannedMonthlyCents, plannedPaycheckCents } from '../../lib/putAway.ts'
import { formatMoney } from '../../lib/money.ts'

export function PutAwayPage() {
  const { recurring, goals, currency, range, payday1, payday2, periodMode } = useAppState()
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
  const terms = payPeriodsInCalendarMonth(monthKey(range.start), payday1, payday2)
  const empty = bills.length === 0 && plannedGoals.length === 0

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
            <p className="page-kicker">This paycheck</p>
            <p className="hero-amount neg">{formatMoney(paycheck, currency)}</p>
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
                    <MoneyText cents={paycheck} currency={currency} tone="out" />
                  </div>
                )
              })}
            </section>
          ) : null}

          {bills.length > 0 ? (
            <section className="card">
              <h2>Bills</h2>
              {bills.map((item) => (
                <div key={item.id} className="list-row">
                  <div className="grow">
                    <div className="strong ellipsis">{item.name}</div>
                    <div className="tiny muted">
                      {formatMoney(paycheckBillShare(item.amountCents), currency)} this paycheck ·{' '}
                      {formatMoney(item.amountCents, currency)}/mo
                    </div>
                  </div>
                  <MoneyText
                    cents={paycheckBillShare(item.amountCents)}
                    currency={currency}
                    tone="out"
                  />
                </div>
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
