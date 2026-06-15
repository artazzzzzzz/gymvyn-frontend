import { useNavigate, useLocation } from 'react-router-dom'

export default function TrainerBottomNav({ onMorePress }) {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  const isActive = (path, exact = false) => {
    if (exact) return pathname === path
    return pathname.startsWith(path)
  }

  const NAV_ITEMS = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      path: '/trainer/dashboard',
      exact: true,
      icon: (active) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
          stroke={active ? '#111' : '#CCC'} strokeWidth="1.8"
          strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7"/>
          <rect x="14" y="3" width="7" height="7"/>
          <rect x="14" y="14" width="7" height="7"/>
          <rect x="3" y="14" width="7" height="7"/>
        </svg>
      ),
    },
    {
      id: 'clients',
      label: 'Clients',
      path: '/trainer/client',
      navigateTo: '/trainer/clients',
      icon: (active) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
          stroke={active ? '#111' : '#CCC'} strokeWidth="1.8"
          strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
      ),
    },
    {
      id: 'templates',
      label: 'Templates',
      path: '/trainer/templates',
      icon: (active) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
          stroke={active ? '#111' : '#CCC'} strokeWidth="1.8"
          strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="9" y1="13" x2="15" y2="13"/>
          <line x1="9" y1="17" x2="13" y2="17"/>
        </svg>
      ),
    },
    {
      id: 'chat',
      label: 'Chat',
      path: '/trainer/chat',
      icon: (active) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
          stroke={active ? '#111' : '#CCC'} strokeWidth="1.8"
          strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
      ),
    },
  ]

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-black/[0.06] h-16 pb-safe">
      <div className="grid grid-cols-5 h-full">

        {NAV_ITEMS.map(item => {
          const active = isActive(item.path, item.exact)
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.navigateTo ?? item.path)}
              className="flex flex-col items-center justify-center gap-0.5 relative">
              {item.icon(active)}
              <span className={`text-[10px] transition-colors ${
                active ? 'font-semibold text-[#111]' : 'font-normal text-[#CCC]'
              }`}>
                {item.label}
              </span>
              {active && (
                <span className="absolute bottom-1 w-1 h-1 bg-[#111] rounded-full"/>
              )}
            </button>
          )
        })}

        {/* More */}
        <button
          onClick={onMorePress}
          className="flex flex-col items-center justify-center gap-0.5">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" strokeLinecap="round">
            <circle cx="5"  cy="12" r="1.5" fill="#CCC"/>
            <circle cx="12" cy="12" r="1.5" fill="#CCC"/>
            <circle cx="19" cy="12" r="1.5" fill="#CCC"/>
          </svg>
          <span className="text-[10px] font-normal text-[#CCC]">More</span>
        </button>

      </div>
    </div>
  )
}
