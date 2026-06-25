import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, Building2 } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { getMyGym, joinGym, getGymAnnouncements, getGymSchedule, getGymOccupancy } from '../utils/api'
import { supabase } from '../utils/supabase'

const BASE = import.meta.env.VITE_API_URL

function timeAgo(iso) {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1)  return 'just now'
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24)  return `${hr}h ago`
  const day = Math.floor(hr / 24)
  if (day < 7)  return `${day}d ago`
  const w = Math.floor(day / 7)
  return w < 4 ? `${w}w ago` : new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

const occPct   = (current, capacity) => capacity > 0 ? Math.round((current / capacity) * 100) : 0
const occColor = p => p < 50 ? 'var(--success)' : p < 75 ? 'var(--warning)' : 'var(--error)'
const occLabel = p => p < 50 ? 'Quiet right now — great time to go' : p < 75 ? 'Moderate — getting busy' : 'Busy — peak hours'

const QR_GRID = [
  [1,1,1,0,1,0,1],
  [1,0,1,0,1,0,1],
  [1,1,1,0,0,1,0],
  [0,0,0,1,1,0,1],
  [1,1,0,1,0,1,1],
  [1,0,1,0,1,0,1],
  [1,1,1,0,1,1,1],
]

function Skeleton({ width = '100%', height = 16, radius = 8, style = {} }) {
  return (
    <div style={{
      width, height, borderRadius: radius,
      background: 'linear-gradient(90deg, var(--bg-pill) 25%, var(--border) 50%, var(--bg-pill) 75%)',
      backgroundSize: '200% 100%',
      animation: 'gv-pulse 1.4s ease-in-out infinite',
      ...style,
    }} />
  )
}

function EmptyState({ text }) {
  return (
    <div style={{ fontSize: 13, color: "var(--text-tertiary)", textAlign: 'center', padding: '16px 0' }}>
      {text}
    </div>
  )
}

function JoinGymView({ userId, onJoined }) {
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(e) {
    e.preventDefault()
    setError('')
    if (!code.trim()) { setError('Enter a join code.'); return }
    setBusy(true)
    try {
      const data = await joinGym(userId, code.trim().toUpperCase())
      onJoined(data.gym_name)
    } catch (err) {
      setError(err.message || 'Could not join gym.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col items-center pt-12 px-5 text-center">
      <div className="w-16 h-16 rounded-2xl bg-[var(--success-bg)] flex items-center justify-center mb-5">
        <Building2 size={26} className="text-[var(--success)]" />
      </div>
      <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">Join a gym</h2>
      <p className="text-[13px] text-[var(--text-tertiary)] max-w-xs leading-relaxed mb-6">
        Enter the join code your gym shared with you to see schedule and announcements.
      </p>
      <form onSubmit={submit} className="w-full max-w-xs">
        <input
          type="text"
          value={code}
          onChange={e => setCode(e.target.value.toUpperCase())}
          placeholder="ABC123"
          maxLength={12}
          className="w-full bg-[var(--bg-pill)] rounded-xl px-4 py-3 text-center text-lg font-mono tracking-[0.3em] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none uppercase"
        />
        {error && <p className="mt-2 text-xs text-[var(--error)]">{error}</p>}
        <button
          type="submit"
          disabled={busy || !code.trim()}
          className="mt-4 w-full bg-[var(--bg-card)] text-[var(--text-primary)] font-semibold text-sm px-5 py-3 rounded-xl border border-[var(--text-primary)] shadow-[0_1px_3px_rgba(0,0,0,0.08)] disabled:bg-[var(--bg-pill)] disabled:text-[var(--text-tertiary)] disabled:border-[var(--border)]"
        >
          {busy ? 'Joining…' : 'Join Gym'}
        </button>
      </form>
    </div>
  )
}

export default function MyGym() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [gymInfo,        setGymInfo]        = useState(null)   // { linked, gym, membership }
  const [announcements,  setAnnouncements]  = useState([])
  const [classes,        setClasses]        = useState([])
  const [occupancy,      setOccupancy]      = useState(null)

  const [loadingGym,  setLoadingGym]  = useState(true)
  const [loadingAnns, setLoadingAnns] = useState(false)
  const [loadingCls,  setLoadingCls]  = useState(false)
  const [loadingOcc,  setLoadingOcc]  = useState(false)
  const [activeOrders, setActiveOrders] = useState([])

  async function loadGym() {
    if (!user) return
    setLoadingGym(true)
    try {
      const result = await getMyGym(user.id)
      setGymInfo(result)
      if (result?.linked && result?.gym?.id) {
        loadSecondary(result.gym.id)
      }
    } catch (err) {
      console.error('Load my gym error:', err)
      setGymInfo({ linked: false })
    } finally {
      setLoadingGym(false)
    }
  }

  async function loadActiveOrders() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${BASE}/api/supplements/orders/mine`, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      })
      if (!res.ok) return
      const orders = await res.json()
      setActiveOrders(
        Array.isArray(orders)
          ? orders.filter(o => o.status === 'pending' || o.status === 'ready_for_pickup')
          : []
      )
    } catch { /* non-critical */ }
  }

  async function loadSecondary(gymId) {
    setLoadingAnns(true)
    setLoadingCls(true)
    setLoadingOcc(true)

    loadActiveOrders()

    getGymAnnouncements(gymId)
      .then(data => setAnnouncements(Array.isArray(data) ? data : []))
      .catch(() => setAnnouncements([]))
      .finally(() => setLoadingAnns(false))

    getGymSchedule(gymId)
      .then(data => setClasses(Array.isArray(data) ? data : []))
      .catch(() => setClasses([]))
      .finally(() => setLoadingCls(false))

    getGymOccupancy(gymId)
      .then(data => setOccupancy(data || null))
      .catch(() => setOccupancy(null))
      .finally(() => setLoadingOcc(false))
  }

  useEffect(() => { loadGym() }, [user])

  const gym        = gymInfo?.gym        || {}
  const membership = gymInfo?.membership || {}

  const memberSince = membership.start_date
    ? new Date(membership.start_date).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
    : '—'

  const occ = occupancy
  const pct   = occ ? occPct(occ.current, occ.capacity) : 0
  const color = occColor(pct)
  const label = occLabel(pct)

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] pb-24">

      <style>{`@keyframes gv-pulse { 0%,100%{background-position:0% 50%} 50%{background-position:100% 50%} }`}</style>

      {/* TOP BAR */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-[var(--bg-card)] border-b border-[var(--border)] h-14 flex items-center justify-between px-5">
        <span className="text-xl font-semibold text-[var(--text-primary)]">My Gym</span>
        <button className="w-9 h-9 bg-[var(--bg-pill)] rounded-xl flex items-center justify-center">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke="var(--text-primary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
        </button>
      </div>

      {loadingGym ? (
        <div className="pt-14 flex items-center justify-center min-h-screen">
          <Loader2 size={24} className="text-[var(--text-tertiary)] animate-spin" />
        </div>
      ) : !gymInfo?.linked ? (
        <div className="pt-14">
          <JoinGymView userId={user?.id} onJoined={() => window.location.reload()} />
        </div>
      ) : (
        <div className="pt-[72px] px-5 space-y-4 pb-6">

          {/* ── MEMBERSHIP CARD ──────────────────────────────── */}
          <div className="relative w-full bg-[var(--text-primary)] rounded-[20px] overflow-hidden" style={{ height: 180 }}>
            <div className="absolute inset-0 pointer-events-none" style={{
              backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)',
              backgroundSize: '14px 14px',
            }} />
            <div className="absolute bottom-0 left-0 right-0 h-[2px] z-10" style={{ background: 'var(--xp-gold)' }} />
            <div className="relative z-10 p-5 h-full flex flex-col justify-between">
              <div className="flex items-start justify-between">
                <div>
                  {loadingGym ? (
                    <Skeleton width={140} height={20} style={{ marginBottom: 6 }} />
                  ) : (
                    <p className="text-[18px] font-bold text-white leading-tight">{gym.name || '—'}</p>
                  )}
                  {loadingGym ? (
                    <Skeleton width={100} height={14} />
                  ) : (
                    <p className="text-[12px] mt-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
                      {gym.address || gym.city || '—'}
                    </p>
                  )}
                </div>
                <div className="w-14 h-14 rounded-xl p-1.5 flex items-center justify-center"
                  style={{ background: 'rgba(255,255,255,0.10)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1.5, width: 42, height: 42 }}>
                    {QR_GRID.flat().map((cell, i) => (
                      <div key={i} style={{
                        borderRadius: 1,
                        backgroundColor: cell ? 'rgba(255,255,255,0.9)' : 'transparent',
                        width: 5, height: 5,
                      }} />
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <span
                    className="rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-widest"
                    style={{
                      background: 'rgba(255,255,255,0.10)',
                      border: '0.5px solid rgba(255,255,255,0.20)',
                      color: 'var(--xp-gold)',
                    }}
                  >
                    {membership.membership_type || 'Member'}
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)]" />
                    <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.7)' }}>Active</span>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    Member since {memberSince}
                  </span>
                  <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.5)' }}>Tap to show QR</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── LIVE OCCUPANCY ──────────────────────────────── */}
          <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] p-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-tertiary)]">Live Occupancy</span>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)]" />
                <span className="text-[11px] text-[var(--success)]">Updated now</span>
              </div>
            </div>

            {loadingOcc ? (
              <div className="mt-3 space-y-2">
                <Skeleton height={36} width={120} />
                <Skeleton height={12} />
              </div>
            ) : !occ ? (
              <EmptyState text="No occupancy data available" />
            ) : (
              <>
                <div className="flex items-center gap-4 mt-3">
                  <div className="shrink-0">
                    <div className="flex items-baseline">
                      <span className="text-[36px] font-bold text-[var(--text-primary)] tabular-nums leading-none">{occ.current}</span>
                      <span className="text-base text-[var(--text-tertiary)] mx-1">/</span>
                      <span className="text-base text-[var(--text-tertiary)]">{occ.capacity}</span>
                    </div>
                    <span className="text-[11px] text-[var(--text-tertiary)] mt-0.5 block">members</span>
                  </div>
                  <div className="flex-1">
                    <div className="h-3 w-full bg-[var(--bg-pill)] rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${pct}%`, backgroundColor: color }} />
                    </div>
                    <p className="text-[12px] mt-1.5" style={{ color }}>{label}</p>
                  </div>
                </div>
                {occ.hourly?.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-[var(--border)]">
                    <p className="text-[11px] text-[var(--text-tertiary)] mb-2">Today's pattern</p>
                    <div className="flex items-end gap-1">
                      {occ.hourly.map((val, i) => {
                        const h = Math.max(3, Math.round((val / 100) * 32))
                        const isCurrent = i === occ.currentHour
                        const isPast    = i < occ.currentHour
                        return (
                          <div key={i} className="flex flex-col items-center flex-1">
                            <div className="w-full rounded-t-sm transition-all"
                              style={{
                                height: h,
                                backgroundColor: isCurrent ? "var(--text-primary)" : isPast ? 'var(--border)' : 'var(--bg-pill)',
                              }} />
                          </div>
                        )
                      })}
                    </div>
                    <div className="flex justify-between mt-1 px-0.5">
                      {['6a', '9a', '12p', '3p', '6p'].map(l => (
                        <span key={l} className="text-[10px] text-[var(--text-tertiary)]">{l}</span>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* ── TODAY'S CLASSES ─────────────────────────────── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-tertiary)]">Today's Classes</span>
            </div>

            {loadingCls ? (
              <div className="space-y-2">
                {[1,2].map(i => (
                  <div key={i} className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border)]">
                    <Skeleton height={14} width="60%" style={{ marginBottom: 8 }} />
                    <Skeleton height={12} width="40%" />
                  </div>
                ))}
              </div>
            ) : classes.length === 0 ? (
              <EmptyState text="No classes scheduled" />
            ) : (
              classes.map(cls => {
                const startTime = cls.start_time
                  ? cls.start_time.slice(0, 5)
                  : '—'
                const [hh, mm] = startTime.split(':').map(Number)
                const period = !isNaN(hh) ? (hh < 12 ? 'AM' : 'PM') : ''
                const displayTime = !isNaN(hh)
                  ? `${hh % 12 || 12}:${String(mm).padStart(2, '0')}`
                  : startTime

                return (
                  <div
                    key={cls.id}
                    className="bg-[var(--bg-card)] rounded-xl p-4 mb-2 flex items-center gap-3 relative overflow-hidden border border-[var(--border)]"
                  >
                    <div className="w-12 shrink-0 pl-1">
                      <p className="text-[14px] font-semibold text-[var(--text-primary)] tabular-nums">{displayTime}</p>
                      <p className="text-[10px] text-[var(--text-tertiary)]">{period}</p>
                    </div>
                    <div className="w-px h-10 bg-[var(--bg-pill)] shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{cls.class_name || cls.name || '—'}</p>
                      {cls.trainer_name && (
                        <p className="text-xs text-[var(--text-tertiary)] mt-0.5">with {cls.trainer_name}</p>
                      )}
                      {cls.capacity != null && (
                        <p className="text-[11px] text-[var(--text-tertiary)] mt-1">Capacity: {cls.capacity}</p>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* ── ANNOUNCEMENTS ───────────────────────────────── */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-tertiary)] mb-3">
              Announcements
            </p>
            {loadingAnns ? (
              <div className="space-y-2">
                {[1,2].map(i => (
                  <div key={i} className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-4">
                    <Skeleton height={14} width="70%" style={{ marginBottom: 8 }} />
                    <Skeleton height={12} width="90%" style={{ marginBottom: 4 }} />
                    <Skeleton height={12} width="50%" />
                  </div>
                ))}
              </div>
            ) : announcements.length === 0 ? (
              <EmptyState text="No announcements yet" />
            ) : (
              announcements.map(a => (
                <div
                  key={a.id}
                  className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-4 mb-2 flex gap-3 relative overflow-hidden"
                >
                  <div className="w-[3px] rounded-full shrink-0 self-stretch"
                    style={{ backgroundColor: a.priority === 'urgent' ? 'var(--error)' : 'var(--text-cta)' }} />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-[var(--text-primary)]">{a.title}</p>
                    <p className="text-[13px] text-[var(--text-secondary)] mt-1 leading-snug">{a.body}</p>
                    <p className="text-[11px] text-[var(--text-tertiary)] mt-3">
                      Posted by {a.posted_by || 'Management'} · {timeAgo(a.created_at)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* ── BROWSE CLASSES ───────────────────────────────── */}
          <button
            onClick={() => navigate('/classes')}
            className="w-full bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] p-4 flex items-center gap-4"
            style={{ textAlign: 'left' }}
          >
            <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'var(--accent-bg)' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[var(--text-primary)]">Browse Classes</p>
              <p className="text-xs text-[var(--text-tertiary)] mt-0.5">See the schedule &amp; book your spot</p>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="2" strokeLinecap="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>

          {/* ── GYM FEED ─────────────────────────────────────── */}
          <button
            onClick={() => navigate('/my-gym/feed')}
            className="w-full bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] p-4 flex items-center gap-4"
            style={{ textAlign: 'left' }}
          >
            <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'var(--warning-bg)' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                stroke="var(--warning)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 6h16M4 12h16M4 18h7"/>
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[var(--text-primary)]">Gym Feed</p>
              <p className="text-xs text-[var(--text-tertiary)] mt-0.5">Posts, tips &amp; achievements from your gym</p>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="2" strokeLinecap="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>

          {/* ── SUPPLEMENT STORE ────────────────────────────── */}
          <button
            onClick={() => navigate('/my-gym/supplements')}
            className="w-full bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] p-4 flex items-center gap-4"
            style={{ textAlign: 'left' }}
          >
            <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: '#E1F5EE' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                stroke="var(--success)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16.5 9.4l-9-5.19M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                <polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[var(--text-primary)]">Supplement Store</p>
              <p className="text-xs mt-0.5" style={{
                color: activeOrders.some(o => o.status === 'ready_for_pickup') ? 'var(--text-cta)'
                     : activeOrders.length > 0 ? 'var(--text-cta)'
                     : "var(--text-tertiary)",
              }}>
                {activeOrders.some(o => o.status === 'ready_for_pickup')
                  ? 'Order ready for pickup!'
                  : activeOrders.length > 0
                    ? `${activeOrders.length} order${activeOrders.length > 1 ? 's' : ''} in progress`
                    : 'Browse & order supplements'}
              </p>
            </div>
            {activeOrders.some(o => o.status === 'ready_for_pickup') && (
              <span style={{
                width: 8, height: 8, borderRadius: 4,
                background: 'var(--text-cta)', flexShrink: 0, marginRight: 4,
              }} />
            )}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="2" strokeLinecap="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>

          {/* ── MY ORDERS ──────────────────────────────────── */}
          <button
            onClick={() => navigate('/my-gym/orders')}
            className="w-full bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] p-4 flex items-center gap-4"
            style={{ textAlign: 'left' }}
          >
            <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'var(--accent-bg)' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                stroke="var(--text-cta)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
                <line x1="3" y1="6" x2="21" y2="6"/>
                <path d="M16 10a4 4 0 0 1-8 0"/>
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[var(--text-primary)]">My Orders</p>
              <p className="text-xs text-[var(--text-tertiary)] mt-0.5">Track your supplement orders</p>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="2" strokeLinecap="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>

          {/* ── QUICK ACTIONS ───────────────────────────────── */}
          <div className="grid grid-cols-2 gap-2">
            {[
              {
                label: 'Check-in QR',
                icon: (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                    stroke="var(--text-primary)" strokeWidth="1.8" strokeLinecap="round">
                    <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                    <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="3" height="3"/>
                  </svg>
                ),
              },
              {
                label: 'Contact Gym',
                icon: (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                    stroke="var(--text-primary)" strokeWidth="1.8" strokeLinecap="round">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.18 2 2 0 0 1 3.6 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.9a16 16 0 0 0 6 6l.92-.92a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
                  </svg>
                ),
              },
              {
                label: 'My Membership',
                icon: (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                    stroke="var(--text-primary)" strokeWidth="1.8" strokeLinecap="round">
                    <rect x="1" y="4" width="22" height="16" rx="2"/>
                    <line x1="1" y1="10" x2="23" y2="10"/>
                  </svg>
                ),
              },
              {
                label: 'Leave a Review',
                icon: (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                    stroke="var(--text-primary)" strokeWidth="1.8" strokeLinecap="round">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                  </svg>
                ),
              },
            ].map((a, i) => (
              <button
                key={i}
                className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-4 flex items-center gap-3 h-14"
              >
                <div className="w-9 h-9 bg-[var(--bg-pill)] rounded-xl flex items-center justify-center shrink-0">
                  {a.icon}
                </div>
                <span className="text-sm font-medium text-[var(--text-primary)]">{a.label}</span>
              </button>
            ))}
          </div>

        </div>
      )}
    </div>
  )
}
