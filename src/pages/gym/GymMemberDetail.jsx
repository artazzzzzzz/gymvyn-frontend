import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getAvatarColor } from '../../utils/avatarColor'
import { supabase } from '../../utils/supabase'

const BASE = import.meta.env.VITE_API_URL

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

function formatMonthYear(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-IN', {
    month: 'long', year: 'numeric',
  })
}

function daysBetween(dateA, dateB) {
  const a = new Date(dateA)
  const b = new Date(dateB)
  return Math.round(Math.abs(b - a) / (1000 * 60 * 60 * 24))
}

function daysAgo(dateStr) {
  if (!dateStr) return '—'
  return daysBetween(dateStr, new Date())
}

function getInitials(name) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function seededRandom(seed) {
  let s = typeof seed === 'number' ? seed : 42
  return function () {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

function buildCalendar(attendedCount, memberId) {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const todayDate = now.getDate()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  // Mon-start: getDay() 0=Sun → 6, 1=Mon → 0
  const firstDow = (new Date(year, month, 1).getDay() + 6) % 7

  const rand = seededRandom(Number(String(memberId).replace(/\D/g, '').slice(0, 8)) || 42)
  const dayRands = Array.from({ length: daysInMonth }, (_, i) => ({ day: i + 1, r: rand() }))
  const elapsedDays = dayRands.filter(({ day }) => day < todayDate)
  const attendedSet = new Set(
    elapsedDays
      .sort((a, b) => b.r - a.r)
      .slice(0, Math.min(attendedCount || 0, elapsedDays.length))
      .map(({ day }) => day)
  )

  const cells = []
  for (let i = 0; i < firstDow; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)

  return { cells, attendedSet, todayDate }
}

// ── Design tokens ─────────────────────────────────────────────────────────────

const card = {
  background: 'var(--bg-card)',
  border: '0.5px solid rgba(0,0,0,0.08)',
  borderRadius: 12,
  padding: 16,
  marginBottom: 12,
}

const sectionLabel = {
  fontSize: 11,
  letterSpacing: '0.08em',
  color: 'var(--text-tertiary)',
  fontWeight: 600,
  textTransform: 'uppercase',
  margin: '0 0 12px',
}

const detailRow = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '10px 0',
  borderBottom: '0.5px solid rgba(0,0,0,0.06)',
}

// ── StatusPill ────────────────────────────────────────────────────────────────

function StatusPill({ status, churn_risk, days_until_expiry }) {
  let label, bg, color
  if (churn_risk === 'high') {
    label = 'At Risk';   bg = 'var(--error-bg)'; color = 'var(--error)'
  } else if (days_until_expiry <= 7 && days_until_expiry > 0) {
    label = 'Expiring';  bg = 'var(--warning-bg)'; color = 'var(--warning)'
  } else if (status === 'inactive' || status === 'expired') {
    label = 'Inactive';  bg = 'var(--bg-pill)'; color = 'var(--text-secondary)'
  } else {
    label = 'Active';    bg = 'var(--success-bg)'; color = 'var(--success)'
  }
  return (
    <span style={{ background: bg, color, padding: '5px 10px', borderRadius: 20, fontSize: 11, fontWeight: 500 }}>
      {label}
    </span>
  )
}

// ── Plan options for RenewModal ───────────────────────────────────────────────

const PLAN_OPTIONS = [
  { key: 'monthly',   label: 'Monthly',   price: 1500,  days: 30  },
  { key: 'quarterly', label: 'Quarterly', price: 3999,  days: 90  },
  { key: 'annual',    label: 'Annual',    price: 14999, days: 365 },
]

// ── RenewModal ────────────────────────────────────────────────────────────────

function RenewModal({ member, memberId, isOpen, onClose, onSuccess }) {
  const [selected, setSelected] = useState('monthly')
  const [loading,  setLoading]  = useState(false)

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  async function handleConfirm() {
    const plan = PLAN_OPTIONS.find(p => p.key === selected)
    const baseDate = member?.membership_end
      ? new Date(member.membership_end)
      : new Date()
    const newEndDate = new Date(baseDate)
    newEndDate.setDate(newEndDate.getDate() + plan.days)

    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${BASE}/api/gym-members/${memberId}/renew`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          plan_type: plan.key,
          amount: plan.price,
          new_end_date: newEndDate.toISOString().slice(0, 10),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.message || 'Renewal failed')
      onSuccess(data?.member || data)
      onClose()
    } catch (err) {
      alert(err.message || 'Renewal failed, try again')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 60,
          background: 'rgba(0,0,0,0.4)',
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
          transition: 'opacity 0.25s',
        }}
      />
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 70,
        background: 'var(--bg-card)', borderRadius: '24px 24px 0 0',
        transform: isOpen ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 0.3s ease-out',
        paddingBottom: 32,
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12 }}>
          <div style={{ width: 36, height: 4, background: 'var(--border)', borderRadius: 2 }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px 4px' }}>
          <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' }}>Renew Membership</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', padding: 4, cursor: 'pointer', display: 'flex' }}>
            <svg width="20" height="20" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Member info */}
        <div style={{ margin: '8px 20px 16px', padding: '10px 14px', background: 'var(--bg-primary)', borderRadius: 10 }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>{member?.full_name}</p>
          <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: '2px 0 0' }}>Current: {member?.plan_type || '—'}</p>
        </div>

        {/* Plan options */}
        <div style={{ padding: '0 20px' }}>
          {PLAN_OPTIONS.map(plan => (
            <button
              key={plan.key}
              onClick={() => setSelected(plan.key)}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                width: '100%', height: 52, padding: '0 14px',
                background: 'none', cursor: 'pointer',
                border: 'none',
                borderLeft: selected === plan.key ? '3px solid var(--text-primary)' : '3px solid transparent',
                borderBottom: '0.5px solid rgba(0,0,0,0.06)',
                textAlign: 'left',
              }}
            >
              <span style={{ fontSize: 15, fontWeight: selected === plan.key ? 600 : 400, color: selected === plan.key ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                {plan.label}
              </span>
              <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>
                ₹{plan.price.toLocaleString('en-IN')}
              </span>
            </button>
          ))}
        </div>

        <div style={{ padding: '20px 20px 0' }}>
          <button
            onClick={handleConfirm}
            disabled={loading}
            style={{
              width: '100%', height: 52, background: 'var(--text-primary)', color: 'var(--bg-card)',
              border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Processing…' : 'Confirm Renewal'}
          </button>
        </div>
      </div>
    </>
  )
}

// ── RemoveConfirm ─────────────────────────────────────────────────────────────

function RemoveConfirm({ member, memberId, isOpen, onClose, onRemoved }) {
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  async function handleRemove() {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${BASE}/api/gym-members/${memberId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session?.access_token}` },
      })
      if (!res.ok) throw new Error('Failed to remove member')
      onRemoved()
    } catch (err) {
      alert(err.message || 'Failed to remove member')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 60,
          background: 'rgba(0,0,0,0.4)',
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
          transition: 'opacity 0.25s',
        }}
      />
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 70,
        background: 'var(--bg-card)', borderRadius: '24px 24px 0 0',
        transform: isOpen ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 0.3s ease-out',
        padding: '20px 20px 40px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 0, marginBottom: 16 }}>
          <div style={{ width: 36, height: 4, background: 'var(--border)', borderRadius: 2 }} />
        </div>
        <div style={{ textAlign: 'center', padding: '0 12px 20px' }}>
          <div style={{
            width: 52, height: 52, borderRadius: '50%', background: 'var(--error-bg)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 14px',
          }}>
            <svg width="22" height="22" fill="none" stroke="var(--error)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14H6L5 6" />
              <path d="M10 11v6M14 11v6" />
              <path d="M9 6V4h6v2" />
            </svg>
          </div>
          <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 8px' }}>
            Remove {member?.full_name}?
          </p>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
            This will end their membership immediately.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1, height: 50, background: 'var(--bg-pill)', border: 'none',
              borderRadius: 12, fontSize: 15, fontWeight: 600, color: 'var(--text-secondary)', cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleRemove}
            disabled={loading}
            style={{
              flex: 1, height: 50, background: 'var(--error)', border: 'none',
              borderRadius: 12, fontSize: 15, fontWeight: 600, color: 'var(--bg-card)',
              cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Removing…' : 'Remove'}
          </button>
        </div>
      </div>
    </>
  )
}

// ── AttendanceCalendar ────────────────────────────────────────────────────────

const DAY_HEADERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

function AttendanceCalendar({ attendedCount, memberId }) {
  const { cells, attendedSet, todayDate } = buildCalendar(attendedCount, memberId)

  return (
    <div>
      {/* Day headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 4 }}>
        {DAY_HEADERS.map((d, i) => (
          <div key={i} style={{ textAlign: 'center', fontSize: 10, color: 'var(--text-tertiary)', fontWeight: 600 }}>{d}</div>
        ))}
      </div>
      {/* Calendar grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
        {cells.map((day, i) => {
          if (!day) return <div key={i} style={{ height: 20 }} />

          const isFuture  = day > todayDate
          const isToday   = day === todayDate
          const attended  = attendedSet.has(day)

          let bg = 'transparent', textColor = 'var(--text-tertiary)'
          if (isToday) { bg = 'var(--text-primary)'; textColor = 'var(--bg-card)' }
          else if (isFuture) { bg = 'transparent'; textColor = 'var(--border)' }
          else if (attended) { bg = 'var(--success)'; textColor = 'var(--bg-card)' }
          else { bg = 'var(--bg-pill)'; textColor = 'var(--text-tertiary)' }

          return (
            <div
              key={i}
              style={{
                height: 20, width: 20, borderRadius: '50%',
                background: bg, color: textColor,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 500, margin: '0 auto',
              }}
            >
              {day}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function GymMemberDetail() {
  const { memberId } = useParams()
  const navigate = useNavigate()

  const [member,            setMember]            = useState(null)
  const [loading,           setLoading]           = useState(true)
  const [showRenewModal,    setShowRenewModal]    = useState(false)
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false)
  const [actionLoading,     setActionLoading]     = useState(false)

  useEffect(() => {
    if (!memberId) return
    let cancelled = false
    setLoading(true)

    supabase.auth.getSession()
      .then(({ data: { session } }) => fetch(`${BASE}/api/gym-members/${memberId}`, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      }))
      .then(r => r.json())
      .then(data => { if (!cancelled) setMember(data?.member || data) })
      .catch(err => console.error('GymMemberDetail load error:', err))
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [memberId])

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="w-7 h-7 border-2 border-[var(--success)] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!member) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        <p style={{ fontSize: 16, fontWeight: 500, color: 'var(--text-primary)' }}>Member not found</p>
        <button onClick={() => navigate(-1)} style={{ fontSize: 13, color: 'var(--text-cta)', background: 'none', border: 'none', cursor: 'pointer' }}>← Back</button>
      </div>
    )
  }

  // ── Derived ─────────────────────────────────────────────────────────────────
  const { bg: avBg, text: avText } = getAvatarColor(member.full_name || '')
  const initials = getInitials(member.full_name || '')

  const totalDays   = daysBetween(member.membership_start, member.membership_end)
  const elapsed     = daysBetween(member.membership_start, new Date())
  const progressPct = totalDays > 0 ? Math.min(Math.round((elapsed / totalDays) * 100), 100) : 0

  const daysLeft = member.days_until_expiry ?? daysBetween(new Date(), member.membership_end)
  const daysLeftColor = daysLeft < 7 ? 'var(--error)' : daysLeft < 14 ? 'var(--warning)' : 'var(--success)'

  const rateVal = member.attendance?.rate_percent ?? 0
  const rateColor = rateVal >= 70 ? 'var(--success)' : rateVal >= 40 ? 'var(--warning)' : 'var(--error)'
  const rateBg    = rateVal >= 70 ? 'var(--success-bg)' : rateVal >= 40 ? 'var(--warning-bg)' : 'var(--error-bg)'

  const churnIsVisible = member.churn_risk && member.churn_risk !== 'low'
  const churnBorderColor = member.churn_risk === 'high' ? 'var(--error)' : 'var(--warning)'
  const churnBg          = member.churn_risk === 'high' ? 'var(--error-bg)' : 'var(--warning-bg)'
  const churnTextColor   = member.churn_risk === 'high' ? 'var(--error)' : 'var(--warning)'
  const churnBarColor    = member.churn_risk === 'high' ? '#E24B4A' : '#EF9F27'
  const churnLabel       = member.churn_risk === 'high' ? 'High Risk' : 'Medium Risk'
  const churnScore       = member.churn_score != null ? Math.round(member.churn_score * 100) : null

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <>
      <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', paddingBottom: 40 }}>

        {/* 1 — Top bar */}
        <div style={{
          background: 'var(--bg-card)', borderBottom: '0.5px solid rgba(0,0,0,0.08)',
          padding: '14px 20px',
          display: 'flex', alignItems: 'center', gap: 12,
          position: 'sticky', top: 0, zIndex: 30,
        }}>
          <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', padding: '4px 2px', cursor: 'pointer', display: 'flex' }}>
            <svg width="22" height="22" fill="none" stroke="var(--text-primary)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <span style={{ flex: 1, fontSize: 20, fontWeight: 600, color: 'var(--text-primary)' }}>Member Detail</span>
          <button style={{ background: 'none', border: 'none', padding: 4, cursor: 'pointer', display: 'flex' }}>
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
              <circle cx="5" cy="12" r="1.5" fill="var(--text-secondary)" />
              <circle cx="12" cy="12" r="1.5" fill="var(--text-secondary)" />
              <circle cx="19" cy="12" r="1.5" fill="var(--text-secondary)" />
            </svg>
          </button>
        </div>

        <div style={{ padding: '16px 20px 0' }}>

          {/* 2 — Hero card */}
          <div style={card}>
            {/* Avatar + name */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%',
                background: avBg, color: avText, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, fontWeight: 700,
              }}>
                {initials}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {member.full_name}
                </p>
                <p style={{ fontSize: 13, color: 'var(--text-tertiary)', margin: '3px 0 6px' }}>
                  Member since {formatMonthYear(member.joined_at || member.created_at)}
                </p>
                {member.plan_type && (
                  <span style={{ background: 'var(--success-bg)', color: 'var(--success)', fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20 }}>
                    {member.plan_type.charAt(0).toUpperCase() + member.plan_type.slice(1)}
                  </span>
                )}
              </div>
            </div>

            {/* Stats row */}
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
              background: 'var(--bg-primary)', borderRadius: 10, overflow: 'hidden', marginBottom: 16,
            }}>
              {[
                { val: member.age,            unit: '',   label: 'Age'    },
                { val: member.current_weight, unit: ' kg', label: 'Weight' },
                { val: member.height,         unit: ' cm', label: 'Height' },
              ].map(({ val, unit, label }, i) => (
                <div key={label} style={{
                  textAlign: 'center', padding: '12px 4px',
                  borderRight: i < 2 ? '0.5px solid rgba(0,0,0,0.08)' : 'none',
                }}>
                  <p style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                    {val != null ? `${val}${unit}` : '—'}
                  </p>
                  <p style={{ fontSize: 11, color: 'var(--text-tertiary)', margin: '3px 0 0' }}>{label}</p>
                </div>
              ))}
            </div>

            {/* Contact */}
            {member.phone && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderTop: '0.5px solid rgba(0,0,0,0.06)' }}>
                <svg width="16" height="16" fill="none" stroke="var(--text-tertiary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.4 2 2 0 0 1 3.6 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.78a16 16 0 0 0 6 6l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
                <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{member.phone}</span>
              </div>
            )}
          </div>

          {/* 3 — Membership card */}
          <div style={card}>
            <p style={sectionLabel}>MEMBERSHIP</p>

            {/* Plan + status */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>
                {member.plan_type
                  ? member.plan_type.charAt(0).toUpperCase() + member.plan_type.slice(1) + ' Plan'
                  : '—'}
              </span>
              <StatusPill
                status={member.status}
                churn_risk={member.churn_risk}
                days_until_expiry={member.days_until_expiry}
              />
            </div>

            {/* Progress bar */}
            <div style={{ height: 6, background: 'var(--bg-pill)', borderRadius: 3, overflow: 'hidden', marginBottom: 6 }}>
              <div style={{ height: '100%', width: `${progressPct}%`, background: 'var(--success)', borderRadius: 3, transition: 'width 0.5s' }} />
            </div>

            {/* Date labels */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{formatDate(member.membership_start)}</span>
              <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{formatDate(member.membership_end)}</span>
            </div>

            <p style={{ fontSize: 12, color: daysLeftColor, fontWeight: 500, marginBottom: 14 }}>
              {daysLeft} days remaining
            </p>

            {/* Detail rows */}
            {[
              { label: 'Plan Type',    value: member.plan_type ? member.plan_type.charAt(0).toUpperCase() + member.plan_type.slice(1) : '—' },
              { label: 'Start Date',   value: formatDate(member.membership_start) },
              { label: 'End Date',     value: formatDate(member.membership_end) },
              { label: 'Amount Paid',  value: member.payments?.[0]?.amount != null ? `₹${Number(member.payments[0].amount).toLocaleString('en-IN')}` : '—' },
              { label: 'Next Renewal', value: formatDate(member.membership_end) },
            ].map(({ label, value }, i, arr) => (
              <div key={label} style={{ ...detailRow, borderBottom: i === arr.length - 1 ? 'none' : '0.5px solid rgba(0,0,0,0.06)' }}>
                <span style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>{label}</span>
                <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{value}</span>
              </div>
            ))}

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
              <button
                onClick={() => setShowRenewModal(true)}
                style={{
                  flex: 1, height: 44, background: 'var(--text-primary)', color: 'var(--bg-card)',
                  border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer',
                }}
              >
                Renew
              </button>
              <button
                onClick={() => {}}
                style={{
                  flex: 1, height: 44, background: 'var(--bg-pill)', color: 'var(--text-primary)',
                  border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer',
                }}
              >
                Change Plan
              </button>
            </div>
          </div>

          {/* 4 — Attendance card */}
          <div style={card}>
            <p style={sectionLabel}>ATTENDANCE THIS MONTH</p>

            {/* Stats row */}
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
              background: 'var(--bg-primary)', borderRadius: 10, overflow: 'hidden', marginBottom: 16,
            }}>
              {[
                { val: member.attendance?.this_month ?? '—', label: 'Visits',   extraStyle: {} },
                { val: member.attendance?.per_week ?? '—',   label: 'Per week', extraStyle: {} },
                {
                  val: rateVal != null ? `${rateVal}%` : '—',
                  label: 'Rate',
                  extraStyle: { color: rateColor, background: rateBg },
                },
              ].map(({ val, label, extraStyle }, i) => (
                <div key={label} style={{
                  textAlign: 'center', padding: '12px 4px',
                  borderRight: i < 2 ? '0.5px solid rgba(0,0,0,0.08)' : 'none',
                  ...extraStyle,
                }}>
                  <p style={{ fontSize: 17, fontWeight: 700, color: extraStyle.color || 'var(--text-primary)', margin: 0 }}>{val}</p>
                  <p style={{ fontSize: 11, color: extraStyle.color || 'var(--text-tertiary)', margin: '3px 0 0' }}>{label}</p>
                </div>
              ))}
            </div>

            <AttendanceCalendar
              attendedCount={member.attendance?.this_month ?? 0}
              memberId={memberId}
            />
          </div>

          {/* 5 — Churn risk card */}
          {churnIsVisible && (
            <div style={{
              background: churnBg,
              border: `0.5px solid rgba(0,0,0,0.06)`,
              borderLeft: `3px solid ${churnBorderColor}`,
              borderRadius: 12, padding: 16, marginBottom: 12,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: churnTextColor }}>{churnLabel}</span>
                {churnScore != null && (
                  <span style={{ fontSize: 12, fontWeight: 600, color: churnTextColor, background: 'var(--bg-card)', padding: '3px 10px', borderRadius: 20 }}>
                    {churnScore} / 100
                  </span>
                )}
              </div>

              {/* Risk bar */}
              <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden', marginBottom: 8 }}>
                <div style={{ height: '100%', width: `${churnScore ?? 50}%`, background: churnBarColor, borderRadius: 3 }} />
              </div>

              <p style={{ fontSize: 12, color: churnTextColor, margin: '0 0 10px' }}>
                Last visited {daysAgo(member.attendance?.last_visited)} days ago
              </p>

              {/* Risk factor pills */}
              {Array.isArray(member.risk_factors) && member.risk_factors.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {member.risk_factors.map((f, i) => (
                    <span key={i} style={{
                      fontSize: 11, fontWeight: 500, color: churnTextColor,
                      background: 'rgba(255,255,255,0.6)',
                      padding: '4px 10px', borderRadius: 20,
                    }}>
                      {f}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 6 — Payment history */}
          <div style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <p style={sectionLabel}>PAYMENT HISTORY</p>
              <button
                onClick={() => navigate('/gym/payments')}
                style={{ background: 'none', border: 'none', fontSize: 13, color: 'var(--text-cta)', fontWeight: 600, cursor: 'pointer', padding: 0 }}
              >
                See all →
              </button>
            </div>

            {!member.payments?.length ? (
              <p style={{ fontSize: 13, color: 'var(--text-tertiary)', textAlign: 'center', padding: '16px 0', margin: 0 }}>No payment records</p>
            ) : (
              member.payments.slice(0, 3).map((payment, i, arr) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 0',
                  borderBottom: i < arr.length - 1 ? '0.5px solid rgba(0,0,0,0.06)' : 'none',
                }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--success-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="16" height="16" fill="none" stroke="var(--success)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 6v6l4 2" />
                    </svg>
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', margin: 0 }}>Monthly Renewal</p>
                    <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: '2px 0 0' }}>
                      {formatDate(payment.paid_at || payment.created_at)}
                    </p>
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                    ₹{Number(payment.amount || 0).toLocaleString('en-IN')}
                  </span>
                </div>
              ))
            )}
          </div>

          {/* 7 — Actions */}
          <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
            <button
              onClick={() => navigate('/trainer/chat')}
              style={{
                display: 'flex', alignItems: 'center', gap: 14,
                width: '100%', padding: '0 16px', height: 56,
                background: 'none', border: 'none', cursor: 'pointer',
                borderBottom: '0.5px solid rgba(0,0,0,0.06)',
                textAlign: 'left',
              }}
            >
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--accent-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="16" height="16" fill="none" stroke="var(--text-cta)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <span style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-primary)' }}>Send Message</span>
              <svg style={{ marginLeft: 'auto' }} width="16" height="16" fill="none" stroke="var(--text-tertiary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>

            <button
              onClick={() => setShowRemoveConfirm(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 14,
                width: '100%', padding: '0 16px', height: 56,
                background: 'none', border: 'none', cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--error-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="16" height="16" fill="none" stroke="var(--error)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6l-1 14H6L5 6" />
                  <path d="M10 11v6M14 11v6" />
                  <path d="M9 6V4h6v2" />
                </svg>
              </div>
              <span style={{ fontSize: 15, fontWeight: 500, color: 'var(--error)' }}>Remove Member</span>
              <svg style={{ marginLeft: 'auto' }} width="16" height="16" fill="none" stroke="var(--text-tertiary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>

        </div>
      </div>

      {/* Modals */}
      <RenewModal
        member={member}
        memberId={memberId}
        isOpen={showRenewModal}
        onClose={() => setShowRenewModal(false)}
        onSuccess={updated => setMember(prev => ({ ...prev, ...updated }))}
      />
      <RemoveConfirm
        member={member}
        memberId={memberId}
        isOpen={showRemoveConfirm}
        onClose={() => setShowRemoveConfirm(false)}
        onRemoved={() => navigate('/gym/members')}
      />
    </>
  )
}
