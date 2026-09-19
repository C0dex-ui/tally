import { NavLink } from 'react-router-dom'

export function FundTabs() {
  return (
    <div className="seg seg-3" role="tablist" aria-label="Fund">
      <NavLink to="/goals" end role="tab" className={({ isActive }) => (isActive ? 'on' : '')}>
        Fund
      </NavLink>
      <NavLink to="/borrowed" role="tab" className={({ isActive }) => (isActive ? 'on' : '')}>
        Borrowed
      </NavLink>
      <NavLink to="/missed" role="tab" className={({ isActive }) => (isActive ? 'on' : '')}>
        Missed
      </NavLink>
    </div>
  )
}
