import { useEffect, useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { Loader2, Building2, X, MoreVertical } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { getMyGym, joinGym, unlinkGym, getClassesByDate, getGymOccupancy, getGymQR } from '../utils/api'
import { supabase } from '../utils/supabase'
import ReviewGymSheet from '../components/ReviewGymSheet'

const BASE = import.meta.env.VITE_API_URL

// Local YYYY-MM-DD (avoids the UTC day-shift that toISOString() can cause).
function localDateStr(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function formatClassTime(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d)) return '—'
  let h = d.getHours()
  const m = d.getMinutes()
  const period = h < 12 ? 'AM' : 'PM'
  h = h % 12 || 12
  return { time: `${h}:${String(m).padStart(2, '0')}`, period }
}

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
  const { refetchLinks } = useOutletContext() || {}

  const [menuOpen,        setMenuOpen]        = useState(false)
  const [unlinkConfirmOpen, setUnlinkConfirmOpen] = useState(false)
  const [unlinking,       setUnlinking]       = useState(false)
  const [unlinkError,     setUnlinkError]     = useState('')

  const [gymInfo,        setGymInfo]        = useState(null)   // { linked, gym, membership }
  const [announcements,  setAnnouncements]  = useState([])
  const [classes,        setClasses]        = useState([])
  const [occupancy,      setOccupancy]      = useState(null)
  const [gymLoadError,   setGymLoadError]   = useState(false)

  const [loadingGym,  setLoadingGym]  = useState(true)
  const [loadingCls,  setLoadingCls]  = useState(false)
  const [loadingOcc,  setLoadingOcc]  = useState(false)
  const [activeOrders, setActiveOrders] = useState([])

  const [qrOpen,    setQrOpen]    = useState(false)
  const [qrLoading, setQrLoading] = useState(false)
  const [qrError,   setQrError]   = useState('')
  const [qrCode,    setQrCode]    = useState('')

  const [contactOpen,    setContactOpen]    = useState(false)
  const [membershipOpen, setMembershipOpen] = useState(false)
  const [reviewOpen,     setReviewOpen]     = useState(false)

  const [announcementDetail, setAnnouncementDetail] = useState(null)

  async function loadGym() {
    if (!user) return
    setLoadingGym(true)
    setGymLoadError(false)
    try {
      const result = await getMyGym(user.id)
      setGymInfo(result)
      setAnnouncements(Array.isArray(result?.announcements) ? result.announcements : [])
      if (result?.linked && result?.gym?.id) {
        loadSecondary(result.gym.id)
      }
    } catch (err) {
      // The backend never 404s for "not linked" — it returns 200 with
      // { linked: false }. So anything caught here (401/403/500/network)
      // is a genuine failure, not a real unlinked state. Never conflate
      // the two by defaulting to { linked: false }.
      console.error('Load my gym error:', err)
      setGymInfo(null)
      setGymLoadError(true)
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
    setLoadingCls(true)
    setLoadingOcc(true)

    loadActiveOrders()

    getClassesByDate(gymId, localDateStr(new Date()))
      .then(data => setClasses(Array.isArray(data?.classes) ? data.classes : []))
      .catch(() => setClasses([]))
      .finally(() => setLoadingCls(false))

    getGymOccupancy(gymId)
      .then(data => setOccupancy(data || null))
      .catch(() => setOccupancy(null))
      .finally(() => setLoadingOcc(false))
  }

  useEffect(() => { loadGym() }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  async function openQr() {
    if (!user?.id || !gymInfo?.gym?.id) return
    setQrOpen(true)
    setQrLoading(true)
    setQrError('')
    try {
      const data = await getGymQR(gymInfo.gym.id, user.id)
      setQrCode(data.qr_code)
    } catch (err) {
      setQrError(err.message || 'Could not load QR code.')
    } finally {
      setQrLoading(false)
    }
  }

  async function confirmUnlink() {
    setUnlinking(true)
    setUnlinkError('')
    try {
      await unlinkGym()
      setUnlinkConfirmOpen(false)
      setGymInfo({ linked: false })
      setAnnouncements([])
      setClasses([])
      setOccupancy(null)
      refetchLinks?.()
    } catch (err) {
      setUnlinkError(err.message || 'Could not unlink from gym.')
    } finally {
      setUnlinking(false)
    }
  }

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
      <div className="fixed top-0 left-0 right-0 z-50 bg-[var(--bg-card)] border-b border-[var(--border)] h-14 flex items-center justify-between px-5 pt-safe">
        <span className="text-xl font-semibold text-[var(--text-primary)]">My Gym</span>
        {gymInfo?.linked && (
          <div className="relative">
            <button
              onClick={() => setMenuOpen(o => !o)}
              className="w-9 h-9 bg-[var(--bg-pill)] rounded-xl flex items-center justify-center"
            >
              <MoreVertical size={18} className="text-[var(--text-primary)]" />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-11 z-50 w-52 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl shadow-[0_4px_16px_rgba(0,0,0,0.12)] overflow-hidden">
                  <button
                    onClick={() => { setMenuOpen(false); setUnlinkError(''); setUnlinkConfirmOpen(true) }}
                    className="w-full text-left px-4 py-3 text-sm font-medium text-[var(--error)]"
                  >
                    Leave this gym
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {loadingGym ? (
        <div className="pt-14 flex items-center justify-center min-h-screen">
          <Loader2 size={24} className="text-[var(--text-tertiary)] animate-spin" />
        </div>
      ) : gymLoadError ? (
        <div className="pt-14 px-5">
          <div className="bg-[var(--bg-card)] rounded-2xl p-8 border border-[var(--border)] text-center mt-6">
            <div className="w-16 h-16 rounded-full bg-[var(--error-bg)] border border-[var(--border)] flex items-center justify-center mx-auto mb-4">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--error)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
            <h2 className="text-lg font-semibold mb-2 text-[var(--text-primary)]">Couldn't load your gym</h2>
            <p className="text-[var(--text-tertiary)] text-sm mb-6 leading-relaxed">
              Something went wrong loading this page. Your gym membership (if any) is unaffected — try again.
            </p>
            <button
              onClick={loadGym}
              className="w-full py-3.5 rounded-xl font-semibold text-[var(--cta-text)] border"
              style={{ background: 'var(--cta-bg)', borderColor: 'var(--cta-border)' }}
            >
              Try again
            </button>
          </div>
        </div>
      ) : !gymInfo?.linked ? (
        <div className="pt-14">
          <JoinGymView userId={user?.id} onJoined={() => window.location.reload()} />
        </div>
      ) : (
        <div className="pt-[72px] px-5 space-y-4 pb-6">

          {/* ── MEMBERSHIP CARD ──────────────────────────────── */}
          <div
            onClick={openQr}
            className="relative w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-[20px] overflow-hidden cursor-pointer"
            style={{ height: 180 }}
          >
            <div className="absolute inset-0 pointer-events-none" style={{
              backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.04) 1px, transparent 1px)',
              backgroundSize: '14px 14px',
            }} />
            <div className="absolute bottom-0 left-0 right-0 h-[2px] z-10" style={{ background: 'var(--xp-gold)' }} />
            <div className="relative z-10 p-5 h-full flex flex-col justify-between">
              <div className="flex items-start justify-between">
                <div>
                  {loadingGym ? (
                    <Skeleton width={140} height={20} style={{ marginBottom: 6 }} />
                  ) : (
                    <p className="text-[18px] font-bold text-[var(--text-primary)] leading-tight">{gym.name || '—'}</p>
                  )}
                  {loadingGym ? (
                    <Skeleton width={100} height={14} />
                  ) : (
                    <p className="text-[12px] mt-1 text-[var(--text-tertiary)]">
                      {gym.address || gym.city || '—'}
                    </p>
                  )}
                </div>
                <div className="w-14 h-14 rounded-xl p-1.5 flex items-center justify-center"
                  style={{ background: 'var(--bg-camera)' }}>
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
                      background: 'var(--xp-gold-bg)',
                      border: '0.5px solid var(--border)',
                      color: 'var(--xp-gold)',
                    }}
                  >
                    {membership.membership_type || 'Member'}
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)]" />
                    <span className="text-[11px] text-[var(--text-secondary)]">Active</span>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[11px] text-[var(--text-tertiary)]">
                    Member since {memberSince}
                  </span>
                  <span className="text-[11px] text-[var(--text-tertiary)]">Tap to show QR</span>
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
                const formatted = formatClassTime(cls.start_time)
                const displayTime = typeof formatted === 'string' ? formatted : formatted.time
                const period = typeof formatted === 'string' ? '' : formatted.period

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
            {loadingGym ? (
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
              announcements.map(a => {
                const isLong = (a.body || '').length > 150
                return (
                <div
                  key={a.id}
                  onClick={isLong ? () => setAnnouncementDetail(a) : undefined}
                  className={`bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-4 mb-2 flex gap-3 relative overflow-hidden ${isLong ? 'cursor-pointer' : ''}`}
                >
                  <div className="w-[3px] rounded-full shrink-0 self-stretch"
                    style={{ backgroundColor: a.priority === 'urgent' ? 'var(--error)' : 'var(--text-cta)' }} />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-[var(--text-primary)]">{a.title}</p>
                    <p className={`text-[13px] text-[var(--text-secondary)] mt-1 leading-snug ${isLong ? 'line-clamp-3' : ''}`}>{a.body}</p>
                    {isLong && (
                      <p className="text-[11px] text-[var(--accent)] font-medium mt-1">Read more</p>
                    )}
                    <p className="text-[11px] text-[var(--text-tertiary)] mt-3">
                      Posted by {a.posted_by || 'Management'} · {timeAgo(a.created_at)}
                    </p>
                  </div>
                </div>
                )
              })
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
              style={{ background: 'var(--success-bg)' }}>
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
                onClick: openQr,
              },
              {
                label: 'Contact Gym',
                icon: (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                    stroke="var(--text-primary)" strokeWidth="1.8" strokeLinecap="round">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.18 2 2 0 0 1 3.6 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.9a16 16 0 0 0 6 6l.92-.92a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
                  </svg>
                ),
                onClick: () => setContactOpen(true),
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
                onClick: () => setMembershipOpen(true),
              },
              {
                label: 'Leave a Review',
                icon: (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                    stroke="var(--text-primary)" strokeWidth="1.8" strokeLinecap="round">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                  </svg>
                ),
                onClick: () => setReviewOpen(true),
              },
            ].map((a, i) => (
              <button
                key={i}
                {...(a.onClick ? { onClick: a.onClick } : {})}
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

      {qrOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-6"
          onClick={() => setQrOpen(false)}
        >
          <div
            className="relative w-full max-w-xs bg-[var(--bg-card)] rounded-2xl p-6 flex flex-col items-center"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setQrOpen(false)}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-[var(--bg-pill)] flex items-center justify-center"
            >
              <X size={16} className="text-[var(--text-primary)]" />
            </button>
            <p className="text-sm font-semibold text-[var(--text-primary)] mb-4">Check-in QR</p>
            <div className="w-48 h-48 flex items-center justify-center">
              {qrLoading ? (
                <Loader2 size={24} className="text-[var(--text-tertiary)] animate-spin" />
              ) : qrError ? (
                <p className="text-xs text-[var(--error)] text-center px-2">{qrError}</p>
              ) : qrCode ? (
                <img src={qrCode} alt="Check-in QR code" className="w-48 h-48 rounded-xl" />
              ) : null}
            </div>
            <p className="text-xs text-[var(--text-tertiary)] mt-4 text-center">Show this to gym staff to check in</p>
          </div>
        </div>
      )}

      {contactOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-6"
          onClick={() => setContactOpen(false)}
        >
          <div
            className="relative w-full max-w-xs bg-[var(--bg-card)] rounded-2xl p-6"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setContactOpen(false)}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-[var(--bg-pill)] flex items-center justify-center"
            >
              <X size={16} className="text-[var(--text-primary)]" />
            </button>
            <p className="text-sm font-semibold text-[var(--text-primary)] mb-4">Contact Gym</p>
            <div className="space-y-4">
              <div>
                <p className="text-[11px] text-[var(--text-tertiary)] uppercase tracking-widest mb-1">Phone</p>
                {gym.phone ? (
                  <a href={`tel:${gym.phone}`} className="text-sm font-medium text-[var(--accent)]">{gym.phone}</a>
                ) : (
                  <p className="text-sm text-[var(--text-tertiary)]">—</p>
                )}
              </div>
              <div>
                <p className="text-[11px] text-[var(--text-tertiary)] uppercase tracking-widest mb-1">Address</p>
                {gym.address ? (
                  <a
                    href={`https://maps.google.com/?q=${encodeURIComponent(gym.address)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-[var(--accent)]"
                  >
                    {gym.address}
                  </a>
                ) : (
                  <p className="text-sm text-[var(--text-tertiary)]">—</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {membershipOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-6"
          onClick={() => setMembershipOpen(false)}
        >
          <div
            className="relative w-full max-w-xs bg-[var(--bg-card)] rounded-2xl p-6"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setMembershipOpen(false)}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-[var(--bg-pill)] flex items-center justify-center"
            >
              <X size={16} className="text-[var(--text-primary)]" />
            </button>
            <p className="text-sm font-semibold text-[var(--text-primary)] mb-4">My Membership</p>
            <div className="space-y-4">
              <div>
                <p className="text-[11px] text-[var(--text-tertiary)] uppercase tracking-widest mb-1">Plan</p>
                <p className="text-sm font-medium text-[var(--text-primary)] capitalize">{membership.membership_type || '—'}</p>
              </div>
              <div>
                <p className="text-[11px] text-[var(--text-tertiary)] uppercase tracking-widest mb-1">Start Date</p>
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  {membership.start_date
                    ? new Date(membership.start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                    : '—'}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-[var(--text-tertiary)] uppercase tracking-widest mb-1">End Date</p>
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  {membership.end_date
                    ? new Date(membership.end_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                    : '—'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <ReviewGymSheet open={reviewOpen} onClose={() => setReviewOpen(false)} />

      {unlinkConfirmOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-6"
          onClick={() => !unlinking && setUnlinkConfirmOpen(false)}
        >
          <div
            className="relative w-full max-w-xs bg-[var(--bg-card)] rounded-2xl p-6"
            onClick={e => e.stopPropagation()}
          >
            <p className="text-sm font-semibold text-[var(--text-primary)] mb-2">Leave {gym.name || 'this gym'}?</p>
            <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed mb-5">
              Your history will be saved but they will no longer have access to your data. You can join a new gym anytime.
            </p>
            {unlinkError && (
              <p className="text-xs text-[var(--error)] mb-3">{unlinkError}</p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => setUnlinkConfirmOpen(false)}
                disabled={unlinking}
                className="flex-1 py-3 rounded-xl font-medium text-sm text-[var(--text-secondary)] border border-[var(--border)] bg-[var(--bg-elevated)] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmUnlink}
                disabled={unlinking}
                className="flex-1 py-3 rounded-xl font-semibold text-sm text-white bg-[var(--error)] disabled:opacity-60"
              >
                {unlinking ? 'Leaving…' : 'Leave Gym'}
              </button>
            </div>
          </div>
        </div>
      )}

      {announcementDetail && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-6"
          onClick={() => setAnnouncementDetail(null)}
        >
          <div
            className="relative w-full max-w-xs bg-[var(--bg-card)] rounded-2xl p-6 max-h-[70vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setAnnouncementDetail(null)}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-[var(--bg-pill)] flex items-center justify-center"
            >
              <X size={16} className="text-[var(--text-primary)]" />
            </button>
            <p className="text-sm font-semibold text-[var(--text-primary)] mb-2 pr-8">{announcementDetail.title}</p>
            <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">{announcementDetail.body}</p>
            <p className="text-[11px] text-[var(--text-tertiary)] mt-4">
              Posted by {announcementDetail.posted_by || 'Management'} · {timeAgo(announcementDetail.created_at)}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
