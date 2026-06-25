import { useNavigate, useLocation } from 'react-router-dom'

export default function BottomNav({ onMorePress }) {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  const isActive = (path) => {
    if (path === '/more') return false
    if (path === '/home') return pathname === '/home'
    return pathname.startsWith(path)
  }

  const NAV_ITEMS = [
    {
      id: 'home',
      label: 'Home',
      path: '/home',
      icon: (active) => (
        <svg width="22" height="22" viewBox="0 0 24 24"
          fill={active ? 'var(--text-primary)' : 'none'}
          stroke={active ? 'var(--text-primary)' : 'var(--text-tertiary)'}
          strokeWidth="1.8" strokeLinecap="round"
          strokeLinejoin="round">
          <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9.5z"/>
          <polyline points="9,21 9,12 15,12 15,21"
            stroke={active ? 'var(--bg-card)' : 'var(--text-tertiary)'}
            fill="none"/>
        </svg>
      ),
    },
    {
      id: 'workout',
      label: 'Workout',
      path: '/workout',
      icon: (active) => (
        <svg width="22" height="22" viewBox="0 0 24 24"
          fill="none"
          stroke={active ? 'var(--text-primary)' : 'var(--text-tertiary)'}
          strokeWidth="1.8" strokeLinecap="round"
          strokeLinejoin="round">
          <path d="M6.5 6.5h11M6.5 17.5h11"/>
          <line x1="3" y1="9" x2="3" y2="15" strokeWidth="3"/>
          <line x1="21" y1="9" x2="21" y2="15" strokeWidth="3"/>
          <line x1="6" y1="6" x2="6" y2="18" strokeWidth="2.5"/>
          <line x1="18" y1="6" x2="18" y2="18" strokeWidth="2.5"/>
        </svg>
      ),
    },
    {
      id: 'diet',
      label: 'Diet',
      path: '/diet',
      icon: (active) => (
        <svg width="22" height="22" viewBox="0 0 24 24"
          fill="none"
          stroke={active ? 'var(--text-primary)' : 'var(--text-tertiary)'}
          strokeWidth="1.8" strokeLinecap="round"
          strokeLinejoin="round">
          <line x1="12" y1="2" x2="12" y2="6"/>
          <path d="M17.66 7.93A9 9 0 1 1 6.34 7.93"/>
          <path d="M17.66 7.93L12 13"/>
        </svg>
      ),
    },
    {
      id: 'progress',
      label: 'Progress',
      path: '/progress',
      icon: (active) => (
        <svg width="22" height="22" viewBox="0 0 24 24"
          fill="none"
          stroke={active ? 'var(--text-primary)' : 'var(--text-tertiary)'}
          strokeWidth="1.8" strokeLinecap="round"
          strokeLinejoin="round">
          <line x1="18" y1="20" x2="18" y2="10"/>
          <line x1="12" y1="20" x2="12" y2="4"/>
          <line x1="6" y1="20" x2="6" y2="14"/>
        </svg>
      ),
    },
  ]

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-[var(--bg-card)] border-t border-[var(--border)] h-16 pb-safe">
      <div className="grid grid-cols-5 h-full">

        {/* Regular nav items */}
        {NAV_ITEMS.map(item => {
          const active = isActive(item.path)
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className="flex flex-col items-center justify-center gap-0.5 relative">
              {item.icon(active)}
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

        {/* More button — opens sheet, never navigates */}
        <button
          onClick={onMorePress}
          className="flex flex-col items-center justify-center gap-0.5">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" strokeLinecap="round">
            <circle cx="5"  cy="12" r="1.5" fill="var(--text-tertiary)"/>
            <circle cx="12" cy="12" r="1.5" fill="var(--text-tertiary)"/>
            <circle cx="19" cy="12" r="1.5" fill="var(--text-tertiary)"/>
          </svg>
          <span className="text-[10px] font-normal text-[var(--text-tertiary)]">More</span>
        </button>

      </div>
    </div>
  )
}
