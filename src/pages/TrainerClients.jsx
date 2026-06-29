import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { apiFetch } from '../utils/api'

const C = {
  bg: 'var(--bg-pill)',
  card: "var(--bg-card)",
  border: 'var(--border)',
  text: 'var(--text-primary)',
  sub: 'var(--text-secondary)',
  green: '#1a9955',
  greenBg: 'var(--success-bg)',
  amber: '#c07800',
  amberBg: 'var(--warning-bg)',
  blue: '#1a6fd4',
  blueBg: 'var(--accent-bg)',
  gray: 'var(--text-tertiary)',
  grayBg: 'var(--bg-pill)',
}

const AVATAR_COLORS = [
  { bg: 'var(--accent-bg)', text: '#1a6fd4' },
  { bg: 'var(--error-bg)', text: '#c0392b' },
  { bg: 'var(--success-bg)', text: '#1a9955' },
  { bg: 'var(--warning-bg)', text: '#c07800' },
  { bg: '#f3e8fb', text: '#7b2fbf' },
]

const FILTER_TABS = ['All', 'Active', 'Needs attention', 'No plan', 'Pending']

function getInitials(name = '') {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?'
}

function getStatusFromClient(rel) {
  if (rel.status === 'pending') return 'pending'
  if (!rel.stats?.activePlans || rel.stats.activePlans === 0) return 'noplan'
  if (rel.stats?.lastWorkout) {
    const days = (Date.now() - new Date(rel.stats.lastWorkout)) / 86400000
    if (days > 3) return 'attention'
  }
  return 'active'
}

function statusDotColor(status) {
  if (status === 'active') return C.green
  if (status === 'attention') return C.amber
  return C.gray
}

function lastActiveText(rel) {
  if (rel.status === 'pending') return 'Pending invite'
  if (!rel.stats?.lastWorkout) return 'No activity'
  const days = Math.floor((Date.now() - new Date(rel.stats.lastWorkout)) / 86400000)
  if (days === 0) return 'Active today'
  if (days === 1) return 'Yesterday'
  return `${days} days ago`
}

const IconSearch = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.sub} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
)

const IconChevronRight = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.sub} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6" />
  </svg>
)

function ClientCard({ rel, avatarIdx, onClick }) {
  const [pressed, setPressed] = useState(false)
  const av = AVATAR_COLORS[avatarIdx % AVATAR_COLORS.length]
  const name = rel.client?.full_name || rel.invite_email || 'Client'
  const initials = getInitials(name)
  const status = getStatusFromClient(rel)
  const goal = rel.client?.goal || '—'
  const planName = rel.stats?.planName || null

  let badge, badgeColor, badgeBg
  if (rel.status === 'pending') {
    badge = 'Pending invite'; badgeColor = C.amber; badgeBg = C.amberBg
  } else if (!rel.stats?.activePlans || rel.stats.activePlans === 0) {
    badge = 'No plan assigned'; badgeColor = C.amber; badgeBg = C.amberBg
  } else {
    badge = 'Workout + Diet'; badgeColor = C.blue; badgeBg = C.blueBg
  }

  return (
    <div
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
      onTouchStart={() => setPressed(true)}
      onTouchEnd={() => setPressed(false)}
      onClick={onClick}
      style={{
        background: pressed ? '#f9f9fb' : C.card,
        borderRadius: 16, padding: '14px 14px',
        display: 'flex', alignItems: 'center', gap: 12,
        border: `1px solid ${C.border}`,
        cursor: 'pointer',
        transition: 'background 0.1s',
      }}
    >
      <div style={{
        width: 44, height: 44, borderRadius: 14,
        background: av.bg, color: av.text,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 14, fontWeight: 700, flexShrink: 0, letterSpacing: '0.3px',
      }}>{initials}</div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{name}</span>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: statusDotColor(status), flexShrink: 0 }} />
        </div>
        <div style={{ fontSize: 12, color: C.sub, marginBottom: 6 }}>
          {goal}{planName ? ` · ${planName}` : ''}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{
            fontSize: 11, fontWeight: 600,
            color: badgeColor, background: badgeBg,
            borderRadius: 20, padding: '2px 8px',
          }}>{badge}</span>
          <span style={{ fontSize: 11, color: C.sub }}>{lastActiveText(rel)}</span>
        </div>
      </div>

      <IconChevronRight />
    </div>
  )
}

export default function TrainerClients() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState('All')
  const [searchVal, setSearchVal] = useState('')

  useEffect(() => {
    if (!user?.id) return
    apiFetch(`/api/trainer/clients/${user.id}`)
      .then(setClients)
      .catch(err => console.error('Load clients error:', err))
      .finally(() => setLoading(false))
  }, [user?.id])

  const filteredClients = clients.filter(rel => {
    const name = (rel.client?.full_name || rel.invite_email || '').toLowerCase()
    if (searchVal && !name.includes(searchVal.toLowerCase())) return false
    if (activeFilter === 'Active') return rel.status === 'active' && getStatusFromClient(rel) === 'active'
    if (activeFilter === 'Needs attention') return getStatusFromClient(rel) === 'attention'
    if (activeFilter === 'No plan') return getStatusFromClient(rel) === 'noplan'
    if (activeFilter === 'Pending') return rel.status === 'pending'
    return true
  })

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', border: `3px solid ${C.border}`, borderTopColor: C.text, animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: "'DM Sans', system-ui, sans-serif", paddingBottom: 80 }}>
      <div style={{ padding: '52px 16px 0' }}>

        <div style={{ marginBottom: 22 }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: C.text, letterSpacing: '-0.3px' }}>Clients</div>
          <div style={{ fontSize: 13, color: C.sub, marginTop: 3 }}>{clients.length} total</div>
        </div>

        {/* search */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: C.card, borderRadius: 12, padding: '10px 12px',
          border: `1px solid ${C.border}`, marginBottom: 12,
        }}>
          <IconSearch />
          <input
            value={searchVal}
            onChange={e => setSearchVal(e.target.value)}
            placeholder="Search clients…"
            style={{
              border: 'none', outline: 'none', background: 'transparent',
              fontSize: 14, color: C.text, flex: 1, fontFamily: 'inherit',
            }}
          />
        </div>

        {/* filter chips */}
        <div style={{
          display: 'flex', gap: 7, overflowX: 'auto', paddingBottom: 4, marginBottom: 14,
          scrollbarWidth: 'none',
        }}>
          {FILTER_TABS.map(f => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              style={{
                padding: '6px 13px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                whiteSpace: 'nowrap', cursor: 'pointer', flexShrink: 0,
                border: activeFilter === f ? 'none' : `1px solid ${C.border}`,
                background: activeFilter === f ? C.text : C.card,
                color: activeFilter === f ? "var(--bg-card)" : C.sub,
                transition: 'all 0.15s',
              }}
            >{f}</button>
          ))}
        </div>

        {/* client cards */}
        {filteredClients.length === 0 ? (
          <div style={{
            background: C.card, borderRadius: 18, padding: '40px 24px',
            border: `1px solid ${C.border}`, textAlign: 'center',
          }}>
            <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'center', color: C.sub }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, color: C.text, marginBottom: 4 }}>
              {clients.length === 0 ? 'No clients yet' : 'No matches'}
            </div>
            <div style={{ fontSize: 13, color: C.sub }}>
              {clients.length === 0 ? 'Share your invite code to get started' : 'Try a different filter or search term'}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filteredClients.map((rel, i) => (
              <ClientCard
                key={rel.id}
                rel={rel}
                avatarIdx={i}
                onClick={() => rel.status !== 'pending' && rel.client_id && navigate(`/trainer/client/${rel.client_id}`)}
              />
            ))}
          </div>
        )}

        <div style={{ height: 20 }} />
      </div>
    </div>
  )
}
