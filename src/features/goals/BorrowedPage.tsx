import { Link } from 'react-router-dom'
import { FundTabs } from './FundTabs.tsx'
import { EmptyState } from '../../components/display.tsx'
import { useAppState } from '../../context/AppState.tsx'
import { formatShortDate } from '../../lib/dates.ts'
import { isEmergencyGoal } from '../../lib/goals.ts'
import { outstandingBorrows, paidBorrows } from '../../lib/borrow.ts'

export function BorrowedPage() {
  const { fundBorrows, goals } = useAppState()
  const emergency = goals.find((g) => !g.archived && isEmergencyGoal(g))
  const open = outstandingBorrows(fundBorrows)
  const paid = paidBorrows(fundBorrows)

  return (
    <div className="stack-lg">
      <FundTabs />
      <div>
        <p className="page-kicker">Emergency fund</p>
        <h1 className="page-title">Borrowed</h1>
      </div>

      {!emergency ? (
        <EmptyState
          icon="target"
          title="No emergency fund"
          body="Create an emergency fund first. Borrow from it when you need cash."
          action={
            <Link to="/goals/new" className="btn btn-primary">
              Start fund
            </Link>
          }
        />
      ) : open.length === 0 && paid.length === 0 ? (
        <EmptyState
          icon="wallet"
          title="Nothing borrowed"
          body="Record a withdrawal from the emergency fund. Restore it on Missed."
        />
      ) : (
        <>
          {open.length > 0 ? (
            <section className="card">
              <h2>To put back</h2>
              {open.map((row) => (
                <label key={row.id} className="check-row">
                  <input type="checkbox" checked={false} disabled readOnly />
                  <span className="grow">
                    <span className="strong">{row.purpose}</span>
                    <span className="tiny muted">{formatShortDate(row.date)}</span>
                  </span>
                </label>
              ))}
              <p className="tiny muted" style={{ marginTop: 8 }}>
                Restore amounts on Missed. This item is marked complete when you put the cash back.
              </p>
            </section>
          ) : null}
          {paid.length > 0 ? (
            <section className="card">
              <h2>Put back</h2>
              {paid.map((row) => (
                <label key={row.id} className="check-row done">
                  <input type="checkbox" checked disabled readOnly />
                  <span className="grow">
                    <span className="strong">{row.purpose}</span>
                    <span className="tiny muted">{formatShortDate(row.date)}</span>
                  </span>
                </label>
              ))}
            </section>
          ) : null}
        </>
      )}
    </div>
  )
}
