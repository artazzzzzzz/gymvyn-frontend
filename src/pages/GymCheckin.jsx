import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import {
  Activity, AlertCircle, Check, Loader2, LogIn, LogOut,
  QrCode, Search, UserCheck, Users, X,
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../utils/supabase'
import {
  getGymQR, getGymOccupancy, checkInMember, checkOutMember,
} from '../utils/api'
import GymOwnerNav from '../components/GymOwnerNav'

// ── Helpers ──────────────────────────────────────────────────────────────────

const AVATAR_PALETTE = [
  { bg: 'bg-emerald-500/15', text: 'text-emerald-400' },
  { bg: 'bg-sky-500/15',     text: 'text-sky-400'     },
  { bg: 'bg-violet-500/15',  text: 'text-violet-400'  },
  { bg: 'bg-amber-500/15',   text: 'text-amber-400'   },
  { bg: 'bg-rose-500/15',    text: 'text-rose-400'    },
  { bg: 'bg-cyan-500/15',    text: 'text-cyan-400'    },
]

function avatarColor(name) {
  const s = (name || '?').toString()
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return AVATAR_PALETTE[h % AVATAR_PALETTE.length]
}

function initials(name) {
  if (!name) return '?'
  return name.trim().split(/\s+/).slice(0, 2).map(p => p[0]?.toUpperCase()).join('')
}

function todayMidnightIso() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

function timeAgo(iso) {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

function formatTime(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('en-IN', {
    hour: 'numeric', minute: '2-digit', hour12: true,
  }).toLowerCase()
}

// ── Toast ────────────────────────────────────────────────────────────────────

function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(onClose, 2800)
    return () => clearTimeout(t)
  }, [toast, onClose])
  if (!toast) return null
  const isError = toast.kind === 'error'
  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[60]">
      <div className={`bg-[#1a1a1d] border rounded-xl px-4 py-3 shadow-2xl flex items-center gap-3 min-w-[260px] max-w-[400px] ${
        isError ? 'border-red-500/30' : 'border-emerald-500/30'
      }`}>
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
          isError ? 'bg-red-500/15' : 'bg-emerald-500/15'
        }`}>
          {isError
            ? <AlertCircle size={14} className="text-red-400" />
            : <Check size={14} className="text-emerald-400" />}
        </div>
        <p className="text-sm text-white flex-1">{toast.msg}</p>
        <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300">
          <X size={14} />
        </button>
      </div>
    </div>
  )
}

// ── QR card ──────────────────────────────────────────────────────────────────

function QRCard({ qrData, gymName }) {
  return (
    <div className="bg-[#141416] border border-white/[0.06] rounded-2xl p-6 text-center">
      <div className="flex items-center justify-center gap-1.5 mb-4">
        <QrCode size={14} className="text-emerald-400" />
        <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">
          Member check-in QR
        </p>
      </div>

      <div className="inline-block p-4 bg-white rounded-2xl shadow-lg">
        {qrData ? (
          <QRCodeSVG value={qrData} size={240} level="M" includeMargin={false} />
        ) : (
          <div className="w-[240px] h-[240px] flex items-center justify-center text-zinc-400">
            <Loader2 size={24} className="animate-spin" />
          </div>
        )}
      </div>

      <p className="text-xs text-zinc-500 mt-5 max-w-xs mx-auto leading-relaxed">
        Members scan this with the FitForge app to check in. Keep it visible at your entrance.
      </p>
      {gymName && (
        <p className="text-[11px] text-zinc-600 mt-2">{gymName}</p>
      )}
    </div>
  )
}

// ── Occupancy card ───────────────────────────────────────────────────────────

function OccupancyCard({ count, asOf, loading }) {
  return (
    <div className="bg-[#141416] border border-white/[0.06] rounded-2xl p-6">
      <div className="flex items-center gap-1.5 mb-3">
        <Activity size={14} className="text-emerald-400" />
        <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">
          Live occupancy
        </p>
        <span className="ml-auto flex items-center gap-1.5 text-[10px] text-zinc-500">
          <span className="relative flex w-2 h-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 animate-ping opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
          </span>
          LIVE
        </span>
      </div>

      <div className="flex items-baseline gap-3">
        <span className="text-5xl font-bold text-white tabular-nums">
          {loading && count == null ? '—' : count}
        </span>
        <span className="text-sm text-zinc-400">
          {count === 1 ? 'person' : 'people'} currently in gym
        </span>
      </div>

      {asOf && (
        <p className="text-[10px] text-zinc-600 mt-2 tabular-nums">
          Updated {timeAgo(asOf)}
        </p>
      )}
    </div>
  )
}

// ── Manual check-in section ──────────────────────────────────────────────────

function ManualCheckinSection({ gymId, members, openCheckinByUser, onAction }) {
  const [query, setQuery] = useState('')
  const [busy, setBusy]   = useState(null) // user_id being processed

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return members
      .filter(m => m.full_name?.toLowerCase().includes(q) || m.phone?.includes(q))
      .slice(0, 6)
  }, [members, query])

  async function handle(action, member) {
    setBusy(member.id)
    try {
      if (action === 'in') {
        await checkInMember(member.id, gymId, 'manual')
        onAction({ kind: 'in', name: member.full_name })
      } else {
        await checkOutMember(member.id, gymId)
        onAction({ kind: 'out', name: member.full_name })
      }
      setQuery('')
    } catch (err) {
      onAction({ kind: 'error', msg: err.message || 'Action failed' })
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="bg-[#141416] border border-white/[0.06] rounded-2xl p-5">
      <div className="flex items-center gap-1.5 mb-4">
        <UserCheck size={14} className="text-emerald-400" />
        <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">
          Manual check-in
        </p>
      </div>

      <div className="relative mb-3">
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search member by name or phone…"
          className="w-full bg-[#1c1c1f] border border-white/[0.08] rounded-xl pl-9 pr-3.5 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30"
        />
      </div>

      {query.trim() && (
        filtered.length === 0 ? (
          <p className="text-xs text-zinc-500 px-2 py-3 text-center">No members match.</p>
        ) : (
          <ul className="space-y-2">
            {filtered.map(m => {
              const av = avatarColor(m.full_name)
              const isCheckedIn = openCheckinByUser.has(m.id)
              return (
                <li key={m.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
                  <div className={`w-9 h-9 rounded-xl ${av.bg} flex items-center justify-center flex-shrink-0`}>
                    <span className={`text-xs font-bold ${av.text}`}>{initials(m.full_name)}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-white truncate">{m.full_name}</p>
                    {m.phone && (
                      <p className="text-[11px] text-zinc-500 tabular-nums truncate">{m.phone}</p>
                    )}
                  </div>
                  {isCheckedIn ? (
                    <button
                      onClick={() => handle('out', m)}
                      disabled={busy === m.id}
                      className="inline-flex items-center gap-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-semibold px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {busy === m.id ? <Loader2 size={12} className="animate-spin" /> : <LogOut size={12} />}
                      Check out
                    </button>
                  ) : (
                    <button
                      onClick={() => handle('in', m)}
                      disabled={busy === m.id}
                      className="inline-flex items-center gap-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-semibold px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {busy === m.id ? <Loader2 size={12} className="animate-spin" /> : <LogIn size={12} />}
                      Check in
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        )
      )}
    </div>
  )
}

// ── Recent check-ins list ────────────────────────────────────────────────────

function RecentCheckinsList({ items, loading }) {
  return (
    <div className="bg-[#141416] border border-white/[0.06] rounded-2xl p-5">
      <div className="flex items-center gap-1.5 mb-4">
        <Users size={14} className="text-emerald-400" />
        <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">
          Recent activity
        </p>
        {loading && <Loader2 size={12} className="text-zinc-600 animate-spin ml-auto" />}
      </div>

      {items.length === 0 ? (
        <p className="text-xs text-zinc-500 py-6 text-center">No check-ins today yet.</p>
      ) : (
        <ul className="space-y-2">
          {items.map(c => {
            const av = avatarColor(c.full_name)
            return (
              <li key={c.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/[0.02] transition-colors">
                <div className={`w-9 h-9 rounded-xl ${av.bg} flex items-center justify-center flex-shrink-0`}>
                  <span className={`text-xs font-bold ${av.text}`}>{initials(c.full_name)}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white truncate">{c.full_name || 'Unknown'}</p>
                  <p className="text-[11px] text-zinc-500 tabular-nums">
                    {formatTime(c.checked_in_at)}
                    {c.checked_out_at && <> – {formatTime(c.checked_out_at)}</>}
                    <span className="ml-1.5 text-zinc-600">· {c.method}</span>
                  </p>
                </div>
                {c.checked_out_at ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-zinc-500 bg-white/[0.04] px-2 py-1 rounded-full">
                    Left
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    In
                  </span>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function GymCheckin() {
  const { user } = useAuth()
  const [gymId, setGymId]       = useState(null)
  const [gymName, setGymName]   = useState('')
  const [qrData, setQrData]     = useState('')
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')
  const [toast, setToast]       = useState(null)

  // Live data
  const [occupancy, setOccupancy] = useState({ current: null, asOf: null })
  const [recent, setRecent]       = useState([])
  const [recentLoading, setRecentLoading] = useState(false)
  const [members, setMembers]     = useState([])
  const [openCheckinByUser, setOpenCheckinByUser] = useState(new Set())

  const gymIdRef = useRef(null)
  useEffect(() => { gymIdRef.current = gymId }, [gymId])

  // ── Fetchers ─────────────────────────────────────────────────────────────

  const fetchOccupancy = useCallback(async (gId) => {
    try {
      const data = await getGymOccupancy(gId)
      setOccupancy(data)
    } catch { /* keep last value */ }
  }, [])

  const fetchRecent = useCallback(async (gId) => {
    setRecentLoading(true)
    try {
      // Last 10 check-ins today
      const { data: checkins, error: ciErr } = await supabase
        .from('check_ins')
        .select('id, user_id, checked_in_at, checked_out_at, method')
        .eq('gym_id', gId)
        .gte('checked_in_at', todayMidnightIso())
        .order('checked_in_at', { ascending: false })
        .limit(10)
      if (ciErr) throw ciErr

      const userIds = [...new Set((checkins || []).map(c => c.user_id))]
      let nameById = new Map()
      if (userIds.length) {
        const { data: users, error: uErr } = await supabase
          .from('users')
          .select('id, full_name')
          .in('id', userIds)
        if (uErr) throw uErr
        nameById = new Map((users || []).map(u => [u.id, u.full_name]))
      }

      setRecent((checkins || []).map(c => ({
        ...c,
        full_name: nameById.get(c.user_id) || null,
      })))

      // Also track who's currently in for the manual section
      const openSet = new Set(
        (checkins || [])
          .filter(c => !c.checked_out_at)
          .map(c => c.user_id)
      )
      setOpenCheckinByUser(openSet)
    } catch (err) {
      console.error('Fetch recent check-ins error:', err)
    } finally {
      setRecentLoading(false)
    }
  }, [])

  const fetchMembers = useCallback(async (gId) => {
    try {
      const { data, error: mErr } = await supabase
        .from('gym_memberships')
        .select('user_id')
        .eq('gym_id', gId)
        .eq('status', 'active')
      if (mErr) throw mErr

      const ids = (data || []).map(m => m.user_id)
      if (ids.length === 0) { setMembers([]); return }

      const { data: users, error: uErr } = await supabase
        .from('users')
        .select('id, full_name, phone')
        .in('id', ids)
      if (uErr) throw uErr
      setMembers(users || [])
    } catch (err) {
      console.error('Fetch members error:', err)
    }
  }, [])

  // ── Initial load ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (!user) return
    let cancelled = false
    ;(async () => {
      setLoading(true); setError('')
      try {
        const { data: gym, error: gymErr } = await supabase
          .from('gyms')
          .select('id, name')
          .eq('owner_id', user.id)
          .maybeSingle()
        if (gymErr) throw gymErr
        if (!gym) throw new Error('No gym found for this account.')
        if (cancelled) return

        setGymId(gym.id)
        setGymName(gym.name || '')

        const qrInfo = await getGymQR(gym.id)
        if (cancelled) return
        setQrData(qrInfo.qrData || `fitforge:checkin:${gym.id}`)

        await Promise.all([
          fetchOccupancy(gym.id),
          fetchRecent(gym.id),
          fetchMembers(gym.id),
        ])
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [user, fetchOccupancy, fetchRecent, fetchMembers])

  // ── Polling every 30s ────────────────────────────────────────────────────

  useEffect(() => {
    if (!gymId) return
    const t = setInterval(() => {
      const g = gymIdRef.current
      if (!g) return
      fetchOccupancy(g)
      fetchRecent(g)
    }, 30_000)
    return () => clearInterval(t)
  }, [gymId, fetchOccupancy, fetchRecent])

  // ── Manual action callback ───────────────────────────────────────────────

  function onManualAction(result) {
    if (result.kind === 'error') {
      setToast({ kind: 'error', msg: result.msg })
      return
    }
    setToast({
      kind: 'success',
      msg: result.kind === 'in'
        ? `${result.name} checked in`
        : `${result.name} checked out`,
    })
    if (gymId) {
      fetchOccupancy(gymId)
      fetchRecent(gymId)
    }
  }

  return (
    <div className="min-h-screen bg-[#0c0c0e] pb-28 overflow-x-hidden">
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[700px] h-[300px] bg-emerald-500/[0.07] blur-[120px] rounded-full pointer-events-none" />

      <div className="relative z-10 max-w-5xl mx-auto px-5 py-10 sm:py-12">
        <header className="mb-7">
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Check-in</h1>
          <p className="text-zinc-500 text-sm mt-0.5">
            QR-based and manual member check-in.
          </p>
        </header>

        {error && (
          <div className="mb-5 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="bg-[#141416] border border-white/[0.06] rounded-2xl p-10 flex items-center justify-center">
            <Loader2 size={20} className="text-zinc-500 animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
            {/* Left column: QR + occupancy */}
            <div className="lg:col-span-3 space-y-5">
              <QRCard qrData={qrData} gymName={gymName} />
              <OccupancyCard
                count={occupancy.current}
                asOf={occupancy.asOf}
                loading={loading}
              />
            </div>

            {/* Right column: manual + recent */}
            <div className="lg:col-span-2 space-y-5">
              <ManualCheckinSection
                gymId={gymId}
                members={members}
                openCheckinByUser={openCheckinByUser}
                onAction={onManualAction}
              />
              <RecentCheckinsList items={recent} loading={recentLoading} />
            </div>
          </div>
        )}
      </div>

      <Toast toast={toast} onClose={() => setToast(null)} />
      <GymOwnerNav />
    </div>
  )
}
