import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Icon, type IconName } from './Icon.tsx'

const nav: { to: string; label: string; icon: IconName }[] = [
  { to: '/', label: 'Home', icon: 'home' },
  { to: '/transactions', label: 'Activity', icon: 'list' },
  { to: '/responsibilities', label: 'Bills', icon: 'bill' },
  { to: '/budget', label: 'Budget', icon: 'pie' },
  { to: '/more', label: 'More', icon: 'more' },
]

function moreActive(pathname: string): boolean {
  return (
    pathname === '/more' ||
    pathname.startsWith('/more/') ||
    pathname === '/goals' ||
    pathname.startsWith('/goals/') ||
    pathname === '/borrowed'
  )
}

export function Shell() {
  const location = useLocation()
  return (
    <div className="app-shell">
      <main className="app-main">
        <Outlet />
      </main>
      <nav className="app-nav" aria-label="Main">
        {nav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) => {
              if (item.to === '/more') return moreActive(location.pathname) ? 'active' : ''
              return isActive ? 'active' : ''
            }}
          >
            <Icon name={item.icon} size={22} />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <Fab />
    </div>
  )
}

function Fab() {
  const navigate = useNavigate()
  const location = useLocation()
  if (location.pathname === '/add') return null
  return (
    <button
      type="button"
      className="fab"
      aria-label="Add transaction"
      onClick={() => navigate('/add')}
    >
      <Icon name="plus" size={26} />
    </button>
  )
}

export function FormShell() {
  return (
    <div className="form-shell">
      <div className="form-main">
        <Outlet />
      </div>
    </div>
  )
}

export function PageHeader({
  title,
  backTo,
}: {
  title: string
  backTo?: string
}) {
  const navigate = useNavigate()
  return (
    <header className="page-header">
      <button
        type="button"
        className="icon-btn"
        aria-label="Back"
        onClick={() => (backTo ? navigate(backTo) : navigate(-1))}
      >
        <Icon name="chevronLeft" />
      </button>
      <h1>{title}</h1>
    </header>
  )
}
