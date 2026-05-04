import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Users, ClipboardCheck, BarChart3, UserCog } from 'lucide-react'

const tabs = [
  { to: '/gym/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/gym/members',   icon: Users,           label: 'Members'   },
  { to: '/gym/checkins',  icon: ClipboardCheck,  label: 'Check-ins' },
  { to: '/gym/insights',  icon: BarChart3,       label: 'Insights'  },
  { to: '/gym/profile',   icon: UserCog,         label: 'Profile'   },
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
      </div>
    </nav>
  )
}
