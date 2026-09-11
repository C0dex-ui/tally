import { NavLink } from 'react-router-dom'

export function FundTabs() {
  return (
    <div className="seg" role="tablist" aria-label="Fund">
      <NavLink to="/goals" end role="tab" className={({ isActive }) => (isActive ? 'on' : '')}>
        Fund
      </NavLink>
      <NavLink to="/borrowed" role="tab" className={({ isActive }) => (isActive ? 'on' : '')}>
        Borrowed
      </NavLink>
    </div>
  )
}
