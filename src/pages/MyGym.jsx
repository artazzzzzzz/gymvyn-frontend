import { useEffect, useMemo, useState } from 'react'
import {
  MapPin, Phone, Megaphone, CalendarDays, Clock, Users, Bell, Info, Zap,
  Loader2, Building2,
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { getMyGym, joinGym } from '../utils/api'
import BottomNav from '../components/BottomNav'

const DAYS = [
  { key: 0, short: 'Mon', long: 'Monday'    },
  { key: 1, short: 'Tue', long: 'Tuesday'   },
  { key: 2, short: 'Wed', long: 'Wednesday' },
  { key: 3, short: 'Thu', long: 'Thursday'  },
  { key: 4, short: 'Fri', long: 'Friday'    },
  { key: 5, short: 'Sat', long: 'Saturday'  },
  { key: 6, short: 'Sun', long: 'Sunday'    },
]

const PRIORITY_STYLES = {
  normal:    { bg: 'bg-white/[0.06]', border: 'border-white/[0.10]', text: 'text-zinc-300', icon: Info,  iconColor: 'text-zinc-400' },
  important: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400', icon: Bell, iconColor: 'text-amber-400' },
  urgent:    { bg: 'bg-red-500/10',   border: 'border-red-500/30',  text: 'text-red-400',   icon: Zap,  iconColor: 'text-red-400' },
}

function formatTime(t) {
  if (!t) return ''
  const [h, m] = t.split(':')
  const hour = Number(h)
  const minute = m ?? '00'
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const display = hour % 12 || 12
  return `${display}:${minute} ${ampm}`
}

function timeAgo(iso) {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1)    return 'just now'
  if (min < 60)   return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24)    return `${hr}h ago`
  const day = Math.floor(hr / 24)
  if (day < 7)    return `${day}d ago`
  if (day < 30)   {
    const w = Math.floor(day / 7)
    return `${w}w ago`
  }
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function PriorityPill({ priority }) {
  const s = PRIORITY_STYLES[priority] ?? PRIORITY_STYLES.normal
  const Icon = s.icon
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${s.bg} ${s.border} ${s.text}`}>
      <Icon size={10} className={s.iconColor} />
      {priority || 'normal'}
    </span>
  )
}

// ── Join-a-gym view ──────────────────────────────────────────────────────────

function JoinGymView({ userId, onJoined }) {
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(e) {
    e.preventDefault()
    setError('')
    if (!code.trim()) {
      setError('Enter a join code.')
      return
    }
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
    <div className="bg-[#141416] border border-white/[0.06] rounded-2xl p-8 sm:p-10 text-center">
      <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-5">
        <Building2 size={26} className="text-emerald-400" />
      </div>
      <h2 className="text-2xl font-bold text-white tracking-tight mb-2">Join a gym</h2>
      <p className="text-zinc-400 text-sm max-w-md mx-auto mb-6">
        Enter the 6-character join code your gym shared with you to see schedule and announcements.
      </p>

      <form onSubmit={submit} className="max-w-xs mx-auto">
        <input
          type="text"
          value={code}
          onChange={e => setCode(e.target.value.toUpperCase())}
          placeholder="ABC123"
          maxLength={12}
          className="w-full bg-[#1c1c1f] border border-white/[0.08] rounded-xl px-4 py-3 text-center text-lg font-mono tracking-[0.3em] text-white placeholder-zinc-700 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30 uppercase"
        />
        {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={busy || !code.trim()}
          className="mt-4 w-full inline-flex items-center justify-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold text-sm px-5 py-3 rounded-xl transition-all duration-200 shadow-lg shadow-emerald-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {busy && <Loader2 size={14} className="animate-spin" />}
          {busy ? 'Joining…' : 'Join'}
        </button>
      </form>
    </div>
  )
}

// ── Gym header ───────────────────────────────────────────────────────────────

function GymHeaderCard({ gym }) {
  return (
    <section className="bg-[#141416] border border-white/[0.06] rounded-2xl p-5 mb-5 flex items-start gap-4">
      {gym.logo_url ? (
        <img
          src={gym.logo_url}
          alt={`${gym.name} logo`}
          className="w-14 h-14 rounded-2xl object-cover flex-shrink-0"
        />
      ) : (
        <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
          <Building2 size={22} className="text-emerald-400" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight truncate">
          {gym.name || 'Your gym'}
        </h2>
        <div className="mt-1.5 space-y-1">
          {gym.address && (
            <p className="text-xs text-zinc-400 flex items-start gap-1.5">
              <MapPin size={12} className="mt-0.5 text-zinc-500 flex-shrink-0" />
              <span className="break-words">{gym.address}</span>
            </p>
          )}
          {gym.phone && (
            <p className="text-xs text-zinc-400 flex items-center gap-1.5">
              <Phone size={12} className="text-zinc-500 flex-shrink-0" />
              <a href={`tel:${gym.phone}`} className="hover:text-white tabular-nums">{gym.phone}</a>
            </p>
          )}
        </div>
      </div>
    </section>
  )
}

// ── Announcements section ────────────────────────────────────────────────────

function AnnouncementsSection({ items }) {
  return (
    <section className="mb-5">
      <h3 className="text-sm font-semibold text-white mb-2.5 flex items-center gap-1.5">
        <Megaphone size={14} className="text-emerald-400" />
        Announcements
      </h3>
      {items.length === 0 ? (
        <div className="bg-[#141416] border border-white/[0.06] rounded-2xl p-6 text-center">
          <p className="text-sm text-zinc-300 font-medium">No announcements yet</p>
          <p className="text-xs text-zinc-500 mt-1">Updates from your gym will show up here.</p>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {items.map(a => (
            <li key={a.id} className="bg-[#141416] border border-white/[0.06] rounded-2xl p-4">
              <div className="flex items-center gap-2 flex-wrap mb-1.5">
                <h4 className="text-sm font-semibold text-white">{a.title}</h4>
                <PriorityPill priority={a.priority} />
              </div>
              <p className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">{a.body}</p>
              <p className="text-[11px] text-zinc-500 mt-2">{timeAgo(a.created_at)}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

// ── Schedule section (read-only) ─────────────────────────────────────────────

function ScheduleSection({ schedule }) {
  const byDay = useMemo(() => {
    const map = new Map(DAYS.map(d => [d.key, []]))
    for (const c of schedule) {
      const k = Number(c.day_of_week)
      if (map.has(k)) map.get(k).push(c)
    }
    return map
  }, [schedule])

  const allEmpty = schedule.length === 0

  return (
    <section>
      <h3 className="text-sm font-semibold text-white mb-2.5 flex items-center gap-1.5">
        <CalendarDays size={14} className="text-emerald-400" />
        This week
      </h3>

      {allEmpty ? (
        <div className="bg-[#141416] border border-white/[0.06] rounded-2xl p-6 text-center">
          <p className="text-sm text-zinc-300 font-medium">No classes scheduled</p>
          <p className="text-xs text-zinc-500 mt-1">Classes will show up here once your gym posts them.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
          {DAYS.map(d => {
            const dayClasses = byDay.get(d.key) || []
            return (
              <div key={d.key} className="bg-[#141416] border border-white/[0.06] rounded-2xl p-3 min-h-[140px]">
                <div className="flex items-center justify-between mb-2.5">
                  <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">
                    {d.short}
                  </p>
                  <p className="text-[10px] text-zinc-500 tabular-nums">
                    {dayClasses.length}
                  </p>
                </div>

                {dayClasses.length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-center py-4 text-zinc-600">
                    <CalendarDays size={16} className="mb-1" />
                    <p className="text-[11px]">No classes</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {dayClasses.map(c => (
                      <div key={c.id} className="bg-[#1a1a1d] border border-white/[0.06] rounded-xl p-3">
                        <p className="text-sm font-semibold text-white mb-1.5 truncate">{c.class_name}</p>
                        <div className="flex items-center gap-1 text-[11px] text-zinc-400 tabular-nums mb-1">
                          <Clock size={10} />
                          {formatTime(c.start_time)} – {formatTime(c.end_time)}
                        </div>
                        {c.trainer_name && (
                          <p className="text-[11px] text-zinc-500 truncate">with {c.trainer_name}</p>
                        )}
                        <div className="flex items-center gap-1 text-[11px] text-zinc-500 tabular-nums mt-1">
                          <Users size={10} />
                          {c.capacity} {c.capacity === 1 ? 'spot' : 'spots'}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function MyGym() {
  const { user } = useAuth()
  const [data, setData] = useState(null)        // { linked, gym, announcements, schedule }
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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

  function onJoined(_gymName) {
    // Reload so BottomNav re-evaluates the user's gym_id and the linked view renders.
    window.location.reload()
  }

  return (
    <div className="min-h-screen bg-[#0c0c0e] pb-24 overflow-x-hidden">
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[700px] h-[300px] bg-emerald-500/[0.07] blur-[120px] rounded-full pointer-events-none" />

      <div className="relative z-10 max-w-5xl mx-auto px-5 py-10 sm:py-12">
        <header className="mb-7">
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">My Gym</h1>
          <p className="text-zinc-500 text-sm mt-0.5">
            {loading ? 'Loading…'
              : data?.linked ? 'Schedule and announcements from your gym.'
              : 'Connect to your gym to see what’s happening.'}
          </p>
        </header>

        {error && (
          <div className="mb-5 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="bg-[#141416] border border-white/[0.06] rounded-2xl p-8 sm:p-10 flex items-center justify-center">
            <Loader2 size={20} className="text-zinc-500 animate-spin" />
          </div>
        ) : !data?.linked ? (
          <JoinGymView userId={user?.id} onJoined={onJoined} />
        ) : (
          <>
            {data.gym && <GymHeaderCard gym={data.gym} />}
            <AnnouncementsSection items={data.announcements || []} />
            <ScheduleSection schedule={data.schedule || []} />
          </>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
