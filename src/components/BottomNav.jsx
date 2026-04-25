import { NavLink } from 'react-router-dom'
import { House, Dumbbell, Apple, TrendingUp, ScanLine } from 'lucide-react'

const tabs = [
  { to: '/home',       icon: House,      label: 'Home'     },
  { to: '/workout',    icon: Dumbbell,   label: 'Workout'  },
  { to: '/diet',       icon: Apple,      label: 'Diet'     },
  { to: '/progress',   icon: TrendingUp, label: 'Progress' },
  { to: '/form-coach', icon: ScanLine,   label: 'Form'     },
]

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 bg-[#111113] border-t border-white/[0.06]">
      <div className="flex items-stretch h-16 max-w-lg mx-auto">
        {tabs.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center gap-1 transition-colors duration-150 ${
                isActive ? 'text-emerald-400' : 'text-zinc-600 hover:text-zinc-400'
              }`
            }
          >
            <Icon size={20} strokeWidth={1.8} />
            <span className="text-[10px] font-medium tracking-wide">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
