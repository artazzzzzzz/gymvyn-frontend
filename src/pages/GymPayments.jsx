import { useEffect, useMemo, useState } from 'react'
import {
  Wallet, AlertTriangle, CheckCircle2, Clock, Plus, X, Loader2, Check,
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../utils/supabase'
import { getGymPayments, markPaymentPaid, recordPayment } from '../utils/api'
import GymOwnerNav from '../components/GymOwnerNav'

// ── Helpers ──────────────────────────────────────────────────────────────────

const inrFormatter = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 })
function formatINR(v) { return `₹${inrFormatter.format(Math.round(v || 0))}` }

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

function isThisMonth(iso) {
  if (!iso) return false
  const d = new Date(iso)
  const now = new Date()
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
}

const STATUS_TABS = [
  { key: 'all',     label: 'All'     },
  { key: 'pending', label: 'Pending' },
  { key: 'paid',    label: 'Paid'    },
  { key: 'overdue', label: 'Overdue' },
]

const STATUS_STYLES = {
  paid:    { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400', label: 'Paid'    },
  pending: { bg: 'bg-amber-500/10',   border: 'border-amber-500/30',   text: 'text-amber-400',   label: 'Pending' },
  overdue: { bg: 'bg-red-500/10',     border: 'border-red-500/30',     text: 'text-red-400',     label: 'Overdue' },
}

function StatusPill({ status }) {
  const s = STATUS_STYLES[status] ?? STATUS_STYLES.pending
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${s.bg} ${s.border} ${s.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.text.replace('text-', 'bg-')}`} />
      {s.label}
    </span>
  )
}

function StatCard({ label, value, icon: Icon, iconBg, iconColor, sub }) {
  return (
    <div className="bg-[#141416] border border-white/[0.06] rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${iconBg}`}>
          <Icon size={14} className={iconColor} />
        </div>
        <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">{label}</p>
      </div>
      <p className="text-2xl font-bold text-white tabular-nums">{value}</p>
      {sub && <p className="text-xs text-zinc-500 mt-1">{sub}</p>}
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

// ── Mark Paid modal ──────────────────────────────────────────────────────────

function MarkPaidModal({ open, payment, onClose, onConfirm, busy }) {
  const [method, setMethod] = useState('cash')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (open) { setMethod('cash'); setNotes('') }
  }, [open, payment?.id])

  if (!open || !payment) return null

  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center p-4 bg-black/70" onClick={onClose}>
      <div
        className="bg-[#141416] border border-white/[0.08] rounded-2xl p-6 max-w-sm w-full shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-base font-semibold text-white">Mark payment as paid</h3>
        <p className="text-sm text-zinc-400 mt-1">
          {payment.full_name || 'Member'} — {formatINR(payment.amount)}
        </p>

        <div className="mt-4 space-y-3">
          <div>
            <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">
              Payment method
            </label>
            <select
              value={method}
              onChange={e => setMethod(e.target.value)}
              className="mt-1.5 w-full bg-[#1c1c1f] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30"
            >
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
              <option value="card">Card</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="e.g. Paid in 2 instalments"
              className="mt-1.5 w-full bg-[#1c1c1f] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30 resize-none"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-5">
          <button
            onClick={onClose}
            disabled={busy}
            className="px-4 py-2 rounded-xl text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/[0.04] disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm({ method, notes })}
            disabled={busy}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-emerald-500 hover:bg-emerald-400 inline-flex items-center gap-1.5 disabled:opacity-50"
          >
            {busy && <Loader2 size={13} className="animate-spin" />}
            Mark Paid
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Record Payment modal ─────────────────────────────────────────────────────

function RecordPaymentModal({ open, gymId, members, onClose, onSubmitted }) {
  const [userId, setUserId] = useState('')
  const [amount, setAmount] = useState('')
  const [dueDate, setDueDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      setUserId('')
      setAmount('')
      setDueDate(new Date().toISOString().slice(0, 10))
      setNotes('')
      setError('')
    }
  }, [open])

  if (!open) return null

  async function submit(e) {
    e.preventDefault()
    setError('')
    if (!userId)            { setError('Please pick a member.'); return }
    if (!amount || Number(amount) <= 0) { setError('Amount must be a positive number.'); return }
    if (!dueDate)           { setError('Please pick a due date.'); return }

    setBusy(true)
    try {
      const member = members.find(m => m.user_id === userId)
      await recordPayment({
        gymId,
        userId,
        membershipId: member?.membership_id || null,
        amount: Number(amount),
        dueDate,
        notes: notes.trim() || null,
      })
      onSubmitted()
    } catch (err) {
      setError(err.message || 'Failed to record payment.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center p-4 bg-black/70" onClick={onClose}>
      <form
        onSubmit={submit}
        className="bg-[#141416] border border-white/[0.08] rounded-2xl p-6 max-w-md w-full shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-base font-semibold text-white">Record payment</h3>
        <p className="text-sm text-zinc-400 mt-1">Add a manual payment record for a member.</p>

        <div className="mt-4 space-y-3">
          <div>
            <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">
              Member
            </label>
            <select
              value={userId}
              onChange={e => setUserId(e.target.value)}
              className="mt-1.5 w-full bg-[#1c1c1f] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30"
            >
              <option value="">Select a member…</option>
              {members.map(m => (
                <option key={m.user_id} value={m.user_id}>
                  {m.full_name || '—'}{m.phone ? ` · ${m.phone}` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">
                Amount (₹)
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="1500"
                className="mt-1.5 w-full bg-[#1c1c1f] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">
                Due date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="mt-1.5 w-full bg-[#1c1c1f] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="e.g. Quarterly renewal"
              className="mt-1.5 w-full bg-[#1c1c1f] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30 resize-none"
            />
          </div>
        </div>

        {error && (
          <p className="mt-3 text-xs text-red-400">{error}</p>
        )}

        <div className="flex justify-end gap-2 mt-5">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="px-4 py-2 rounded-xl text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/[0.04] disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-emerald-500 hover:bg-emerald-400 inline-flex items-center gap-1.5 disabled:opacity-50"
          >
            {busy && <Loader2 size={13} className="animate-spin" />}
            Record Payment
          </button>
        </div>
      </form>
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function GymPayments() {
  const { user } = useAuth()

  const [gym, setGym] = useState(null)
  const [members, setMembers] = useState([])
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState('all')
  const [toast, setToast] = useState('')

  const [paying, setPaying] = useState(null)        // payment being marked paid
  const [payingBusy, setPayingBusy] = useState(false)
  const [recordOpen, setRecordOpen] = useState(false)

  async function loadAll() {
    if (!user) return
    setLoading(true)
    setError('')
    try {
      const { data: gymRow, error: gymErr } = await supabase
        .from('gyms')
        .select('id, name')
        .eq('owner_id', user.id)
        .maybeSingle()
      if (gymErr) throw gymErr
      if (!gymRow) {
        setError('No gym found for this owner.')
        setLoading(false)
        return
      }
      setGym(gymRow)

      const [paymentsList, { data: memberRows, error: memErr }] = await Promise.all([
        getGymPayments(gymRow.id),
        supabase
          .from('gym_memberships')
          .select('id, user_id, users(full_name, phone)')
          .eq('gym_id', gymRow.id)
          .eq('status', 'active'),
      ])
      if (memErr) throw memErr

      setPayments(paymentsList)
      setMembers((memberRows || []).map(m => ({
        user_id: m.user_id,
        membership_id: m.id,
        full_name: m.users?.full_name ?? null,
        phone: m.users?.phone ?? null,
      })))
    } catch (err) {
      console.error('Load payments error:', err)
      setError(err.message || 'Failed to load payments.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadAll() }, [user])

  // ── Stats ──────────────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    let collectedThisMonth = 0
    let outstanding = 0
    let overdueCount = 0
    let paidThisMonthCount = 0

    for (const p of payments) {
      const amt = Number(p.amount || 0)
      if (p.status === 'paid' && isThisMonth(p.paid_at)) {
        collectedThisMonth += amt
        paidThisMonthCount++
      }
      if (p.status === 'pending' || p.status === 'overdue') outstanding += amt
      if (p.status === 'overdue') overdueCount++
    }
    return { collectedThisMonth, outstanding, overdueCount, paidThisMonthCount }
  }, [payments])

  const filtered = useMemo(() => {
    if (tab === 'all') return payments
    return payments.filter(p => p.status === tab)
  }, [payments, tab])

  // ── Actions ────────────────────────────────────────────────────────────────

  async function onConfirmMarkPaid({ method, notes }) {
    if (!paying) return
    setPayingBusy(true)
    try {
      await markPaymentPaid(paying.id, method, notes)
      setToast('Payment marked as paid')
      setPaying(null)
      await loadAll()
    } catch (err) {
      console.error('Mark paid error:', err)
      setToast(err.message || 'Failed to mark paid')
    } finally {
      setPayingBusy(false)
    }
  }

  async function onPaymentRecorded() {
    setRecordOpen(false)
    setToast('Payment recorded')
    await loadAll()
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#0c0c0e] pb-24 overflow-x-hidden">
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[700px] h-[300px] bg-emerald-500/[0.07] blur-[120px] rounded-full pointer-events-none" />

      <div className="relative z-10 max-w-6xl mx-auto px-5 py-10 sm:py-12">
        <header className="flex items-center justify-between gap-4 mb-7">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Payments</h1>
            <p className="text-zinc-500 text-sm mt-0.5">
              {loading ? 'Loading…' : `${payments.length} ${payments.length === 1 ? 'record' : 'records'} in ${gym?.name ?? 'your gym'}`}
            </p>
          </div>
          <button
            onClick={() => setRecordOpen(true)}
            disabled={!gym?.id}
            className="inline-flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold text-sm px-4 py-2.5 rounded-xl transition-all duration-200 shadow-lg shadow-emerald-500/20 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Plus size={14} />
            <span className="hidden sm:inline">Record Payment</span>
            <span className="sm:hidden">Record</span>
          </button>
        </header>

        {error && (
          <div className="mb-5 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Stats */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          <StatCard
            label="Collected (Month)"
            icon={Wallet}
            iconBg="bg-emerald-500/10"
            iconColor="text-emerald-400"
            value={loading ? '—' : formatINR(stats.collectedThisMonth)}
            sub="paid this month"
          />
          <StatCard
            label="Outstanding"
            icon={Clock}
            iconBg="bg-amber-500/10"
            iconColor="text-amber-400"
            value={loading ? '—' : formatINR(stats.outstanding)}
            sub="pending + overdue"
          />
          <StatCard
            label="Overdue"
            icon={AlertTriangle}
            iconBg="bg-red-500/10"
            iconColor="text-red-400"
            value={loading ? '—' : inrFormatter.format(stats.overdueCount)}
            sub={stats.overdueCount === 1 ? 'payment' : 'payments'}
          />
          <StatCard
            label="Paid This Month"
            icon={CheckCircle2}
            iconBg="bg-sky-500/10"
            iconColor="text-sky-400"
            value={loading ? '—' : inrFormatter.format(stats.paidThisMonthCount)}
            sub={stats.paidThisMonthCount === 1 ? 'payment' : 'payments'}
          />
        </section>

        {/* Filter tabs */}
        <section className="bg-[#141416] border border-white/[0.06] rounded-2xl p-1.5 mb-4 inline-flex">
          {STATUS_TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                tab === t.key
                  ? 'bg-white/[0.08] text-white'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </section>

        {/* Table / list */}
        <section className="bg-[#141416] border border-white/[0.06] rounded-2xl overflow-hidden">
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] text-left">
                  <th className="py-3 px-4 text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">Member</th>
                  <th className="py-3 px-4 text-[10px] font-semibold text-zinc-500 uppercase tracking-widest text-right">Amount</th>
                  <th className="py-3 px-4 text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">Due Date</th>
                  <th className="py-3 px-4 text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">Status</th>
                  <th className="py-3 px-4 text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">Paid On</th>
                  <th className="py-3 px-4 text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">Method</th>
                  <th className="py-3 px-4 w-32" />
                </tr>
              </thead>
              <tbody>
                {loading
                  ? Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i} className="border-b border-white/[0.04]">
                        {Array.from({ length: 7 }).map((_, j) => (
                          <td key={j} className="py-3.5 px-4">
                            <div className="h-3 bg-white/[0.05] rounded animate-pulse" style={{ width: `${50 + (j * 7) % 40}%` }} />
                          </td>
                        ))}
                      </tr>
                    ))
                  : filtered.length === 0
                    ? (
                      <tr>
                        <td colSpan={7} className="py-14 text-center">
                          <p className="text-zinc-300 text-sm font-medium mb-1">No payments</p>
                          <p className="text-zinc-500 text-xs">
                            {tab === 'all' ? 'Record one to get started.' : `No ${tab} payments right now.`}
                          </p>
                        </td>
                      </tr>
                    )
                    : filtered.map(p => (
                      <tr key={p.id} className="border-b border-white/[0.04] last:border-b-0 hover:bg-white/[0.02] transition-colors">
                        <td className="py-3 px-4 text-white font-medium truncate max-w-[200px]">{p.full_name || '—'}</td>
                        <td className="py-3 px-4 text-zinc-200 tabular-nums text-right">{formatINR(p.amount)}</td>
                        <td className="py-3 px-4 text-zinc-400 tabular-nums">{formatDate(p.due_date)}</td>
                        <td className="py-3 px-4"><StatusPill status={p.status} /></td>
                        <td className="py-3 px-4 text-zinc-400 tabular-nums">{p.paid_at ? formatDate(p.paid_at) : '—'}</td>
                        <td className="py-3 px-4 text-zinc-400 capitalize">{p.payment_method ? p.payment_method.replace('_', ' ') : '—'}</td>
                        <td className="py-3 px-4 text-right">
                          {p.status !== 'paid' && (
                            <button
                              onClick={() => setPaying(p)}
                              className="inline-flex items-center gap-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-semibold px-3 py-1.5 rounded-lg border border-emerald-500/20 transition-colors"
                            >
                              <Check size={12} />
                              Mark Paid
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-white/[0.04]">
            {loading
              ? <div className="p-3 space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="bg-[#141416] border border-white/[0.06] rounded-2xl p-4 space-y-2">
                      <div className="h-3 bg-white/[0.05] rounded animate-pulse w-1/2" />
                      <div className="h-2.5 bg-white/[0.04] rounded animate-pulse w-1/3" />
                    </div>
                  ))}
                </div>
              : filtered.length === 0
                ? <div className="py-14 px-4 text-center">
                    <p className="text-zinc-300 text-sm font-medium mb-1">No payments</p>
                    <p className="text-zinc-500 text-xs">
                      {tab === 'all' ? 'Record one to get started.' : `No ${tab} payments right now.`}
                    </p>
                  </div>
                : filtered.map(p => (
                    <div key={p.id} className="px-4 py-3.5">
                      <div className="flex items-start justify-between gap-3 mb-1.5">
                        <p className="text-sm font-semibold text-white truncate">{p.full_name || '—'}</p>
                        <p className="text-sm font-semibold text-white tabular-nums flex-shrink-0">{formatINR(p.amount)}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <StatusPill status={p.status} />
                        <span className="text-[11px] text-zinc-500">Due {formatDate(p.due_date)}</span>
                        {p.paid_at && <span className="text-[11px] text-zinc-500">Paid {formatDate(p.paid_at)}</span>}
                        {p.payment_method && (
                          <span className="text-[11px] text-zinc-500 capitalize">{p.payment_method.replace('_', ' ')}</span>
                        )}
                      </div>
                      {p.status !== 'paid' && (
                        <button
                          onClick={() => setPaying(p)}
                          className="inline-flex items-center gap-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-semibold px-3 py-1.5 rounded-lg border border-emerald-500/20"
                        >
                          <Check size={12} />
                          Mark Paid
                        </button>
                      )}
                    </div>
                  ))}
          </div>
        </section>
      </div>

      <Toast toast={toast} onClose={() => setToast('')} />

      <MarkPaidModal
        open={!!paying}
        payment={paying}
        onClose={() => !payingBusy && setPaying(null)}
        onConfirm={onConfirmMarkPaid}
        busy={payingBusy}
      />

      <RecordPaymentModal
        open={recordOpen}
        gymId={gym?.id}
        members={members}
        onClose={() => setRecordOpen(false)}
        onSubmitted={onPaymentRecorded}
      />

      <GymOwnerNav />
    </div>
  )
}
