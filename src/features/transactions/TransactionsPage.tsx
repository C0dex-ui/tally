import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { MonthSwitcher } from '../../components/fields.tsx'
import { CategoryGlyph, EmptyState, MoneyText } from '../../components/display.tsx'
import { Icon } from '../../components/Icon.tsx'
import { useAppState } from '../../context/AppState.tsx'
import { formatShortDate, inRange } from '../../lib/dates.ts'

export function TransactionsPage() {
  const {
    transactions,
    categoryMap,
    currency,
    range,
    monthLabel,
    goPrevMonth,
    goNextMonth,
    goThisMonth,
  } = useAppState()
  const [q, setQ] = useState('')

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return transactions.filter((t) => {
      if (!inRange(t.date, range.start, range.end)) return false
      if (!needle) return true
      const cat = categoryMap.get(t.categoryId)?.name ?? ''
      return (
        t.payee.toLowerCase().includes(needle) ||
        t.notes.toLowerCase().includes(needle) ||
        cat.toLowerCase().includes(needle)
      )
    })
  }, [transactions, range, q, categoryMap])

  const groups: { date: string; items: typeof filtered }[] = []
  for (const t of filtered) {
    const last = groups[groups.length - 1]
    if (last && last.date === t.date) last.items.push(t)
    else groups.push({ date: t.date, items: [t] })
  }

  return (
    <div className="stack-lg">
      <div>
        <p className="page-kicker">Activity</p>
        <h1 className="page-title">This paycheck</h1>
      </div>
      <MonthSwitcher
        label={monthLabel}
        onPrev={goPrevMonth}
        onNext={goNextMonth}
        onReset={goThisMonth}
      />
      <label className="search">
        <Icon name="search" size={18} />
        <span className="sr-only">Search</span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Payee, notes, category"
        />
      </label>

      {groups.length === 0 ? (
        <EmptyState
          icon="list"
          title="Nothing this month"
          body=""
          action={
            <Link to="/add" className="btn btn-primary">
              Add transaction
            </Link>
          }
        />
      ) : (
        groups.map((g) => (
          <section key={g.date}>
            <div className="sticky-day">{formatShortDate(g.date)}</div>
            <div className="card" style={{ paddingTop: 4, paddingBottom: 4 }}>
              {g.items.map((t) => {
                const cat = categoryMap.get(t.categoryId)
                return (
                  <Link key={t.id} to={`/transactions/${t.id}`} className="list-row">
                    <CategoryGlyph category={cat} />
                    <div className="grow">
                      <div className="strong ellipsis">{t.payee || cat?.name || 'Transaction'}</div>
                      <div className="tiny muted ellipsis">{cat?.name}</div>
                    </div>
                    <MoneyText
                      cents={t.amountCents}
                      currency={currency}
                      tone={t.kind === 'income' ? 'in' : 'out'}
                      signed={t.kind === 'income'}
                    />
                  </Link>
                )
              })}
            </div>
          </section>
        ))
      )}
    </div>
  )
}
