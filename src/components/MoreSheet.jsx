import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../utils/supabase'

const BASE = import.meta.env.VITE_API_URL

// ── Icon helpers ──────────────────────────────────────────────────────────────

const IconUsers = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
)

const IconBarChart = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10"/>
    <line x1="12" y1="20" x2="12" y2="4"/>
    <line x1="6"  y1="20" x2="6"  y2="14"/>
  </svg>
)

const IconScan = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="4 7 4 4 7 4"/>
    <polyline points="17 4 20 4 20 7"/>
    <polyline points="20 17 20 20 17 20"/>
    <polyline points="7 20 4 20 4 17"/>
    <line x1="4" y1="12" x2="20" y2="12"/>
  </svg>
)

const IconSettings = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>
)

const IconLayout = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7"/>
    <rect x="14" y="3" width="7" height="7"/>
    <rect x="14" y="14" width="7" height="7"/>
    <rect x="3" y="14" width="7" height="7"/>
  </svg>
)

const IconClipboard = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
    <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
    <line x1="9" y1="12" x2="15" y2="12"/>
    <line x1="9" y1="16" x2="13" y2="16"/>
  </svg>
)

const IconCommunity = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
)

const IconFormCoach = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
    <polyline points="9 11 12 14 15 11"/>
  </svg>
)

const IconChat = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
)

// ── Item lists per role ───────────────────────────────────────────────────────

const IconPackage = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/>
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
    <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
    <line x1="12" y1="22.08" x2="12" y2="12"/>
  </svg>
)

const IconReceipt = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1z"/>
    <line x1="9" y1="9" x2="15" y2="9"/>
    <line x1="9" y1="13" x2="15" y2="13"/>
    <line x1="9" y1="17" x2="12" y2="17"/>
  </svg>
)

const IconKey = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="7.5" cy="15.5" r="5.5"/>
    <path d="M21 2l-9.6 9.6"/>
    <path d="M15.5 7.5l3 3L22 7l-3-3"/>
  </svg>
)

const IconBadge = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2l2.4 4.9L20 7.6l-4 3.9 1 5.5L12 14.4l-5 2.6 1-5.5L4 7.6l5.6-.7z"/>
    <polyline points="9 11 11 13 15 9"/>
  </svg>
)

const IconFeed = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 6h16M4 12h16M4 18h7"/>
  </svg>
)

const IconDumbbell = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6.5 6.5h11"/>
    <path d="M6.5 17.5h11"/>
    <path d="M4 8.5v7"/>
    <path d="M20 8.5v7"/>
    <path d="M2 10v4"/>
    <path d="M22 10v4"/>
    <rect x="3" y="8" width="2" height="8" rx="1"/>
    <rect x="19" y="8" width="2" height="8" rx="1"/>
    <rect x="1" y="10" width="2" height="4" rx="1"/>
    <rect x="21" y="10" width="2" height="4" rx="1"/>
    <line x1="7" y1="12" x2="17" y2="12"/>
  </svg>
)

const IconBarChart2 = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10"/>
    <line x1="12" y1="20" x2="12" y2="4"/>
    <line x1="6"  y1="20" x2="6"  y2="14"/>
    <line x1="2"  y1="20" x2="22" y2="20"/>
  </svg>
)

const IconWallet = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/>
    <path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/>
    <path d="M18 12a2 2 0 0 0 0 4h4v-4z"/>
  </svg>
)

const GYM_OWNER_BASE_ITEMS = [
  { id: 'chat',         label: 'Chat',             sub: 'Message staff, trainers & members', path: '/gym/chat',  icon: <IconChat /> },
  { id: 'feed',         label: 'Gym Feed',         sub: 'Posts, tips & achievements',  path: '/gym/feed',         icon: <IconFeed /> },
  { id: 'reports',      label: 'Reports',          sub: 'Revenue & analytics reports', path: '/gym/reports',      icon: <IconBarChart2 /> },
  { id: 'insights',     label: 'Insights',         sub: 'Analytics & occupancy',       path: '/gym/insights',     icon: <IconBarChart /> },
  { id: 'supplements',  label: 'Supplements',      sub: 'Products & member orders',    path: '/gym/supplements',  icon: <IconPackage /> },
  { id: 'expenses',         label: 'Expense Tracker',  sub: 'Log & track gym spending',      path: '/gym/expenses',         icon: <IconReceipt /> },
  { id: 'trainer-payouts', label: 'Trainer Payouts', sub: 'Earnings & payout management', path: '/gym/trainer-payouts',  icon: <IconWallet /> },
  { id: 'equipment',       label: 'Equipment',        sub: 'Track & schedule maintenance', path: '/gym/equipment',        icon: <IconDumbbell /> },
  { id: 'checkin',      label: 'Check-in',         sub: 'Scan member QR codes',        path: '/gym/checkin',      icon: <IconScan /> },
  { id: 'staff',        label: 'Staff',            sub: 'Manage front desk access',    path: '/gym/staff',        icon: <IconBadge /> },
  { id: 'trainers',     label: 'Trainers',         sub: 'Manage your staff',           path: '/gym/trainers',     icon: <IconUsers /> },
  { id: 'gym-settings', label: 'Settings',         sub: 'Gym profile & plans',         path: '/gym/settings',     icon: <IconSettings /> },
]

const LOCKERS_ITEM = { id: 'lockers', label: 'Lockers', sub: 'Assign & manage lockers', path: '/gym/lockers', icon: <IconKey /> }

const TRAINER_ITEMS = [
  { id: 'gym-feed',    label: 'Gym Feed',     sub: 'Posts & trainer tips',   path: '/trainer/feed',         icon: <IconFeed /> },
  { id: 'templates',   label: 'Templates',    sub: 'Workout plan library',   path: '/trainer/templates',    icon: <IconLayout /> },
  { id: 'assign-plan',   label: 'Assign Plan',  sub: 'Send plan to client',    path: '/trainer/assign-plan',  icon: <IconClipboard /> },
  { id: 't-earnings',   label: 'Earnings',     sub: 'Your pay & session log', path: '/trainer/earnings',     icon: <IconWallet /> },
  { id: 't-settings',   label: 'Settings',     sub: 'Account & preferences',  path: '/trainer/settings',     icon: <IconSettings /> },
]

const CONSUMER_ITEMS = [
  { id: 'community',   label: 'Community',    sub: 'Connect with others',    path: '/community',    icon: <IconCommunity /> },
  { id: 'formcoach',   label: 'Form Coach',   sub: 'AI-powered form check',  path: '/form-coach',   icon: <IconFormCoach /> },
  { id: 'chat',        label: 'Chat',         sub: 'Messages & support',     path: '/client/chat',  icon: <IconChat /> },
  { id: 'settings',    label: 'Settings',     sub: 'Account & app preferences', path: '/settings', icon: <IconSettings /> },
]

// ── Component ─────────────────────────────────────────────────────────────────

// Accepts both `isOpen` and `open` for backwards-compatibility with gym pages
// that pass one or the other.
function badgeLabel(pending, lowStock) {
  const n = pending > 0 ? pending : lowStock
  if (n <= 0) return null
  return n > 9 ? '9+' : String(n)
}

export default function MoreSheet({ isOpen, open, onClose, hasGym = false, hasTrainer = false, onOpenJoinGym, onOpenJoinTrainer }) {
  const navigate = useNavigate()
  const { role } = useAuth()

  const visible = isOpen ?? open ?? false

  const [supplementBadge, setSupplementBadge] = useState(null)
  const [lockersEnabled, setLockersEnabled] = useState(false)
  const [lockersBadge, setLockersBadge] = useState(null)

  useEffect(() => {
    if (!visible || role !== 'gym_owner') return
    async function fetchBadges() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const token = session?.access_token
        const headers = { Authorization: `Bearer ${token}` }
        const [pendingRes, lowStockRes, lockerSettingsRes] = await Promise.all([
          fetch(`${BASE}/api/supplements/orders?status=pending`, { headers }),
          fetch(`${BASE}/api/supplements/products/low-stock`, { headers }),
          fetch(`${BASE}/api/lockers/settings`, { headers }),
        ])
        const pending  = pendingRes.ok  ? await pendingRes.json()  : []
        const lowStock = lowStockRes.ok ? await lowStockRes.json() : []
        setSupplementBadge(badgeLabel(
          Array.isArray(pending)  ? pending.length  : 0,
          Array.isArray(lowStock) ? lowStock.length : 0,
        ))
        if (lockerSettingsRes.ok) {
          const ls = await lockerSettingsRes.json()
          const enabled = ls.lockers_enabled ?? false
          setLockersEnabled(enabled)
          if (enabled) {
            try {
              const expRes = await fetch(`${BASE}/api/lockers/expiring-soon`, { headers })
              if (expRes.ok) {
                const exp = await expRes.json()
                const n = Array.isArray(exp) ? exp.length : 0
                setLockersBadge(n > 0 ? (n > 9 ? '9+' : String(n)) : null)
              }
            } catch { /* non-critical */ }
          }
        }
      } catch { /* non-critical */ }
    }
    fetchBadges()
  }, [visible, role])

  const gymItem = {
    id: 'my-gym',
    label: 'My Gym',
    sub: hasGym ? 'Your gym info & announcements' : 'Tap to join a gym',
    path: '/my-gym',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18"/>
        <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/>
        <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/>
        <path d="M10 6h4"/><path d="M10 10h4"/>
      </svg>
    ),
  }
  const trainerItem = {
    id: 'my-trainer',
    label: 'My Trainer',
    sub: hasTrainer ? 'Your trainer & assigned plans' : 'Tap to link a trainer',
    path: '/my-trainer',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <polyline points="16 11 18 13 22 9"/>
      </svg>
    ),
  }

  const classesItem = {
    id: 'classes',
    label: 'Classes',
    sub: 'Browse & book gym classes',
    path: '/classes',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
        <line x1="16" y1="2" x2="16" y2="6"/>
        <line x1="8" y1="2" x2="8" y2="6"/>
        <line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
    ),
  }

  const consumerExtras = [gymItem, trainerItem, classesItem]

  const gymOwnerItems = lockersEnabled
    ? [...GYM_OWNER_BASE_ITEMS.slice(0, 3), LOCKERS_ITEM, ...GYM_OWNER_BASE_ITEMS.slice(3)]
    : GYM_OWNER_BASE_ITEMS

  const items =
    role === 'gym_owner' ? gymOwnerItems :
    role === 'trainer'   ? TRAINER_ITEMS :
    [...consumerExtras, ...CONSUMER_ITEMS]

  useEffect(() => {
    document.body.style.overflow = visible ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [visible])

  const handleNavigate = (path) => {
    onClose()
    setTimeout(() => navigate(path), 200)
  }

  const handleItemClick = (item) => {
    if (item.id === 'my-gym' && !hasGym) {
      onClose()
      onOpenJoinGym?.()
      return
    }
    if (item.id === 'my-trainer' && !hasTrainer) {
      onClose()
      onOpenJoinTrainer?.()
      return
    }
    handleNavigate(item.path)
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-[60] bg-black/40 transition-opacity duration-300 ${
          visible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Sheet */}
      <div className={`fixed bottom-0 left-0 right-0 z-[70] bg-[var(--bg-card)] rounded-t-[24px] transition-transform duration-300 ease-out ${
        visible ? 'translate-y-0' : 'translate-y-full'
      }`}>

        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-9 h-1 bg-[var(--border)] rounded-full" />
        </div>

        {/* Header */}
        <div className="px-5 pt-3 pb-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--text-tertiary)]">More</p>
        </div>

        {/* Menu items */}
        <div className="px-4">
          {items.map((item, i) => (
            <div key={item.id}>
              <button
                onClick={() => handleItemClick(item)}
                className="w-full flex items-center gap-3 py-3 px-1 active:bg-[var(--bg-primary)] rounded-xl transition-colors text-left"
              >
                <div className="w-10 h-10 bg-[var(--bg-pill)] rounded-xl flex items-center justify-center shrink-0">
                  {item.icon}
                </div>
                <div className="flex-1">
                  <p className="text-[15px] font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                    {item.label}
                    {item.id === 'supplements' && supplementBadge && (
                      <span style={{
                        background: 'var(--error)', color: 'var(--bg-card)',
                        fontSize: 10, fontWeight: 700,
                        minWidth: 16, height: 16, borderRadius: 8,
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        padding: '0 3px',
                      }}>
                        {supplementBadge}
                      </span>
                    )}
                    {item.id === 'lockers' && lockersBadge && (
                      <span style={{
                        background: 'var(--warning)', color: 'var(--bg-card)',
                        fontSize: 10, fontWeight: 700,
                        minWidth: 16, height: 16, borderRadius: 8,
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        padding: '0 3px',
                      }}>
                        {lockersBadge}
                      </span>
                    )}
                  </p>
                  <p className="text-[12px] text-[var(--text-tertiary)] mt-0.5">{item.sub}</p>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke="var(--text-tertiary)" strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </button>
              {i < items.length - 1 && (
                <div className="ml-[52px] border-t border-[var(--border)]" />
              )}
            </div>
          ))}
        </div>

        <div className="h-6" />
      </div>
    </>
  )
}
