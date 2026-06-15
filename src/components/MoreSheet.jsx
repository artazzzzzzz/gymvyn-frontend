import { useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'

// ── Icon helpers ──────────────────────────────────────────────────────────────

const IconUsers = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
    stroke="#111" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
)

const IconBarChart = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
    stroke="#111" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10"/>
    <line x1="12" y1="20" x2="12" y2="4"/>
    <line x1="6"  y1="20" x2="6"  y2="14"/>
  </svg>
)

const IconScan = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
    stroke="#111" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="4 7 4 4 7 4"/>
    <polyline points="17 4 20 4 20 7"/>
    <polyline points="20 17 20 20 17 20"/>
    <polyline points="7 20 4 20 4 17"/>
    <line x1="4" y1="12" x2="20" y2="12"/>
  </svg>
)

const IconSettings = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
    stroke="#111" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>
)

const IconLayout = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
    stroke="#111" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7"/>
    <rect x="14" y="3" width="7" height="7"/>
    <rect x="14" y="14" width="7" height="7"/>
    <rect x="3" y="14" width="7" height="7"/>
  </svg>
)

const IconClipboard = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
    stroke="#111" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
    <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
    <line x1="9" y1="12" x2="15" y2="12"/>
    <line x1="9" y1="16" x2="13" y2="16"/>
  </svg>
)

const IconCommunity = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
    stroke="#111" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
)

const IconFormCoach = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
    stroke="#111" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
    <polyline points="9 11 12 14 15 11"/>
  </svg>
)

const IconChat = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
    stroke="#111" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
)

// ── Item lists per role ───────────────────────────────────────────────────────

const GYM_OWNER_ITEMS = [
  { id: 'insights',    label: 'Insights',     sub: 'Analytics & occupancy',  path: '/gym/insights',  icon: <IconBarChart /> },
  { id: 'checkin',     label: 'Check-in',     sub: 'Scan member QR codes',   path: '/gym/checkin',   icon: <IconScan /> },
  { id: 'trainers',    label: 'Trainers',     sub: 'Manage your staff',      path: '/gym/trainers',  icon: <IconUsers /> },
  { id: 'gym-settings',label: 'Settings',     sub: 'Gym profile & plans',    path: '/gym/settings',  icon: <IconSettings /> },
]

const TRAINER_ITEMS = [
  { id: 'templates',   label: 'Templates',    sub: 'Workout plan library',   path: '/trainer/templates',    icon: <IconLayout /> },
  { id: 'assign-plan', label: 'Assign Plan',  sub: 'Send plan to client',    path: '/trainer/assign-plan',  icon: <IconClipboard /> },
  { id: 't-settings',  label: 'Settings',     sub: 'Account & preferences',  path: '/trainer/settings',     icon: <IconSettings /> },
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
export default function MoreSheet({ isOpen, open, onClose, hasGym = false, hasTrainer = false }) {
  const navigate = useNavigate()
  const { role } = useAuth()

  const visible = isOpen ?? open ?? false

  const gymItem = {
    id: 'my-gym',     label: 'My Gym',     sub: 'Your gym info & announcements', path: '/my-gym',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18"/>
        <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/>
        <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/>
        <path d="M10 6h4"/><path d="M10 10h4"/>
      </svg>
    ),
  }
  const trainerItem = {
    id: 'my-trainer', label: 'My Trainer', sub: 'Your trainer & assigned plans', path: '/my-trainer',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <polyline points="16 11 18 13 22 9"/>
      </svg>
    ),
  }

  const consumerExtras = [
    ...(hasGym     ? [gymItem]     : []),
    ...(hasTrainer ? [trainerItem] : []),
  ]

  const items =
    role === 'gym_owner' ? GYM_OWNER_ITEMS :
    role === 'trainer'   ? TRAINER_ITEMS   :
    [...consumerExtras, ...CONSUMER_ITEMS]

  useEffect(() => {
    document.body.style.overflow = visible ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [visible])

  const handleNavigate = (path) => {
    onClose()
    setTimeout(() => navigate(path), 200)
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
      <div className={`fixed bottom-0 left-0 right-0 z-[70] bg-white rounded-t-[24px] transition-transform duration-300 ease-out ${
        visible ? 'translate-y-0' : 'translate-y-full'
      }`}>

        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-9 h-1 bg-[#E0E0E0] rounded-full" />
        </div>

        {/* Header */}
        <div className="px-5 pt-3 pb-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#999]">More</p>
        </div>

        {/* Menu items */}
        <div className="px-4">
          {items.map((item, i) => (
            <div key={item.id}>
              <button
                onClick={() => handleNavigate(item.path)}
                className="w-full flex items-center gap-3 py-3 px-1 active:bg-[#F7F7F5] rounded-xl transition-colors text-left"
              >
                <div className="w-10 h-10 bg-[#F1EFE8] rounded-xl flex items-center justify-center shrink-0">
                  {item.icon}
                </div>
                <div className="flex-1">
                  <p className="text-[15px] font-semibold text-[#111]">{item.label}</p>
                  <p className="text-[12px] text-[#999] mt-0.5">{item.sub}</p>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke="#CCC" strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </button>
              {i < items.length - 1 && (
                <div className="ml-[52px] border-t border-black/[0.05]" />
              )}
            </div>
          ))}
        </div>

        <div className="h-6" />
      </div>
    </>
  )
}
