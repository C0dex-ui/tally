import { NavLink } from 'react-router-dom'

export function BillTabs() {
  return (
    <div className="seg seg-3" role="tablist" aria-label="Bills">
      <NavLink
        to="/responsibilities"
        end
        role="tab"
        className={({ isActive }) => (isActive ? 'on' : '')}
      >
        Bills
      </NavLink>
      <NavLink to="/put-away" role="tab" className={({ isActive }) => (isActive ? 'on' : '')}>
        Put away
      </NavLink>
      <NavLink to="/utang" role="tab" className={({ isActive }) => (isActive ? 'on' : '')}>
        Utang
      </NavLink>
    </div>
  )
}
