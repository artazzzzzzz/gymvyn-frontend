import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, Building2 } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { getMyGym, joinGym } from '../utils/api'

// ── Utility helpers (kept from original) ─────────────────────────────────────

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

// ── Mock / fallback data ──────────────────────────────────────────────────────

const mockGym = {
  name: 'IronPeak Fitness',
  location: 'Bhopal · MP',
  memberSince: 'Jan 2025',
  tier: 'Gold Member',
  memberId: 'FF-2024-0847',
}

const mockOccupancy = {
  current: 34,
  capacity: 80,
  hourly: [20, 45, 70, 55, 35, 30, 42, 50, 38, 43, 65, 80],
  currentHour: 7,
}

const mockClasses = [
  { id: '1', name: 'Morning HIIT',             time: '06:30', period: 'AM', duration: '45 min', trainer: 'Priya Sharma',  spotsLeft: 4, capacity: 16, status: 'upcoming' },
  { id: '2', name: 'Strength & Conditioning', time: '08:00', period: 'AM', duration: '60 min', trainer: 'Vikram Nair',   spotsLeft: 0, capacity: 20, status: 'booked'   },
  { id: '3', name: 'Yoga Flow',               time: '07:00', period: 'AM', duration: '50 min', trainer: 'Ananya Singh',  spotsLeft: 0, capacity: 15, status: 'past'     },
]

const mockAnnouncements = [
  {
    id: '1',
    accentColor: '#185FA5',
    title: 'New equipment arriving this week',
    body: '3 new cable machines and a Smith rack will be available from Monday. First come first served.',
    postedBy: 'Management',
    timeAgo: '2 days ago',
  },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

const occPct   = o => Math.round((o.current / o.capacity) * 100)
const occColor = p => p < 50 ? '#3B6D11' : p < 75 ? '#854F0B' : '#A32D2D'
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

// ── Join-a-gym view (preserved from original) ─────────────────────────────────

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
      <div className="w-16 h-16 rounded-2xl bg-[#E1F5EE] flex items-center justify-center mb-5">
        <Building2 size={26} className="text-[#0F6E56]" />
      </div>
      <h2 className="text-xl font-bold text-[#111] mb-2">Join a gym</h2>
      <p className="text-[13px] text-[#999] max-w-xs leading-relaxed mb-6">
        Enter the join code your gym shared with you to see schedule and announcements.
      </p>
      <form onSubmit={submit} className="w-full max-w-xs">
        <input
          type="text"
          value={code}
          onChange={e => setCode(e.target.value.toUpperCase())}
          placeholder="ABC123"
          maxLength={12}
          className="w-full bg-[#F1EFE8] rounded-xl px-4 py-3 text-center text-lg font-mono tracking-[0.3em] text-[#111] placeholder-[#CCC] focus:outline-none uppercase"
        />
        {error && <p className="mt-2 text-xs text-[#A32D2D]">{error}</p>}
        <button
          type="submit"
          disabled={busy || !code.trim()}
          className="mt-4 w-full bg-[#111] text-white font-semibold text-sm px-5 py-3 rounded-xl disabled:opacity-40"
        >
          {busy ? 'Joining…' : 'Join Gym'}
        </button>
      </form>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function MyGym() {
  const { user }    = useAuth()
  const navigate    = useNavigate()
  const [data,    setData]    = useState(null)   // { linked, gym, announcements, schedule }
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  async function load() {
    if (!user) return
    setLoading(true)
    setError('')
    try {
      const result = await getMyGym(user.id)
      setData(result)
    } catch (err) {
      console.error('Load my gym error:', err)
      setError(err.message || 'Failed to load gym.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [user])

  function onJoined() {
    window.location.reload()
  }

  // Derive display values from real API data with mock fallbacks
  const gymData = {
    name:        data?.gym?.name     || mockGym.name,
    location:    data?.gym?.address  || mockGym.location,
    memberSince: mockGym.memberSince,
    tier:        mockGym.tier,
    memberId:    mockGym.memberId,
  }

  const occ = mockOccupancy   // no live-occupancy API yet
  const classes = mockClasses // no class-booking API yet

  const displayAnnouncements = data?.announcements?.length > 0
    ? data.announcements.map(a => ({
        id: a.id,
        accentColor: a.priority === 'urgent' ? '#A32D2D' : '#185FA5',
        title:    a.title,
        body:     a.body,
        postedBy: 'Management',
        timeAgo:  timeAgo(a.created_at),
      }))
    : mockAnnouncements

  const pct   = occPct(occ)
  const color = occColor(pct)
  const label = occLabel(pct)

  return (
    <div className="min-h-screen bg-[#F7F7F5] pb-24">

      {/* TOP BAR */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-black/[0.06] h-14 flex items-center justify-between px-5">
        <span className="text-xl font-semibold text-[#111]">My Gym</span>
        <button className="w-9 h-9 bg-[#F1EFE8] rounded-xl flex items-center justify-center">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke="#111" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
        </button>
      </div>

      {loading ? (
        <div className="pt-14 flex items-center justify-center min-h-screen">
          <Loader2 size={24} className="text-[#999] animate-spin" />
        </div>
      ) : !data?.linked ? (
        <div className="pt-14">
          <JoinGymView userId={user?.id} onJoined={onJoined} />
        </div>
      ) : (
        <div className="pt-[72px] px-5 space-y-4 pb-6">

          {/* ── MEMBERSHIP CARD ─────────────────────────────── */}
          <div className="relative w-full bg-[#111] rounded-[20px] overflow-hidden" style={{ height: 180 }}>

            {/* Dot-grid texture */}
            <div className="absolute inset-0 pointer-events-none" style={{
              backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)',
              backgroundSize: '14px 14px',
            }} />

            {/* Gold accent at bottom */}
            <div className="absolute bottom-0 left-0 right-0 h-[2px] z-10" style={{ background: '#D4A017' }} />

            {/* Content */}
            <div className="relative z-10 p-5 h-full flex flex-col justify-between">

              {/* Top row */}
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[18px] font-bold text-white leading-tight">{gymData.name}</p>
                  <p className="text-[12px] mt-1" style={{ color: 'rgba(255,255,255,0.5)' }}>{gymData.location}</p>
                </div>
                {/* QR pattern */}
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

              {/* Bottom */}
              <div>
                <div className="flex items-center gap-3">
                  <span
                    className="rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-widest"
                    style={{
                      background: 'rgba(255,255,255,0.10)',
                      border: '0.5px solid rgba(255,255,255,0.20)',
                      color: '#D4A017',
                    }}
                  >
                    {gymData.tier}
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#3B6D11]" />
                    <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.7)' }}>Active</span>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    Member since {gymData.memberSince}
                  </span>
                  <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.5)' }}>Tap to show QR</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── LIVE OCCUPANCY ──────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-black/[0.06] p-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-[#999]">Live Occupancy</span>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#3B6D11]" />
                <span className="text-[11px] text-[#3B6D11]">Updated now</span>
              </div>
            </div>

            {/* Count + progress bar */}
            <div className="flex items-center gap-4 mt-3">
              <div className="shrink-0">
                <div className="flex items-baseline">
                  <span className="text-[36px] font-bold text-[#111] tabular-nums leading-none">{occ.current}</span>
                  <span className="text-base text-[#CCC] mx-1">/</span>
                  <span className="text-base text-[#999]">{occ.capacity}</span>
                </div>
                <span className="text-[11px] text-[#999] mt-0.5 block">members</span>
              </div>
              <div className="flex-1">
                <div className="h-3 w-full bg-[#F1EFE8] rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${pct}%`, backgroundColor: color }} />
                </div>
                <p className="text-[12px] mt-1.5" style={{ color }}>{label}</p>
              </div>
            </div>

            {/* Hourly bars */}
            <div className="mt-4 pt-3 border-t border-black/[0.04]">
              <p className="text-[11px] text-[#999] mb-2">Today's pattern</p>
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
                          backgroundColor: isCurrent ? '#111' : isPast ? '#E5E5E3' : '#F1EFE8',
                        }} />
                    </div>
                  )
                })}
              </div>
              <div className="flex justify-between mt-1 px-0.5">
                {['6a', '9a', '12p', '3p', '6p'].map(l => (
                  <span key={l} className="text-[10px] text-[#CCC]">{l}</span>
                ))}
              </div>
            </div>
          </div>

          {/* ── TODAY'S CLASSES ─────────────────────────────── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-[#999]">Today's Classes</span>
              <button className="text-[13px] font-medium text-[#185FA5]">View all →</button>
            </div>

            {classes.map(cls => (
              <div
                key={cls.id}
                className={`bg-white rounded-xl p-4 mb-2 flex items-center gap-3 relative overflow-hidden ${
                  cls.status === 'booked'
                    ? 'border-[1.5px] border-[#3B6D11]'
                    : 'border border-black/[0.06]'
                } ${cls.status === 'past' ? 'opacity-50' : ''}`}
              >
                {/* Green left accent on booked */}
                {cls.status === 'booked' && (
                  <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#3B6D11]" />
                )}

                {/* Time column */}
                <div className="w-12 shrink-0 pl-1">
                  <p className="text-[14px] font-semibold text-[#111] tabular-nums">{cls.time}</p>
                  <p className="text-[10px] text-[#999]">{cls.period}</p>
                  <p className="text-[11px] text-[#CCC] mt-0.5">{cls.duration}</p>
                </div>

                {/* Divider */}
                <div className="w-px h-10 bg-[#F1EFE8] shrink-0" />

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#111] truncate">{cls.name}</p>
                  <p className="text-xs text-[#999] mt-0.5">with {cls.trainer}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    {cls.status === 'upcoming' && (
                      <>
                        <span className="text-[11px] font-medium bg-[#EAF3DE] text-[#3B6D11] px-2 py-0.5 rounded-full">
                          {cls.spotsLeft} spots left
                        </span>
                        <span className="text-[11px] text-[#999]">
                          {cls.capacity - cls.spotsLeft}/{cls.capacity}
                        </span>
                      </>
                    )}
                    {cls.status === 'booked' && (
                      <span className="text-[11px] font-semibold bg-[#EAF3DE] text-[#3B6D11] px-2 py-0.5 rounded-full">
                        ✓ Booked
                      </span>
                    )}
                    {cls.status === 'past' && (
                      <span className="text-[11px] bg-[#F1EFE8] text-[#999] px-2 py-0.5 rounded-full">
                        Attended
                      </span>
                    )}
                  </div>
                </div>

                {/* Action */}
                {cls.status === 'upcoming' && (
                  <button className="bg-[#111] text-white text-[12px] font-semibold px-3 py-1.5 rounded-xl shrink-0">
                    Book →
                  </button>
                )}
                {cls.status === 'booked' && (
                  <button className="text-[12px] text-[#999] shrink-0">Cancel</button>
                )}
              </div>
            ))}
          </div>

          {/* ── ANNOUNCEMENTS ───────────────────────────────── */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[#999] mb-3">
              Announcements
            </p>
            {displayAnnouncements.map(a => (
              <div
                key={a.id}
                className="bg-white rounded-xl border border-black/[0.06] p-4 mb-2 flex gap-3 relative overflow-hidden"
              >
                <div className="w-[3px] rounded-full shrink-0 self-stretch"
                  style={{ backgroundColor: a.accentColor }} />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-[#111]">{a.title}</p>
                  <p className="text-[13px] text-[#666] mt-1 leading-snug">{a.body}</p>
                  <p className="text-[11px] text-[#CCC] mt-3">
                    Posted by {a.postedBy} · {a.timeAgo}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* ── QUICK ACTIONS ───────────────────────────────── */}
          <div className="grid grid-cols-2 gap-2">
            {[
              {
                label: 'Check-in QR',
                icon: (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                    stroke="#111" strokeWidth="1.8" strokeLinecap="round">
                    <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                    <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="3" height="3"/>
                  </svg>
                ),
              },
              {
                label: 'Contact Gym',
                icon: (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                    stroke="#111" strokeWidth="1.8" strokeLinecap="round">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.18 2 2 0 0 1 3.6 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.9a16 16 0 0 0 6 6l.92-.92a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
                  </svg>
                ),
              },
              {
                label: 'My Membership',
                icon: (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                    stroke="#111" strokeWidth="1.8" strokeLinecap="round">
                    <rect x="1" y="4" width="22" height="16" rx="2"/>
                    <line x1="1" y1="10" x2="23" y2="10"/>
                  </svg>
                ),
              },
              {
                label: 'Leave a Review',
                icon: (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                    stroke="#111" strokeWidth="1.8" strokeLinecap="round">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                  </svg>
                ),
              },
            ].map((a, i) => (
              <button
                key={i}
                className="bg-white rounded-xl border border-black/[0.06] p-4 flex items-center gap-3 h-14"
              >
                <div className="w-9 h-9 bg-[#F1EFE8] rounded-xl flex items-center justify-center shrink-0">
                  {a.icon}
                </div>
                <span className="text-sm font-medium text-[#111]">{a.label}</span>
              </button>
            ))}
          </div>

        </div>
      )}
    </div>
  )
}
