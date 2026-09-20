import { useState } from 'react'
import { Link } from 'react-router-dom'
import { BillTabs } from './BillTabs.tsx'
import { MonthSwitcher } from '../../components/fields.tsx'
import { CategoryGlyph, EmptyState, MoneyText } from '../../components/display.tsx'
import { Icon } from '../../components/Icon.tsx'
import { useAppState } from '../../context/AppState.tsx'
import {
  markResponsibilityPaid,
  setAsideBill,
  skipResponsibility,
  undoResponsibilityPayment,
  undoSetAsideBill,
  unskipResponsibility,
} from '../../db/ops.ts'
import { formatMoney } from '../../lib/money.ts'
import { billMonthRange, formatMonthLabel, formatShortDate } from '../../lib/dates.ts'
import { hasSetAsideThisPeriod, setAsideAmountCents } from '../../lib/billSetAside.ts'
import {
  dueDateForPeriod,
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
    goPrevMonth,
    goNextMonth,
    goThisMonth,
    periodMode,
    billAllotmentCents,
    monthlyBillsCents,
    billSetAsides,
    hasCapital,
  } = useAppState()

  const billMonth = billMonthRange(range.start)
  const active = recurring.filter((r) => r.active)
  const bills = sortResponsibilities(
    active.filter((r) => r.kind === 'expense'),
    transactions,
    recurringSkips,
    billMonth,
  ).filter((r) => statusForPeriod(r, transactions, recurringSkips, billMonth) !== 'not_due')
  const income = sortResponsibilities(
    active.filter((r) => r.kind === 'income'),
    transactions,
    recurringSkips,
    billMonth,
  ).filter((r) => statusForPeriod(r, transactions, recurringSkips, billMonth) !== 'not_due')
  const unpaid = unpaidExpenseCents(active, transactions, recurringSkips, billMonth)
  const counts = responsibilityCounts(active, transactions, recurringSkips, billMonth)

  return (
    <div className="stack-lg">
      <BillTabs />
      <div className="row-between">
        <div>
          <p className="page-kicker">This month</p>
          <h1 className="page-title">Bills</h1>
        </div>
        <Link to="/responsibilities/new" className="btn btn-secondary" style={{ width: 'auto' }}>
          Add
        </Link>
      </div>
      <MonthSwitcher
        label={formatMonthLabel(billMonth, 1)}
        onPrev={goPrevMonth}
        onNext={goNextMonth}
        onReset={goThisMonth}
      />

      {active.length === 0 ? (
        <EmptyState
          icon="bill"
          title="No bills yet"
          body="Add monthly bills such as rent, phone, or insurance."
          action={
            <Link to="/responsibilities/new" className="btn btn-primary">
              Add a bill
            </Link>
          }
        />
      ) : (
        <section className="card">
          <p className="page-kicker">Still unpaid this month</p>
          <p className={`hero-amount ${unpaid > 0 ? 'neg' : 'pos'}`}>
            {formatMoney(unpaid, currency)}
          </p>
          <p className="tiny muted" style={{ marginTop: 8 }}>
            {counts.paid} of {counts.total} marked paid
            {counts.skipped > 0 ? ` · ${counts.skipped} skipped` : ''}
            {periodMode === 'pay' && monthlyBillsCents > 0
              ? ` · leftover still uses ${formatMoney(billAllotmentCents, currency)} this paycheck`
              : ''}
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
              range={billMonth}
              periodMode={periodMode}
              category={categoryMap.get(item.categoryId)}
              status={statusForPeriod(item, transactions, recurringSkips, billMonth)}
              paymentId={paymentInPeriod(item.id, transactions, billMonth)?.id}
              payPeriodStart={range.start}
              setAside={hasSetAsideThisPeriod(billSetAsides, item.id, range.start)}
              canSetAside={periodMode === 'pay' && hasCapital}
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
              range={billMonth}
              periodMode={periodMode}
              category={categoryMap.get(item.categoryId)}
              status={statusForPeriod(item, transactions, recurringSkips, billMonth)}
              paymentId={paymentInPeriod(item.id, transactions, billMonth)?.id}
              payPeriodStart={range.start}
              setAside={false}
              canSetAside={false}
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
  periodMode,
  category,
  status,
  paymentId,
  payPeriodStart,
  setAside,
  canSetAside,
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
  periodMode: 'pay' | 'month'
  category: Parameters<typeof CategoryGlyph>[0]['category']
  status: 'paid' | 'unpaid' | 'skipped' | 'not_due'
  paymentId?: string
  payPeriodStart: string
  setAside: boolean
  canSetAside: boolean
}) {
  const [error, setError] = useState('')
  const due = dueDateForPeriod(item.dueDay, range)
  const halfCents = setAsideAmountCents(item.amountCents)
  const statusLabel =
    status === 'paid' ? 'Paid' : status === 'skipped' ? 'Not this month' : `Due ${formatShortDate(due)}`
  const detail =
    item.kind === 'expense' && status === 'unpaid' && setAside
      ? `${statusLabel} · Set aside this paycheck`
      : item.kind === 'expense' && status === 'unpaid' && periodMode === 'pay'
        ? `${statusLabel} · ${formatMoney(halfCents, currency)} this paycheck`
        : statusLabel

  async function onSetAside() {
    setError('')
    try {
      await setAsideBill(item.id, payPeriodStart)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not set aside.')
    }
  }

  async function onUndoSetAside() {
    setError('')
    try {
      await undoSetAsideBill(item.id, payPeriodStart)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not undo.')
    }
  }

  return (
    <div>
      <Link to={`/responsibilities/${item.id}`} className="list-row">
        <CategoryGlyph category={category} fallback="bill" />
        <div className="grow">
          <div className="strong ellipsis">{item.name}</div>
          <div className="tiny muted">{detail}</div>
        </div>
        {status === 'paid' ? <Icon name="check" size={18} /> : null}
        <MoneyText
          cents={item.amountCents}
          currency={currency}
          tone={item.kind === 'income' ? 'in' : 'out'}
        />
      </Link>
      {status === 'unpaid' && item.kind === 'expense' && canSetAside ? (
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
