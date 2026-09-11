import { Link } from 'react-router-dom'
import { Icon, type IconName } from '../../components/Icon.tsx'

const links: { to: string; title: string; body: string; icon: IconName }[] = [
  { to: '/goals', title: 'Goals', body: 'Emergency fund', icon: 'target' },
  { to: '/borrowed', title: 'Borrowed', body: 'From emergency fund', icon: 'wallet' },
  { to: '/more/reports', title: 'Reports', body: 'Trends', icon: 'pie' },
  { to: '/more/settings', title: 'Settings', body: 'Backup, theme', icon: 'settings' },
]

export function MorePage() {
  return (
    <div className="stack-lg">
      <div>
        <p className="page-kicker">Tally</p>
        <h1 className="page-title">More</h1>
      </div>
      {links.map((l) => (
        <Link key={l.to} to={l.to} className="card tap list-row" style={{ borderBottom: 0 }}>
          <span className="cat-glyph" style={{ background: 'var(--sage-soft)', color: 'var(--sage)' }}>
            <Icon name={l.icon} />
          </span>
          <div className="grow">
            <div className="strong">{l.title}</div>
            <div className="tiny muted">{l.body}</div>
          </div>
          <Icon name="chevronRight" />
        </Link>
      ))}

    </div>
  )
}
