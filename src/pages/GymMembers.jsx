import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search, Users as UsersIcon, UserPlus, Filter, MoreVertical, Eye,
  Pause, Ban, ChevronLeft, ChevronRight, Copy, Check, X, AlertTriangle,
  Loader2, User as UserIcon,
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../utils/supabase'
import GymOwnerNav from '../components/GymOwnerNav'
import AddMemberModal from '../components/AddMemberModal'

// ── Constants ───────────────────────────────────────────────────────────────

const PAGE_SIZE = 25

const STATUS_OPTIONS = [
  { value: 'all',       label: 'All' },
  { value: 'active',    label: 'Active' },
  { value: 'frozen',    label: 'Frozen' },
  { value: 'expired',   label: 'Expired' },
  { value: 'cancelled', label: 'Cancelled' },
]

const TYPE_OPTIONS = [
  { value: 'all',         label: 'All types' },
  { value: 'monthly',     label: 'Monthly' },
  { value: 'quarterly',   label: 'Quarterly' },
  { value: 'half_yearly', label: 'Half-yearly' },
  { value: 'annual',      label: 'Annual' },
]

const TYPE_LABELS = {
  monthly:     'Monthly',
  quarterly:   'Quarterly',
  half_yearly: 'Half-yearly',
  annual:      'Annual',
}

const STATUS_STYLES = {
  active:    { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400', label: 'Active'    },
  frozen:    { bg: 'bg-sky-500/10',     border: 'border-sky-500/30',     text: 'text-sky-400',     label: 'Frozen'    },
  expired:   { bg: 'bg-amber-500/10',   border: 'border-amber-500/30',   text: 'text-amber-400',   label: 'Expired'   },
  cancelled: { bg: 'bg-red-500/10',     border: 'border-red-500/30',    text: 'text-red-400',     label: 'Cancelled' },
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

// ── Formatting helpers ─────────────────────────────────────────────────────

const inrFormatter = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 })
function formatINR(v) { return `₹${inrFormatter.format(Math.round(v || 0))}` }

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

function relativeTime(iso) {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const day  = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (day < 1)   return 'today'
  if (day < 7)   return `${day} day${day === 1 ? '' : 's'} ago`
  if (day < 30)  {
    const w = Math.floor(day / 7)
    return `${w} week${w === 1 ? '' : 's'} ago`
  }
  if (day < 365) {
    const m = Math.floor(day / 30)
    return `${m} month${m === 1 ? '' : 's'} ago`
  }
  const y = Math.floor(day / 365)
  return `${y} year${y === 1 ? '' : 's'} ago`
}

// Effective status: 'expired' if end_date < today regardless of stored value (only if status was 'active')
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

function avatarColor(name) {
  const s = (name || '?').toString()
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return AVATAR_PALETTE[h % AVATAR_PALETTE.length]
}

function initials(name) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/).slice(0, 2)
  return parts.map(p => p[0]?.toUpperCase()).join('')
}

// ── Small UI helpers ───────────────────────────────────────────────────────

function Avatar({ name }) {
  const c = avatarColor(name)
  return (
    <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${c.bg}`}>
      {name
        ? <span className={`text-[11px] font-semibold ${c.text}`}>{initials(name)}</span>
        : <UserIcon size={14} className={c.text} />}
    </div>
  )
}

function StatusPill({ status }) {
  const s = STATUS_STYLES[status] ?? STATUS_STYLES.active
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${s.bg} ${s.border} ${s.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.text.replace('text-', 'bg-')}`} />
      {s.label}
    </span>
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
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[60] animate-[fadeIn_180ms_ease-out]">
      <div className="bg-[#1a1a1d] border border-white/10 rounded-xl px-4 py-3 shadow-2xl flex items-center gap-3 min-w-[260px]">
        <div className="w-7 h-7 rounded-lg bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
          <Check size={14} className="text-emerald-400" />
        </div>
        <p className="text-sm text-white flex-1">{toast}</p>
        <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300">
          <X size={14} />
        </button>
      </div>
    </div>
  )
}

function ConfirmDialog({ open, title, body, confirmLabel, danger, onConfirm, onCancel, busy }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center p-4 bg-black/70" onClick={onCancel}>
      <div
        className="bg-[#141416] border border-white/[0.08] rounded-2xl p-6 max-w-sm w-full shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 mb-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${danger ? 'bg-red-500/10' : 'bg-amber-500/10'}`}>
            <AlertTriangle size={18} className={danger ? 'text-red-400' : 'text-amber-400'} />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">{title}</h3>
            <p className="text-sm text-zinc-400 mt-1 leading-relaxed">{body}</p>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button
            onClick={onCancel}
            disabled={busy}
            className="px-4 py-2 rounded-xl text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/[0.04] disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            className={`px-4 py-2 rounded-xl text-sm font-semibold text-white inline-flex items-center gap-1.5 disabled:opacity-50 transition-colors ${
              danger
                ? 'bg-red-500 hover:bg-red-400'
                : 'bg-emerald-500 hover:bg-emerald-400'
            }`}
          >
            {busy && <Loader2 size={13} className="animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

function KebabMenu({ open, onOpen, onClose, onView, onFreeze, onCancel, status }) {
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose()
    }
    function handleEsc(e) { if (e.key === 'Escape') onClose() }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown',   handleEsc)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown',   handleEsc)
    }
  }, [open, onClose])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={(e) => { e.stopPropagation(); open ? onClose() : onOpen() }}
        className="w-8 h-8 rounded-lg hover:bg-white/[0.06] text-zinc-500 hover:text-white flex items-center justify-center transition-colors"
        aria-label="Actions"
      >
        <MoreVertical size={15} />
      </button>
      {open && (
        <div
          onClick={e => e.stopPropagation()}
          className="absolute right-0 top-9 z-30 min-w-[160px] bg-[#1a1a1d] border border-white/[0.08] rounded-xl shadow-2xl overflow-hidden py-1"
        >
          <MenuItem icon={Eye} label="View" onClick={onView} />
          {status !== 'frozen' && status !== 'cancelled' && (
            <MenuItem icon={Pause} label="Freeze" onClick={onFreeze} />
          )}
          {status !== 'cancelled' && (
            <MenuItem icon={Ban} label="Cancel" onClick={onCancel} danger />
          )}
        </div>
      )}
    </div>
  )
}

function MenuItem({ icon: Icon, label, onClick, danger }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
        danger
          ? 'text-red-400 hover:bg-red-500/10'
          : 'text-zinc-300 hover:bg-white/[0.04] hover:text-white'
      }`}
    >
      <Icon size={13} />
      {label}
    </button>
  )
}

// Stats card / quick filter chip
function StatChip({ label, value, active, tone, onClick }) {
  const toneClass = tone === 'emerald' ? 'text-emerald-400'
                  : tone === 'sky'     ? 'text-sky-400'
                  : tone === 'amber'   ? 'text-amber-400'
                  : 'text-white'
  return (
    <button
      onClick={onClick}
      className={`text-left bg-[#141416] border rounded-xl p-3.5 transition-all duration-150 ${
        active
          ? 'border-emerald-500/40 ring-1 ring-emerald-500/20'
          : 'border-white/[0.06] hover:border-white/[0.14]'
      }`}
    >
      <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-1.5">{label}</p>
      <p className={`text-xl font-bold tabular-nums ${toneClass}`}>{value}</p>
    </button>
  )
}

function SkeletonRow() {
  return (
    <tr className="border-b border-white/[0.04]">
      {Array.from({ length: 8 }).map((_, i) => (
        <td key={i} className="py-3.5 px-4">
          <div className="h-3 bg-white/[0.05] rounded animate-pulse" style={{ width: `${50 + (i * 7) % 40}%` }} />
        </td>
      ))}
    </tr>
  )
}

function SkeletonCard() {
  return (
    <div className="bg-[#141416] border border-white/[0.06] rounded-2xl p-4 space-y-2.5">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-white/[0.05] animate-pulse" />
        <div className="flex-1 space-y-2">
          <div className="h-3 bg-white/[0.05] rounded animate-pulse w-1/2" />
          <div className="h-2.5 bg-white/[0.04] rounded animate-pulse w-1/3" />
        </div>
      </div>
      <div className="h-2.5 bg-white/[0.04] rounded animate-pulse w-2/3" />
    </div>
  )
}

// ── Main page ───────────────────────────────────────────────────────────────

export default function GymMembers() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [gym, setGym]               = useState(null)
  const [members, setMembers]       = useState([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState('')
  const [toast, setToast]           = useState('')
  const [copied, setCopied]         = useState(false)

  // Filters
  const [searchInput, setSearchInput]     = useState('')
  const [searchTerm, setSearchTerm]       = useState('')
  const [statusFilter, setStatusFilter]   = useState('all')
  const [typeFilter, setTypeFilter]       = useState('all')
  const [page, setPage]                   = useState(1)
  const [openMenuId, setOpenMenuId]       = useState(null)

  // Pending action
  const [confirm, setConfirm]   = useState(null) // { kind, member }
  const [busy, setBusy]         = useState(false)

  // Add Member modal
  const [addOpen, setAddOpen]   = useState(false)

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setSearchTerm(searchInput.trim().toLowerCase()), 300)
    return () => clearTimeout(t)
  }, [searchInput])

  // Reset page when filters/search change
  useEffect(() => { setPage(1) }, [searchTerm, statusFilter, typeFilter])

  // Fetch gym + members
  async function load() {
    if (!user) return
    setLoading(true)
    setError('')
    try {
      const { data: gymRow, error: gymErr } = await supabase
        .from('gyms')
        .select('id, name, join_code')
        .eq('owner_id', user.id)
        .maybeSingle()
      if (gymErr) throw gymErr
      if (!gymRow) {
        setError('No gym found for this owner.')
        setLoading(false)
        return
      }
      setGym(gymRow)

      // Try with explicit FK alias first; fall back if it errors
      let { data: rows, error: memErr } = await supabase
        .from('gym_memberships')
        .select(`
          id, membership_type, monthly_fee, start_date, end_date, status,
          assigned_trainer_id, created_at, user_id,
          users!gym_memberships_user_id_fkey ( id, full_name, phone, is_active )
        `)
        .eq('gym_id', gymRow.id)
        .order('start_date', { ascending: false })

      if (memErr) {
        console.warn('FK-aliased join failed, retrying with implicit relationship:', memErr.message)
        const retry = await supabase
          .from('gym_memberships')
          .select(`
            id, membership_type, monthly_fee, start_date, end_date, status,
            assigned_trainer_id, created_at, user_id,
            users ( id, full_name, phone, is_active )
          `)
          .eq('gym_id', gymRow.id)
          .order('start_date', { ascending: false })
        if (retry.error) throw retry.error
        rows = retry.data
      }

      setMembers(rows ?? [])
    } catch (err) {
      console.error('Load members error:', err)
      setError(err.message || 'Failed to load members.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [user])

  // ── Derived data ──────────────────────────────────────────────────────────

  const counts = useMemo(() => {
    const c = { total: members.length, active: 0, frozen: 0, expired: 0, cancelled: 0 }
    for (const m of members) {
      const s = effectiveStatus(m)
      c[s] = (c[s] || 0) + 1
    }
    return c
  }, [members])

  const filtered = useMemo(() => {
    return members.filter(m => {
      const s = effectiveStatus(m)
      if (statusFilter !== 'all' && s !== statusFilter) return false
      if (typeFilter !== 'all' && m.membership_type !== typeFilter) return false
      if (searchTerm) {
        const name  = (m.users?.full_name || '').toLowerCase()
        const phone = (m.users?.phone     || '').toLowerCase()
        if (!name.includes(searchTerm) && !phone.includes(searchTerm)) return false
      }
      return true
    })
  }, [members, statusFilter, typeFilter, searchTerm])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage   = Math.min(page, totalPages)
  const pageStart  = (safePage - 1) * PAGE_SIZE
  const pageRows   = filtered.slice(pageStart, pageStart + PAGE_SIZE)

  // ── Actions ───────────────────────────────────────────────────────────────

  function showToast(msg) { setToast(msg) }
  function clearToast()    { setToast('') }

  function onAddMemberClick() {
    setAddOpen(true)
  }

  async function onMemberAdded(name) {
    showToast(`${name || 'Member'} added to your gym`)
    await load()
  }

  function onView(member) {
    setOpenMenuId(null)
    if (member?.user_id) navigate(`/gym/members/${member.user_id}`)
  }

  function onRowClick(member) {
    if (member?.user_id) navigate(`/gym/members/${member.user_id}`)
  }

  function onFreezeStart(member) {
    setOpenMenuId(null)
    setConfirm({ kind: 'freeze', member })
  }
  function onCancelStart(member) {
    setOpenMenuId(null)
    setConfirm({ kind: 'cancel', member })
  }

  async function onConfirmAction() {
    if (!confirm) return
    const { kind, member } = confirm
    const newStatus = kind === 'freeze' ? 'frozen' : 'cancelled'
    setBusy(true)
    try {
      const { error: upErr } = await supabase
        .from('gym_memberships')
        .update({ status: newStatus })
        .eq('id', member.id)
      if (upErr) throw upErr
      setConfirm(null)
      showToast(kind === 'freeze' ? 'Member frozen' : 'Membership cancelled')
      await load()
    } catch (err) {
      console.error('Update membership error:', err)
      showToast(err.message || 'Action failed. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  async function handleCopyJoinCode() {
    if (!gym?.join_code) return
    try {
      await navigator.clipboard.writeText(gym.join_code.toUpperCase())
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Clipboard error:', err)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const showZeroEmpty = !loading && !error && members.length === 0

  return (
    <div className="min-h-screen bg-[#0c0c0e] pb-24 overflow-x-hidden">
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[700px] h-[300px] bg-emerald-500/[0.07] blur-[120px] rounded-full pointer-events-none" />

      <div className="relative z-10 max-w-6xl mx-auto px-5 py-10 sm:py-12">
        {/* Header */}
        <header className="flex items-center justify-between gap-4 mb-7">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Members</h1>
            <p className="text-zinc-500 text-sm mt-0.5">
              {loading ? 'Loading…' : `${counts.total} ${counts.total === 1 ? 'member' : 'members'} in ${gym?.name ?? 'your gym'}`}
            </p>
          </div>
          <button
            onClick={onAddMemberClick}
            className="inline-flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold text-sm px-4 py-2.5 rounded-xl transition-all duration-200 shadow-lg shadow-emerald-500/20 active:scale-[0.98]"
          >
            <UserPlus size={14} />
            <span className="hidden sm:inline">Add Member</span>
            <span className="sm:hidden">Add</span>
          </button>
        </header>

        {error && (
          <div className="mb-5 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* ── Empty state for brand-new gym ────────────────────────── */}
        {showZeroEmpty ? (
          <div className="bg-[#141416] border border-white/[0.06] rounded-2xl p-8 sm:p-12 text-center mt-2">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-5">
              <UsersIcon size={26} className="text-emerald-400" />
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight mb-2">No members yet</h2>
            <p className="text-zinc-400 text-sm max-w-md mx-auto mb-7">
              Share your join code with members, or add them manually.
            </p>

            {gym?.join_code && (
              <div className="bg-white/[0.03] border border-emerald-500/20 rounded-2xl p-6 max-w-sm mx-auto mb-7">
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-2.5">Your gym join code</p>
                <p className="text-3xl sm:text-4xl font-bold text-emerald-400 font-mono tracking-[0.3em] mb-4">
                  {gym.join_code.toUpperCase()}
                </p>
                <button
                  onClick={handleCopyJoinCode}
                  className="inline-flex items-center gap-1.5 bg-white/[0.06] hover:bg-white/[0.12] text-white text-xs font-medium px-3.5 py-2 rounded-lg transition-colors"
                >
                  {copied
                    ? <><Check size={12} className="text-emerald-400" /> Copied!</>
                    : <><Copy size={12} /> Copy code</>}
                </button>
              </div>
            )}

            <button
              onClick={onAddMemberClick}
              className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold text-sm px-6 py-3 rounded-xl transition-all duration-200 shadow-lg shadow-emerald-500/20"
            >
              <UserPlus size={14} />
              Add Manually
            </button>
          </div>
        ) : (
          <>
            {/* ── Stats strip / quick filters ──────────────────────── */}
            <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
              <StatChip
                label="Total Members"
                value={loading ? '—' : inrFormatter.format(counts.total)}
                active={statusFilter === 'all'}
                onClick={() => setStatusFilter('all')}
              />
              <StatChip
                label="Active"
                tone="emerald"
                value={loading ? '—' : inrFormatter.format(counts.active || 0)}
                active={statusFilter === 'active'}
                onClick={() => setStatusFilter('active')}
              />
              <StatChip
                label="Frozen"
                tone="sky"
                value={loading ? '—' : inrFormatter.format(counts.frozen || 0)}
                active={statusFilter === 'frozen'}
                onClick={() => setStatusFilter('frozen')}
              />
              <StatChip
                label="Expired"
                tone="amber"
                value={loading ? '—' : inrFormatter.format((counts.expired || 0) + (counts.cancelled || 0))}
                active={statusFilter === 'expired' || statusFilter === 'cancelled'}
                onClick={() => setStatusFilter('expired')}
              />
            </section>

            {/* ── Search + filters bar ─────────────────────────────── */}
            <section className="bg-[#141416] border border-white/[0.06] rounded-2xl p-3 sm:p-4 mb-4 flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
                  placeholder="Search by name or phone..."
                  className="w-full bg-[#1c1c1f] border border-white/[0.08] rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30 transition-all"
                />
              </div>
              <div className="flex gap-2.5">
                <div className="relative flex-1 sm:flex-initial">
                  <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                    className="appearance-none w-full bg-[#1c1c1f] border border-white/[0.08] rounded-xl pl-3 pr-8 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30 transition-all cursor-pointer"
                  >
                    {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <Filter size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
                </div>
                <div className="relative flex-1 sm:flex-initial">
                  <select
                    value={typeFilter}
                    onChange={e => setTypeFilter(e.target.value)}
                    className="appearance-none w-full bg-[#1c1c1f] border border-white/[0.08] rounded-xl pl-3 pr-8 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30 transition-all cursor-pointer"
                  >
                    {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <Filter size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
                </div>
              </div>
            </section>

            {/* ── Table (desktop) / Cards (mobile) ─────────────────── */}
            <section className="bg-[#141416] border border-white/[0.06] rounded-2xl overflow-hidden">
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.06] text-left">
                      <th className="py-3 px-4 text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">Member</th>
                      <th className="py-3 px-4 text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">Phone</th>
                      <th className="py-3 px-4 text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">Type</th>
                      <th className="py-3 px-4 text-[10px] font-semibold text-zinc-500 uppercase tracking-widest text-right">Fee</th>
                      <th className="py-3 px-4 text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">Status</th>
                      <th className="py-3 px-4 text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">Joined</th>
                      <th className="py-3 px-4 text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">End date</th>
                      <th className="py-3 px-4 w-12" />
                    </tr>
                  </thead>
                  <tbody>
                    {loading
                      ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
                      : pageRows.length === 0
                        ? (
                          <tr>
                            <td colSpan={8} className="py-14 text-center">
                              <p className="text-zinc-300 text-sm font-medium mb-1">No matches</p>
                              <p className="text-zinc-500 text-xs">Try clearing search or filters.</p>
                            </td>
                          </tr>
                        )
                        : pageRows.map(m => {
                            const s = effectiveStatus(m)
                            return (
                              <tr
                                key={m.id}
                                onClick={() => onRowClick(m)}
                                className="border-b border-white/[0.04] last:border-b-0 hover:bg-white/[0.02] cursor-pointer transition-colors"
                              >
                                <td className="py-3 px-4">
                                  <div className="flex items-center gap-2.5">
                                    <Avatar name={m.users?.full_name} />
                                    <div className="min-w-0">
                                      <p className="text-sm font-medium text-white truncate">{m.users?.full_name ?? '—'}</p>
                                    </div>
                                  </div>
                                </td>
                                <td className="py-3 px-4 text-zinc-400 tabular-nums">{m.users?.phone || '—'}</td>
                                <td className="py-3 px-4 text-zinc-300">{TYPE_LABELS[m.membership_type] ?? m.membership_type ?? '—'}</td>
                                <td className="py-3 px-4 text-zinc-200 tabular-nums text-right">
                                  {m.monthly_fee != null ? <>{formatINR(m.monthly_fee)}<span className="text-zinc-600">/mo</span></> : '—'}
                                </td>
                                <td className="py-3 px-4"><StatusPill status={s} /></td>
                                <td className="py-3 px-4 text-zinc-400">{relativeTime(m.start_date)}</td>
                                <td className="py-3 px-4 text-zinc-400 tabular-nums">{formatDate(m.end_date)}</td>
                                <td className="py-3 px-4 text-right" onClick={e => e.stopPropagation()}>
                                  <KebabMenu
                                    open={openMenuId === m.id}
                                    onOpen={() => setOpenMenuId(m.id)}
                                    onClose={() => setOpenMenuId(null)}
                                    onView={() => onView(m)}
                                    onFreeze={() => onFreezeStart(m)}
                                    onCancel={() => onCancelStart(m)}
                                    status={s}
                                  />
                                </td>
                              </tr>
                            )
                          })}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden divide-y divide-white/[0.04]">
                {loading
                  ? <div className="p-3 space-y-3">{Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}</div>
                  : pageRows.length === 0
                    ? <div className="py-14 px-4 text-center">
                        <p className="text-zinc-300 text-sm font-medium mb-1">No matches</p>
                        <p className="text-zinc-500 text-xs">Try clearing search or filters.</p>
                      </div>
                    : pageRows.map(m => {
                        const s = effectiveStatus(m)
                        return (
                          <div
                            key={m.id}
                            onClick={() => onRowClick(m)}
                            className="px-4 py-3.5 hover:bg-white/[0.02] active:bg-white/[0.03] transition-colors cursor-pointer"
                          >
                            <div className="flex items-start gap-3">
                              <Avatar name={m.users?.full_name} />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <p className="text-sm font-semibold text-white truncate">{m.users?.full_name ?? '—'}</p>
                                  <div onClick={e => e.stopPropagation()} className="-mr-2 -mt-1">
                                    <KebabMenu
                                      open={openMenuId === m.id}
                                      onOpen={() => setOpenMenuId(m.id)}
                                      onClose={() => setOpenMenuId(null)}
                                      onView={() => onView(m)}
                                      onFreeze={() => onFreezeStart(m)}
                                      onCancel={() => onCancelStart(m)}
                                      status={s}
                                    />
                                  </div>
                                </div>
                                <p className="text-xs text-zinc-500 tabular-nums mt-0.5">{m.users?.phone || '—'}</p>
                                <div className="flex items-center gap-2 flex-wrap mt-2">
                                  <StatusPill status={s} />
                                  <span className="text-[11px] text-zinc-500">{TYPE_LABELS[m.membership_type] ?? '—'}</span>
                                  <span className="text-[11px] text-zinc-300 tabular-nums">
                                    {m.monthly_fee != null ? `${formatINR(m.monthly_fee)}/mo` : ''}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between mt-2 text-[11px] text-zinc-500 tabular-nums">
                                  <span>Joined {relativeTime(m.start_date)}</span>
                                  <span>Ends {formatDate(m.end_date)}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
              </div>

              {/* Pagination */}
              {!loading && filtered.length > PAGE_SIZE && (
                <div className="flex items-center justify-between gap-3 border-t border-white/[0.06] px-4 py-3">
                  <p className="text-xs text-zinc-500 tabular-nums">
                    Showing <span className="text-zinc-300">{pageStart + 1}–{Math.min(pageStart + PAGE_SIZE, filtered.length)}</span> of <span className="text-zinc-300">{filtered.length}</span>
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={safePage <= 1}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-300 hover:bg-white/[0.04] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft size={13} />
                      Previous
                    </button>
                    <span className="text-xs text-zinc-500 tabular-nums">{safePage} / {totalPages}</span>
                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={safePage >= totalPages}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-300 hover:bg-white/[0.04] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      Next
                      <ChevronRight size={13} />
                    </button>
                  </div>
                </div>
              )}
            </section>
          </>
        )}
      </div>

      <Toast toast={toast} onClose={clearToast} />

      <ConfirmDialog
        open={!!confirm}
        title={confirm?.kind === 'freeze' ? 'Freeze this member?' : 'Cancel this membership?'}
        body={confirm?.kind === 'freeze'
          ? 'They won’t be marked active until you unfreeze.'
          : 'This is permanent. The member will be marked cancelled.'}
        confirmLabel={confirm?.kind === 'freeze' ? 'Freeze member' : 'Cancel membership'}
        danger={confirm?.kind === 'cancel'}
        onConfirm={onConfirmAction}
        onCancel={() => !busy && setConfirm(null)}
        busy={busy}
      />

      <AddMemberModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        gymId={gym?.id}
        gymName={gym?.name}
        joinCode={gym?.join_code}
        onAdded={onMemberAdded}
      />

      <GymOwnerNav />
    </div>
  )
}
