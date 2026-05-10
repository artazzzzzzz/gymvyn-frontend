import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, Link, Navigate } from 'react-router-dom'
import {
  ArrowLeft, Phone, User as UserIcon, Pause, Ban, Play, Pencil,
  Activity, IndianRupee, AlertCircle, Calendar, Clock, Loader2,
  Check, X, AlertTriangle, Plus, BadgeCheck, MapPin,
} from 'lucide-react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
} from 'recharts'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../utils/supabase'
import { getGymTrainers, assignTrainer } from '../utils/api'
import GymOwnerNav from '../components/GymOwnerNav'

// ── Constants ───────────────────────────────────────────────────────────────

const TYPE_LABELS = {
  monthly:     'Monthly',
  quarterly:   'Quarterly',
  half_yearly: 'Half-yearly',
  annual:      'Annual',
}
const TYPE_MONTHS = {
  monthly: 1, quarterly: 3, half_yearly: 6, annual: 12,
}

const STATUS_STYLES = {
  active:    { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400', label: 'Active'    },
  frozen:    { bg: 'bg-sky-500/10',     border: 'border-sky-500/30',     text: 'text-sky-400',     label: 'Frozen'    },
  expired:   { bg: 'bg-amber-500/10',   border: 'border-amber-500/30',   text: 'text-amber-400',   label: 'Expired'   },
  cancelled: { bg: 'bg-red-500/10',     border: 'border-red-500/30',    text: 'text-red-400',     label: 'Cancelled' },
}

const PAYMENT_STATUS_STYLES = {
  paid:    { bg: 'bg-emerald-500/10', text: 'text-emerald-400', label: 'Paid'    },
  overdue: { bg: 'bg-amber-500/10',   text: 'text-amber-400',   label: 'Overdue' },
  pending: { bg: 'bg-yellow-500/10',  text: 'text-yellow-400',  label: 'Pending' },
  waived:  { bg: 'bg-zinc-500/10',    text: 'text-zinc-400',    label: 'Waived'  },
}

const AVATAR_PALETTE = [
  { bg: 'bg-emerald-500/15', text: 'text-emerald-400' },
  { bg: 'bg-sky-500/15',     text: 'text-sky-400'     },
  { bg: 'bg-violet-500/15',  text: 'text-violet-400'  },
  { bg: 'bg-amber-500/15',   text: 'text-amber-400'   },
  { bg: 'bg-rose-500/15',    text: 'text-rose-400'    },
  { bg: 'bg-cyan-500/15',    text: 'text-cyan-400'    },
  { bg: 'bg-orange-500/15',  text: 'text-orange-400'  },
  { bg: 'bg-indigo-500/15',  text: 'text-indigo-400'  },
]

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const FULL_DAY_LABELS = ['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays']

// ── Helpers ─────────────────────────────────────────────────────────────────

const inrFormatter = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 })
const formatINR = (v) => `₹${inrFormatter.format(Math.round(v || 0))}`

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}
function formatTime(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase()
}
function formatWeekday(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
}
function formatDuration(ms) {
  if (!ms || ms < 0) return ''
  const totalMin = Math.floor(ms / 60000)
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}
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

function effectiveStatus(m) {
  if (!m) return 'cancelled'
  if (m.status === 'cancelled' || m.status === 'frozen' || m.status === 'expired') return m.status
  if (m.end_date) {
    const end = new Date(m.end_date)
    end.setHours(23, 59, 59, 999)
    if (end.getTime() < Date.now()) return 'expired'
  }
  return m.status || 'active'
}

function daysUntil(iso) {
  if (!iso) return null
  const target = new Date(iso); target.setHours(23, 59, 59, 999)
  return Math.ceil((target.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

// ── Reusable atoms ──────────────────────────────────────────────────────────

function StatusPill({ status }) {
  const s = STATUS_STYLES[status] ?? STATUS_STYLES.active
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${s.bg} ${s.border} ${s.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.text.replace('text-', 'bg-')}`} />
      {s.label}
    </span>
  )
}

function PaymentPill({ status }) {
  const s = PAYMENT_STATUS_STYLES[status] ?? PAYMENT_STATUS_STYLES.pending
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${s.bg} ${s.text}`}>
      {s.label}
    </span>
  )
}

function LiveIndicator({ active }) {
  return (
    <div className="inline-flex items-center gap-1.5 bg-white/[0.04] border border-white/[0.06] rounded-full px-2.5 py-1">
      <span className="relative flex w-2 h-2">
        <span className={`absolute inline-flex h-full w-full rounded-full ${active ? 'bg-emerald-400 animate-ping opacity-75' : 'bg-zinc-600'}`} />
        <span className={`relative inline-flex rounded-full h-2 w-2 ${active ? 'bg-emerald-400' : 'bg-zinc-500'}`} />
      </span>
      <span className="text-[10px] font-mono font-semibold text-zinc-300 tracking-widest">LIVE</span>
    </div>
  )
}

function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(onClose, 2800)
    return () => clearTimeout(t)
  }, [toast, onClose])
  if (!toast) return null
  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[60]">
      <div className="bg-[#1a1a1d] border border-emerald-500/30 rounded-xl px-4 py-3 shadow-2xl flex items-center gap-3 min-w-[260px]">
        <div className="w-7 h-7 rounded-lg bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
          <Activity size={14} className="text-emerald-400" />
        </div>
        <p className="text-sm text-white flex-1">{toast}</p>
        <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300"><X size={14} /></button>
      </div>
    </div>
  )
}

function ConfirmDialog({ open, title, body, confirmLabel, danger, onConfirm, onCancel, busy }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center p-4 bg-black/70" onClick={onCancel}>
      <div className="bg-[#141416] border border-white/[0.08] rounded-2xl p-6 max-w-sm w-full shadow-2xl"
           onClick={e => e.stopPropagation()}>
        <div className="flex items-start gap-3 mb-1">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${danger ? 'bg-red-500/10' : 'bg-amber-500/10'}`}>
            <AlertTriangle size={18} className={danger ? 'text-red-400' : 'text-amber-400'} />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">{title}</h3>
            <p className="text-sm text-zinc-400 mt-1 leading-relaxed">{body}</p>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onCancel} disabled={busy}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/[0.04] disabled:opacity-50 transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={busy}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold text-white inline-flex items-center gap-1.5 disabled:opacity-50 transition-colors ${
                    danger ? 'bg-red-500 hover:bg-red-400' : 'bg-emerald-500 hover:bg-emerald-400'
                  }`}>
            {busy && <Loader2 size={13} className="animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

function StatChip({ label, value, tone, sub }) {
  const valueTone = tone === 'warn' ? 'text-amber-400' : 'text-white'
  return (
    <div className="bg-[#141416] border border-white/[0.06] rounded-xl p-3.5 transition-all duration-300">
      <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-1.5">{label}</p>
      <p className={`text-xl sm:text-2xl font-bold tabular-nums ${valueTone} transition-colors duration-300`}>{value}</p>
      {sub && <p className="text-[11px] text-zinc-500 mt-0.5 tabular-nums">{sub}</p>}
    </div>
  )
}

function CardSection({ title, action, children }) {
  return (
    <div className="bg-[#141416] border border-white/[0.06] rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">{title}</p>
        {action}
      </div>
      {children}
    </div>
  )
}

function Field({ label, value, valueTone }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-2 border-b border-white/[0.04] last:border-b-0">
      <span className="text-xs text-zinc-500">{label}</span>
      <span className={`text-sm text-right font-medium tabular-nums ${valueTone || 'text-white'}`}>{value}</span>
    </div>
  )
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#1a1a1d] border border-white/10 rounded-xl px-3 py-2 shadow-xl">
      <p className="text-zinc-400 text-[11px] mb-0.5">{label}</p>
      <p className="text-emerald-400 font-semibold text-sm tabular-nums">{payload[0].value} check-in{payload[0].value === 1 ? '' : 's'}</p>
    </div>
  )
}

// ── Page ────────────────────────────────────────────────────────────────────

export default function GymMemberDetail() {
  const { memberId } = useParams()
  const { user: authUser } = useAuth()
  const navigate = useNavigate()

  // Data
  const [ownerGymId, setOwnerGymId]   = useState(null)
  const [member, setMember]           = useState(null)
  const [membership, setMembership]   = useState(null)
  const [payments, setPayments]       = useState([])
  const [checkins, setCheckins]       = useState([])
  const [gymTrainers, setGymTrainers] = useState([])
  const [selectedTrainerId, setSelectedTrainerId] = useState('')
  const [assignBusy, setAssignBusy]   = useState(false)
  const [assignMsg, setAssignMsg]     = useState('')

  // UI state
  const [loading, setLoading]                 = useState(true)
  const [paymentsError, setPaymentsError]     = useState('')
  const [pageError, setPageError]             = useState('')
  const [forbidden, setForbidden]             = useState(false)
  const [missing, setMissing]                 = useState(false)
  const [toast, setToast]                     = useState('')
  const [confirm, setConfirm]                 = useState(null) // { kind }
  const [busy, setBusy]                       = useState(false)
  const [paying, setPaying]                   = useState(null) // payment id in progress
  const [realtimeActive, setRealtimeActive]   = useState(false)
  const [hoveredCell, setHoveredCell]         = useState(null) // { day, hour, count }
  const [statBumpKey, setStatBumpKey]         = useState(0)

  // Live timer for "currently in gym"
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(t)
  }, [])

  // Refs to keep latest closures for realtime callbacks
  const memberIdRef = useRef(memberId)
  useEffect(() => { memberIdRef.current = memberId }, [memberId])

  // ── Fetchers (re-runnable) ───────────────────────────────────────────────

  async function fetchPayments(uid) {
    setPaymentsError('')
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('user_id', uid)
      .order('due_date', { ascending: false })
    if (error) {
      console.error('Fetch payments error:', error)
      setPaymentsError(error.message || 'Failed to load payments.')
      return
    }
    setPayments(data || [])
  }

  async function fetchCheckins(uid) {
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()
    const { data, error } = await supabase
      .from('check_ins')
      .select('*')
      .eq('user_id', uid)
      .gte('checked_in_at', sixtyDaysAgo)
      .order('checked_in_at', { ascending: false })
    if (error) {
      console.error('Fetch check-ins error:', error)
      return
    }
    setCheckins(data || [])
  }

  async function fetchMembership(uid) {
    const { data, error } = await supabase
      .from('gym_memberships')
      .select('*, trainer:assigned_trainer_id(full_name)')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error) {
      console.error('Fetch membership error:', error)
      return null
    }
    return data
  }

  // ── Initial load ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (!authUser || !memberId) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setPageError(''); setForbidden(false); setMissing(false)
      try {
        // Fetch owner's gym first (for security check)
        const { data: gymRow, error: gymErr } = await supabase
          .from('gyms')
          .select('id')
          .eq('owner_id', authUser.id)
          .maybeSingle()
        if (gymErr) throw gymErr
        if (!gymRow) {
          if (!cancelled) { setPageError('No gym found for this owner.'); setLoading(false) }
          return
        }
        if (cancelled) return
        setOwnerGymId(gymRow.id)

        // Load trainers for assignment dropdown (non-blocking)
        getGymTrainers(gymRow.id).then(t => { if (!cancelled) setGymTrainers(t) }).catch(() => {})

        // Parallel fetch
        const [memberRes, membershipData, paymentsRes, checkinsRes] = await Promise.all([
          supabase.from('users').select('*').eq('id', memberId).maybeSingle(),
          fetchMembership(memberId),
          supabase.from('payments').select('*').eq('user_id', memberId).order('due_date', { ascending: false }),
          supabase.from('check_ins').select('*').eq('user_id', memberId)
            .gte('checked_in_at', new Date(Date.now() - 60*24*60*60*1000).toISOString())
            .order('checked_in_at', { ascending: false }),
        ])
        if (cancelled) return

        if (memberRes.error) throw memberRes.error
        if (!memberRes.data) {
          setMissing(true); setLoading(false); return
        }

        // Security: membership.gym_id must match owner's gym
        if (membershipData && membershipData.gym_id !== gymRow.id) {
          setForbidden(true); setLoading(false); return
        }
        // Fallback if no membership row: check users.gym_id
        if (!membershipData && memberRes.data.gym_id && memberRes.data.gym_id !== gymRow.id) {
          setForbidden(true); setLoading(false); return
        }

        setMember(memberRes.data)
        setMembership(membershipData)
        setSelectedTrainerId(membershipData?.assigned_trainer_id || '')

        if (paymentsRes.error) {
          console.error('Payments error:', paymentsRes.error)
          setPaymentsError(paymentsRes.error.message || 'Failed to load payments.')
          setPayments([])
        } else {
          setPayments(paymentsRes.data || [])
        }

        if (checkinsRes.error) console.error('Check-ins error:', checkinsRes.error)
        setCheckins(checkinsRes.data || [])
      } catch (err) {
        console.error('Member detail load error:', err)
        if (!cancelled) setPageError(err.message || 'Failed to load member.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [authUser, memberId])

  // ── Realtime subscriptions ───────────────────────────────────────────────

  useEffect(() => {
    if (!memberId) return
    let activeCount = 0
    const updateActive = () => setRealtimeActive(activeCount === 2)

    const checkInsChannel = supabase
      .channel(`member-checkins-${memberId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'check_ins',
        filter: `user_id=eq.${memberId}`,
      }, async () => {
        await fetchCheckins(memberIdRef.current)
        setStatBumpKey(k => k + 1)
        setToast('New check-in just now!')
      })
      .subscribe(status => {
        if (status === 'SUBSCRIBED') { activeCount++; updateActive() }
      })

    const paymentsChannel = supabase
      .channel(`member-payments-${memberId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'payments',
        filter: `user_id=eq.${memberId}`,
      }, async () => {
        await fetchPayments(memberIdRef.current)
        setStatBumpKey(k => k + 1)
      })
      .subscribe(status => {
        if (status === 'SUBSCRIBED') { activeCount++; updateActive() }
      })

    return () => {
      supabase.removeChannel(checkInsChannel)
      supabase.removeChannel(paymentsChannel)
    }
  }, [memberId])

  // ── Derived ──────────────────────────────────────────────────────────────

  const status = membership ? effectiveStatus(membership) : 'cancelled'

  const totalVisits = checkins.length
  const visitsThisMonth = useMemo(() => {
    const startOfMonth = new Date(); startOfMonth.setDate(1); startOfMonth.setHours(0,0,0,0)
    return checkins.filter(c => new Date(c.checked_in_at) >= startOfMonth).length
  }, [checkins])
  const totalPaid = useMemo(() =>
    payments.filter(p => p.status === 'paid').reduce((s, p) => s + Number(p.amount || 0), 0)
  , [payments])
  const outstanding = useMemo(() =>
    payments.filter(p => p.status === 'overdue').reduce((s, p) => s + Number(p.amount || 0), 0)
  , [payments])

  // 30-day check-in chart
  const checkinChart = useMemo(() => {
    const buckets = []
    for (let i = 29; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i); d.setHours(0,0,0,0)
      buckets.push({
        iso: d.toISOString().slice(0,10),
        label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        isToday: i === 0,
        count: 0,
      })
    }
    for (const c of checkins) {
      const k = new Date(c.checked_in_at).toISOString().slice(0,10)
      const b = buckets.find(b => b.iso === k)
      if (b) b.count++
    }
    return buckets
  }, [checkins])

  // 7×24 heatmap
  const heatmap = useMemo(() => {
    const grid = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => 0))
    let max = 0
    for (const c of checkins) {
      const d = new Date(c.checked_in_at)
      const day = d.getDay(); const hr = d.getHours()
      grid[day][hr]++
      if (grid[day][hr] > max) max = grid[day][hr]
    }
    return { grid, max }
  }, [checkins])

  const visitWindow = useMemo(() => {
    if (checkins.length < 5) return null
    let morning = 0, evening = 0
    for (const c of checkins) {
      const h = new Date(c.checked_in_at).getHours()
      if (h >= 5 && h < 12) morning++
      else if (h >= 17 && h < 22) evening++
    }
    const total = checkins.length
    if (morning / total > 0.6) return 'Usually visits in the morning'
    if (evening / total > 0.6) return 'Usually visits in the evening'
    return 'Mixed schedule'
  }, [checkins])

  const recentCheckins = checkins.slice(0, 10)

  const expiryCountdown = useMemo(() => {
    const d = daysUntil(membership?.end_date)
    if (d == null) return null
    if (d < 0)  return { text: `Expired ${Math.abs(d)} days ago`, tone: 'text-red-400' }
    if (d === 0) return { text: 'Expires today', tone: 'text-red-400' }
    if (d < 7)   return { text: `Expires in ${d} day${d===1?'':'s'}`, tone: 'text-red-400' }
    if (d <= 30) return { text: `Expires in ${d} days`, tone: 'text-amber-400' }
    return         { text: `Expires in ${d} days`, tone: 'text-emerald-400' }
  }, [membership])

  // ── Actions ──────────────────────────────────────────────────────────────

  function showToast(m) { setToast(m) }
  function clearToast()  { setToast('') }

  async function applyStatus(newStatus, extraPatch = {}) {
    if (!membership) return
    setBusy(true)
    try {
      const { error } = await supabase
        .from('gym_memberships')
        .update({ status: newStatus, ...extraPatch })
        .eq('id', membership.id)
      if (error) throw error
      const fresh = await fetchMembership(memberId)
      setMembership(fresh)
    } catch (err) {
      console.error('Update membership error:', err)
      showToast(err.message || 'Action failed.')
    } finally {
      setBusy(false)
      setConfirm(null)
    }
  }

  function onFreeze() { setConfirm({ kind: 'freeze' }) }
  function onCancel() { setConfirm({ kind: 'cancel' }) }
  function onReactivate() {
    if (!membership) return
    const months = TYPE_MONTHS[membership.membership_type] ?? 1
    const baseDate = new Date()
    baseDate.setMonth(baseDate.getMonth() + months)
    const newEnd = baseDate.toISOString().slice(0, 10)
    setConfirm({ kind: 'reactivate', newEnd })
  }
  function onEditPlaceholder() { showToast('Coming soon') }
  function onRecordPaymentPlaceholder() { showToast('Coming in Day 5') }

  async function handleConfirm() {
    if (!confirm) return
    if (confirm.kind === 'freeze')     return applyStatus('frozen')
    if (confirm.kind === 'cancel')     return applyStatus('cancelled')
    if (confirm.kind === 'reactivate') return applyStatus('active', { end_date: confirm.newEnd })
  }

  async function markPaid(payment) {
    setPaying(payment.id)
    try {
      const { error } = await supabase
        .from('payments')
        .update({ status: 'paid', paid_at: new Date().toISOString() })
        .eq('id', payment.id)
      if (error) throw error
      await fetchPayments(memberId)
      showToast('Payment marked as paid')
    } catch (err) {
      console.error('Mark paid error:', err)
      showToast(err.message || 'Failed to update payment.')
    } finally {
      setPaying(null)
    }
  }

  // ── Edge-case renders ───────────────────────────────────────────────────

  if (forbidden) return <Navigate to="/gym/members" replace />

  if (missing || pageError) {
    return (
      <div className="min-h-screen bg-[#0c0c0e] flex flex-col items-center justify-center px-4">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center mb-4">
          <AlertTriangle size={20} className="text-amber-400" />
        </div>
        <h1 className="text-xl font-semibold text-white mb-1">{missing ? 'Member not found' : 'Couldn’t load this member'}</h1>
        <p className="text-sm text-zinc-500 mb-6 text-center max-w-sm">
          {missing
            ? 'This member doesn’t exist, or the link is wrong.'
            : pageError}
        </p>
        <Link to="/gym/members" className="inline-flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 text-sm font-medium">
          <ArrowLeft size={14} />
          Back to Members
        </Link>
      </div>
    )
  }

  // ── Main render ─────────────────────────────────────────────────────────

  const memberName = member?.full_name ?? 'Member'
  const ac = avatarColor(memberName)
  const idTail = (memberId || '').slice(-4).toUpperCase()

  return (
    <div className="min-h-screen bg-[#0c0c0e] pb-24 overflow-x-hidden">
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[700px] h-[300px] bg-emerald-500/[0.07] blur-[120px] rounded-full pointer-events-none" />

      <div className="relative z-10 max-w-6xl mx-auto px-5 py-8 sm:py-10">
        {/* Back */}
        <Link to="/gym/members" className="inline-flex items-center gap-1.5 text-zinc-500 hover:text-zinc-300 transition-colors text-sm mb-5">
          <ArrowLeft size={14} />
          Back to Members
        </Link>

        {loading ? (
          <LoadingState />
        ) : (
          <>
            {/* ── Header card ─────────────────────────────────────── */}
            <section className="bg-[#141416] border border-white/[0.06] rounded-2xl p-5 sm:p-6 mb-5">
              <div className="flex flex-col lg:flex-row gap-6 justify-between">
                {/* Left */}
                <div className="flex items-start gap-4 min-w-0">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 ${ac.bg}`}>
                    {memberName
                      ? <span className={`text-lg font-bold ${ac.text}`}>{initials(memberName)}</span>
                      : <UserIcon size={24} className={ac.text} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight truncate">{memberName}</h1>
                      <StatusPill status={status} />
                    </div>
                    <p className="text-zinc-400 text-sm mt-1.5 inline-flex items-center gap-1.5">
                      <Phone size={13} className="text-zinc-500" />
                      <span className="tabular-nums">{member?.phone || 'No phone'}</span>
                    </p>
                    <p className="text-xs text-zinc-500 mt-2">
                      Member since {formatDate(membership?.start_date || member?.created_at)} · ID: <span className="font-mono text-zinc-400">#{idTail || '—'}</span>
                    </p>
                  </div>
                </div>

                {/* Right */}
                <div className="flex flex-col gap-2 lg:items-end lg:min-w-[220px]">
                  <div className="flex justify-end mb-1">
                    <LiveIndicator active={realtimeActive} />
                  </div>
                  <div className="grid grid-cols-2 lg:grid-cols-1 gap-2 w-full">
                    {status === 'active' && (
                      <button onClick={onFreeze}
                              className="inline-flex items-center justify-center gap-1.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-white text-xs font-medium px-3.5 py-2 rounded-lg transition-colors">
                        <Pause size={12} />
                        Freeze Membership
                      </button>
                    )}
                    {status !== 'cancelled' && (
                      <button onClick={onCancel}
                              className="inline-flex items-center justify-center gap-1.5 bg-red-500/10 hover:bg-red-500/15 border border-red-500/20 text-red-300 text-xs font-medium px-3.5 py-2 rounded-lg transition-colors">
                        <Ban size={12} />
                        Cancel Membership
                      </button>
                    )}
                    {(status === 'frozen' || status === 'expired') && (
                      <button onClick={onReactivate}
                              className="inline-flex items-center justify-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-semibold px-3.5 py-2 rounded-lg transition-colors">
                        <Play size={12} />
                        Reactivate
                      </button>
                    )}
                    <button onClick={onEditPlaceholder}
                            className="inline-flex items-center justify-center gap-1.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-white text-xs font-medium px-3.5 py-2 rounded-lg transition-colors">
                      <Pencil size={12} />
                      Edit Details
                    </button>
                  </div>
                </div>
              </div>
            </section>

            {/* ── Stats strip ─────────────────────────────────────── */}
            <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5" key={`stats-${statBumpKey}`}>
              <StatChip label="Total Visits" value={inrFormatter.format(totalVisits)} />
              <StatChip label="This Month"   value={inrFormatter.format(visitsThisMonth)} />
              <StatChip label="Total Paid"   value={formatINR(totalPaid)} sub={`${payments.filter(p=>p.status==='paid').length} payments`} />
              <StatChip label="Outstanding"  value={outstanding > 0 ? formatINR(outstanding) : '₹0'}
                        tone={outstanding > 0 ? 'warn' : null}
                        sub={(() => {
                          const n = payments.filter(p=>p.status==='overdue').length
                          return n > 0 ? `${n} overdue` : 'All caught up'
                        })()} />
            </section>

            {/* ── Two-column body ─────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Left: Membership + Payments */}
              <div className="space-y-5">
                <CardSection title="Membership Details">
                  {membership ? (
                    <div>
                      <Field label="Type"        value={TYPE_LABELS[membership.membership_type] ?? membership.membership_type ?? '—'} />
                      <Field label="Monthly fee" value={membership.monthly_fee != null ? `${formatINR(membership.monthly_fee)}/mo` : '—'} />
                      <Field label="Start date"  value={formatDate(membership.start_date)} />
                      <Field label="End date"    value={
                        <span>
                          {formatDate(membership.end_date)}
                          {expiryCountdown && (
                            <span className={`ml-2 text-[11px] ${expiryCountdown.tone}`}>· {expiryCountdown.text}</span>
                          )}
                        </span>
                      } />
                      <div className="flex items-baseline justify-between gap-3 py-2 border-b border-white/[0.04] last:border-b-0">
                        <span className="text-xs text-zinc-500 flex-shrink-0">Trainer</span>
                        <div className="flex items-center gap-2">
                          <select
                            value={selectedTrainerId}
                            onChange={e => { setSelectedTrainerId(e.target.value); setAssignMsg('') }}
                            className="bg-[#1c1c1f] border border-white/[0.08] rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-emerald-500/60 max-w-[140px]"
                          >
                            <option value="">Not assigned</option>
                            {gymTrainers.map(t => (
                              <option key={t.user_id} value={t.user_id}>{t.full_name}</option>
                            ))}
                          </select>
                          <button
                            onClick={async () => {
                              setAssignBusy(true); setAssignMsg('')
                              try {
                                await assignTrainer(memberId, selectedTrainerId || null)
                                setMembership(m => ({ ...m, assigned_trainer_id: selectedTrainerId || null }))
                                setAssignMsg('Saved')
                                setTimeout(() => setAssignMsg(''), 2000)
                              } catch {
                                setAssignMsg('Error')
                              } finally {
                                setAssignBusy(false)
                              }
                            }}
                            disabled={assignBusy}
                            className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 disabled:opacity-40 transition-colors flex-shrink-0"
                          >
                            {assignBusy ? <Loader2 size={12} className="animate-spin" /> : assignMsg || 'Save'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-zinc-500 py-6 text-center">No membership record.</p>
                  )}
                </CardSection>

                <CardSection
                  title="Payment History"
                  action={
                    <button onClick={onRecordPaymentPlaceholder}
                            className="inline-flex items-center gap-1 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-zinc-300 text-[11px] font-medium px-2.5 py-1 rounded-full transition-colors">
                      <Plus size={11} />
                      Record Payment
                    </button>
                  }
                >
                  {paymentsError ? (
                    <div className="px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                      {paymentsError}
                    </div>
                  ) : payments.length === 0 ? (
                    <p className="text-sm text-zinc-500 py-6 text-center">No payments recorded yet</p>
                  ) : (
                    <div className="-mx-1 max-h-[360px] overflow-y-auto pr-1">
                      {payments.map(p => (
                        <div key={p.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/[0.02] transition-colors">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-semibold text-white tabular-nums">{formatINR(p.amount)}</span>
                              <PaymentPill status={p.status} />
                            </div>
                            <p className="text-[11px] text-zinc-500 mt-0.5 tabular-nums">
                              {p.status === 'paid' && p.paid_at
                                ? <>Paid {formatDate(p.paid_at)}</>
                                : <>Due {formatDate(p.due_date)}</>}
                              {p.method && <> · {p.method}</>}
                            </p>
                          </div>
                          {p.status === 'overdue' && (
                            <button onClick={() => markPaid(p)} disabled={paying === p.id}
                                    className="inline-flex items-center gap-1 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-white text-[11px] font-semibold px-2.5 py-1 rounded-full transition-colors">
                              {paying === p.id ? <Loader2 size={11} className="animate-spin" /> : <BadgeCheck size={11} />}
                              Mark as Paid
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardSection>
              </div>

              {/* Right: Activity + Heatmap + Recent */}
              <div className="space-y-5">
                <CardSection title="Check-ins — Last 30 days">
                  {checkins.length === 0 ? (
                    <p className="text-sm text-zinc-500 py-12 text-center">No check-ins yet</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={checkinChart} margin={{ top: 4, right: 8, left: -28, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0d" vertical={false} />
                        <XAxis
                          dataKey="label"
                          tick={{ fill: '#71717a', fontSize: 9 }}
                          axisLine={false}
                          tickLine={false}
                          interval={Math.floor(checkinChart.length / 6)}
                        />
                        <YAxis allowDecimals={false} tick={{ fill: '#71717a', fontSize: 10 }} axisLine={false} tickLine={false} />
                        <Tooltip cursor={{ fill: '#ffffff08' }} content={<ChartTooltip />} />
                        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                          {checkinChart.map((b, i) => (
                            <Cell key={i} fill={b.isToday ? '#10b981' : '#10b98180'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardSection>

                <CardSection title="Attendance Pattern">
                  {checkins.length < 3 ? (
                    <p className="text-sm text-zinc-500 py-12 text-center">Not enough data yet</p>
                  ) : (
                    <div>
                      <div className="overflow-x-auto -mx-1">
                        <div className="inline-flex flex-col gap-1.5 px-1 min-w-full">
                          {/* Hour labels */}
                          <div className="flex items-center gap-1 pl-7 sticky top-0">
                            {Array.from({ length: 24 }).map((_, h) => (
                              <div key={h} className="w-3.5 text-center">
                                {h % 6 === 0 && (
                                  <span className="text-[8px] text-zinc-600 tabular-nums">{h}</span>
                                )}
                              </div>
                            ))}
                          </div>
                          {/* Grid */}
                          {heatmap.grid.map((row, day) => (
                            <div key={day} className="flex items-center gap-1">
                              <span className="text-[9px] text-zinc-500 w-6 text-right pr-1">{DAY_LABELS[day]}</span>
                              {row.map((count, hr) => {
                                const intensity = heatmap.max > 0 ? count / heatmap.max : 0
                                const opacity = count === 0 ? 0.04 : 0.18 + intensity * 0.82
                                return (
                                  <div
                                    key={hr}
                                    onMouseEnter={() => setHoveredCell({ day, hr, count })}
                                    onMouseLeave={() => setHoveredCell(null)}
                                    className="w-3.5 h-3.5 rounded-[3px] transition-all duration-200 cursor-default"
                                    style={{ backgroundColor: `rgba(16, 185, 129, ${opacity})` }}
                                    title={`${FULL_DAY_LABELS[day]} at ${hr % 12 || 12}${hr < 12 ? 'am' : 'pm'}: ${count} check-in${count === 1 ? '' : 's'}`}
                                  />
                                )
                              })}
                            </div>
                          ))}
                        </div>
                      </div>

                      {hoveredCell && (
                        <p className="text-[11px] text-zinc-400 mt-3 tabular-nums">
                          {FULL_DAY_LABELS[hoveredCell.day]} at {hoveredCell.hr % 12 || 12}{hoveredCell.hr < 12 ? 'am' : 'pm'}: <span className="text-emerald-400 font-semibold">{hoveredCell.count}</span> check-in{hoveredCell.count === 1 ? '' : 's'}
                        </p>
                      )}
                      {!hoveredCell && visitWindow && (
                        <p className="text-[11px] text-zinc-400 mt-3">{visitWindow}</p>
                      )}
                    </div>
                  )}
                </CardSection>

                <CardSection title="Recent Check-ins">
                  {recentCheckins.length === 0 ? (
                    <p className="text-sm text-zinc-500 py-8 text-center">No recent check-ins</p>
                  ) : (
                    <div className="-mx-1">
                      {recentCheckins.map(c => {
                        const inGym = !c.checked_out_at
                        const duration = c.checked_out_at
                          ? formatDuration(new Date(c.checked_out_at) - new Date(c.checked_in_at))
                          : ''
                        const liveDuration = inGym ? formatDuration(now - new Date(c.checked_in_at).getTime()) : ''
                        return (
                          <div key={c.id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/[0.02] transition-colors">
                            <div className="w-7 h-7 rounded-lg bg-sky-500/10 flex items-center justify-center flex-shrink-0">
                              <Clock size={12} className="text-sky-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-white tabular-nums">
                                {formatWeekday(c.checked_in_at)} · {formatTime(c.checked_in_at)}
                                {duration && <span className="text-zinc-500"> · {duration}</span>}
                              </p>
                              {inGym && (
                                <p className="text-[11px] text-emerald-400 mt-0.5">
                                  Currently in gym 🟢 <span className="text-zinc-500 ml-1">{liveDuration}</span>
                                </p>
                              )}
                            </div>
                            <span className="text-[10px] text-zinc-500 uppercase tracking-wide">{c.method || 'manual'}</span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </CardSection>
              </div>
            </div>
          </>
        )}
      </div>

      <Toast toast={toast} onClose={clearToast} />

      <ConfirmDialog
        open={!!confirm}
        title={
          confirm?.kind === 'freeze'     ? 'Freeze this membership?'
        : confirm?.kind === 'cancel'     ? 'Cancel this membership?'
        : confirm?.kind === 'reactivate' ? 'Reactivate this member?'
        : ''
        }
        body={
          confirm?.kind === 'freeze'     ? 'They won’t be marked active until you unfreeze.'
        : confirm?.kind === 'cancel'     ? 'This is permanent. The member will be marked cancelled.'
        : confirm?.kind === 'reactivate' ? `New end date will be ${confirm?.newEnd ? formatDate(confirm.newEnd) : '—'}.`
        : ''
        }
        confirmLabel={
          confirm?.kind === 'freeze'     ? 'Freeze'
        : confirm?.kind === 'cancel'     ? 'Cancel membership'
        : confirm?.kind === 'reactivate' ? 'Reactivate'
        : ''
        }
        danger={confirm?.kind === 'cancel'}
        onConfirm={handleConfirm}
        onCancel={() => !busy && setConfirm(null)}
        busy={busy}
      />

      <GymOwnerNav />
    </div>
  )
}

// ── Loading skeleton ────────────────────────────────────────────────────────

function Pulse({ className }) {
  return <div className={`bg-white/[0.05] rounded-lg animate-pulse ${className}`} />
}

function LoadingState() {
  return (
    <>
      <div className="bg-[#141416] border border-white/[0.06] rounded-2xl p-5 sm:p-6 mb-5">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-2xl bg-white/[0.05] animate-pulse" />
          <div className="flex-1 space-y-2.5">
            <Pulse className="h-6 w-1/2" />
            <Pulse className="h-3 w-1/3" />
            <Pulse className="h-3 w-1/4" />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-[#141416] border border-white/[0.06] rounded-xl p-3.5 space-y-2">
            <Pulse className="h-2 w-1/3" />
            <Pulse className="h-6 w-1/2" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-[#141416] border border-white/[0.06] rounded-2xl p-5 h-44 space-y-3">
            <Pulse className="h-2 w-1/3" />
            <Pulse className="h-3 w-2/3" />
            <Pulse className="h-3 w-1/2" />
            <Pulse className="h-3 w-3/4" />
          </div>
        ))}
      </div>
    </>
  )
}
