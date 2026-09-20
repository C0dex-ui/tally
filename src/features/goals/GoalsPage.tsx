import { Link } from 'react-router-dom'
import { FundTabs } from './FundTabs.tsx'
import { CategoryGlyph, EmptyState, MoneyText, ProgressBar } from '../../components/display.tsx'
import { useAppState } from '../../context/AppState.tsx'
import { formatMoney } from '../../lib/money.ts'
import { formatMonthYear, formatShortDate } from '../../lib/dates.ts'
import {
  formatTimeToGoal,
  goalPaycheckSetAside,
  isEmergencyGoal,
  lastUse,
  remainingGoalCents,
  timeToGoal,
} from '../../lib/goals.ts'

export function GoalsPage() {
  const { goals, goalEvents, currency, today } = useAppState()
  const active = [...goals.filter((g) => !g.archived)].sort((a, b) => {
    const ae = isEmergencyGoal(a) ? 0 : 1
    const be = isEmergencyGoal(b) ? 0 : 1
    if (ae !== be) return ae - be
    return a.name.localeCompare(b.name)
  })
  const hasEmergency = active.some(isEmergencyGoal)

  return (
    <div className="stack-lg">
      <FundTabs />
      <div className="row-between">
        <div>
          <p className="page-kicker">Save</p>
          <h1 className="page-title">Goals</h1>
        </div>
        <Link to="/goals/new" className="btn btn-secondary" style={{ width: 'auto' }}>
          Add
        </Link>
      </div>
      {!hasEmergency ? (
        <Link to="/goals/new" className="card tap">
          <div className="strong">Start an emergency fund</div>
        </Link>
      ) : null}
      {active.length === 0 ? (
        <EmptyState
          icon="target"
          title="No savings goals yet"
          body="Add targets such as an emergency fund, vacation, or a purchase."
          action={
            <Link to="/goals/new" className="btn btn-primary">
              New goal
            </Link>
          }
        />
      ) : (
        active.map((g) => {
          const pct = g.targetCents > 0 ? g.savedCents / g.targetCents : 0
          const used = lastUse(goalEvents.filter((e) => e.goalId === g.id))
          const share = goalPaycheckSetAside(g)
          const eta = timeToGoal({
            remainingCents: remainingGoalCents(g),
            monthlyCents: g.monthlyContributionCents,
            fromISO: today,
          })
          return (
            <Link key={g.id} to={`/goals/${g.id}`} className="card tap">
              <div className="row-between" style={{ alignItems: 'center', gap: 10 }}>
                <CategoryGlyph
                  category={{
                    id: g.id,
                    name: g.name,
                    kind: 'expense',
                    icon: 'target',
                    color: g.color,
                    monthlyLimitCents: 0,
                    sortOrder: 0,
                    archived: false,
                  }}
                  fallback="target"
                />
                <h2 className="grow" style={{ margin: 0 }}>
                  {g.name}
                </h2>
                <span className="goal-pct" style={{ color: g.color }}>
                  {Math.round(Math.min(pct, 9.99) * 100)}%
                </span>
              </div>
              <ProgressBar value={pct} color={g.color} />
              <p className="tiny muted" style={{ marginTop: 8 }}>
                <MoneyText cents={g.savedCents} currency={currency} /> of{' '}
                {formatMoney(g.targetCents, currency)}
                {g.deadline ? ` · by ${g.deadline}` : ''}
              </p>
              {share > 0 ? (
                <p className="tiny muted">
                  Set aside {formatMoney(share, currency)} this paycheck ·{' '}
                  {formatMoney(g.monthlyContributionCents, currency)}/mo
                </p>
              ) : null}
              {eta && eta.months > 0 ? (
                <p className="tiny muted">
                  {formatTimeToGoal(eta)}
                  {eta.reachISO ? ` · ${formatMonthYear(eta.reachISO)}` : ''}
                </p>
              ) : null}
              {used ? (
                <p className="tiny muted">
                  Last use: {used.purpose} · {formatShortDate(used.date)}
                </p>
              ) : isEmergencyGoal(g) ? (
                <p className="tiny muted">No withdrawals yet.</p>
              ) : null}
            </Link>
          )
        })
      )}
    </div>
  )
}
