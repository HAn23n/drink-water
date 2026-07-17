import { NavLink } from 'react-router-dom'

const ITEMS = [
  { to: '/', label: 'หน้าหลัก', icon: '🏠' },
  { to: '/history', label: 'ประวัติ', icon: '📊' },
  { to: '/profile', label: 'โปรไฟล์', icon: '👤' },
]

export function BottomNav() {
  return (
    <nav className="sticky bottom-0 flex border-t border-water-100 bg-white">
      {ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/'}
          className={({ isActive }) =>
            `flex flex-1 flex-col items-center gap-0.5 py-2 text-xs ${
              isActive ? 'text-water-600' : 'text-slate-400'
            }`
          }
        >
          <span className="text-lg">{item.icon}</span>
          {item.label}
        </NavLink>
      ))}
    </nav>
  )
}
