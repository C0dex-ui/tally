import { useState } from 'react'
import { AmountField } from '../../components/fields.tsx'
import { PAYDAY_PRESETS } from '../../lib/payPeriod.ts'
import { useAppState } from '../../context/AppState.tsx'
import { completeOnboarding } from '../../db/ops.ts'
import { ONBOARDING_BUDGET_IDS } from '../../db/seed.ts'
import { CURRENCIES, parseMajorInput } from '../../lib/money.ts'

export function Onboarding() {
  const { categories, settings } = useAppState()
  const [step, setStep] = useState(0)
  const [displayName, setDisplayName] = useState(settings.displayName || 'Leonel')
  const [currency, setCurrency] = useState(settings.currency || 'USD')
  const [income, setIncome] = useState('')
  const [repeatIncome, setRepeatIncome] = useState(true)
  const [preset, setPreset] = useState<(typeof PAYDAY_PRESETS)[number]['id']>('halves')
  const [limits, setLimits] = useState<Record<string, string>>({})
  const [error, setError] = useState('')

  const budgetCats = categories.filter((c) =>
    (ONBOARDING_BUDGET_IDS as readonly string[]).includes(c.id),
  )

  async function finish() {
    const incomeCents = income.trim() === '' ? 0 : parseMajorInput(income, currency)
    if (income.trim() && (incomeCents === null || incomeCents <= 0)) {
      setError('Income amount looks invalid.')
      return
    }
    const parsedLimits: { id: string; monthlyLimitCents: number }[] = []
    for (const cat of budgetCats) {
      const raw = limits[cat.id] ?? ''
      if (!raw.trim()) {
        parsedLimits.push({ id: cat.id, monthlyLimitCents: 0 })
        continue
      }
      const cents = parseMajorInput(raw, currency)
      if (cents === null) {
        setError(`Check the ${cat.name} limit.`)
        return
      }
      parsedLimits.push({ id: cat.id, monthlyLimitCents: cents })
    }
    setError('')
    const pay = PAYDAY_PRESETS.find((p) => p.id === preset) ?? PAYDAY_PRESETS[0]
    await completeOnboarding({
      displayName,
      currency,
      incomeCents: incomeCents ?? 0,
      repeatIncome,
      payday1: pay.payday1,
      payday2: pay.payday2,
      limits: parsedLimits,
    })
  }

  return (
    <div className="app-shell">
      <div className="onboarding">
        <div className="step-dots">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className={i === step ? 'on' : ''} />
          ))}
        </div>

        {step === 0 ? (
          <>
            <p className="page-kicker">Welcome</p>
            <h1>Keep your budget on this device.</h1>
            <p className="hint">No account required. Export a backup from Settings.</p>
            <div className="field">
              <label htmlFor="ob-name">Name</label>
              <input
                id="ob-name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Leonel"
              />
            </div>
            <div className="field">
              <label htmlFor="ob-currency">Currency</label>
              <select
                id="ob-currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <button type="button" className="btn btn-primary" onClick={() => setStep(1)}>
              Continue
            </button>
          </>
        ) : null}

        {step === 1 ? (
          <>
            <p className="page-kicker">Paycheck</p>
            <h1>One paycheck</h1>
            <AmountField
              id="ob-income"
              label="One paycheck"
              value={income}
              onChange={setIncome}
              currency={currency}
            />
            <div className="field">
              <span className="label">Pay schedule</span>
              <div className="stack">
                {PAYDAY_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className={`chip ${preset === p.id ? 'on' : ''}`}
                    onClick={() => setPreset(p.id)}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <label className="list-row" style={{ border: 0 }}>
              <div className="grow">
                <div className="strong">Add a payday reminder</div>
              </div>
              <input
                type="checkbox"
                checked={repeatIncome}
                onChange={(e) => setRepeatIncome(e.target.checked)}
              />
            </label>
            {error ? <p className="error">{error}</p> : null}
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                if (income.trim()) {
                  const cents = parseMajorInput(income, currency)
                  if (cents === null || cents <= 0) {
                    setError('Income amount looks invalid.')
                    return
                  }
                }
                setError('')
                setStep(2)
              }}
            >
              Continue
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setIncome('')
                setError('')
                setStep(2)
              }}
            >
              Skip
            </button>
          </>
        ) : null}

        {step === 2 ? (
          <>
            <p className="page-kicker">Limits</p>
            <h1>Until next payday</h1>
            <p className="hint">Optional limits per paycheck. Leave blank for none.</p>
            {budgetCats.map((c) => (
              <AmountField
                key={c.id}
                id={`lim-${c.id}`}
                label={c.name}
                value={limits[c.id] ?? ''}
                onChange={(v) => setLimits((prev) => ({ ...prev, [c.id]: v }))}
                currency={currency}
              />
            ))}
            {error ? <p className="error">{error}</p> : null}
            <button type="button" className="btn btn-primary" onClick={() => setStep(3)}>
              Continue
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setStep(3)}>
              Skip
            </button>
          </>
        ) : null}

        {step === 3 ? (
          <>
            <p className="page-kicker">Backup</p>
            <h1>Export a backup from Settings.</h1>
            <p className="hint">Clearing site data permanently deletes this budget.</p>
            {error ? <p className="error">{error}</p> : null}
            <button type="button" className="btn btn-primary" onClick={() => void finish()}>
              Open Tally
            </button>
          </>
        ) : null}
      </div>
    </div>
  )
}
