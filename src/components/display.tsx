import type { ReactNode } from 'react'
import { ResponsiveContainer } from 'recharts'
import { Icon, isIconName, type IconName } from './Icon.tsx'
import { formatMoney } from '../lib/money.ts'
import type { Category } from '../db/types.ts'

export function MoneyText({
  cents,
  currency,
  tone = 'neutral',
  signed = false,
}: {
  cents: number
  currency: string
  tone?: 'in' | 'out' | 'neutral'
  signed?: boolean
}) {
  const cls =
    tone === 'in' ? 'money-in' : tone === 'out' ? 'money-out' : 'money-neutral'
  return <span className={`${cls} tabular`}>{formatMoney(cents, currency, { signed })}</span>
}

export function CategoryGlyph({
  category,
  fallback = 'more',
}: {
  category?: Category
  fallback?: IconName
}) {
  const color = category?.color ?? '#6E726E'
  const icon = category?.icon && isIconName(category.icon) ? category.icon : fallback
  return (
    <span className="cat-glyph" style={{ background: `${color}22`, color }}>
      <Icon name={icon} size={20} />
    </span>
  )
}

export function ProgressBar({
  value,
  over = false,
}: {
  value: number
  over?: boolean
}) {
  const width = Math.min(100, Math.max(0, value * 100))
  return (
    <div className={`progress${over ? ' over' : ''}`}>
      <span style={{ width: `${width}%` }} />
    </div>
  )
}

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: IconName
  title: string
  body?: string
  action?: ReactNode
}) {
  return (
    <div className="empty card">
      <Icon name={icon} size={28} />
      <h3>{title}</h3>
      {body ? <p className="muted">{body}</p> : null}
      {action ? <div style={{ marginTop: 12 }}>{action}</div> : null}
    </div>
  )
}

export function ChartFrame({ children }: { children: ReactNode }) {
  return (
    <div className="chart-wrap">
      <ResponsiveContainer
        width="100%"
        height={220}
        initialDimension={{ width: 320, height: 220 }}
      >
        {children}
      </ResponsiveContainer>
    </div>
  )
}

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel = 'Confirm',
  danger = false,
  onConfirm,
  onCancel,
}: {
  open: boolean
  title: string
  body: string
  confirmLabel?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  if (!open) return null
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
      <div className="sheet">
        <h2 id="confirm-title">{title}</h2>
        <p className="hint">{body}</p>
        <div className="btn-row" style={{ marginTop: 16 }}>
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
