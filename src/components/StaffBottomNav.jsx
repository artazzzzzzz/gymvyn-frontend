import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Home, ScanLine, Users, CreditCard, MoreHorizontal,
  Calendar, Lock, Package, Megaphone, Settings, LogOut, X, LayoutList,
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

// All permission-gated tabs in priority order
const ALL_PERM_TABS = [
  {
    id: 'checkin',
    label: 'Check-in',
    path: '/staff/checkin',
    Icon: ScanLine,
    enabled: (p) => !!p?.checkin,
  },
  {
    id: 'members',
    label: 'Members',
    path: '/staff/members',
    Icon: Users,
    enabled: (p) => !!p?.view_members,
  },
  {
    id: 'payments',
    label: 'Payments',
    path: '/staff/payments',
    Icon: CreditCard,
    enabled: (p) => !!(p?.view_payments || p?.collect_payment),
  },
  {
    id: 'schedule',
    label: 'Schedule',
    path: '/staff/schedule',
    Icon: Calendar,
    enabled: (p) => !!p?.view_schedule,
  },
  {
    id: 'lockers',
    label: 'Lockers',
    path: '/staff/lockers',
    Icon: Lock,
    enabled: (p) => !!p?.manage_lockers,
  },
  {
    id: 'supplements',
    label: 'Supplements',
    path: '/staff/supplements',
    Icon: Package,
    enabled: (p) => !!p?.view_supplements,
  },
  {
    id: 'announcements',
    label: 'Announcements',
    path: '/staff/announcements',
    Icon: Megaphone,
    enabled: (p) => !!p?.view_announcements,
  },
  {
    id: 'feed',
    label: 'Feed',
    path: '/staff/feed',
    Icon: LayoutList,
    enabled: (p) => !!(p?.view_announcements || p?.manage_feed),
  },
]

// ── StaffMoreSheet ────────────────────────────────────────────────────────────

function StaffMoreSheet({ open, onClose, overflowTabs }) {
  const navigate = useNavigate()
  const { signOut } = useAuth()

  const handleNav = (path) => {
    onClose()
    setTimeout(() => navigate(path), 180)
  }

  const handleSignOut = async () => {
    onClose()
    await signOut()
  }

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 60,
          backgroundColor: 'rgba(0,0,0,0.4)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity 0.25s',
        }}
      />
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 70,
        backgroundColor: 'var(--bg-card)',
        borderRadius: '22px 22px 0 0',
        transform: open ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 0.3s ease-out',
        paddingBottom: 32,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}>
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
          <div style={{ width: 36, height: 4, backgroundColor: 'var(--border)', borderRadius: 2 }} />
        </div>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 20px 12px' }}>
          <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-tertiary)' }}>
            More
          </span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <X size={18} color="var(--text-tertiary)" />
          </button>
        </div>

        <div style={{ padding: '0 16px' }}>
          {/* Overflow perm tabs */}
          {overflowTabs.map((tab, i) => (
            <div key={tab.id}>
              <button
                onClick={() => handleNav(tab.path)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 14,
                  padding: '14px 8px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
                }}
              >
                <div style={{
                  width: 40, height: 40, borderRadius: 12,
                  backgroundColor: 'var(--bg-hover)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <tab.Icon size={20} color="var(--text-secondary)" />
                </div>
                <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>{tab.label}</span>
              </button>
              {i < overflowTabs.length - 1 && (
                <div style={{ marginLeft: 54, borderTop: '0.5px solid var(--border)' }} />
              )}
            </div>
          ))}

          {/* Divider */}
          {overflowTabs.length > 0 && (
            <div style={{ margin: '8px 0', borderTop: '1px solid var(--border)' }} />
          )}

          {/* Settings */}
          <button
            onClick={() => handleNav('/staff/settings')}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 14,
              padding: '14px 8px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
            }}
          >
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              backgroundColor: 'var(--bg-hover)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <Settings size={20} color="var(--text-secondary)" />
            </div>
            <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>Settings</span>
          </button>

          <div style={{ margin: '4px 0', borderTop: '0.5px solid var(--border)' }} />

          {/* Sign Out */}
          <button
            onClick={handleSignOut}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 14,
              padding: '14px 8px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
            }}
          >
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              backgroundColor: 'var(--error-bg)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <LogOut size={20} color="var(--error)" />
            </div>
            <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--error)' }}>Sign Out</span>
          </button>
        </div>
      </div>
    </>
  )
}

// ── StaffBottomNav ────────────────────────────────────────────────────────────

export default function StaffBottomNav({ permissions }) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [moreOpen, setMoreOpen] = useState(false)

  const perms = permissions || {}

  // Split enabled tabs into nav slots (max 3) and overflow
  const enabledTabs = ALL_PERM_TABS.filter(t => t.enabled(perms))
  const inNav  = enabledTabs.slice(0, 3)
  const inMore = enabledTabs.slice(3)

  const isActive = (path) => pathname.startsWith(path)
  const totalCols = 2 + inNav.length  // Home + perm tabs + More

  return (
    <>
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
        height: 64,
        backgroundColor: 'var(--bg-elevated)',
        borderTop: '1px solid var(--border)',
        display: 'grid',
        gridTemplateColumns: `repeat(${totalCols}, 1fr)`,
      }}>
        {/* Home — always */}
        <NavBtn
          label="Home"
          Icon={Home}
          active={pathname === '/staff/dashboard'}
          onClick={() => navigate('/staff/dashboard')}
        />

        {/* Permission-gated tabs in nav */}
        {inNav.map(tab => (
          <NavBtn
            key={tab.id}
            label={tab.label}
            Icon={tab.Icon}
            active={isActive(tab.path)}
            onClick={() => navigate(tab.path)}
          />
        ))}

        {/* More — always last */}
        <NavBtn
          label="More"
          Icon={MoreHorizontal}
          active={false}
          onClick={() => setMoreOpen(true)}
        />
      </div>

      <StaffMoreSheet
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        overflowTabs={inMore}
      />
    </>
  )
}

function NavBtn({ label, Icon, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 3,
        background: 'none', border: 'none', cursor: 'pointer',
        borderTop: active ? '2px solid var(--text-cta)' : '2px solid transparent',
        transition: 'border-color 0.15s',
      }}
    >
      <Icon size={22} color={active ? 'var(--text-cta)' : 'var(--text-tertiary)'} strokeWidth={1.8} />
      <span style={{
        fontSize: 10, fontWeight: active ? 600 : 400,
        color: active ? 'var(--text-cta)' : 'var(--text-tertiary)',
      }}>
        {label}
      </span>
    </button>
  )
}
