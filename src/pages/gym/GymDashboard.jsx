import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Settings } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import {
  getGymByUserId,
  getGymMembers,
  getGymOccupancy,
  getChurnScores,
} from '../../utils/api'
import { getAvatarColor } from '../../utils/avatarColor'
import GymBottomNav from '../../components/GymBottomNav'
import MoreSheet from '../../components/MoreSheet'
import { GymCodeCard } from '../../components/GymCodeCard'

// ── Helpers ───────────────────────────────────────────────────────────────────

function getGreeting() {
  const h = new Date().getHours()
  if (h >= 5 && h < 12) return 'Good morning'
  if (h >= 12 && h < 17) return 'Good afternoon'
  if (h >= 17 && h < 21) return 'Good evening'
  return 'Good night'
}

function formatDate() {
  return new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long',
  })
}

function getInitials(name) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function daysUntil(dateStr) {
  if (!dateStr) return Infinity
  return Math.floor((new Date(dateStr) - Date.now()) / 86_400_000)
}

// ── Design tokens ─────────────────────────────────────────────────────────────

const card = {
  background: 'var(--bg-card)',
  border: '0.5px solid rgba(0,0,0,0.08)',
  borderRadius: 12,
  padding: 16,
}

const sectionLabel = {
  fontSize: 11,
  letterSpacing: '0.08em',
  color: 'var(--text-tertiary)',
  fontWeight: 600,
  textTransform: 'uppercase',
  margin: 0,
}

// ── Sub-components ────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, subColor, subBg, loading: cardLoading }) {
  return (
    <div style={card}>
      <p style={sectionLabel}>{label}</p>
      {cardLoading ? (
        <div style={{ height: 32, width: '65%', background: 'var(--bg-pill)', borderRadius: 6, margin: '8px 0 8px', animation: 'skel 1.2s ease infinite alternate' }} />
      ) : (
        <p style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', margin: '8px 0 8px' }}>
          {value}
        </p>
      )}
      <span style={{
        fontSize: 12, color: subColor, background: subBg,
        padding: '2px 8px', borderRadius: 20, fontWeight: 500,
      }}>
        {sub}
      </span>
    </div>
  )
}

function QuickActionCard({ icon, label, onTap }) {
  return (
    <button
      onClick={onTap}
      style={{
        ...card,
        height: 80,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        cursor: 'pointer',
        width: '100%',
        padding: 0,
      }}
    >
      {icon}
      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '0.02em' }}>
        {label}
      </span>
    </button>
  )
}

function MemberRow({ member, isLast }) {
  const name = member.full_name || member.name || 'Unknown'
  const { bg, text } = getAvatarColor(name)
  const initials = getInitials(name)
  const joinDate = member.created_at
    ? new Date(member.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
    : ''

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '10px 0',
      borderBottom: isLast ? 'none' : '0.5px solid rgba(0,0,0,0.06)',
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: '50%',
        background: bg, color: text,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 13, fontWeight: 600, flexShrink: 0,
      }}>
        {initials}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {name}
        </p>
        <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: 0 }}>
          {member.membership_type || 'Member'}
        </p>
      </div>
      <span style={{ fontSize: 12, color: 'var(--text-tertiary)', flexShrink: 0 }}>{joinDate}</span>
    </div>
  )
}

// ── SVG Icon helpers ──────────────────────────────────────────────────────────

const iconProps = { width: 22, height: 22, fill: 'none', stroke: 'var(--success)', strokeWidth: '1.8', strokeLinecap: 'round', strokeLinejoin: 'round', viewBox: '0 0 24 24' }

function IconUserPlus() {
  return (
    <svg {...iconProps}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <line x1="19" y1="8" x2="19" y2="14" />
      <line x1="16" y1="11" x2="22" y2="11" />
    </svg>
  )
}

function IconCheckin() {
  return (
    <svg {...iconProps}>
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  )
}

function IconPayment() {
  return (
    <svg {...iconProps}>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <line x1="2" y1="10" x2="22" y2="10" />
    </svg>
  )
}

function IconReports() {
  return (
    <svg {...iconProps}>
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  )
}

function IconBell() {
  return (
    <svg width="22" height="22" fill="none" stroke="var(--text-secondary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  )
}

function IconWarning() {
  return (
    <svg width="16" height="16" fill="none" stroke="var(--error)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function GymDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [moreOpen, setMoreOpen] = useState(false)

  const [gym, setGym] = useState(null)
  const [members, setMembers] = useState([])
  const [occupancy, setOccupancy] = useState({ current: 0, capacity: 0 })
  const [churnCount, setChurnCount] = useState(0)
  const [loading, setLoading] = useState(true)
  // null = loading, number = resolved, 'error' = failed
  const [revenue, setRevenue] = useState(null)

  useEffect(() => {
    if (!user) return
    let cancelled = false

    async function load() {
      setLoading(true)
      try {
        const gymData = await getGymByUserId(user.id)
        if (cancelled) return
        setGym(gymData)
        // Cache for owner pages that read via useOwnerGymId.
        try { if (gymData?.id) localStorage.setItem('gymId', gymData.id) } catch {}

        const [membersRes, occupancyRes, churnRes, revenueRes] = await Promise.all([
          getGymMembers(gymData.id).catch(() => []),
          getGymOccupancy(gymData.id).catch(() => ({ current: 0, capacity: 0 })),
          getChurnScores(gymData.id).catch(() => null),
          fetch(`${import.meta.env.VITE_API_URL || ''}/api/gym/revenue?gym_id=${encodeURIComponent(gymData.id)}`)
            .then(r => r.json())
            .catch(() => null),
        ])
        if (cancelled) return

        const memberList = Array.isArray(membersRes)
          ? membersRes
          : membersRes?.members ?? []
        setMembers(memberList)
        setOccupancy(occupancyRes || { current: 0, capacity: 0 })
        setChurnCount(
          churnRes?.summary?.high
          ?? churnRes?.high_risk_count
          ?? 0
        )
        setRevenue(
          typeof revenueRes?.revenue === 'number' ? revenueRes.revenue : 'error'
        )
      } catch (err) {
        console.error('GymDashboard load error:', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [user])

  // ── Derived ───────────────────────────────────────────────────────────────

  const firstName = (
    user?.user_metadata?.full_name?.split(' ')[0]
    || user?.email?.split('@')[0]
    || 'there'
  )

  const gymName = gym?.name || 'Your Gym'

  const occupancyPct = occupancy.capacity > 0
    ? Math.min(100, Math.round((occupancy.current / occupancy.capacity) * 100))
    : 0

  const recentMembers = [...members]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 3)

  const expiringMembers = members.filter(m => {
    const days = daysUntil(m.end_date || m.membership_end_date)
    return days >= 0 && days <= 7
  })

  // ── Loading ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div className="w-7 h-7 border-2 border-[var(--success)] border-t-transparent rounded-full animate-spin" />
          <p style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>Loading dashboard…</p>
        </div>
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', paddingBottom: 80 }}>

      {/* 1 — Top bar */}
      <div style={{
        background: 'var(--bg-card)',
        borderBottom: '0.5px solid rgba(0,0,0,0.08)',
        padding: '14px 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontWeight: 700, fontSize: 17, color: 'var(--text-primary)' }}>{gymName}</span>
          <span style={{
            background: 'var(--success-bg)', color: 'var(--success)',
            fontSize: 11, fontWeight: 600,
            padding: '2px 8px', borderRadius: 20,
          }}>
            Owner
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button style={{ background: 'none', border: 'none', padding: 4, cursor: 'pointer', display: 'flex' }}>
            <IconBell />
          </button>
          <button
            onClick={() => navigate('/gym/settings')}
            className="rounded-full p-2 bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:bg-[var(--bg-pill)] transition-colors"
            style={{ border: 'none', cursor: 'pointer', display: 'flex' }}
            aria-label="Settings"
          >
            <Settings size={18} />
          </button>
        </div>
      </div>

      <div style={{ padding: '20px 16px 0' }}>

        {/* 2 — Greeting */}
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            {getGreeting()}, {firstName}
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-tertiary)', margin: '4px 0 0' }}>{formatDate()}</p>
        </div>

        {/* 3 — KPI 2×2 grid */}
        <style>{`@keyframes skel { from { opacity: 0.4 } to { opacity: 1 } }`}</style>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          {/* members.length is real — from getGymMembers API */}
          <KpiCard
            label="Total Members"
            value={members.length}
            sub="All enrolled"
            subColor="var(--success)"
            subBg="var(--success-bg)"
          />
          <KpiCard
            label="Monthly Revenue"
            loading={revenue === null}
            value={
              revenue === 'error'
                ? '₹—'
                : `₹${Number(revenue).toLocaleString('en-IN')}`
            }
            sub="Paid this month"
            subColor="var(--success)"
            subBg="var(--success-bg)"
          />
          {/* TODO: occupancy.current is real (check_ins table) but capacity comes from gyms.capacity which may be unset */}
          <KpiCard
            label="Active Today"
            value={occupancy.current}
            sub={`of ${occupancy.capacity || '—'} capacity`}
            subColor="var(--text-secondary)"
            subBg="var(--bg-pill)"
          />
          {/* churnCount is real — from ML scoring endpoint */}
          <KpiCard
            label="Churn Risk"
            value={churnCount}
            sub={churnCount > 0 ? 'High risk members' : 'No churn risk'}
            subColor={churnCount > 0 ? 'var(--error)' : 'var(--success)'}
            subBg={churnCount > 0 ? 'var(--error-bg)' : 'var(--success-bg)'}
          />
        </div>

        {/* Gym Join Code */}
        <div style={{ marginBottom: 16 }}>
          <GymCodeCard />
        </div>

        {/* 4 — Live Occupancy */}
        <div style={{ ...card, marginBottom: 16 }}>
          <p style={sectionLabel}>LIVE OCCUPANCY</p>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', margin: '10px 0 10px' }}>
            <span style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)' }}>{occupancy.current}</span>
            <span style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>/ {occupancy.capacity || '—'} capacity</span>
          </div>
          <div style={{ height: 6, background: 'var(--bg-pill)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${occupancyPct}%`,
              background: 'var(--success)',
              borderRadius: 3,
              transition: 'width 0.5s ease',
            }} />
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: '6px 0 0' }}>{occupancyPct}% full</p>
        </div>

        {/* 5 — Quick Actions 2×2 */}
        <p style={{ ...sectionLabel, marginBottom: 10 }}>QUICK ACTIONS</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          <QuickActionCard icon={<IconUserPlus />} label="Add Member"       onTap={() => navigate('/gym/members')} />
          <QuickActionCard icon={<IconCheckin />}  label="Check In"         onTap={() => navigate('/gym/checkin')} />
          <QuickActionCard icon={<IconPayment />}  label="Collect Payment"  onTap={() => navigate('/gym/payments')} />
          <QuickActionCard icon={<IconReports />}  label="View Reports"     onTap={() => navigate('/gym/insights')} />
        </div>

        {/* 6 — Recent Members */}
        <div style={{ ...card, marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <p style={sectionLabel}>RECENT MEMBERS</p>
            <button
              onClick={() => navigate('/gym/members')}
              style={{ background: 'none', border: 'none', fontSize: 13, color: 'var(--success)', fontWeight: 600, cursor: 'pointer', padding: 0 }}
            >
              See all →
            </button>
          </div>
          {recentMembers.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--text-tertiary)', textAlign: 'center', padding: '16px 0', margin: 0 }}>
              No members yet
            </p>
          ) : (
            recentMembers.map((m, i) => (
              <MemberRow key={m.id || i} member={m} isLast={i === recentMembers.length - 1} />
            ))
          )}
        </div>

        {/* 7 — Alerts */}
        {expiringMembers.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <p style={{ ...sectionLabel, marginBottom: 10 }}>ALERTS</p>
            <div style={{
              background: 'var(--error-bg)',
              border: '0.5px solid rgba(163,45,45,0.2)',
              borderRadius: 12,
              padding: 16,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <IconWarning />
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--error)' }}>
                  {expiringMembers.length} membership{expiringMembers.length > 1 ? 's' : ''} expiring soon
                </span>
              </div>
              {expiringMembers.slice(0, 3).map((m, i) => {
                const days = daysUntil(m.end_date || m.membership_end_date)
                return (
                  <p key={i} style={{ fontSize: 12, color: 'var(--error)', margin: '4px 0 0' }}>
                    {m.full_name || m.name} — {days === 0 ? 'expires today' : `${days} day${days !== 1 ? 's' : ''} left`}
                  </p>
                )
              })}
            </div>
          </div>
        )}

      </div>

      {/* 8 — Bottom nav */}
      <GymBottomNav onMorePress={() => setMoreOpen(true)} />
      <MoreSheet isOpen={moreOpen} onClose={() => setMoreOpen(false)} />
    </div>
  )
}
