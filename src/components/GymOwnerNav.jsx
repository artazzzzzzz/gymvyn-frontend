import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Users, Wallet, CalendarDays, UserCheck, Settings } from 'lucide-react'

const tabs = [
  { to: '/gym/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/gym/members',   icon: Users,           label: 'Members'   },
  { to: '/gym/payments',  icon: Wallet,          label: 'Payments'  },
  { to: '/gym/schedule',  icon: CalendarDays,    label: 'Schedule'  },
  { to: '/gym/trainers',  icon: UserCheck,       label: 'Trainers'  },
]

export default function GymOwnerNav() {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 bg-[#111113] border-t border-white/[0.06] backdrop-blur-md">
      <div className="flex items-stretch h-16 max-w-2xl mx-auto">
        {tabs.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/gym/dashboard'}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center gap-1 transition-colors duration-150 ${
                isActive ? 'text-emerald-400' : 'text-zinc-600 hover:text-zinc-400'
              }`
            }
          >
            <Icon size={18} strokeWidth={1.8} />
            <span className="text-[10px] font-medium tracking-wide">{label}</span>
          </NavLink>
        ))}
        <NavLink
          to="/gym/settings"
          className={({ isActive }) =>
            `w-14 flex flex-col items-center justify-center gap-1 transition-colors duration-150 border-l border-white/[0.06] ${
              isActive ? 'text-emerald-400' : 'text-zinc-600 hover:text-zinc-400'
            }`
          }
        >
          <Settings size={18} strokeWidth={1.8} />
          <span className="text-[10px] font-medium tracking-wide">Settings</span>
        </NavLink>
      </div>
    </nav>
  )
}
