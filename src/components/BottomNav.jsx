import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { House, Dumbbell, Apple, TrendingUp, ScanLine, Building2 } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../utils/supabase'

const baseTabs = [
  { to: '/home',       icon: House,      label: 'Home'     },
  { to: '/workout',    icon: Dumbbell,   label: 'Workout'  },
  { to: '/diet',       icon: Apple,      label: 'Diet'     },
  { to: '/progress',   icon: TrendingUp, label: 'Progress' },
  { to: '/form-coach', icon: ScanLine,   label: 'Form'     },
]

const myGymTab = { to: '/my-gym', icon: Building2, label: 'My Gym' }

export default function BottomNav() {
  const { user } = useAuth()
  const [hasGym, setHasGym] = useState(false)

  useEffect(() => {
    let cancelled = false
    if (!user) { setHasGym(false); return }
    ;(async () => {
      try {
        const { data } = await supabase
          .from('users')
          .select('gym_id')
          .eq('id', user.id)
          .maybeSingle()
        if (!cancelled) setHasGym(!!data?.gym_id)
      } catch {
        if (!cancelled) setHasGym(false)
      }
    })()
    return () => { cancelled = true }
  }, [user])

  const tabs = hasGym ? [...baseTabs, myGymTab] : baseTabs

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
