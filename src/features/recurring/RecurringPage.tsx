import { Link } from 'react-router-dom'
import { CategoryGlyph, EmptyState, MoneyText } from '../../components/display.tsx'
import { useAppState } from '../../context/AppState.tsx'
import { logRecurringPayment, skipRecurring } from '../../db/ops.ts'
import { isDue } from '../../lib/recurring.ts'
import { formatShortDate } from '../../lib/dates.ts'

export function RecurringPage() {
  const { recurring, categoryMap, currency, today } = useAppState()
  const active = recurring.filter((r) => r.active).sort((a, b) => a.nextDate.localeCompare(b.nextDate))

  return (
    <div className="stack-lg">
      <div className="row-between">
        <div>
          <p className="page-kicker">Repeat</p>
          <h1 className="page-title">Bills & income</h1>
        </div>
        <Link to="/more/recurring/new" className="btn btn-secondary" style={{ width: 'auto' }}>
          Add
        </Link>
      </div>
      {active.length === 0 ? (
        <EmptyState
          icon="bill"
          title="No recurring items"
          body="Add repeating bills, subscriptions, or income."
          action={
            <Link to="/more/recurring/new" className="btn btn-primary">
              Add recurring
            </Link>
          }
        />
      ) : (
        <section className="card">
          {active.map((item) => {
            const due = isDue(item.nextDate, today, true)
            return (
              <div key={item.id}>
                <Link to={`/more/recurring/${item.id}`} className="list-row">
                  <CategoryGlyph category={categoryMap.get(item.categoryId)} fallback="bill" />
                  <div className="grow">
                    <div className="strong ellipsis">{item.name}</div>
                    <div className="tiny muted">
                      {item.frequency}
                      {item.autoLog ? ' · auto-log' : ''} · {formatShortDate(item.nextDate)}
                      {due ? ' · due' : ''}
                    </div>
                  </div>
                  <MoneyText
                    cents={item.amountCents}
                    currency={currency}
                    tone={item.kind === 'income' ? 'in' : 'out'}
                  />
                </Link>
                {due ? (
                  <div className="btn-row" style={{ paddingBottom: 12 }}>
                    <button
                      type="button"
                      className="btn btn-primary"
                      style={{ minHeight: 40 }}
                      onClick={() => void logRecurringPayment(item.id)}
                    >
                      Log payment
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ minHeight: 40 }}
                      onClick={() => void skipRecurring(item.id)}
                    >
                      Skip
                    </button>
                  </div>
                ) : null}
              </div>
            )
          })}
        </section>
      )}
    </div>
  )
}
