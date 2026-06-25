import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../utils/supabase'
import { getAvatarColor, getInitials } from '../../utils/avatarColor'
import { formatShortDate } from '../../utils/dateHelpers'
import GymBottomNav from '../../components/GymBottomNav'
import MoreSheet from '../../components/MoreSheet'

const BASE    = import.meta.env.VITE_API_URL
const LIMIT   = 20
const FILTERS = ['all', 'paid', 'overdue', 'refunded', 'this_week']
const FILTER_LABELS = {
  all: 'All', paid: 'Paid',
  overdue: 'Overdue', refunded: 'Refunded',
  this_week: 'This Week',
}

const PLAN_OPTIONS = [
  { key: 'monthly',   label: 'Monthly',   amount: 1500  },
  { key: 'quarterly', label: 'Quarterly', amount: 3999  },
  { key: 'annual',    label: 'Annual',    amount: 14999 },
]

// ── Design tokens ─────────────────────────────────────────────────────────────

const card = {
  background: 'var(--bg-card)',
  border: '0.5px solid rgba(0,0,0,0.08)',
  borderRadius: 12,
  padding: 16,
  marginBottom: 12,
}

const sectionLabel = {
  fontSize: 11, letterSpacing: '0.08em',
  color: 'var(--text-tertiary)', fontWeight: 600,
  textTransform: 'uppercase', margin: 0,
}

// ── PaymentStatusPill ─────────────────────────────────────────────────────────

function PaymentStatusPill({ status }) {
  const map = {
    paid:     { bg: 'var(--success-bg)', color: 'var(--success)', label: 'Paid'     },
    overdue:  { bg: 'var(--error-bg)', color: 'var(--error)', label: 'Overdue'  },
    refunded: { bg: 'var(--bg-pill)', color: 'var(--text-secondary)', label: 'Refunded' },
  }
  const s = map[status] || map.paid
  return (
    <span style={{ background: s.bg, color: s.color, fontSize: 11, borderRadius: 20, padding: '4px 8px', fontWeight: 500 }}>
      {s.label}
    </span>
  )
}

// ── PaymentRow ────────────────────────────────────────────────────────────────

function PaymentRow({ payment, isLast }) {
  const name = payment.full_name || payment.member_name || 'Unknown'
  const { bg, text } = getAvatarColor(name)
  const initials = getInitials(name)
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '0 16px', height: 60,
      borderBottom: isLast ? 'none' : '0.5px solid rgba(0,0,0,0.06)',
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: '50%',
        background: bg, color: text, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 13, fontWeight: 600,
      }}>
        {initials}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {name}
        </p>
        <p style={{ fontSize: 13, color: 'var(--text-tertiary)', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {payment.plan_type
            ? payment.plan_type.charAt(0).toUpperCase() + payment.plan_type.slice(1)
            : 'Payment'} · {formatShortDate(payment.paid_at || payment.created_at)}
        </p>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
          ₹{Number(payment.amount || 0).toLocaleString('en-IN')}
        </p>
        <div style={{ marginTop: 3 }}>
          <PaymentStatusPill status={payment.status || 'paid'} />
        </div>
      </div>
    </div>
  )
}

// ── SkeletonRow ───────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 16px', height: 60, borderBottom: '0.5px solid rgba(0,0,0,0.06)' }}>
      <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--bg-pill)', flexShrink: 0, animation: 'skel 1.2s ease infinite alternate' }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ height: 13, width: '50%', background: 'var(--bg-pill)', borderRadius: 4, animation: 'skel 1.2s ease infinite alternate' }} />
        <div style={{ height: 11, width: '35%', background: 'var(--bg-pill)', borderRadius: 4, animation: 'skel 1.2s ease 0.2s infinite alternate' }} />
      </div>
      <div style={{ width: 60, height: 13, background: 'var(--bg-pill)', borderRadius: 4, animation: 'skel 1.2s ease infinite alternate' }} />
    </div>
  )
}

// ── CollectModal ──────────────────────────────────────────────────────────────

function CollectModal({ isOpen, onClose, gymId, onSuccess }) {
  const [step,           setStep]           = useState(1)
  const [memberSearch,   setMemberSearch]   = useState('')
  const [allMembers,     setAllMembers]     = useState([])
  const [selectedMember, setSelectedMember] = useState(null)
  const [selectedPlan,   setSelectedPlan]   = useState('monthly')
  const [notes,          setNotes]          = useState('')
  const [submitting,     setSubmitting]     = useState(false)

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen || !gymId) return
    fetch(`${BASE}/api/gym-members?gymId=${encodeURIComponent(gymId)}&limit=100`)
      .then(r => r.json())
      .then(d => setAllMembers(Array.isArray(d) ? d : (d?.members ?? [])))
      .catch(() => setAllMembers([]))
  }, [isOpen, gymId])

  function handleClose() {
    setStep(1); setMemberSearch(''); setSelectedMember(null)
    setSelectedPlan('monthly'); setNotes(''); onClose()
  }

  const filteredMembers = allMembers.filter(m =>
    (m.full_name || '').toLowerCase().includes(memberSearch.toLowerCase())
  )

  const planObj   = PLAN_OPTIONS.find(p => p.key === selectedPlan)
  const selAmount = planObj?.amount ?? 0

  async function handleCollect() {
    if (!selectedMember) return
    setSubmitting(true)
    try {
      const res = await fetch(`${BASE}/api/gym-payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          member_id: selectedMember.id,
          gym_id:    gymId,
          amount:    selAmount,
          plan_type: selectedPlan,
          notes,
          status:    'paid',
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.message || 'Failed to collect payment')
      onSuccess({
        ...data,
        full_name: selectedMember.full_name,
        amount:    selAmount,
        plan_type: selectedPlan,
        status:    'paid',
        paid_at:   new Date().toISOString(),
      })
      handleClose()
    } catch (err) {
      alert(err.message || 'Failed to collect payment')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <div
        onClick={handleClose}
        style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,0.4)', opacity: isOpen ? 1 : 0, pointerEvents: isOpen ? 'auto' : 'none', transition: 'opacity 0.25s' }}
      />
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 70,
        background: 'var(--bg-card)', borderRadius: '24px 24px 0 0',
        transform: isOpen ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 0.3s ease-out',
        maxHeight: '85vh', display: 'flex', flexDirection: 'column',
      }}>
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 0', flexShrink: 0 }}>
          <div style={{ width: 36, height: 4, background: 'var(--border)', borderRadius: 2 }} />
        </div>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px 8px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {step === 2 && (
              <button onClick={() => setStep(1)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}>
                <svg width="20" height="20" fill="none" stroke="var(--text-primary)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
            )}
            <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' }}>Collect Payment</span>
          </div>
          <button onClick={handleClose} style={{ background: 'none', border: 'none', padding: 4, cursor: 'pointer', display: 'flex' }}>
            <svg width="20" height="20" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0 32px' }}>
          {step === 1 ? (
            <>
              <div style={{ padding: '0 20px 12px' }}>
                <div style={{ position: 'relative' }}>
                  <svg style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
                    width="16" height="16" fill="none" stroke="var(--text-tertiary)" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24">
                    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <input
                    type="text"
                    value={memberSearch}
                    onChange={e => setMemberSearch(e.target.value)}
                    placeholder="Search member name..."
                    style={{ width: '100%', height: 44, background: 'var(--bg-pill)', border: 'none', borderRadius: 12, padding: '0 12px 0 36px', fontSize: 15, color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              </div>
              <div>
                {filteredMembers.slice(0, 20).map((m, i) => {
                  const { bg, text } = getAvatarColor(m.full_name || '')
                  return (
                    <button
                      key={m.id || i}
                      onClick={() => { setSelectedMember(m); setStep(2) }}
                      style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '0 20px', height: 60, background: 'none', border: 'none', cursor: 'pointer', borderBottom: '0.5px solid rgba(0,0,0,0.06)', textAlign: 'left' }}
                    >
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: bg, color: text, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600 }}>
                        {getInitials(m.full_name || '')}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.full_name}</p>
                        <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: '2px 0 0' }}>{m.plan_type || m.membership_type || 'Member'}</p>
                      </div>
                      <svg width="16" height="16" fill="none" stroke="var(--text-tertiary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </button>
                  )
                })}
                {filteredMembers.length === 0 && (
                  <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-tertiary)', padding: '24px 0' }}>No members found</p>
                )}
              </div>
            </>
          ) : (
            <div style={{ padding: '0 20px' }}>
              {/* Selected member chip */}
              {selectedMember && (() => {
                const { bg, text } = getAvatarColor(selectedMember.full_name || '')
                return (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 14px', background: 'var(--bg-primary)', borderRadius: 10, marginBottom: 16 }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: bg, color: text, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600, flexShrink: 0 }}>
                      {getInitials(selectedMember.full_name || '')}
                    </div>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>{selectedMember.full_name}</p>
                      <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: '2px 0 0' }}>{selectedMember.plan_type || 'Member'}</p>
                    </div>
                  </div>
                )
              })()}

              {/* Plan options */}
              <div style={{ marginBottom: 14 }}>
                {PLAN_OPTIONS.map(plan => (
                  <button
                    key={plan.key}
                    onClick={() => setSelectedPlan(plan.key)}
                    style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      width: '100%', height: 52, padding: '0 14px',
                      background: 'none', cursor: 'pointer',
                      border: 'none',
                      borderLeft: selectedPlan === plan.key ? '3px solid var(--text-primary)' : '3px solid transparent',
                      borderBottom: '0.5px solid rgba(0,0,0,0.06)',
                      textAlign: 'left',
                    }}
                  >
                    <span style={{ fontSize: 15, fontWeight: selectedPlan === plan.key ? 600 : 400, color: selectedPlan === plan.key ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                      {plan.label}
                    </span>
                    <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>
                      ₹{plan.amount.toLocaleString('en-IN')}
                    </span>
                  </button>
                ))}
              </div>

              {/* Notes */}
              <input
                type="text"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Add note..."
                style={{ width: '100%', height: 40, background: 'var(--bg-card)', border: '0.5px solid rgba(0,0,0,0.12)', borderRadius: 8, padding: '0 12px', fontSize: 13, color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box', marginBottom: 20 }}
              />

              <button
                onClick={handleCollect}
                disabled={submitting}
                style={{ width: '100%', height: 52, background: 'var(--text-primary)', color: 'var(--bg-card)', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1 }}
              >
                {submitting ? 'Processing…' : `Collect ₹${selAmount.toLocaleString('en-IN')}`}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function GymPayments() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [gymId,            setGymId]            = useState(null)
  const [summary,          setSummary]          = useState(null)
  const [payments,         setPayments]         = useState([])
  const [activeFilter,     setActiveFilter]     = useState('all')
  const [loading,          setLoading]          = useState(true)
  const [page,             setPage]             = useState(1)
  const [hasMore,          setHasMore]          = useState(true)
  const [showCollectModal, setShowCollectModal] = useState(false)
  const [moreOpen,         setMoreOpen]         = useState(false)
  const [sendingReminders, setSendingReminders] = useState(false)

  // ── Resolve gymId ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return
    supabase.from('users').select('gym_id').eq('id', user.id).single()
      .then(({ data }) => setGymId(data?.gym_id ?? null))
  }, [user])

  // ── Initial data load ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!gymId) return
    let cancelled = false
    setLoading(true)

    async function load() {
      try {
        const [sumRes, payRes] = await Promise.all([
          fetch(`${BASE}/api/gym-payments/${gymId}/summary`),
          fetch(`${BASE}/api/gym-payments/${gymId}?page=1&limit=${LIMIT}`),
        ])
        const sumData = await sumRes.json().catch(() => null)
        const payData = await payRes.json().catch(() => [])
        if (cancelled) return
        setSummary(sumData)
        const list = Array.isArray(payData) ? payData : (payData?.payments ?? [])
        setPayments(list)
        setHasMore(list.length === LIMIT)
        setPage(1)
      } catch (err) {
        console.error('GymPayments load error:', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [gymId])

  // ── Filter ─────────────────────────────────────────────────────────────────
  async function applyFilter(filter) {
    if (!gymId) return
    setActiveFilter(filter)
    setLoading(true)
    try {
      const statusParam = filter !== 'all' && filter !== 'this_week' ? `&status=${filter}` : ''
      const periodParam = filter === 'this_week' ? '&period=this_week' : ''
      const res  = await fetch(`${BASE}/api/gym-payments/${gymId}?page=1&limit=${LIMIT}${statusParam}${periodParam}`)
      const data = await res.json().catch(() => [])
      const list = Array.isArray(data) ? data : (data?.payments ?? [])
      setPayments(list)
      setHasMore(list.length === LIMIT)
      setPage(1)
    } catch (err) {
      console.error('GymPayments filter error:', err)
    } finally {
      setLoading(false)
    }
  }

  // ── Load more ──────────────────────────────────────────────────────────────
  async function loadMore() {
    if (!gymId) return
    const nextPage = page + 1
    try {
      const statusParam = activeFilter !== 'all' && activeFilter !== 'this_week' ? `&status=${activeFilter}` : ''
      const periodParam = activeFilter === 'this_week' ? '&period=this_week' : ''
      const res  = await fetch(`${BASE}/api/gym-payments/${gymId}?page=${nextPage}&limit=${LIMIT}${statusParam}${periodParam}`)
      const data = await res.json().catch(() => [])
      const list = Array.isArray(data) ? data : (data?.payments ?? [])
      setPayments(prev => [...prev, ...list])
      setHasMore(list.length === LIMIT)
      setPage(nextPage)
    } catch (err) {
      console.error('GymPayments loadMore error:', err)
    }
  }

  // ── Send reminders ─────────────────────────────────────────────────────────
  async function sendReminders() {
    if (!gymId || sendingReminders) return
    setSendingReminders(true)
    try {
      const res  = await fetch(`${BASE}/api/gym-payments/send-reminders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gym_id: gymId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.message || 'Failed')
      alert(`Reminders sent to ${data.reminded_count ?? '—'} members`)
    } catch (err) {
      alert(err.message || 'Failed to send reminders')
    } finally {
      setSendingReminders(false)
    }
  }

  // ── Chart helpers ──────────────────────────────────────────────────────────
  const maxChartVal = Math.max(...(summary?.monthly_chart?.map(m => m.total) ?? [1]), 1)
  const currentMonthKey = new Date().toISOString().slice(0, 7)
  const change = summary?.month_change || 0

  const chipBase   = { borderRadius: 20, padding: '8px 14px', fontSize: 12, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap', border: 'none' }
  const activeChip = { ...chipBase, background: 'var(--text-primary)', color: 'var(--bg-card)' }
  const inactiveChip = { ...chipBase, background: 'var(--bg-card)', border: '0.5px solid var(--border)', color: 'var(--text-secondary)' }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`@keyframes skel { from { opacity: 0.4; } to { opacity: 1; } }`}</style>

      <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', paddingBottom: 80 }}>

        {/* 1 — Top bar */}
        <div style={{
          background: 'var(--bg-card)', borderBottom: '0.5px solid rgba(0,0,0,0.08)',
          padding: '14px 20px',
          display: 'flex', alignItems: 'center', gap: 4,
          position: 'sticky', top: 0, zIndex: 30,
        }}>
          <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', padding: '4px 6px 4px 2px', cursor: 'pointer', display: 'flex', minWidth: 36 }}>
            <svg width="22" height="22" fill="none" stroke="var(--text-primary)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <span style={{ flex: 1, fontSize: 20, fontWeight: 600, color: 'var(--text-primary)' }}>Payments</span>
          <button style={{ background: 'none', border: 'none', padding: 4, cursor: 'pointer', display: 'flex', minWidth: 44, justifyContent: 'center' }}>
            <svg width="22" height="22" fill="none" stroke="var(--text-secondary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </button>
          <button style={{ background: 'none', border: 'none', padding: 4, cursor: 'pointer', display: 'flex', minWidth: 44, justifyContent: 'center' }}>
            <svg width="20" height="20" fill="none" stroke="var(--text-secondary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
            </svg>
          </button>
        </div>

        <div style={{ padding: '16px 20px 0' }}>

          {/* 2 — Revenue summary card */}
          {loading ? (
            <div style={{ height: 180, background: 'var(--bg-pill)', borderRadius: 12, marginBottom: 12, animation: 'skel 1.2s ease infinite alternate' }} />
          ) : (
            <div style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <p style={sectionLabel}>THIS MONTH</p>
                <span style={{ fontSize: 12, color: 'var(--text-tertiary)', fontWeight: 500 }}>
                  {new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
                </span>
              </div>

              <p style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 6px' }}>
                ₹{(summary?.this_month ?? 0).toLocaleString('en-IN')}
              </p>

              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 16 }}>
                {change > 0 ? (
                  <>
                    <svg width="14" height="14" fill="none" stroke="var(--success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                      <line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" />
                    </svg>
                    <span style={{ fontSize: 13, color: 'var(--success)', fontWeight: 500 }}>
                      +₹{change.toLocaleString('en-IN')} vs last month
                    </span>
                  </>
                ) : change < 0 ? (
                  <>
                    <svg width="14" height="14" fill="none" stroke="var(--error)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                      <line x1="12" y1="5" x2="12" y2="19" /><polyline points="19 12 12 19 5 12" />
                    </svg>
                    <span style={{ fontSize: 13, color: 'var(--error)', fontWeight: 500 }}>
                      -₹{Math.abs(change).toLocaleString('en-IN')} vs last month
                    </span>
                  </>
                ) : (
                  <span style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>Same as last month</span>
                )}
              </div>

              {/* Stats row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', background: 'var(--bg-primary)', borderRadius: 10, overflow: 'hidden', marginBottom: 16 }}>
                {[
                  { val: summary?.transaction_count ?? '—', label: 'Transactions',    color: 'var(--text-primary)' },
                  { val: summary?.avg_per_member != null ? `₹${summary.avg_per_member.toLocaleString('en-IN')}` : '—', label: 'Avg. per member', color: 'var(--text-primary)' },
                  { val: summary?.overdue_count ?? 0, label: 'Overdue', color: (summary?.overdue_count ?? 0) > 0 ? 'var(--error)' : 'var(--text-primary)' },
                ].map(({ val, label, color }, i) => (
                  <div key={label} style={{ textAlign: 'center', padding: '12px 4px', borderRight: i < 2 ? '0.5px solid rgba(0,0,0,0.08)' : 'none' }}>
                    <p style={{ fontSize: 16, fontWeight: 700, color, margin: 0 }}>{val}</p>
                    <p style={{ fontSize: 10, color: 'var(--text-tertiary)', margin: '3px 0 0', lineHeight: 1.3 }}>{label}</p>
                  </div>
                ))}
              </div>

              {/* Mini bar chart */}
              {(summary?.monthly_chart?.length ?? 0) > 0 && (
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6 }}>
                  {summary.monthly_chart.map((item, i) => {
                    const isCurrent = item.month === currentMonthKey
                    const barH = Math.max(Math.round((item.total / maxChartVal) * 48), 4)
                    return (
                      <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                        <div style={{ width: '100%', height: barH, background: isCurrent ? 'var(--text-primary)' : 'var(--success)', borderRadius: '3px 3px 0 0' }} />
                        <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
                          {item.label || (item.month ? item.month.slice(5) : '')}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* 3 — Overdue alert */}
          {!loading && (summary?.overdue_count ?? 0) > 0 && (
            <div style={{
              background: 'var(--error-bg)',
              border: '0.5px solid rgba(163,45,45,0.15)',
              borderLeft: '3px solid var(--error)',
              borderRadius: 12, padding: '12px 16px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginBottom: 12,
            }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--error)' }}>
                ⚠ {summary.overdue_count} overdue · ₹{(summary.overdue_total ?? 0).toLocaleString('en-IN')} pending
              </span>
              <button
                onClick={sendReminders}
                disabled={sendingReminders}
                style={{ background: 'none', border: 'none', fontSize: 12, color: 'var(--error)', fontWeight: 600, cursor: sendingReminders ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap', padding: '4px 0 4px 12px', opacity: sendingReminders ? 0.6 : 1 }}
              >
                {sendingReminders ? 'Sending…' : 'Send reminders →'}
              </button>
            </div>
          )}

          {/* 4 — Filter chips */}
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, marginBottom: 14, scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {FILTERS.map(f => (
              <button key={f} onClick={() => applyFilter(f)} style={activeFilter === f ? activeChip : inactiveChip}>
                {FILTER_LABELS[f]}
              </button>
            ))}
          </div>

          {/* 5 — Payment list */}
          <p style={{ ...sectionLabel, marginBottom: 10 }}>RECENT PAYMENTS</p>

          <div style={{ background: 'var(--bg-card)', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: 12, overflow: 'hidden', marginBottom: 12 }}>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
            ) : payments.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <svg width="40" height="40" fill="none" stroke="var(--text-tertiary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" style={{ margin: '0 auto 10px', display: 'block' }}>
                  <rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" />
                </svg>
                <p style={{ fontSize: 14, color: 'var(--text-tertiary)', margin: 0 }}>No payments found</p>
              </div>
            ) : (
              payments.map((payment, i) => (
                <PaymentRow key={payment.id || i} payment={payment} isLast={i === payments.length - 1} />
              ))
            )}
          </div>

          {/* Load more */}
          {!loading && hasMore && (
            <div style={{ textAlign: 'center', paddingBottom: 8 }}>
              <button
                onClick={loadMore}
                style={{ background: 'none', border: 'none', fontSize: 13, color: 'var(--text-cta)', fontWeight: 500, cursor: 'pointer', height: 44 }}
              >
                Load {LIMIT} more
              </button>
            </div>
          )}

        </div>

        {/* 6 — FAB */}
        <button
          onClick={() => setShowCollectModal(true)}
          style={{
            position: 'fixed', bottom: 84, right: 20, zIndex: 10,
            width: 52, height: 52, borderRadius: '50%',
            background: 'var(--text-primary)', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
          }}
        >
          <svg width="24" height="24" fill="none" stroke="var(--bg-card)" strokeWidth="2.5" strokeLinecap="round" viewBox="0 0 24 24">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>

        {/* 7 — Bottom nav */}
        <GymBottomNav onMorePress={() => setMoreOpen(true)} />
        <MoreSheet isOpen={moreOpen} onClose={() => setMoreOpen(false)} />
      </div>

      {/* Collect modal */}
      <CollectModal
        isOpen={showCollectModal}
        onClose={() => setShowCollectModal(false)}
        gymId={gymId}
        onSuccess={newPayment => {
          setPayments(prev => [newPayment, ...prev])
          setSummary(prev => prev
            ? {
                ...prev,
                this_month:        (prev.this_month        || 0) + (newPayment.amount || 0),
                transaction_count: (prev.transaction_count || 0) + 1,
              }
            : prev
          )
        }}
      />
    </>
  )
}
