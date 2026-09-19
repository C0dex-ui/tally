import { Bar, BarChart, Cell, Pie, PieChart, Tooltip, XAxis } from 'recharts'
import { MonthSwitcher } from '../../components/fields.tsx'
import { ChartFrame, EmptyState, MoneyText } from '../../components/display.tsx'
import { useAppState } from '../../context/AppState.tsx'
import { monthSummary, spendByCategory } from '../../lib/budget.ts'
import { unpaidExpenseCents } from '../../lib/responsibilities.ts'
import { inRange, lastNMonthRanges } from '../../lib/dates.ts'
import { formatPeriodTick, lastNPayPeriods } from '../../lib/payPeriod.ts'
import { centsToMajor, formatMoney, majorToCents } from '../../lib/money.ts'

export function ReportsPage() {
  const {
    transactions,
    categories,
    currency,
    range,
    monthLabel,
    goPrevMonth,
    goNextMonth,
    goThisMonth,
    monthStartDay,
    periodMode,
    payday1,
    payday2,
    goalEvents,
    recurring,
    recurringSkips,
    whatsLeftCents,
  } = useAppState()

  const summary = monthSummary(transactions, range, goalEvents)
  const spend = spendByCategory(transactions, range)
  const pieData = categories
    .filter((c) => c.kind === 'expense')
    .map((c) => ({
      id: c.id,
      name: c.name,
      value: spend.get(c.id) ?? 0,
      color: c.color,
    }))
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value)

  const chartRanges =
    periodMode === 'pay'
      ? lastNPayPeriods(range.end, payday1, payday2, 6)
      : lastNMonthRanges(range.end, monthStartDay, 6)
  const monthBars = chartRanges.map((r) => {
    const s = monthSummary(transactions, r)
    return {
      label: formatPeriodTick(r.start),
      income: centsToMajor(s.incomeCents, currency),
      expense: centsToMajor(s.expenseCents, currency),
    }
  })

  const inMonth = transactions.filter((t) => inRange(t.date, range.start, range.end))
  const recurringSpend = inMonth
    .filter((t) => t.kind === 'expense' && t.recurringId)
    .reduce((s, t) => s + t.amountCents, 0)
  const oneOffSpend = inMonth
    .filter((t) => t.kind === 'expense' && !t.recurringId)
    .reduce((s, t) => s + t.amountCents, 0)

  const unpaidBills = unpaidExpenseCents(
    recurring.filter((r) => r.active),
    transactions,
    recurringSkips,
    range,
  )
  const has = inMonth.length > 0 || unpaidBills > 0

  return (
    <div className="stack-lg">
      <div>
        <p className="page-kicker">Spend</p>
        <h1 className="page-title">Reports</h1>
      </div>
      <MonthSwitcher
        label={monthLabel}
        onPrev={goPrevMonth}
        onNext={goNextMonth}
        onReset={goThisMonth}
      />

      {!has ? (
        <EmptyState
          icon="pie"
          title="No data"
          body=""
        />
      ) : (
        <>
          <section className="card">
            <div className="stat-grid">
              <div className="stat in">
                <b>{formatMoney(summary.incomeCents, currency)}</b>
                <span>In</span>
              </div>
              <div className="stat out">
                <b>{formatMoney(summary.expenseCents, currency)}</b>
                <span>Out</span>
              </div>
              <div className="stat">
                <b>
                  {whatsLeftCents == null
                    ? '—'
                    : formatMoney(whatsLeftCents, currency)}
                </b>
                <span>What’s left</span>
              </div>
            </div>
          </section>

          <section className="card">
            <h2>Bills vs one-off</h2>
            <div className="list-row">
              <div className="grow">Bills logged</div>
              <MoneyText cents={recurringSpend} currency={currency} tone="out" />
            </div>
            <div className="list-row">
              <div className="grow">Everything else</div>
              <MoneyText cents={oneOffSpend} currency={currency} tone="out" />
            </div>
            {unpaidBills > 0 ? (
              <div className="list-row">
                <div className="grow">Unpaid bills this month</div>
                <MoneyText cents={unpaidBills} currency={currency} tone="out" />
              </div>
            ) : null}
          </section>

          {pieData.length > 0 ? (
            <section className="card">
              <h2>Where it went</h2>
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
              {pieData.map((d) => (
                <div key={d.id} className="list-row">
                  <span className="grow">
                    <i
                      style={{
                        display: 'inline-block',
                        width: 8,
                        height: 8,
                        borderRadius: 99,
                        background: d.color,
                        marginRight: 8,
                      }}
                    />
                    {d.name}
                  </span>
                  <MoneyText cents={d.value} currency={currency} tone="out" />
                </div>
              ))}
            </section>
          ) : null}

          <section className="card">
            <h2>Six months</h2>
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
        </>
      )}
    </div>
  )
}
