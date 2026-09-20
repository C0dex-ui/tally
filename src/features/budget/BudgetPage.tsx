import { Link } from 'react-router-dom'
import { MonthSwitcher } from '../../components/fields.tsx'
import { LeftoverLine } from '../../components/LeftoverLine.tsx'
import {
  CategoryGlyph,
  EmptyState,
  MoneyText,
  ProgressBar,
} from '../../components/display.tsx'
import { useAppState } from '../../context/AppState.tsx'
import { remaining, spendByCategory, usagePct } from '../../lib/budget.ts'
import { formatMoney } from '../../lib/money.ts'

export function BudgetPage() {
  const {
    categories,
    transactions,
    currency,
    range,
    monthLabel,
    goPrevMonth,
    goNextMonth,
    goThisMonth,
    periodMode,
  } = useAppState()

  const spend = spendByCategory(transactions, range, 'expense')
  const earned = spendByCategory(transactions, range, 'income')
  const expenses = categories.filter((c) => c.kind === 'expense' && !c.archived)
  const incomes = categories.filter((c) => c.kind === 'income' && !c.archived)

  const plannedIncome = incomes.reduce((s, c) => s + c.monthlyLimitCents, 0)
  const actualIncome = incomes.reduce((s, c) => s + (earned.get(c.id) ?? 0), 0)

  return (
    <div className="stack-lg">
      <div className="row-between">
        <div>
          <p className="page-kicker">{periodMode === 'pay' ? 'This paycheck' : 'This month'}</p>
          <h1 className="page-title">Budget</h1>
          <LeftoverLine />
        </div>
        <Link to="/budget/new" className="btn btn-secondary" style={{ width: 'auto' }}>
          Add
        </Link>
      </div>
      <MonthSwitcher
        label={monthLabel}
        onPrev={goPrevMonth}
        onNext={goNextMonth}
        onReset={goThisMonth}
      />

      <section className="card">
        <h2>Income</h2>
        <p className="tiny muted" style={{ margin: '4px 0 8px' }}>
          Actual {formatMoney(actualIncome, currency)}
          {plannedIncome > 0 ? ` · planned ${formatMoney(plannedIncome, currency)}` : ''}
        </p>
        {incomes.map((c) => (
          <Link key={c.id} to={`/budget/${c.id}`} className="list-row">
            <CategoryGlyph category={c} />
            <div className="grow">
              <div className="strong">{c.name}</div>
              <div className="tiny muted">
                {c.monthlyLimitCents > 0
                  ? `Plan ${formatMoney(c.monthlyLimitCents, currency)}`
                  : 'No plan set'}
              </div>
            </div>
            <MoneyText cents={earned.get(c.id) ?? 0} currency={currency} tone="in" />
          </Link>
        ))}
      </section>

      <section className="card">
        <h2>Spending</h2>
        {expenses.length === 0 ? (
          <EmptyState icon="pie" title="No categories" body="Add a category to track spending." />
        ) : (
          expenses.map((c) => {
            const spent = spend.get(c.id) ?? 0
            const left = remaining(c.monthlyLimitCents, spent)
            const pct = usagePct(c.monthlyLimitCents, spent)
            const over = left !== null && left < 0
            return (
              <Link key={c.id} to={`/budget/${c.id}`} className="list-row" style={{ alignItems: 'flex-start' }}>
                <CategoryGlyph category={c} />
                <div className="grow">
                  <div className="row-between">
                    <span className="strong">{c.name}</span>
                    <MoneyText cents={spent} currency={currency} tone="out" />
                  </div>
                  {pct === null ? (
                    <div className="tiny muted">No limit</div>
                  ) : (
                    <>
                      <ProgressBar value={pct} over={over} />
                      <div className="tiny muted" style={{ marginTop: 4 }}>
                        {over
                          ? `Over by ${formatMoney(Math.abs(left ?? 0), currency)}`
                          : `${formatMoney(left ?? 0, currency)} left of ${formatMoney(c.monthlyLimitCents, currency)}`}
                      </div>
                    </>
                  )}
                </div>
              </Link>
            )
          })
        )}
      </section>
    </div>
  )
}
