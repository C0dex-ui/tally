import { Link } from 'react-router-dom'
import { MonthSwitcher } from '../../components/fields.tsx'
import { CategoryGlyph, EmptyState, MoneyText } from '../../components/display.tsx'
import { Icon } from '../../components/Icon.tsx'
import { useAppState } from '../../context/AppState.tsx'
import {
  markResponsibilityPaid,
  skipResponsibility,
  undoResponsibilityPayment,
  unskipResponsibility,
} from '../../db/ops.ts'
import { formatMoney } from '../../lib/money.ts'
import { formatShortDate } from '../../lib/dates.ts'
import {
  billPaymentsInPeriod,
  billShareBurden,
  dueDateForPeriod,
  monthlyExpenseTotal,
  paycheckBillShare,
  paymentInPeriod,
  responsibilityCounts,
  sortResponsibilities,
  statusForPeriod,
  unpaidExpenseCents,
} from '../../lib/responsibilities.ts'

export function ResponsibilitiesPage() {
  const {
    recurring,
    recurringSkips,
    transactions,
    categoryMap,
    currency,
    range,
    monthLabel,
    goPrevMonth,
    goNextMonth,
    goThisMonth,
    periodMode,
  } = useAppState()

  const active = recurring.filter((r) => r.active)
  const bills = sortResponsibilities(
    active.filter((r) => r.kind === 'expense'),
    transactions,
    recurringSkips,
    range,
  ).filter((r) => statusForPeriod(r, transactions, recurringSkips, range) !== 'not_due')
  const income = sortResponsibilities(
    active.filter((r) => r.kind === 'income'),
    transactions,
    recurringSkips,
    range,
  ).filter((r) => statusForPeriod(r, transactions, recurringSkips, range) !== 'not_due')
  const unpaid = unpaidExpenseCents(active, transactions, recurringSkips, range)
  const counts = responsibilityCounts(active, transactions, recurringSkips, range)
  const monthlyBills = monthlyExpenseTotal(active)
  const billShare = paycheckBillShare(monthlyBills)
  const billsPaid = billPaymentsInPeriod(active, transactions, range)
  const shareLeft = billShareBurden(billShare, billsPaid)

  return (
    <div className="stack-lg">
      <div className="row-between">
        <div>
          <p className="page-kicker">This paycheck</p>
          <h1 className="page-title">Bills</h1>
        </div>
        <Link to="/responsibilities/new" className="btn btn-secondary" style={{ width: 'auto' }}>
          Add
        </Link>
      </div>
      <MonthSwitcher
        label={monthLabel}
        onPrev={goPrevMonth}
        onNext={goNextMonth}
        onReset={goThisMonth}
      />

      {active.length === 0 ? (
        <EmptyState
          icon="bill"
          title="No bills yet"
          body="Rent, phone, insurance."
          action={
            <Link to="/responsibilities/new" className="btn btn-primary">
              Add a bill
            </Link>
          }
        />
      ) : (
        <section className="card">
          <p className="page-kicker">
            {periodMode === 'pay' ? 'This payday' : 'Still due'}
          </p>
          <p className={`hero-amount ${ (periodMode === 'pay' ? shareLeft : unpaid) > 0 ? 'neg' : 'pos'}`}>
            {formatMoney(periodMode === 'pay' ? shareLeft : unpaid, currency)}
          </p>
          <p className="tiny muted" style={{ marginTop: 8 }}>
            {periodMode === 'pay'
              ? `${formatMoney(billShare, currency)} of ${formatMoney(monthlyBills, currency)}/mo`
              : `${counts.paid} of ${counts.total} marked paid`}
            {counts.skipped > 0 ? ` · ${counts.skipped} skipped` : ''}
          </p>
        </section>
      )}

      {bills.length > 0 ? (
        <section className="card">
          <h2>To pay</h2>
          {bills.map((item) => (
            <ResponsibilityRow
              key={item.id}
              item={item}
              currency={currency}
              range={range}
              category={categoryMap.get(item.categoryId)}
              status={statusForPeriod(item, transactions, recurringSkips, range)}
              paymentId={paymentInPeriod(item.id, transactions, range)?.id}
            />
          ))}
        </section>
      ) : null}

      {income.length > 0 ? (
        <section className="card">
          <h2>Expected in</h2>
          {income.map((item) => (
            <ResponsibilityRow
              key={item.id}
              item={item}
              currency={currency}
              range={range}
              category={categoryMap.get(item.categoryId)}
              status={statusForPeriod(item, transactions, recurringSkips, range)}
              paymentId={paymentInPeriod(item.id, transactions, range)?.id}
            />
          ))}
        </section>
      ) : null}
    </div>
  )
}

function ResponsibilityRow({
  item,
  currency,
  range,
  category,
  status,
  paymentId,
}: {
  item: {
    id: string
    name: string
    kind: 'expense' | 'income'
    amountCents: number
    dueDay: number
    categoryId: string
  }
  currency: string
  range: { start: string; end: string }
  category: Parameters<typeof CategoryGlyph>[0]['category']
  status: 'paid' | 'unpaid' | 'skipped' | 'not_due'
  paymentId?: string
}) {
  const due = dueDateForPeriod(item.dueDay, range)
  return (
    <div>
      <Link to={`/responsibilities/${item.id}`} className="list-row">
        <CategoryGlyph category={category} fallback="bill" />
        <div className="grow">
          <div className="strong ellipsis">{item.name}</div>
          <div className="tiny muted">
            {status === 'paid'
              ? 'Paid'
              : status === 'skipped'
                ? 'Not this month'
                : `Due ${formatShortDate(due)}${
                    item.kind === 'expense'
                      ? ` · ${formatMoney(paycheckBillShare(item.amountCents), currency)} this payday`
                      : ''
                  }`}
          </div>
        </div>
        {status === 'paid' ? <Icon name="check" size={18} /> : null}
        <MoneyText
          cents={item.amountCents}
          currency={currency}
          tone={item.kind === 'income' ? 'in' : 'out'}
        />
      </Link>
      {status === 'unpaid' ? (
        <div className="btn-row" style={{ paddingBottom: 12 }}>
          <button
            type="button"
            className="btn btn-primary"
            style={{ minHeight: 40 }}
            onClick={() => void markResponsibilityPaid(item.id, range)}
          >
            Mark paid
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ minHeight: 40 }}
            onClick={() => void skipResponsibility(item.id, range.start)}
          >
            Not this month
          </button>
        </div>
      ) : null}
      {status === 'skipped' ? (
        <div style={{ paddingBottom: 12 }}>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ minHeight: 40 }}
            onClick={() => void unskipResponsibility(item.id, range.start)}
          >
            Undo skip
          </button>
        </div>
      ) : null}
      {status === 'paid' ? (
        <div className="btn-row" style={{ paddingBottom: 12 }}>
          {paymentId ? (
            <Link to={`/transactions/${paymentId}`} className="btn btn-secondary" style={{ minHeight: 40 }}>
              View
            </Link>
          ) : (
            <span />
          )}
          <button
            type="button"
            className="btn btn-ghost"
            style={{ minHeight: 40 }}
            onClick={() => void undoResponsibilityPayment(item.id, range)}
          >
            Undo paid
          </button>
        </div>
      ) : null}
    </div>
  )
}
