import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../utils/supabase'
import { getAvatarColor } from '../../utils/avatarColor'
import GymBottomNav from '../../components/GymBottomNav'
import MoreSheet from '../../components/MoreSheet'

const FILTERS = ['all', 'active', 'expiring', 'at_risk', 'inactive']
const LIMIT = 20

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatExpiry(dateString) {
  if (!dateString) return '—'
  return new Date(dateString).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short',
  })
}

function getInitials(name) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function filterLabel(f) {
  if (f === 'at_risk')  return 'At Risk'
  if (f === 'expiring') return 'Expiring Soon'
  return f.charAt(0).toUpperCase() + f.slice(1)
}

// ── StatusPill ────────────────────────────────────────────────────────────────

function StatusPill({ status, churn_risk, days_until_expiry }) {
  let label, bg, color
  if (churn_risk === 'high') {
    label = 'At Risk';   bg = '#FCEBEB'; color = '#A32D2D'
  } else if (days_until_expiry <= 7 && days_until_expiry > 0) {
    label = 'Expiring';  bg = '#FAEEDA'; color = '#854F0B'
  } else if (status === 'inactive') {
    label = 'Inactive';  bg = '#F1EFE8'; color = '#5F5E5A'
  } else {
    label = 'Active';    bg = '#EAF3DE'; color = '#3B6D11'
  }
  return (
    <span style={{
      background: bg, color,
      padding: '6px 10px', borderRadius: 20,
      fontSize: 11, fontWeight: 500, flexShrink: 0,
    }}>
      {label}
    </span>
  )
}

// ── MemberRow ─────────────────────────────────────────────────────────────────

function MemberRow({ member, onClick }) {
  const { bg, text } = getAvatarColor(member.full_name || '')
  const initials = getInitials(member.full_name || '')
  const expiry = member.expiry_date || member.end_date || member.membership_end_date

  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '0 16px', height: 68,
        width: '100%', background: 'none', border: 'none',
        cursor: 'pointer', textAlign: 'left',
        borderBottom: '0.5px solid rgba(0,0,0,0.06)',
      }}
    >
      <div style={{
        width: 40, height: 40, borderRadius: '50%',
        background: bg, color: text, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 14, fontWeight: 600,
      }}>
        {initials}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 15, fontWeight: 500, color: '#111', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {member.full_name}
        </p>
        <p style={{ fontSize: 13, color: '#999', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {member.plan_type || member.membership_type || 'Member'} · Exp {formatExpiry(expiry)}
        </p>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
        <StatusPill
          status={member.status}
          churn_risk={member.churn_risk}
          days_until_expiry={member.days_until_expiry}
        />
        <svg width="16" height="16" fill="none" stroke="#CCC" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </div>
    </button>
  )
}

// ── SkeletonRow ───────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '0 16px', height: 68,
      borderBottom: '0.5px solid rgba(0,0,0,0.06)',
    }}>
      <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#F0F0EE', flexShrink: 0, animation: 'skel 1.2s ease infinite alternate' }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ height: 13, width: '55%', background: '#F0F0EE', borderRadius: 4, animation: 'skel 1.2s ease infinite alternate' }} />
        <div style={{ height: 11, width: '38%', background: '#F0F0EE', borderRadius: 4, animation: 'skel 1.2s ease 0.2s infinite alternate' }} />
      </div>
      <div style={{ width: 56, height: 24, background: '#F0F0EE', borderRadius: 20, animation: 'skel 1.2s ease infinite alternate' }} />
    </div>
  )
}

// ── SummaryPill ───────────────────────────────────────────────────────────────

function SummaryPill({ label, bg, text }) {
  return (
    <span style={{
      background: bg, color: text,
      padding: '6px 12px', borderRadius: 20,
      fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  )
}

// ── AddMemberSheet (stub) ─────────────────────────────────────────────────────

function AddMemberSheet({ isOpen, onClose }) {
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  const options = [
    { label: 'Invite via Phone', icon: <PhoneIcon /> },
    { label: 'Invite via Email', icon: <MailIcon />  },
    { label: 'Scan Member QR',   icon: <QrIcon />    },
  ]

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
        background: '#fff', borderRadius: '24px 24px 0 0',
        transform: isOpen ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 0.3s ease-out',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12 }}>
          <div style={{ width: 36, height: 4, background: '#E0E0E0', borderRadius: 2 }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px 4px' }}>
          <span style={{ fontSize: 17, fontWeight: 700, color: '#111' }}>Add Member</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', padding: 4, cursor: 'pointer', display: 'flex' }}>
            <svg width="20" height="20" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div style={{ padding: '4px 0 32px' }}>
          {options.map((opt, i) => (
            <div key={opt.label}>
              <button
                onClick={() => console.log(opt.label)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 16,
                  width: '100%', height: 64, padding: '0 20px',
                  background: 'none', border: 'none', cursor: 'pointer',
                }}
              >
                <div style={{
                  width: 40, height: 40, borderRadius: 12, background: '#EBF2FB',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {opt.icon}
                </div>
                <span style={{ fontSize: 15, fontWeight: 500, color: '#185FA5' }}>{opt.label}</span>
              </button>
              {i < options.length - 1 && (
                <div style={{ marginLeft: 76, height: '0.5px', background: 'rgba(0,0,0,0.06)' }} />
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

function PhoneIcon() {
  return (
    <svg width="20" height="20" fill="none" stroke="#185FA5" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.4 2 2 0 0 1 3.6 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.78a16 16 0 0 0 6 6l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  )
}

function MailIcon() {
  return (
    <svg width="20" height="20" fill="none" stroke="#185FA5" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  )
}

function QrIcon() {
  return (
    <svg width="20" height="20" fill="none" stroke="#185FA5" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <path d="M14 14h3v3h-3z" fill="#185FA5" stroke="none" />
      <path d="M17 17h4" /><path d="M21 14v3" /><path d="M14 21h3" />
    </svg>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function GymMembers() {
  const { user } = useAuth()
  const navigate  = useNavigate()

  const [members,      setMembers]      = useState([])
  const [filtered,     setFiltered]     = useState([])
  const [search,       setSearch]       = useState('')
  const [activeFilter, setActiveFilter] = useState('all')
  const [loading,      setLoading]      = useState(true)
  const [page,         setPage]         = useState(1)
  const [hasMore,      setHasMore]      = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [moreOpen,     setMoreOpen]     = useState(false)
  const [gymId,        setGymId]        = useState(null)

  // ── Fetch gymId once ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return
    supabase
      .from('users').select('gym_id').eq('id', user.id).single()
      .then(({ data }) => setGymId(data?.gym_id ?? null))
  }, [user])

  // ── Fetch members (re-runs when gymId or page changes) ────────────────────
  useEffect(() => {
    if (!gymId) return
    let cancelled = false

    async function load() {
      if (page === 1) setLoading(true)
      try {
        const base = import.meta.env.VITE_API_URL
        const url  = `${base}/api/gym-members?gymId=${encodeURIComponent(gymId)}&page=${page}&limit=${LIMIT}`
        const res  = await fetch(url)
        const data = await res.json().catch(() => [])
        if (cancelled) return

        const list = Array.isArray(data) ? data : (data?.members ?? [])
        setMembers(prev => page === 1 ? list : [...prev, ...list])
        setHasMore(list.length === LIMIT)
      } catch (err) {
        console.error('GymMembers load error:', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [gymId, page])

  // ── Filter + search ───────────────────────────────────────────────────────
  useEffect(() => {
    let result = members

    if (activeFilter !== 'all') {
      result = result.filter(m => {
        if (activeFilter === 'active')   return m.status === 'active'
        if (activeFilter === 'expiring') return m.days_until_expiry <= 7 && m.days_until_expiry > 0
        if (activeFilter === 'at_risk')  return m.churn_risk === 'high'
        if (activeFilter === 'inactive') return m.status === 'inactive'
        return true
      })
    }

    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(m => (m.full_name || '').toLowerCase().includes(q))
    }

    setFiltered(result)
  }, [search, activeFilter, members])

  // ── Derived counts ────────────────────────────────────────────────────────
  const totalCount  = members.length
  const activeCount = members.filter(m => m.status === 'active').length
  const atRiskCount = members.filter(m => m.churn_risk === 'high').length

  // ── Chip styles ───────────────────────────────────────────────────────────
  const chipBase = { borderRadius: 20, padding: '8px 14px', fontSize: 12, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap', border: 'none' }
  const activeChip   = { ...chipBase, background: '#111', color: '#fff' }
  const inactiveChip = { ...chipBase, background: '#fff', border: '0.5px solid #ddd', color: '#666' }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`@keyframes skel { from { opacity: 0.4; } to { opacity: 1; } }`}</style>

      <div style={{ minHeight: '100vh', background: '#F7F7F5', paddingBottom: 80 }}>

        {/* 1 — Top bar */}
        <div style={{
          background: '#fff', borderBottom: '0.5px solid rgba(0,0,0,0.08)',
          padding: '14px 20px',
          display: 'flex', alignItems: 'center', gap: 12,
          position: 'sticky', top: 0, zIndex: 30,
        }}>
          <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', padding: '4px 2px', cursor: 'pointer', display: 'flex' }}>
            <svg width="22" height="22" fill="none" stroke="#111" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <span style={{ flex: 1, fontSize: 17, fontWeight: 700, color: '#111' }}>Members</span>
          <button style={{ background: 'none', border: 'none', padding: 4, cursor: 'pointer', display: 'flex' }}>
            <svg width="20" height="20" fill="none" stroke="#555" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
            </svg>
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            style={{
              background: '#111', color: '#fff', border: 'none',
              borderRadius: 20, padding: '8px 14px',
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 4,
            }}
          >
            <span style={{ fontSize: 18, lineHeight: 1, marginTop: -1 }}>+</span> Add
          </button>
        </div>

        <div style={{ padding: '16px 20px 0' }}>

          {/* 2 — Summary strip */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <SummaryPill label={`${totalCount} Total`}    bg="#F1EFE8" text="#5F5E5A" />
            <SummaryPill label={`${activeCount} Active`}  bg="#EAF3DE" text="#3B6D11" />
            <SummaryPill label={`${atRiskCount} At Risk`} bg="#FCEBEB" text="#A32D2D" />
          </div>

          {/* 3 — Search */}
          <div style={{ position: 'relative', marginBottom: 12 }}>
            <svg style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
              width="16" height="16" fill="none" stroke="#999" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search members..."
              style={{
                width: '100%', height: 44, background: '#F1EFE8', border: 'none',
                borderRadius: 12, padding: '0 36px',
                fontSize: 15, color: '#111', outline: 'none', boxSizing: 'border-box',
              }}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 2, display: 'flex' }}
              >
                <svg width="14" height="14" fill="none" stroke="#999" strokeWidth="2.5" strokeLinecap="round" viewBox="0 0 24 24">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>

          {/* 4 — Filter chips */}
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, marginBottom: 14, scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {FILTERS.map(f => (
              <button key={f} onClick={() => setActiveFilter(f)} style={activeFilter === f ? activeChip : inactiveChip}>
                {filterLabel(f)}
              </button>
            ))}
          </div>

        </div>

        {/* 5 — Members list */}
        <div style={{
          margin: '0 20px 16px',
          background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)',
          borderRadius: 12, overflow: 'hidden',
        }}>
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
          ) : filtered.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 20px' }}>
              <svg width="48" height="48" fill="none" stroke="#999" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              <p style={{ fontSize: 16, fontWeight: 500, color: '#111', margin: '12px 0 4px' }}>No members found</p>
              <p style={{ fontSize: 13, color: '#999', margin: 0, textAlign: 'center' }}>
                Try changing your search or filter
              </p>
            </div>
          ) : (
            filtered.map((member, i) => (
              <MemberRow
                key={member.id || i}
                member={member}
                onClick={() => navigate(`/gym/members/${member.id}`)}
              />
            ))
          )}
        </div>

        {/* 6 — Load more */}
        {!loading && hasMore && (
          <div style={{ textAlign: 'center', paddingBottom: 16 }}>
            <button
              onClick={() => setPage(p => p + 1)}
              style={{ background: 'none', border: 'none', fontSize: 13, color: '#185FA5', fontWeight: 500, cursor: 'pointer' }}
            >
              Load {LIMIT} more members
            </button>
          </div>
        )}

        {/* 7 — FAB */}
        <button
          onClick={() => setShowAddModal(true)}
          style={{
            position: 'fixed', bottom: 84, right: 20, zIndex: 10,
            width: 52, height: 52, borderRadius: '50%',
            background: '#111', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
          }}
        >
          <svg width="24" height="24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" viewBox="0 0 24 24">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>

        {/* 8 — Bottom nav */}
        <GymBottomNav onMorePress={() => setMoreOpen(true)} />
        <MoreSheet isOpen={moreOpen} onClose={() => setMoreOpen(false)} />
        <AddMemberSheet isOpen={showAddModal} onClose={() => setShowAddModal(false)} />
      </div>
    </>
  )
}
