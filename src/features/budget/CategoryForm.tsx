import { useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { PageHeader } from '../../components/chrome.tsx'
import { AmountField, KindToggle } from '../../components/fields.tsx'
import { ConfirmDialog } from '../../components/display.tsx'
import { Icon, type IconName } from '../../components/Icon.tsx'
import { useAppState } from '../../context/AppState.tsx'
import { addCategory, archiveCategory, updateCategory } from '../../db/ops.ts'
import { centsToMajorString, parseMajorInput } from '../../lib/money.ts'
import type { MoneyKind } from '../../db/types.ts'

const ICONS: IconName[] = [
  'home',
  'cart',
  'utensils',
  'car',
  'zap',
  'heart',
  'smile',
  'bag',
  'repeat',
  'bank',
  'plus',
  'more',
  'bill',
  'target',
]

const COLORS = [
  '#5B7C6A',
  '#3D7A54',
  '#C45C3E',
  '#3E6B8A',
  '#C9A227',
  '#B4566C',
  '#6B5B95',
  '#8A5A3E',
  '#4A6FA5',
  '#6E726E',
  '#2F6B4F',
]

export function CategoryForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { categories, currency } = useAppState()
  const existing = id ? categories.find((c) => c.id === id) : undefined
  const [kind, setKind] = useState<MoneyKind>(existing?.kind ?? 'expense')
  const [name, setName] = useState(existing?.name ?? '')
  const [icon, setIcon] = useState<IconName>((existing?.icon as IconName) || 'more')
  const [color, setColor] = useState(existing?.color ?? COLORS[0])
  const [limit, setLimit] = useState(
    existing && existing.monthlyLimitCents > 0
      ? centsToMajorString(existing.monthlyLimitCents, currency)
      : '',
  )
  const [error, setError] = useState('')
  const [confirm, setConfirm] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      setError('Give it a name.')
      return
    }
    const cents = limit.trim() === '' ? 0 : parseMajorInput(limit, currency)
    if (cents === null) {
      setError('Monthly amount looks invalid.')
      return
    }
    try {
      if (existing) {
        await updateCategory(existing.id, {
          name: name.trim(),
          kind,
          icon,
          color,
          monthlyLimitCents: cents,
        })
      } else {
        await addCategory({
          name: name.trim(),
          kind,
          icon,
          color,
          monthlyLimitCents: cents,
        })
      }
      navigate('/budget')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save.')
    }
  }

  return (
    <>
      <PageHeader title={existing ? 'Edit category' : 'New category'} backTo="/budget" />
      <form className="stack-lg" onSubmit={(e) => void onSubmit(e)}>
        <KindToggle value={kind} onChange={setKind} />
        <div className="field">
          <label htmlFor="cat-name">Name</label>
          <input id="cat-name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <AmountField
          id="limit"
          label={
            kind === 'income'
              ? 'Planned per paycheck (optional)'
              : 'Limit until next payday (optional)'
          }
          value={limit}
          onChange={setLimit}
          currency={currency}
        />
        <div className="field">
          <span className="label">Icon</span>
          <div className="chips">
            {ICONS.map((n) => (
              <button
                key={n}
                type="button"
                className={`chip ${icon === n ? 'on' : ''}`}
                onClick={() => setIcon(n)}
                aria-label={n}
              >
                <Icon name={n} size={18} />
              </button>
            ))}
          </div>
        </div>
        <div className="field">
          <span className="label">Color</span>
          <div className="chips">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                className={`chip ${color === c ? 'on' : ''}`}
                onClick={() => setColor(c)}
                aria-label={c}
                style={{ background: c, width: 36, minHeight: 36, padding: 0 }}
              />
            ))}
          </div>
        </div>
        {error ? <p className="error">{error}</p> : null}
        <button type="submit" className="btn btn-primary">
          Save
        </button>
        {existing ? (
          <button type="button" className="btn btn-danger" onClick={() => setConfirm(true)}>
            Archive
          </button>
        ) : null}
      </form>
      <ConfirmDialog
        open={confirm}
        title="Archive this category?"
        body="Hidden from pickers. Old transactions keep the name."
        confirmLabel="Archive"
        danger
        onCancel={() => setConfirm(false)}
        onConfirm={() => {
          if (!existing) return
          void archiveCategory(existing.id).then(() => navigate('/budget'))
        }}
      />
    </>
  )
}
