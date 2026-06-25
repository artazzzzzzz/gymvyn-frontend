import { useNavigate, useLocation } from 'react-router-dom'

export default function GymBottomNav({ onMorePress }) {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  const isActive = (path) => {
    if (!path) return false
    if (path === '/more') return false
    if (path === '/home') return pathname === '/home'
    return pathname.startsWith(path)
  }

  const tabs = [
    {
      label: 'Dashboard',
      path: '/gym/dashboard',
      icon: 'ti-layout-dashboard',
    },
    {
      label: 'Members',
      path: '/gym/members',
      icon: 'ti-users',
    },
    {
      label: 'Payments',
      path: '/gym/payments',
      icon: 'ti-cash',
    },
    {
      label: 'Schedule',
      path: '/gym/schedule',
      icon: 'ti-calendar',
    },
    {
      label: 'More',
      path: null,
      icon: 'ti-dots',
      isMore: true,
    },
  ]

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-[var(--bg-card)] border-t border-[var(--border)] h-16 pb-safe">
      <div className="grid grid-cols-5 h-full">

        {tabs.map((item, index) => {
          if (item.isMore) {
            return (
              <button
                key={index}
                onClick={onMorePress}
                className="flex flex-col items-center justify-center gap-0.5">
                <i className={`ti ${item.icon} text-[22px] text-[var(--text-tertiary)]`}></i>
                <span className="text-[10px] font-normal text-[var(--text-tertiary)]">More</span>
              </button>
            )
          }

          const active = isActive(item.path)
          return (
            <button
              key={index}
              onClick={() => navigate(item.path)}
              className="flex flex-col items-center justify-center gap-0.5 relative">
              <i className={`ti ${item.icon} text-[22px] ${active ? 'text-[var(--text-primary)]' : 'text-[var(--text-tertiary)]'}`}></i>
              <span className={`text-[10px] transition-colors ${
                active ? 'font-semibold text-[var(--text-primary)]' : 'font-normal text-[var(--text-tertiary)]'
              }`}>
                {item.label}
              </span>
              {active && (
                <span className="absolute bottom-1 w-1 h-1 bg-[var(--text-primary)] rounded-full"/>
              )}
            </button>
          )
        })}

      </div>
    </div>
  )
}
