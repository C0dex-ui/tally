import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FundTabs } from './FundTabs.tsx'
import { AmountField } from '../../components/fields.tsx'
import { EmptyState, MoneyText } from '../../components/display.tsx'
import { useAppState } from '../../context/AppState.tsx'
import { repayBorrow } from '../../db/ops.ts'
import { formatShortDate, todayISO } from '../../lib/dates.ts'
import { centsToMajorString, formatMoney, parseMajorInput } from '../../lib/money.ts'
import { isEmergencyGoal } from '../../lib/goals.ts'
import { outstandingBorrows, outstandingTotal, paidBorrows } from '../../lib/borrow.ts'
import type { FundBorrow } from '../../db/types.ts'

export function BorrowedPage() {
  const { fundBorrows, goals, currency } = useAppState()
  const emergency = goals.find((g) => !g.archived && isEmergencyGoal(g))
  const open = outstandingBorrows(fundBorrows)
  const paid = paidBorrows(fundBorrows)
  const owed = outstandingTotal(fundBorrows)
  const [repaying, setRepaying] = useState<FundBorrow | null>(null)
  const [amount, setAmount] = useState('')
  const [error, setError] = useState('')

  function startRepay(row: FundBorrow) {
    setRepaying(row)
    setAmount(centsToMajorString(row.remainingCents, currency))
    setError('')
  }

  async function saveRepay() {
    if (!repaying) return
    const cents = parseMajorInput(amount, currency)
    if (cents === null || cents <= 0) {
      setError('Enter an amount.')
      return
    }
    try {
      await repayBorrow(repaying.id, cents, todayISO())
      setRepaying(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not repay.')
    }
  }

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
          body="Start a fund first."
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
          body="Borrow from the fund when you need cash to pay back."
        />
      ) : (
        <>
          <section className="card">
            <p className="page-kicker">Still owed</p>
            <p className={`hero-amount ${owed > 0 ? 'neg' : 'pos'}`}>
              {formatMoney(owed, currency)}
            </p>
          </section>
          {open.length > 0 ? (
            <section className="card">
              {open.map((row) => (
                <div key={row.id}>
                  <div className="list-row">
                    <div className="grow">
                      <div className="strong">{row.purpose}</div>
                      <div className="tiny muted">
                        {formatShortDate(row.date)}
                        {row.remainingCents < row.amountCents
                          ? ` · of ${formatMoney(row.amountCents, currency)}`
                          : ''}
                      </div>
                    </div>
                    <MoneyText cents={row.remainingCents} currency={currency} tone="out" />
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ minHeight: 40, marginBottom: 12 }}
                    onClick={() => startRepay(row)}
                  >
                    Pay back
                  </button>
                </div>
              ))}
            </section>
          ) : null}
          {paid.length > 0 ? (
            <section className="card">
              <h2>Paid back</h2>
              {paid.map((row) => (
                <div key={row.id} className="list-row">
                  <div className="grow">
                    <div className="strong">{row.purpose}</div>
                    <div className="tiny muted">{formatShortDate(row.date)}</div>
                  </div>
                  <MoneyText cents={row.amountCents} currency={currency} tone="in" />
                </div>
              ))}
            </section>
          ) : null}
        </>
      )}

      {repaying ? (
        <div className="overlay" role="dialog" aria-modal="true">
          <div className="sheet">
            <h2>Pay back {repaying.purpose}</h2>
            <p className="tiny muted" style={{ marginBottom: 12 }}>
              Owed {formatMoney(repaying.remainingCents, currency)}
            </p>
            <AmountField
              id="repay"
              label="Amount"
              value={amount}
              onChange={setAmount}
              currency={currency}
            />
            {error ? <p className="error">{error}</p> : null}
            <div className="btn-row" style={{ marginTop: 16 }}>
              <button type="button" className="btn btn-secondary" onClick={() => setRepaying(null)}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" onClick={() => void saveRepay()}>
                Pay back
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
