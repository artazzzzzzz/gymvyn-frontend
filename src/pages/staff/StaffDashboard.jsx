import { useNavigate, useOutletContext } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import {
  ScanLine, Users, CreditCard, Calendar, Lock,
} from 'lucide-react'

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

const QUICK_ACTIONS = [
  { id: 'checkin',       label: 'Check-in Members', Icon: ScanLine,    path: '/staff/checkin',  perm: 'checkin' },
  { id: 'view_members',  label: 'View Members',      Icon: Users,       path: '/staff/members',  perm: 'view_members' },
  { id: 'collect',       label: 'Collect Payment',   Icon: CreditCard,  path: '/staff/payments', perm: 'collect_payment' },
  { id: 'schedule',      label: 'View Schedule',     Icon: Calendar,    path: '/staff/schedule', perm: 'view_schedule' },
  { id: 'lockers',       label: 'Manage Lockers',    Icon: Lock,        path: '/staff/lockers',  perm: 'manage_lockers' },
]

export default function StaffDashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { permissions, gymName, roleLabel, loading } = useOutletContext()

  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || 'there'

  const enabledActions = QUICK_ACTIONS.filter(a => permissions?.[a.perm])

  return (
    <div style={{
      minHeight: '100vh', backgroundColor: 'var(--bg-primary)', paddingBottom: 88,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>
      {/* Header */}
      <div style={{ padding: '56px 20px 24px', backgroundColor: 'var(--bg-card)' }}>
        <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
          {greeting()}, {firstName}
        </div>
        <div style={{ fontSize: 14, color: 'var(--text-tertiary)', marginBottom: 12 }}>
          {gymName || 'Your Gym'}
        </div>
        {roleLabel && (
          <span style={{
            display: 'inline-block',
            backgroundColor: 'var(--bg-hover)',
            color: 'var(--text-secondary)',
            fontSize: 12, fontWeight: 600,
            padding: '4px 12px', borderRadius: 20,
          }}>
            {roleLabel}
          </span>
        )}
      </div>

      <div style={{ padding: '20px 16px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <span style={{ fontSize: 14, color: 'var(--text-tertiary)' }}>Loading…</span>
          </div>
        ) : enabledActions.length === 0 ? (
          <div style={{
            backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 16, padding: '40px 24px', textAlign: 'center',
          }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🔒</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>
              No permissions yet
            </div>
            <div style={{ fontSize: 14, color: 'var(--text-tertiary)', lineHeight: 1.6 }}>
              Your gym owner hasn't assigned any permissions yet. Contact them to get access.
            </div>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
              Quick Actions
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 12,
            }}>
              {enabledActions.map(action => (
                <button
                  key={action.id}
                  onClick={() => navigate(action.path)}
                  style={{
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'flex-start', gap: 12,
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: 16, padding: '18px 16px',
                    cursor: 'pointer', textAlign: 'left',
                  }}
                >
                  <div style={{
                    width: 42, height: 42, borderRadius: 12,
                    backgroundColor: 'var(--bg-hover)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <action.Icon size={20} color="var(--text-primary)" strokeWidth={1.8} />
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.3 }}>
                    {action.label}
                  </span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
