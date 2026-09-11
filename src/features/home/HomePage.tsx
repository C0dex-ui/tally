import { Link } from 'react-router-dom'
import { Bar, BarChart, Cell, Pie, PieChart, Tooltip, XAxis } from 'recharts'
import { MonthSwitcher } from '../../components/fields.tsx'
import {
  CategoryGlyph,
  ChartFrame,
  EmptyState,
  MoneyText,
  ProgressBar,
} from '../../components/display.tsx'
import { useAppState } from '../../context/AppState.tsx'
import { monthSummary, overLimitCount, spendByCategory } from '../../lib/budget.ts'
import { addDays, formatShortDate, inRange, lastNMonthRanges } from '../../lib/dates.ts'
import { daysUntil, formatPeriodTick, lastNPayPeriods } from '../../lib/payPeriod.ts'
import { centsToMajor, formatMoney, majorToCents } from '../../lib/money.ts'
import { markResponsibilityPaid } from '../../db/ops.ts'
import { CashCheckIn } from './CashCheckIn.tsx'
import {
  billPaymentsInPeriod,
  billShareBurden,
  dueDateForPeriod,
  monthlyExpenseTotal,
  paycheckBillShare,
  responsibilityCounts,
  safeToSpendCents,
  sortResponsibilities,
  statusForPeriod,
  unpaidExpenseCents,
} from '../../lib/responsibilities.ts'
import { isEmergencyGoal, lastUse } from '../../lib/goals.ts'
import {
  clampSavePercent,
  dailyBudget,
  livingPoolCents,
  livingSpendInRange,
  livingSpendOnDate,
} from '../../lib/daily.ts'

export function HomePage() {
  const {
    currency,
    range,
    monthLabel,
    goPrevMonth,
    goNextMonth,
    goThisMonth,
    transactions,
    categories,
    categoryMap,
    recurring,
    recurringSkips,
    goals,
    goalEvents,
    justLogged,
    dismissLogged,
    monthStartDay,
    periodMode,
    payday1,
    payday2,
    today,
    settings,
  } = useAppState()

  const summary = monthSummary(transactions, range, goalEvents)
  const spend = spendByCategory(transactions, range)
  const budgetRows = categories
    .filter((c) => c.kind === 'expense' && !c.archived)
    .map((c) => ({
      category: c,
      spentCents: spend.get(c.id) ?? 0,
      limitCents: c.monthlyLimitCents,
    }))
  const over = overLimitCount(budgetRows)
  const pieData = budgetRows
    .filter((r) => r.spentCents > 0)
    .map((r) => ({
      id: r.category.id,
      name: r.category.name,
      value: r.spentCents,
      color: r.category.color,
    }))
    .sort((a, b) => b.value - a.value)

  const chartRanges =
    periodMode === 'pay'
      ? lastNPayPeriods(range.end || today, payday1, payday2, 6)
      : lastNMonthRanges(range.end || today, monthStartDay, 6)
  const monthBars = chartRanges.map((r) => {
    const s = monthSummary(transactions, r)
    return {
      label: formatPeriodTick(r.start),
      income: centsToMajor(s.incomeCents, currency),
      expense: centsToMajor(s.expenseCents, currency),
    }
  })

  const activeBills = recurring.filter((r) => r.active)
  const monthlyBills = monthlyExpenseTotal(activeBills)
  const billShare = paycheckBillShare(monthlyBills)
  const billsPaid = billPaymentsInPeriod(activeBills, transactions, range)
  const unpaidBills = unpaidExpenseCents(
    activeBills,
    transactions,
    recurringSkips,
    range,
  )
  const burden =
    periodMode === 'pay'
      ? billShareBurden(billShare, billsPaid)
      : unpaidBills
  const safe = safeToSpendCents(
    summary.incomeCents,
    summary.expenseCents,
    burden,
  )
  const billCounts = responsibilityCounts(
    activeBills,
    transactions,
    recurringSkips,
    range,
  )
  const unpaidItems = sortResponsibilities(
    activeBills.filter((r) => r.kind === 'expense'),
    transactions,
    recurringSkips,
    range,
  ).filter(
    (r) => statusForPeriod(r, transactions, recurringSkips, range) === 'unpaid',
  )

  const topGoals = [...goals.filter((g) => !g.archived)]
    .sort((a, b) => {
      const ae = isEmergencyGoal(a) ? 0 : 1
      const be = isEmergencyGoal(b) ? 0 : 1
      return ae - be
    })
    .slice(0, 3)
  const leftoverNeg = safe < 0
  const hasActivity = transactions.some((t) => inRange(t.date, range.start, range.end))
  const nextPaydayDate = range.end ? addDays(range.end, 1) : ''
  const daysLeft = nextPaydayDate ? daysUntil(today, nextPaydayDate) : 0
  const savePercent = clampSavePercent(settings.savePercent ?? 10)
  const monthlyBillIds = new Set(
    activeBills
      .filter((b) => b.kind === 'expense' && (b.frequency ?? 'monthly') === 'monthly')
      .map((b) => b.id),
  )
  const todayLiving = livingSpendOnDate(transactions, today, monthlyBillIds)
  const livingPeriod = livingSpendInRange(transactions, range, monthlyBillIds)
  const livingExToday = Math.max(0, livingPeriod - todayLiving)
  const daily = dailyBudget({
    onHandBeforeTodayLivingCents: livingPoolCents(
      summary.incomeCents,
      periodMode === 'pay' ? billShare : 0,
      livingExToday,
    ),
    incomeCents: summary.incomeCents,
    savePercent,
    daysUntilPayday: daysLeft,
  })
  const todayOver = todayLiving > daily.dailyMaxCents && daily.dailyMaxCents >= 0

  return (
    <div className="stack-lg">
      <div>
        <p className="page-kicker">
          {periodMode === 'pay' ? 'This paycheck' : 'This month'}
        </p>
        <h1 className="page-title">Hey {settings.displayName || 'Leonel'}</h1>
      </div>
      <MonthSwitcher
        label={monthLabel}
        onPrev={goPrevMonth}
        onNext={goNextMonth}
        onReset={goThisMonth}
      />

      {justLogged.length > 0 ? (
        <div className="banner">
          <span>
            Logged {justLogged.length} recurring{' '}
            {justLogged.length === 1 ? 'item' : 'items'}.
          </span>
          <button type="button" className="linkish" onClick={dismissLogged}>
            OK
          </button>
        </div>
      ) : null}

      <section className="card">
        <p className="page-kicker">
          {leftoverNeg ? 'Overcommitted' : periodMode === 'pay' ? 'On hand' : 'Safe to spend'}
        </p>
        <p className={`hero-amount ${leftoverNeg ? 'neg' : 'pos'}`}>
          {formatMoney(Math.abs(safe), currency)}
        </p>
        {periodMode === 'pay' && nextPaydayDate && today <= range.end ? (
          <p className="tiny muted" style={{ marginTop: 6 }}>
            {daysLeft === 0
              ? `Payday today · ${formatShortDate(nextPaydayDate)}`
              : `${daysLeft}d to payday · ${formatShortDate(nextPaydayDate)}`}
          </p>
        ) : null}
        {periodMode === 'pay' && monthlyBills > 0 ? (
          <p className="tiny muted" style={{ marginTop: 6 }}>
            {burden > 0
              ? `Bills ${formatMoney(burden, currency)} of ${formatMoney(billShare, currency)} · ${formatMoney(monthlyBills, currency)}/mo`
              : `Bills covered · ${formatMoney(monthlyBills, currency)}/mo`}
          </p>
        ) : unpaidBills > 0 ? (
          <p className="tiny muted" style={{ marginTop: 6 }}>
            Bills still due {formatMoney(unpaidBills, currency)}
          </p>
        ) : null}
        {periodMode === 'pay' && summary.incomeCents > 0 && today <= range.end ? (
          <div style={{ marginTop: 14 }}>
            <div className="row-between">
              <span className="tiny strong">Today</span>
              <span className={`tiny tabular ${todayOver ? 'money-out' : 'muted'}`}>
                {formatMoney(todayLiving, currency)} of {formatMoney(daily.dailyMaxCents, currency)}
              </span>
            </div>
            <ProgressBar
              value={
                daily.dailyMaxCents > 0 ? todayLiving / daily.dailyMaxCents : todayLiving > 0 ? 1 : 0
              }
              over={todayOver}
            />
            <p className="tiny muted" style={{ marginTop: 6 }}>
              {daily.dailyMaxCents <= 0
                ? `Into the ${savePercent}% cushion`
                : `${savePercent}% held ${formatMoney(daily.floorCents, currency)} · ${daily.days}d`}
            </p>
          </div>
        ) : null}
        <div className="stat-grid" style={{ marginTop: 14 }}>
          <div className="stat in">
            <b>{formatMoney(summary.incomeCents, currency)}</b>
            <span>{periodMode === 'pay' ? 'Paycheck' : 'In'}</span>
          </div>
          <div className="stat out">
            <b>{formatMoney(summary.expenseCents, currency)}</b>
            <span>Out</span>
          </div>
          <div className="stat">
            <b>{formatMoney(summary.savedCents, currency)}</b>
            <span>Saved</span>
          </div>
        </div>
        <p className="tiny muted" style={{ marginTop: 10 }}>
          {over === 0 ? 'On track' : `${over} over budget`}
        </p>
        <div style={{ marginTop: 14 }}>
          <CashCheckIn onHandCents={summary.leftoverCents} />
        </div>
      </section>

      {!hasActivity && unpaidItems.length === 0 ? (
        <EmptyState
          icon="wallet"
          title="Add your first expense"
          body="Or tap Cash left."
          action={
            <Link to="/add" className="btn btn-primary">
              Add expense
            </Link>
          }
        />
      ) : null}

      <section className="card">
        <div className="row-between">
          <h2>Responsibilities</h2>
          <Link to="/responsibilities" className="tiny strong">
            All
          </Link>
        </div>
        {activeBills.length === 0 ? (
          <p className="hint" style={{ marginTop: 8 }}>
            Add rent, phone, insurance.
          </p>
        ) : (
          <p className="tiny muted" style={{ margin: '6px 0 8px' }}>
            {billCounts.paid} of {billCounts.total} paid
            {unpaidBills > 0 ? ` · ${formatMoney(unpaidBills, currency)} still due` : ''}
          </p>
        )}
        {unpaidItems.slice(0, 4).map((item) => (
          <div key={item.id} className="list-row">
            <CategoryGlyph category={categoryMap.get(item.categoryId)} fallback="bill" />
            <div className="grow">
              <div className="strong ellipsis">{item.name}</div>
              <div className="tiny muted">
                Due {formatShortDate(dueDateForPeriod(item.dueDay, range))}
              </div>
            </div>
            <MoneyText cents={item.amountCents} currency={currency} tone="out" />
            <button
              type="button"
              className="btn btn-primary"
              style={{ width: 'auto', minHeight: 40, padding: '0 12px' }}
              onClick={() => void markResponsibilityPaid(item.id, range)}
            >
              Paid
            </button>
          </div>
        ))}
        {activeBills.length === 0 ? (
          <Link to="/responsibilities/new" className="btn btn-secondary" style={{ marginTop: 8 }}>
            Add a bill
          </Link>
        ) : null}
      </section>

      {topGoals.length > 0 ? (
        <section className="card">
          <div className="row-between">
            <h2>Goals</h2>
            <Link to="/goals" className="tiny strong">
              All
            </Link>
          </div>
          {topGoals.map((g) => {
            const pct = g.targetCents > 0 ? g.savedCents / g.targetCents : 0
            const used = lastUse(goalEvents.filter((e) => e.goalId === g.id))
            return (
              <Link key={g.id} to={`/goals/${g.id}`} className="list-row">
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
                <div className="grow">
                  <div className="row-between">
                    <span className="strong ellipsis">{g.name}</span>
                    <span className="goal-pct">{Math.round(pct * 100)}%</span>
                  </div>
                  <ProgressBar value={pct} />
                  {used ? (
                    <div className="tiny muted" style={{ marginTop: 4 }}>
                      Last use: {used.purpose}
                    </div>
                  ) : null}
                </div>
              </Link>
            )
          })}
        </section>
      ) : (
        <EmptyState
          icon="target"
          title="A savings goal"
          body="Not an expense."
          action={
            <Link to="/goals/new" className="btn btn-secondary">
              New goal
            </Link>
          }
        />
      )}

      {pieData.length > 0 ? (
        <section className="card">
          <h2>Spend by category</h2>
          <ChartFrame>
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                innerRadius={58}
                outerRadius={86}
                paddingAngle={2}
                isAnimationActive={false}
              >
                {pieData.map((d) => (
                  <Cell key={d.id} fill={d.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => formatMoney(Number(value), currency)} />
            </PieChart>
          </ChartFrame>
          <div className="legend">
            {pieData.slice(0, 6).map((d) => (
              <span key={d.id}>
                <i style={{ background: d.color }} />
                {d.name}
              </span>
            ))}
          </div>
        </section>
      ) : null}

      {hasActivity ? (
        <section className="card">
          <h2>Income vs spend</h2>
          <ChartFrame>
            <BarChart data={monthBars}>
              <XAxis dataKey="label" tickLine={false} axisLine={false} />
              <Tooltip
                formatter={(value, name) => [
                  formatMoney(majorToCents(Number(value), currency), currency),
                  name === 'income' ? 'In' : 'Out',
                ]}
              />
              <Bar dataKey="income" fill="var(--sage)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
              <Bar dataKey="expense" fill="var(--terracotta)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ChartFrame>
        </section>
      ) : null}
    </div>
  )
}
