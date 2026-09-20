import { FundTabs } from './FundTabs.tsx'
import { EmptyState, MoneyText } from '../../components/display.tsx'
import { useAppState } from '../../context/AppState.tsx'
import { formatShortDate, inRange } from '../../lib/dates.ts'
import { formatMoney } from '../../lib/money.ts'

export function OverPage() {
  const { dailyOvers, currency, range } = useAppState()
  const rows = [...dailyOvers]
    .filter((row) => row.overCents > 0 && inRange(row.date, range.start, range.end))
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))
  const total = rows.reduce((sum, row) => sum + row.overCents, 0)

  return (
    <div className="stack-lg">
      <FundTabs />
      <div>
        <p className="page-kicker">Audit log</p>
        <h1 className="page-title">Over</h1>
      </div>

      <section className="card">
        <p className="page-kicker">Overspend this period</p>
        <p className={`hero-amount ${total > 0 ? 'neg' : 'pos'}`}>{formatMoney(total, currency)}</p>
        <p className="tiny muted" style={{ marginTop: 8 }}>
          Amounts over the daily limit appear here. Does not change remaining cash.
        </p>
      </section>

      {rows.length === 0 ? (
        <EmptyState
          icon="flag"
          title="No overspend logged"
          body="Amounts over the daily limit appear here."
        />
      ) : (
        <section className="card">
          <h2>Log</h2>
          {rows.map((row) => (
            <div key={row.id} className="list-row">
              <div className="grow">
                <div className="strong">Overspend · {formatShortDate(row.date)}</div>
                <div className="tiny muted">
                  Spent {formatMoney(row.spentCents, currency)} · limit{' '}
                  {formatMoney(row.dailyMaxCents, currency)}
                </div>
              </div>
              <MoneyText cents={row.overCents} currency={currency} tone="out" />
            </div>
          ))}
        </section>
      )}
    </div>
  )
}
