import { useEffect, useMemo, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  Users, Activity, IndianRupee, AlertCircle, Copy, Check, LogOut,
  Loader2, ArrowUp, ArrowDown, Minus, UserPlus, Receipt, Inbox, Building2,
} from 'lucide-react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
  AreaChart, Area,
} from 'recharts'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../utils/supabase'
import GymOwnerNav from '../components/GymOwnerNav'

// ── Formatting helpers ──────────────────────────────────────────────────────

const inrFormatter = new Intl.NumberFormat('en-IN', {
  maximumFractionDigits: 0,
})

function formatINR(value) {
  return `₹${inrFormatter.format(Math.round(value || 0))}`
}

function formatINRShort(value) {
  const v = Math.round(value || 0)
  if (v >= 10_000_000) return `₹${(v / 10_000_000).toFixed(1)}Cr`
  if (v >= 100_000)    return `₹${(v / 100_000).toFixed(1)}L`
  if (v >= 1_000)      return `₹${(v / 1_000).toFixed(1)}K`
  return `₹${v}`
}

function relativeTime(iso) {
  if (!iso) return ''
  const diffMs = Date.now() - new Date(iso).getTime()
  const sec = Math.floor(diffMs / 1000)
  if (sec < 60)   return 'just now'
  const min = Math.floor(sec / 60)
  if (min < 60)   return `${min}m ago`
  const hr  = Math.floor(min / 60)
  if (hr < 24)    return `${hr}h ago`
  const day = Math.floor(hr / 24)
  if (day < 7)    return `${day}d ago`
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

function startOfTodayISO() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}
function startOfYesterdayISO() {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}
function nDaysAgoISO(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}
function startOfMonthISO(offset = 0) {
  const d = new Date()
  d.setMonth(d.getMonth() + offset, 1)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

// ── Custom tooltips ─────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label, suffix = '', formatter }) {
  if (!active || !payload?.length) return null
  const v = payload[0].value
  return (
    <div className="bg-[#1a1a1d] border border-white/10 rounded-xl px-3 py-2 shadow-xl">
      <p className="text-zinc-400 text-[11px] mb-0.5">{label}</p>
      <p className="text-emerald-400 font-semibold text-sm tabular-nums">
        {formatter ? formatter(v) : `${v}${suffix}`}
      </p>
    </div>
  )
}

// ── Stat card ───────────────────────────────────────────────────────────────

function StatCard({ label, icon: Icon, iconBg, iconColor, value, sub, subTone, valueTone }) {
  const valueColor = valueTone === 'warn'
    ? 'text-amber-400'
    : valueTone === 'muted'
    ? 'text-zinc-400'
    : 'text-white'

  const subColor = subTone === 'pos'
    ? 'text-emerald-400'
    : subTone === 'neg'
    ? 'text-red-400'
    : subTone === 'warn'
    ? 'text-amber-400'
    : 'text-zinc-500'

  return (
    <div className="relative bg-[#141416] border border-white/[0.06] rounded-2xl p-5 hover:border-white/[0.14] transition-colors duration-150">
      <div className="flex items-start justify-between mb-4">
        <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">{label}</span>
        <div className={`w-7 h-7 rounded-lg ${iconBg} flex items-center justify-center`}>
          <Icon size={13} className={iconColor} />
        </div>
      </div>
      <p className={`text-3xl font-bold tracking-tight tabular-nums ${valueColor}`}>{value}</p>
      <p className={`text-xs mt-1.5 tabular-nums ${subColor}`}>{sub}</p>
    </div>
  )
}

// ── Activity row ────────────────────────────────────────────────────────────

const ACTIVITY_ICONS = {
  checkin:  { icon: Activity, color: 'text-sky-400',     bg: 'bg-sky-500/10' },
  member:   { icon: UserPlus, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  payment:  { icon: Receipt,  color: 'text-amber-400',   bg: 'bg-amber-500/10' },
}

function ActivityRow({ event }) {
  const conf = ACTIVITY_ICONS[event.kind] ?? ACTIVITY_ICONS.checkin
  const Icon = conf.icon
  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors rounded-xl">
      <div className={`w-9 h-9 rounded-xl ${conf.bg} flex items-center justify-center flex-shrink-0`}>
        <Icon size={15} className={conf.color} />
      </div>
      <p className="flex-1 text-sm text-zinc-200 truncate">{event.text}</p>
      <span className="text-xs text-zinc-500 flex-shrink-0 tabular-nums">{relativeTime(event.at)}</span>
    </div>
  )
}

// ── Empty state inside a chart card ─────────────────────────────────────────

function ChartEmpty({ icon: Icon, title, hint }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 gap-2">
      <div className="w-12 h-12 rounded-2xl bg-white/[0.04] flex items-center justify-center">
        <Icon size={20} className="text-zinc-600" />
      </div>
      <p className="text-zinc-400 text-sm font-medium">{title}</p>
      <p className="text-zinc-500 text-xs text-center max-w-xs">{hint}</p>
    </div>
  )
}

// ── Page ────────────────────────────────────────────────────────────────────

export default function GymDashboard() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')
  const [copied, setCopied]     = useState(false)

  const [gym, setGym]                       = useState(null)
  const [activeMembers, setActiveMembers]   = useState(0)
  const [newThisMonth, setNewThisMonth]     = useState(0)
  const [totalMembersEver, setTotalMembers] = useState(0)
  const [todayCheckins, setTodayCheckins]   = useState(0)
  const [yesterdayCheckins, setYesterdayCheckins] = useState(0)
  const [mrr, setMrr]                       = useState(0)
  const [paidInvoices, setPaidInvoices]     = useState(0)
  const [outstandingTotal, setOutstanding]  = useState(0)
  const [overdueCount, setOverdueCount]     = useState(0)
  const [checkinByDay, setCheckinByDay]     = useState([])
  const [revenueByMonth, setRevenueByMonth] = useState([])
  const [activity, setActivity]             = useState([])

  // ── Fetch everything ─────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!user) return
      setLoading(true)
      setError('')
      try {
        // Step 1: get the gym for this owner
        const { data: gymRow, error: gymErr } = await supabase
          .from('gyms')
          .select('*')
          .eq('owner_id', user.id)
          .maybeSingle()
        if (gymErr) throw gymErr
        if (!gymRow) {
          if (!cancelled) {
            setError('No gym found for this owner.')
            setLoading(false)
          }
          return
        }
        if (cancelled) return
        setGym(gymRow)

        const gymId         = gymRow.id
        const todayStart    = startOfTodayISO()
        const yesterStart   = startOfYesterdayISO()
        const sevenDaysAgo  = nDaysAgoISO(6) // last 7 days inclusive of today
        const monthStart    = startOfMonthISO(0)
        const sixMonthsAgo  = startOfMonthISO(-5)

        // Step 2: parallel queries
        const queries = await Promise.allSettled([
          // 0 — total members (any status, ever) — for empty-state detection
          supabase
            .from('gym_memberships')
            .select('id', { count: 'exact', head: true })
            .eq('gym_id', gymId),
          // 1 — active members
          supabase
            .from('gym_memberships')
            .select('id', { count: 'exact', head: true })
            .eq('gym_id', gymId)
            .eq('status', 'active'),
          // 2 — new this month
          supabase
            .from('gym_memberships')
            .select('id', { count: 'exact', head: true })
            .eq('gym_id', gymId)
            .gte('created_at', monthStart),
          // 3 — today check-ins (count)
          supabase
            .from('check_ins')
            .select('id', { count: 'exact', head: true })
            .eq('gym_id', gymId)
            .gte('checked_in_at', todayStart),
          // 4 — yesterday check-ins (count)
          supabase
            .from('check_ins')
            .select('id', { count: 'exact', head: true })
            .eq('gym_id', gymId)
            .gte('checked_in_at', yesterStart)
            .lt('checked_in_at', todayStart),
          // 5 — current month MRR rows
          supabase
            .from('payments')
            .select('amount')
            .eq('gym_id', gymId)
            .eq('status', 'paid')
            .gte('paid_at', monthStart),
          // 6 — outstanding (overdue) rows
          supabase
            .from('payments')
            .select('amount')
            .eq('gym_id', gymId)
            .eq('status', 'overdue')
            .lt('due_date', new Date().toISOString().slice(0, 10)),
          // 7 — last 7 days check-ins
          supabase
            .from('check_ins')
            .select('checked_in_at')
            .eq('gym_id', gymId)
            .gte('checked_in_at', sevenDaysAgo),
          // 8 — last 6 months paid revenue
          supabase
            .from('payments')
            .select('amount, paid_at')
            .eq('gym_id', gymId)
            .eq('status', 'paid')
            .gte('paid_at', sixMonthsAgo),
          // 9 — recent check-ins with member names
          supabase
            .from('check_ins')
            .select('checked_in_at, users(full_name)')
            .eq('gym_id', gymId)
            .gte('checked_in_at', nDaysAgoISO(1))
            .order('checked_in_at', { ascending: false })
            .limit(15),
          // 10 — recent new members
          supabase
            .from('gym_memberships')
            .select('created_at, users(full_name)')
            .eq('gym_id', gymId)
            .gte('created_at', nDaysAgoISO(7))
            .order('created_at', { ascending: false })
            .limit(15),
          // 11 — recent payments
          supabase
            .from('payments')
            .select('amount, paid_at, users(full_name)')
            .eq('gym_id', gymId)
            .eq('status', 'paid')
            .gte('paid_at', nDaysAgoISO(7))
            .order('paid_at', { ascending: false })
            .limit(15),
        ])

        if (cancelled) return

        // Helper to read settled values without crashing on partial errors
        const readCount = i => queries[i].status === 'fulfilled' ? (queries[i].value.count ?? 0) : 0
        const readData  = i => queries[i].status === 'fulfilled' ? (queries[i].value.data ?? []) : []
        const anyErrored = queries.some(q =>
          q.status === 'rejected' || (q.status === 'fulfilled' && q.value.error)
        )

        setTotalMembers(readCount(0))
        setActiveMembers(readCount(1))
        setNewThisMonth(readCount(2))
        setTodayCheckins(readCount(3))
        setYesterdayCheckins(readCount(4))

        const mrrRows = readData(5)
        setMrr(mrrRows.reduce((sum, r) => sum + Number(r.amount || 0), 0))
        setPaidInvoices(mrrRows.length)

        const overdueRows = readData(6)
        setOutstanding(overdueRows.reduce((sum, r) => sum + Number(r.amount || 0), 0))
        setOverdueCount(overdueRows.length)

        // Bucket check-ins by day (last 7 including today)
        const checkinRows = readData(7)
        const dayBuckets = []
        for (let i = 6; i >= 0; i--) {
          const d = new Date()
          d.setDate(d.getDate() - i)
          d.setHours(0, 0, 0, 0)
          dayBuckets.push({
            iso:   d.toISOString().slice(0, 10),
            label: d.toLocaleDateString('en-US', { weekday: 'short' }),
            isToday: i === 0,
            count: 0,
          })
        }
        for (const row of checkinRows) {
          const day = new Date(row.checked_in_at).toISOString().slice(0, 10)
          const b   = dayBuckets.find(b => b.iso === day)
          if (b) b.count++
        }
        setCheckinByDay(dayBuckets)

        // Bucket revenue by month (last 6 including current)
        const revRows = readData(8)
        const monthBuckets = []
        for (let i = 5; i >= 0; i--) {
          const d = new Date()
          d.setMonth(d.getMonth() - i, 1)
          d.setHours(0, 0, 0, 0)
          monthBuckets.push({
            key:   `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`,
            label: d.toLocaleDateString('en-US', { month: 'short' }),
            total: 0,
          })
        }
        for (const row of revRows) {
          if (!row.paid_at) continue
          const d = new Date(row.paid_at)
          const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
          const m   = monthBuckets.find(b => b.key === key)
          if (m) m.total += Number(row.amount || 0)
        }
        setRevenueByMonth(monthBuckets)

        // Activity feed: combine, sort, take 10
        const feed = []
        for (const r of readData(9)) {
          feed.push({
            kind: 'checkin',
            at:   r.checked_in_at,
            text: `${r.users?.full_name ?? 'A member'} checked in`,
          })
        }
        for (const r of readData(10)) {
          feed.push({
            kind: 'member',
            at:   r.created_at,
            text: `${r.users?.full_name ?? 'New member'} joined`,
          })
        }
        for (const r of readData(11)) {
          feed.push({
            kind: 'payment',
            at:   r.paid_at,
            text: `${formatINR(r.amount)} received from ${r.users?.full_name ?? 'a member'}`,
          })
        }
        feed.sort((a, b) => new Date(b.at) - new Date(a.at))
        setActivity(feed.slice(0, 10))

        if (anyErrored) {
          setError('Some data couldn’t be loaded. Showing what’s available.')
        }
      } catch (err) {
        console.error('GymDashboard load error:', err)
        if (!cancelled) setError(err.message || 'Failed to load dashboard.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [user])

  // ── Derived ──────────────────────────────────────────────────────────────

  const checkinDelta = todayCheckins - yesterdayCheckins
  const checkinSubTone = checkinDelta > 0 ? 'pos' : checkinDelta < 0 ? 'neg' : null
  const CheckinDeltaIcon = checkinDelta > 0 ? ArrowUp : checkinDelta < 0 ? ArrowDown : Minus

  const todayDateLabel = useMemo(() => {
    return new Date().toLocaleDateString('en-IN', {
      weekday: undefined,
      day:   'numeric',
      month: 'short',
      year:  'numeric',
    })
  }, [])

  // ── Actions ──────────────────────────────────────────────────────────────

  async function handleCopy() {
    if (!gym?.join_code) return
    try {
      await navigator.clipboard.writeText(gym.join_code.toUpperCase())
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Clipboard error:', err)
    }
  }

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  // ── Render: loading ──────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0c0c0e] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={28} className="text-emerald-500 animate-spin" />
          <p className="text-zinc-500 text-sm">Loading your dashboard…</p>
        </div>
      </div>
    )
  }

  // ── Header (shared between empty and populated states) ────────────────────

  const Header = () => (
    <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-7">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight leading-tight">
          {gym?.name ?? 'Your gym'}
        </h1>
        <p className="text-zinc-500 text-sm mt-0.5">
          {gym?.city || '—'}{gym?.state ? `, ${gym.state}` : ''}
        </p>
        <p className="text-[10px] text-zinc-600 uppercase tracking-widest mt-3 font-semibold">
          Today · {todayDateLabel}
        </p>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {gym?.join_code && (
          <div className="inline-flex items-center gap-2 bg-white/[0.04] border border-white/[0.08] rounded-full pl-3.5 pr-1.5 py-1.5">
            <span className="text-[11px] text-zinc-500">Join code:</span>
            <span className="text-emerald-400 font-mono font-semibold text-xs tracking-[0.2em]">
              {gym.join_code.toUpperCase()}
            </span>
            <button
              onClick={handleCopy}
              className="ml-1 w-7 h-7 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-white flex items-center justify-center transition-colors"
              aria-label="Copy join code"
            >
              {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
            </button>
            {copied && <span className="text-[11px] text-emerald-400 ml-1 mr-1">Copied!</span>}
          </div>
        )}
        <button
          onClick={handleSignOut}
          className="inline-flex items-center gap-1.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded-full px-3 py-1.5 text-[11px] font-medium text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          <LogOut size={12} />
          Logout
        </button>
      </div>
    </header>
  )

  // ── Render: zero-members empty state ─────────────────────────────────────

  if (totalMembersEver === 0 && !error) {
    return (
      <div className="min-h-screen bg-[#0c0c0e] pb-24 overflow-x-hidden">
        <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[700px] h-[300px] bg-emerald-500/[0.08] blur-[120px] rounded-full pointer-events-none" />

        <div className="relative z-10 max-w-3xl mx-auto px-5 py-10 sm:py-14">
          <Header />

          <div className="bg-[#141416] border border-white/[0.06] rounded-2xl p-8 sm:p-12 text-center mt-6">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-5">
              <Building2 size={26} className="text-emerald-400" />
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight mb-2">
              Welcome to your dashboard!
            </h2>
            <p className="text-zinc-400 text-sm max-w-md mx-auto mb-8">
              You have no members yet. Share your join code with members to get started.
            </p>

            {gym?.join_code && (
              <div className="bg-white/[0.03] border border-emerald-500/20 rounded-2xl p-6 max-w-sm mx-auto mb-8">
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-2.5">Your gym join code</p>
                <p className="text-3xl sm:text-4xl font-bold text-emerald-400 font-mono tracking-[0.3em] mb-4">
                  {gym.join_code.toUpperCase()}
                </p>
                <button
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1.5 bg-white/[0.06] hover:bg-white/[0.12] text-white text-xs font-medium px-3.5 py-2 rounded-lg transition-colors"
                >
                  {copied ? <><Check size={12} className="text-emerald-400" /> Copied!</> : <><Copy size={12} /> Copy code</>}
                </button>
              </div>
            )}

            <Link
              to="/gym/members"
              className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold text-sm px-6 py-3 rounded-xl transition-all duration-150 shadow-lg shadow-emerald-500/20"
            >
              <Users size={14} />
              View Members
            </Link>
          </div>
        </div>

        <GymOwnerNav />
      </div>
    )
  }

  // ── Render: full dashboard ───────────────────────────────────────────────

  const hasCheckinData = checkinByDay.some(b => b.count > 0)
  const hasRevenueData = revenueByMonth.some(b => b.total > 0)

  return (
    <div className="min-h-screen bg-[#0c0c0e] pb-24 overflow-x-hidden">
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[700px] h-[300px] bg-emerald-500/[0.07] blur-[120px] rounded-full pointer-events-none" />

      <div className="relative z-10 max-w-5xl mx-auto px-5 py-10 sm:py-12">
        <Header />

        {error && (
          <div className="mb-6 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* ── Stats row ──────────────────────────────────────────── */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <StatCard
            label="Active Members"
            icon={Users}
            iconBg="bg-emerald-500/10"
            iconColor="text-emerald-400"
            value={inrFormatter.format(activeMembers)}
            sub={newThisMonth > 0 ? `+${newThisMonth} this month` : 'No new joins this month'}
            subTone={newThisMonth > 0 ? 'pos' : null}
          />
          <StatCard
            label="Check-ins Today"
            icon={Activity}
            iconBg="bg-sky-500/10"
            iconColor="text-sky-400"
            value={inrFormatter.format(todayCheckins)}
            sub={(
              <span className="inline-flex items-center gap-1">
                <CheckinDeltaIcon size={11} />
                {checkinDelta === 0 ? 'same as yesterday' : `${Math.abs(checkinDelta)} vs yesterday`}
              </span>
            )}
            subTone={checkinSubTone}
          />
          <StatCard
            label="MRR"
            icon={IndianRupee}
            iconBg="bg-amber-500/10"
            iconColor="text-amber-400"
            value={formatINR(mrr)}
            sub={paidInvoices === 1 ? '1 invoice this month' : `${paidInvoices} invoices this month`}
          />
          <StatCard
            label="Outstanding"
            icon={AlertCircle}
            iconBg="bg-amber-500/10"
            iconColor="text-amber-400"
            value={outstandingTotal > 0 ? formatINR(outstandingTotal) : '₹0'}
            sub={overdueCount > 0
              ? `${overdueCount} ${overdueCount === 1 ? 'member' : 'members'} overdue`
              : 'All caught up'}
            subTone={overdueCount > 0 ? 'warn' : 'pos'}
            valueTone={outstandingTotal > 0 ? 'warn' : 'muted'}
          />
        </section>

        {/* ── Charts row ─────────────────────────────────────────── */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          {/* Check-ins last 7 days */}
          <div className="bg-[#141416] border border-white/[0.06] rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">
                Check-ins — Last 7 days
              </p>
              {hasCheckinData && (
                <p className="text-[10px] text-zinc-600 tabular-nums">
                  {checkinByDay.reduce((s, b) => s + b.count, 0)} total
                </p>
              )}
            </div>
            {hasCheckinData ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={checkinByDay} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0d" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: '#71717a', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fill: '#71717a', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: '#ffffff08' }} content={<ChartTooltip suffix=" check-ins" />} />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {checkinByDay.map((entry, i) => (
                      <Cell key={i} fill={entry.isToday ? '#10b981' : '#10b98166'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <ChartEmpty
                icon={Activity}
                title="No check-ins yet"
                hint="Members will appear here when they scan the QR code at entry."
              />
            )}
          </div>

          {/* Revenue last 6 months */}
          <div className="bg-[#141416] border border-white/[0.06] rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">
                Revenue — Last 6 months
              </p>
              {hasRevenueData && (
                <p className="text-[10px] text-zinc-600 tabular-nums">
                  {formatINRShort(revenueByMonth.reduce((s, m) => s + m.total, 0))} total
                </p>
              )}
            </div>
            {hasRevenueData ? (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={revenueByMonth} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"  stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0d" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: '#71717a', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fill: '#71717a', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={v => formatINRShort(v)}
                  />
                  <Tooltip content={<ChartTooltip formatter={v => formatINR(v)} />} />
                  <Area
                    type="monotone"
                    dataKey="total"
                    stroke="#10b981"
                    strokeWidth={2}
                    fill="url(#revGradient)"
                    activeDot={{ r: 5, fill: '#10b981' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <ChartEmpty
                icon={IndianRupee}
                title="No payments recorded yet"
                hint="As members make payments, your monthly revenue trend will show here."
              />
            )}
          </div>
        </section>

        {/* ── Activity feed ──────────────────────────────────────── */}
        <section className="bg-[#141416] border border-white/[0.06] rounded-2xl p-5">
          <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-3">
            Recent Activity
          </p>

          {activity.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <div className="w-12 h-12 rounded-2xl bg-white/[0.04] flex items-center justify-center">
                <Inbox size={20} className="text-zinc-600" />
              </div>
              <p className="text-zinc-300 text-sm font-medium">
                No activity yet — your gym is just getting started 🚀
              </p>
              <p className="text-zinc-500 text-xs text-center max-w-xs">
                Once members start checking in, you’ll see live activity here.
              </p>
            </div>
          ) : (
            <div className="-mx-1.5">
              {activity.map((e, i) => (
                <ActivityRow key={`${e.kind}-${e.at}-${i}`} event={e} />
              ))}
            </div>
          )}
        </section>
      </div>

      <GymOwnerNav />
    </div>
  )
}
