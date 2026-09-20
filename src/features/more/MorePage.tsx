import { Link } from 'react-router-dom'
import { Icon, type IconName } from '../../components/Icon.tsx'

const links: { to: string; title: string; body: string; icon: IconName }[] = [
  { to: '/goals', title: 'Goals', body: 'Emergency fund and other targets', icon: 'target' },
  { to: '/borrowed', title: 'Borrowed', body: 'Amounts drawn from the emergency fund', icon: 'wallet' },
  { to: '/missed', title: 'Missed', body: 'Short months to restore', icon: 'calendar' },
  { to: '/over', title: 'Over', body: 'Daily limit overages', icon: 'flag' },
  { to: '/put-away', title: 'Put away', body: 'Bills and goals this paycheck', icon: 'piggy' },
  { to: '/utang', title: 'Utang', body: 'Personal amounts owed. Does not affect remaining cash.', icon: 'wallet' },
  { to: '/more/reports', title: 'Reports', body: 'Spending trends', icon: 'pie' },
  { to: '/more/settings', title: 'Settings', body: 'Backup and appearance', icon: 'settings' },
]

export function MorePage() {
  return (
    <div className="stack-lg">
      <div>
        <p className="page-kicker">Menu</p>
        <h1 className="page-title">More</h1>
      </div>
      <section className="card" style={{ paddingTop: 6, paddingBottom: 6 }}>
        {links.map((l) => (
          <Link key={l.to} to={l.to} className="list-row">
            <span className="cat-glyph" style={{ background: 'var(--sage-soft)', color: 'var(--sage)' }}>
              <Icon name={l.icon} size={20} />
            </span>
            <div className="grow">
              <div className="strong">{l.title}</div>
              <div className="tiny muted">{l.body}</div>
            </div>
            <span className="muted" style={{ display: 'grid' }}>
              <Icon name="chevronRight" size={18} />
            </span>
          </Link>
        ))}
      </section>
    </div>
  )
}
