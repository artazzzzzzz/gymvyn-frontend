import { useEffect, useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { apiFetch } from '../utils/api'

/**
 * Poll /api/chat/conversations every 30 s and return the total unread count.
 * Returns 0 while loading or on error — never blocks rendering.
 */
function useChatUnreadCount() {
  const [unread, setUnread] = useState(0)
  const intervalRef = useRef(null)

  useEffect(() => {
    let cancelled = false

    async function poll() {
      try {
        const convos = await apiFetch('/api/chat/conversations')
        if (!cancelled && Array.isArray(convos)) {
          const total = convos.reduce((sum, c) => sum + (c.unread || 0), 0)
          setUnread(total)
        }
      } catch {
        // Silently keep the previous count on network failure
      }
    }

    poll()
    intervalRef.current = setInterval(poll, 30_000)

    return () => {
      cancelled = true
      clearInterval(intervalRef.current)
    }
  }, [])

  return unread
}

export default function TrainerBottomNav({ onMorePress }) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const chatUnread = useChatUnreadCount()

  const isActive = (path, exact = false) => {
    if (exact) return pathname === path
    return pathname.startsWith(path)
  }

  // When the trainer is on the chat page, mark as read locally
  const isChatActive = isActive('/trainer/chat')
  const displayUnread = isChatActive ? 0 : chatUnread

  const NAV_ITEMS = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      path: '/trainer/dashboard',
      exact: true,
      icon: (active) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
          stroke={active ? 'var(--text-primary)' : 'var(--text-tertiary)'} strokeWidth="1.8"
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
          stroke={active ? 'var(--text-primary)' : 'var(--text-tertiary)'} strokeWidth="1.8"
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
          stroke={active ? 'var(--text-primary)' : 'var(--text-tertiary)'} strokeWidth="1.8"
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
          stroke={active ? 'var(--text-primary)' : 'var(--text-tertiary)'} strokeWidth="1.8"
          strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
      ),
    },
  ]

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-[var(--bg-card)] border-t border-[var(--border)] h-16 pb-safe">
      <div className="grid grid-cols-5 h-full">

        {NAV_ITEMS.map(item => {
          const active = isActive(item.path, item.exact)
          const isChatItem = item.id === 'chat'
          const badgeCount = isChatItem ? displayUnread : 0

          return (
            <button
              key={item.id}
              onClick={() => navigate(item.navigateTo ?? item.path)}
              className="flex flex-col items-center justify-center gap-0.5 relative">
              {/* Icon wrapper — position:relative so badge can anchor to it */}
              <span className="relative inline-flex">
                {item.icon(active)}
                {badgeCount > 0 && (
                  <span
                    className="absolute -top-1 -right-1 flex items-center justify-center
                      min-w-[16px] h-[16px] px-[3px] rounded-full
                      bg-red-500 text-white text-[9px] font-bold leading-none"
                  >
                    {badgeCount > 99 ? '99+' : badgeCount}
                  </span>
                )}
              </span>
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

        {/* More */}
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
