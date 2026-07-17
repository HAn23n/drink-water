import { NavLink } from 'react-router-dom'
import { HomeIcon, ChartBarIcon, UserIcon } from '@heroicons/react/24/outline'
import {
  HomeIcon as HomeIconSolid,
  ChartBarIcon as ChartBarIconSolid,
  UserIcon as UserIconSolid,
} from '@heroicons/react/24/solid'

const ITEMS = [
  { to: '/', label: 'หน้าหลัก', Icon: HomeIcon, IconActive: HomeIconSolid },
  { to: '/history', label: 'ประวัติ', Icon: ChartBarIcon, IconActive: ChartBarIconSolid },
  { to: '/profile', label: 'โปรไฟล์', Icon: UserIcon, IconActive: UserIconSolid },
]

export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-4 z-20 flex justify-center px-4">
      <div className="flex gap-1 rounded-full bg-white/90 p-1.5 shadow-[0_16px_40px_-12px_rgba(11,79,115,0.35)] backdrop-blur">
        {ITEMS.map(({ to, label, Icon, IconActive }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-medium transition ${
                isActive ? 'bg-water-500 text-white shadow-md shadow-water-500/30' : 'text-slate-400 hover:text-water-600'
              }`
            }
          >
            {({ isActive }) => {
              const IconComponent = isActive ? IconActive : Icon
              return (
                <>
                  <IconComponent className="h-5 w-5" />
                  {label}
                </>
              )
            }}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
