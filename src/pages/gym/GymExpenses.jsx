import { useEffect, useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../utils/supabase'
import GymBottomNav from '../../components/GymBottomNav'
import MoreSheet from '../../components/MoreSheet'
import PrimaryButton from '../../components/PrimaryButton'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import {
  Receipt, ChevronLeft, Plus, X, Trash2, ChevronDown,
} from 'lucide-react'

const BASE = import.meta.env.VITE_API_URL

// ── Auth + fetch helpers ──────────────────────────────────────────────────────

async function getToken() {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token || null
}

async function apiFetch(path, opts = {}) {
  const token = await getToken()
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...opts.headers,
    },
    ...opts,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || data.message || `Request failed (${res.status})`)
  return data
}

// ── Constants ─────────────────────────────────────────────────────────────────

const EXPENSE_CATEGORIES = [
  'rent', 'equipment', 'salaries', 'utilities', 'marketing', 'maintenance', 'other',
]

const CAT_META = {
  rent:        { label: 'Rent',        bg: 'var(--warning-bg)', color: 'var(--warning)' },
  equipment:   { label: 'Equipment',   bg: 'var(--accent-bg)', color: 'var(--text-cta)' },
  salaries:    { label: 'Salaries',    bg: 'var(--bg-pill)', color: 'var(--text-cta)' },
  utilities:   { label: 'Utilities',   bg: 'var(--success-bg)', color: 'var(--success)' },
  marketing:   { label: 'Marketing',   bg: 'var(--bg-pill)', color: 'var(--error)' },
  maintenance: { label: 'Maintenance', bg: 'var(--warning-bg)', color: 'var(--warning)' },
  other:       { label: 'Other',       bg: 'var(--border)', color: 'var(--text-secondary)' },
}

const DATE_RANGES = [
  { key: 'this_month',   label: 'This month' },
  { key: 'last_month',   label: 'Last month' },
  { key: 'last_3_months', label: 'Last 3 months' },
  { key: 'custom',       label: 'Custom range' },
]

const COLOR = {
  pageBg:        'var(--bg-primary)',
  cardBg:        'var(--bg-card)',
  border:        'var(--border)',
  textPrimary:   'var(--text-primary)',
  textSecondary: 'var(--text-secondary)',
  textTertiary:  'var(--text-tertiary)',
  accent:        'var(--text-cta)',
  destructive:   'var(--error)',
}

const card = {
  background: COLOR.cardBg,
  border: `1px solid ${COLOR.border}`,
  borderRadius: 16,
}

// ── Utility ───────────────────────────────────────────────────────────────────

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function getDateRange(range, customStart, customEnd) {
  const now = new Date()
  if (range === 'this_month') {
    return {
      start: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10),
      end:   new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10),
    }
  }
  if (range === 'last_month') {
    return {
      start: new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 10),
      end:   new Date(now.getFullYear(), now.getMonth(), 0).toISOString().slice(0, 10),
    }
  }
  if (range === 'last_3_months') {
    return {
      start: new Date(now.getFullYear(), now.getMonth() - 2, 1).toISOString().slice(0, 10),
      end:   new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10),
    }
  }
  if (range === 'custom') {
    return { start: customStart || todayISO(), end: customEnd || todayISO() }
  }
  return { start: null, end: null }
}

function formatAmount(n) {
  const num = Number(n || 0)
  if (num >= 100000) return `₹${(num / 100000).toFixed(1)}L`
  if (num >= 1000)   return `₹${Number(num.toFixed(0)).toLocaleString('en-IN')}`
  return `₹${num}`
}

function formatAmountFull(n) {
  return `₹${Number(n || 0).toLocaleString('en-IN')}`
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatMonthLabel(yyyyMM) {
  if (!yyyyMM) return ''
  const [y, m] = yyyyMM.split('-')
  const d = new Date(Number(y), Number(m) - 1, 1)
  return d.toLocaleDateString('en-IN', { month: 'short' })
}

// ── Toast ─────────────────────────────────────────────────────────────────────

function Toast({ message, type, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2800)
    return () => clearTimeout(t)
  }, [onDone])
  return (
    <div style={{
      position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)',
      zIndex: 200, background: type === 'error' ? 'var(--error)' : 'var(--text-primary)',
      color: 'var(--bg-card)', padding: '10px 20px', borderRadius: 12,
      fontSize: 14, fontWeight: 500, boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
      maxWidth: '90vw', whiteSpace: 'nowrap',
    }}>
      {message}
    </div>
  )
}

// ── BottomSheet wrapper ───────────────────────────────────────────────────────

function BottomSheet({ open, onClose, title, children }) {
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 60,
          background: 'rgba(0,0,0,0.4)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity 0.25s',
        }}
      />
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 70,
        background: 'var(--bg-card)', borderRadius: '24px 24px 0 0',
        transform: open ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 0.3s ease-out',
        maxHeight: '90vh', display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 0', flexShrink: 0 }}>
          <div style={{ width: 36, height: 4, background: 'var(--border)', borderRadius: 2 }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px 8px', flexShrink: 0 }}>
          <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' }}>{title}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', padding: 4, cursor: 'pointer', display: 'flex' }}>
            <X size={20} color="var(--text-secondary)" />
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '4px 20px 40px' }}>
          {children}
        </div>
      </div>
    </>
  )
}

// ── Category pill ─────────────────────────────────────────────────────────────

function CatPill({ cat, small = false }) {
  const meta = CAT_META[cat] || CAT_META.other
  return (
    <span style={{
      display: 'inline-block',
      background: meta.bg, color: meta.color,
      fontSize: small ? 11 : 12, fontWeight: 600,
      padding: small ? '2px 7px' : '3px 9px',
      borderRadius: 999,
    }}>
      {meta.label}
    </span>
  )
}

// ── Expense form (shared by Log + Edit sheets) ────────────────────────────────

const inputStyle = {
  width: '100%', height: 44, background: 'var(--bg-primary)',
  border: '1px solid rgba(0,0,0,0.08)',
  borderRadius: 12, padding: '0 12px', fontSize: 15,
  color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box',
}

function ExpenseForm({ initial, onSubmit, submitLabel, saving, onDelete }) {
  const [category,    setCategory]    = useState(initial?.category    || 'rent')
  const [amount,      setAmount]      = useState(initial?.amount      ? String(initial.amount) : '')
  const [description, setDescription] = useState(initial?.description || '')
  const [expenseDate, setExpenseDate] = useState(initial?.expense_date || todayISO())

  useEffect(() => {
    if (initial) {
      setCategory(initial.category || 'rent')
      setAmount(initial.amount ? String(initial.amount) : '')
      setDescription(initial.description || '')
      setExpenseDate(initial.expense_date || todayISO())
    } else {
      setCategory('rent'); setAmount(''); setDescription(''); setExpenseDate(todayISO())
    }
  }, [initial])

  function handleSubmit() {
    const amt = Number(amount)
    if (!category) return
    if (!Number.isFinite(amt) || amt <= 0) return
    onSubmit({ category, amount: amt, description: description.trim() || null, expense_date: expenseDate })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Category */}
      <div>
        <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>Category *</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {EXPENSE_CATEGORIES.map(cat => {
            const meta = CAT_META[cat]
            const active = category === cat
            return (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                style={{
                  padding: '6px 14px', borderRadius: 999, fontSize: 13, fontWeight: 600,
                  cursor: 'pointer',
                  background: active ? meta.bg : 'var(--bg-primary)',
                  color: active ? meta.color : 'var(--text-secondary)',
                  border: active ? `1.5px solid ${meta.color}30` : '1.5px solid transparent',
                  transition: 'all 0.12s',
                }}
              >
                {meta.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Amount */}
      <div>
        <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>Amount (₹) *</label>
        <input
          type="number" min="1" step="1" value={amount}
          onChange={e => setAmount(e.target.value)}
          placeholder="0"
          style={inputStyle}
        />
      </div>

      {/* Description */}
      <div>
        <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>Description</label>
        <input
          type="text" value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="e.g. Treadmill belt replacement"
          style={inputStyle}
        />
      </div>

      {/* Date */}
      <div>
        <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>Date</label>
        <input
          type="date" value={expenseDate}
          onChange={e => setExpenseDate(e.target.value)}
          style={inputStyle}
        />
      </div>

      <div style={{ paddingTop: 4 }}>
        <PrimaryButton onClick={handleSubmit} disabled={saving || !amount || Number(amount) <= 0}>
          {saving ? 'Saving…' : submitLabel}
        </PrimaryButton>
      </div>

      {onDelete && (
        <button
          onClick={onDelete}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: COLOR.destructive, fontSize: 14, fontWeight: 500,
            padding: '8px 0', textAlign: 'center', width: '100%',
          }}
        >
          Delete expense
        </button>
      )}
    </div>
  )
}

// ── Swipeable expense row ─────────────────────────────────────────────────────

function SwipeableExpenseRow({ expense, onTap, onDelete }) {
  const [swipeX, setSwipeX]       = useState(0)
  const [animating, setAnimating] = useState(false)
  const touchStartX = useRef(null)
  const REVEAL_W    = 72
  const AUTO_DELETE = 160

  function handleTouchStart(e) {
    touchStartX.current = e.touches[0].clientX
    setAnimating(false)
  }

  function handleTouchMove(e) {
    if (touchStartX.current === null) return
    const dx = e.touches[0].clientX - touchStartX.current
    if (dx > 0) {
      if (swipeX < 0) { setAnimating(true); setSwipeX(0) }
      return
    }
    setSwipeX(Math.max(-280, dx))
  }

  function handleTouchEnd() {
    touchStartX.current = null
    setAnimating(true)
    if (swipeX <= -AUTO_DELETE) {
      onDelete()
    } else if (swipeX <= -(REVEAL_W * 0.45)) {
      setSwipeX(-REVEAL_W)
    } else {
      setSwipeX(0)
    }
  }

  return (
    <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 12, marginBottom: 10 }}>
      {/* Red delete zone */}
      <div
        onClick={onDelete}
        style={{
          position: 'absolute', right: 0, top: 0, bottom: 0, width: REVEAL_W,
          background: 'var(--error)', borderRadius: '0 12px 12px 0',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer',
        }}
      >
        <Trash2 size={18} color="white" />
      </div>

      {/* Row content */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={() => swipeX === 0 && onTap()}
        style={{
          ...card,
          padding: '14px 16px',
          display: 'flex', alignItems: 'center', gap: 12,
          transform: `translateX(${swipeX}px)`,
          transition: animating ? 'transform 0.22s ease' : 'none',
          willChange: 'transform',
          position: 'relative', zIndex: 1,
          touchAction: 'pan-y',
          cursor: 'pointer',
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <CatPill cat={expense.category} small />
            <span style={{ fontSize: 13, color: COLOR.textTertiary }}>{formatDate(expense.expense_date)}</span>
          </div>
          <p style={{ fontSize: 15, fontWeight: 500, color: COLOR.textPrimary, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {expense.description || CAT_META[expense.category]?.label || expense.category}
          </p>
        </div>
        <span style={{ fontSize: 16, fontWeight: 700, color: COLOR.textPrimary, flexShrink: 0 }}>
          {formatAmountFull(expense.amount)}
        </span>
      </div>
    </div>
  )
}

// ── Delete confirmation sheet ─────────────────────────────────────────────────

function DeleteConfirmSheet({ open, onClose, onConfirm, saving }) {
  return (
    <BottomSheet open={open} onClose={onClose} title="Delete Expense?">
      <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: '0 0 16px', lineHeight: 1.5 }}>
        This expense will be permanently removed and your summary will recalculate.
      </p>
      <PrimaryButton
        onClick={onConfirm}
        disabled={saving}
        style={{ borderColor: COLOR.destructive, color: COLOR.destructive }}
      >
        {saving ? 'Deleting…' : 'Delete Expense'}
      </PrimaryButton>
    </BottomSheet>
  )
}

// ── Custom Tooltip for bar chart ──────────────────────────────────────────────

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'var(--chart-tooltip-bg)', border: '1px solid var(--border)', borderRadius: 10,
      padding: '8px 12px', fontSize: 13, boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    }}>
      <p style={{ margin: 0, fontWeight: 600, color: 'var(--text-primary)' }}>{label}</p>
      <p style={{ margin: '3px 0 0', color: 'var(--text-cta)', fontWeight: 700 }}>{formatAmountFull(payload[0].value)}</p>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function GymExpenses({ embedded = false, topOffset = 0 } = {}) {
  const navigate = useNavigate()

  const [moreOpen,  setMoreOpen]  = useState(false)
  const [toast,     setToast]     = useState(null)

  // Data
  const [summary,  setSummary]  = useState(null)
  const [expenses, setExpenses] = useState([])
  const [monthly,  setMonthly]  = useState([])
  const [loading,  setLoading]  = useState(true)

  // Date range
  const [dateRange,    setDateRange]    = useState('this_month')
  const [customStart,  setCustomStart]  = useState(todayISO())
  const [customEnd,    setCustomEnd]    = useState(todayISO())
  const [rangeDropOpen, setRangeDropOpen] = useState(false)

  // Category filter (client-side)
  const [catFilter, setCatFilter] = useState('all')

  // Sheets
  const [logOpen,  setLogOpen]  = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editExpense, setEditExpense] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [saving,   setSaving]   = useState(false)
  const [deleting, setDeleting] = useState(false)

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type })
  }, [])

  // ── Data fetching ─────────────────────────────────────────────────────────

  const refresh = useCallback(async (range, cStart, cEnd) => {
    const { start, end } = getDateRange(range, cStart, cEnd)
    setLoading(true)
    try {
      const qs = start && end ? `?startDate=${start}&endDate=${end}` : ''
      const [summaryData, expenseData, monthlyData] = await Promise.all([
        apiFetch(`/api/expenses/summary${qs}`),
        apiFetch(`/api/expenses${qs}`),
        apiFetch('/api/expenses/summary/monthly'),
      ])
      setSummary(summaryData)
      setExpenses(Array.isArray(expenseData) ? expenseData : [])
      setMonthly(Array.isArray(monthlyData) ? monthlyData : [])
    } catch (err) {
      console.error('GymExpenses fetch error:', err)
      showToast('Failed to load expenses', 'error')
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => {
    refresh(dateRange, customStart, customEnd)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function applyRange(range) {
    setDateRange(range)
    setRangeDropOpen(false)
    if (range !== 'custom') refresh(range, customStart, customEnd)
  }

  function applyCustomRange() {
    setRangeDropOpen(false)
    refresh('custom', customStart, customEnd)
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  async function handleLog(fields) {
    setSaving(true)
    try {
      await apiFetch('/api/expenses', {
        method: 'POST',
        body: JSON.stringify(fields),
      })
      setLogOpen(false)
      showToast('Expense logged')
      refresh(dateRange, customStart, customEnd)
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleEdit(fields) {
    if (!editExpense) return
    setSaving(true)
    try {
      await apiFetch(`/api/expenses/${editExpense.id}`, {
        method: 'PATCH',
        body: JSON.stringify(fields),
      })
      setEditOpen(false)
      setEditExpense(null)
      showToast('Expense updated')
      refresh(dateRange, customStart, customEnd)
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id) {
    setDeleting(true)
    try {
      await apiFetch(`/api/expenses/${id}`, { method: 'DELETE' })
      setDeleteTarget(null)
      setEditOpen(false)
      setEditExpense(null)
      showToast('Expense deleted')
      refresh(dateRange, customStart, customEnd)
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setDeleting(false)
    }
  }

  function openEdit(expense) {
    setEditExpense(expense)
    setEditOpen(true)
  }

  // ── Derived ───────────────────────────────────────────────────────────────

  const filteredExpenses = catFilter === 'all'
    ? expenses
    : expenses.filter(e => e.category === catFilter)

  const rangeLabel = DATE_RANGES.find(r => r.key === dateRange)?.label || 'This month'

  const chartData = monthly.map(m => ({
    month: formatMonthLabel(m.month),
    total: Number(m.total || 0),
  }))

  // ── Filter chips ──────────────────────────────────────────────────────────

  const filterChip = (active) => ({
    borderRadius: 999, padding: '6px 14px', fontSize: 13, fontWeight: 500,
    cursor: 'pointer', whiteSpace: 'nowrap',
    border: active ? '1.5px solid var(--text-primary)' : '1px solid rgba(0,0,0,0.08)',
    background: 'var(--bg-card)',
    color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
    transition: 'all 0.12s',
    flexShrink: 0,
  })

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <style>{`
        @keyframes skel { from { opacity: 0.4 } to { opacity: 1 } }
        input[type="date"] { -webkit-appearance: none; }
      `}</style>

      {toast && <Toast message={toast.message} type={toast.type} onDone={() => setToast(null)} />}

      <div style={{ minHeight: '100vh', background: COLOR.pageBg, paddingBottom: 96 }}>

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div style={{
          background: 'var(--bg-card)', borderBottom: '1px solid rgba(0,0,0,0.08)',
          padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 4,
          position: 'sticky', top: topOffset, zIndex: 30,
        }}>
          <button onClick={() => navigate('/gym/dashboard')} style={{ background: 'none', border: 'none', padding: '4px 6px 4px 2px', cursor: 'pointer', display: 'flex' }}>
            <ChevronLeft size={22} color="var(--text-primary)" />
          </button>
          <span style={{ flex: 1, fontSize: 20, fontWeight: 600, color: 'var(--text-primary)' }}>Expense Tracker</span>
          <button
            onClick={() => setLogOpen(true)}
            style={{ background: 'none', border: 'none', fontSize: 15, fontWeight: 600, color: COLOR.accent, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
          >
            <Plus size={16} color={COLOR.accent} /> Log Expense
          </button>
        </div>

        <div style={{ padding: '16px 16px 0' }}>

          {/* ── Summary Card ─────────────────────────────────────────────── */}
          <div style={{ ...card, padding: 20, marginBottom: 14 }}>

            {/* Date range picker */}
            <div style={{ position: 'relative', marginBottom: 16 }}>
              <button
                onClick={() => setRangeDropOpen(v => !v)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  background: 'var(--bg-primary)', border: '1px solid rgba(0,0,0,0.08)',
                  borderRadius: 20, padding: '6px 12px', fontSize: 13, fontWeight: 500,
                  color: 'var(--text-primary)', cursor: 'pointer',
                }}
              >
                {rangeLabel}
                <ChevronDown size={14} color="var(--text-secondary)" />
              </button>

              {rangeDropOpen && (
                <div style={{
                  position: 'absolute', top: 36, left: 0, zIndex: 50,
                  background: 'var(--bg-card)', border: '1px solid rgba(0,0,0,0.10)',
                  borderRadius: 14, boxShadow: '0 6px 24px rgba(0,0,0,0.12)',
                  minWidth: 200, overflow: 'hidden',
                }}>
                  {DATE_RANGES.map(r => (
                    <button
                      key={r.key}
                      onClick={() => applyRange(r.key)}
                      style={{
                        width: '100%', padding: '12px 16px', textAlign: 'left',
                        fontSize: 14, fontWeight: dateRange === r.key ? 600 : 400,
                        color: dateRange === r.key ? COLOR.accent : 'var(--text-primary)',
                        background: 'none', border: 'none', cursor: 'pointer',
                        borderBottom: '1px solid rgba(0,0,0,0.05)',
                      }}
                    >
                      {r.label}
                    </button>
                  ))}
                  {dateRange === 'custom' && (
                    <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)}
                        style={{ ...inputStyle, height: 38, fontSize: 13 }} />
                      <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)}
                        style={{ ...inputStyle, height: 38, fontSize: 13 }} />
                      <button
                        onClick={applyCustomRange}
                        style={{
                          height: 38, background: 'var(--text-primary)', color: 'var(--bg-card)',
                          border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer',
                        }}
                      >
                        Apply
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Total */}
            {loading ? (
              <div style={{ height: 44, width: '50%', background: 'var(--bg-pill)', borderRadius: 8, marginBottom: 16, animation: 'skel 1.2s ease infinite alternate' }} />
            ) : (
              <p style={{ fontSize: 36, fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 4px', letterSpacing: -1 }}>
                {formatAmountFull(summary?.totalAmount || 0)}
              </p>
            )}
            <p style={{ fontSize: 13, color: COLOR.textTertiary, margin: '0 0 18px' }}>
              {summary ? `${formatDate(summary.periodStart)} – ${formatDate(summary.periodEnd)}` : rangeLabel}
            </p>

            {/* Category breakdown */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {EXPENSE_CATEGORIES.map(cat => {
                const meta = CAT_META[cat]
                const row = summary?.byCategory?.find(b => b.category === cat)
                const total = Number(row?.total || 0)
                const isZero = total === 0
                return (
                  <div
                    key={cat}
                    style={{
                      background: isZero ? 'var(--bg-pill)' : meta.bg,
                      borderRadius: 10, padding: '8px 12px',
                      minWidth: 0,
                    }}
                  >
                    <p style={{ fontSize: 11, fontWeight: 600, color: isZero ? 'var(--text-disabled)' : meta.color, margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {meta.label}
                    </p>
                    <p style={{ fontSize: 14, fontWeight: 700, color: isZero ? 'var(--text-tertiary)' : 'var(--text-primary)', margin: 0 }}>
                      {formatAmount(total)}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>

          {/* ── Monthly Trend Chart ───────────────────────────────────────── */}
          <div style={{ ...card, padding: '16px 8px 12px', marginBottom: 14 }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 14px', paddingLeft: 12 }}>Monthly Trend</p>
            {loading ? (
              <div style={{ height: 140, background: 'var(--bg-pill)', borderRadius: 8, margin: '0 8px', animation: 'skel 1.2s ease infinite alternate' }} />
            ) : (
              <ResponsiveContainer width="100%" height={150}>
                <BarChart data={chartData} margin={{ top: 4, right: 12, left: -20, bottom: 0 }} barSize={22}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--border)' }} />
                  <Bar dataKey="total" fill="var(--text-cta)" radius={[5, 5, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* ── Expense List ──────────────────────────────────────────────── */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>All Expenses</p>
              <span style={{ fontSize: 13, color: COLOR.textTertiary }}>{filteredExpenses.length} entries</span>
            </div>

            {/* Category filter chips */}
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 12, scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
              <button onClick={() => setCatFilter('all')} style={filterChip(catFilter === 'all')}>All</button>
              {EXPENSE_CATEGORIES.map(cat => (
                <button key={cat} onClick={() => setCatFilter(cat)} style={filterChip(catFilter === cat)}>
                  {CAT_META[cat].label}
                </button>
              ))}
            </div>

            {/* List */}
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} style={{ ...card, height: 70, marginBottom: 10, animation: 'skel 1.2s ease infinite alternate' }} />
              ))
            ) : filteredExpenses.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                <Receipt size={48} color="var(--text-tertiary)" style={{ margin: '0 auto 14px', display: 'block' }} />
                <p style={{ fontSize: 17, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 6px' }}>No expenses logged</p>
                <p style={{ fontSize: 14, color: COLOR.textTertiary, margin: '0 0 24px', lineHeight: 1.5 }}>
                  Track your gym's spending by category
                </p>
                {catFilter === 'all' && (
                  <PrimaryButton onClick={() => setLogOpen(true)}>
                    <Plus size={18} /> Log Expense
                  </PrimaryButton>
                )}
              </div>
            ) : (
              filteredExpenses.map(expense => (
                <SwipeableExpenseRow
                  key={expense.id}
                  expense={expense}
                  onTap={() => openEdit(expense)}
                  onDelete={() => setDeleteTarget(expense)}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── Log Expense sheet ───────────────────────────────────────────────── */}
      <BottomSheet open={logOpen} onClose={() => setLogOpen(false)} title="Log Expense">
        <ExpenseForm
          initial={null}
          onSubmit={handleLog}
          submitLabel="Log Expense"
          saving={saving}
        />
      </BottomSheet>

      {/* ── Edit Expense sheet ──────────────────────────────────────────────── */}
      <BottomSheet
        open={editOpen}
        onClose={() => { setEditOpen(false); setEditExpense(null) }}
        title="Edit Expense"
      >
        <ExpenseForm
          initial={editExpense}
          onSubmit={handleEdit}
          submitLabel="Save Changes"
          saving={saving}
          onDelete={() => {
            setEditOpen(false)
            setDeleteTarget(editExpense)
          }}
        />
      </BottomSheet>

      {/* ── Delete confirmation sheet ───────────────────────────────────────── */}
      <DeleteConfirmSheet
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => handleDelete(deleteTarget?.id)}
        saving={deleting}
      />

      {/* Range dropdown backdrop */}
      {rangeDropOpen && (
        <div
          onClick={() => setRangeDropOpen(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 40 }}
        />
      )}

      {!embedded && (
        <>
          <GymBottomNav onMorePress={() => setMoreOpen(true)} />
          <MoreSheet isOpen={moreOpen} onClose={() => setMoreOpen(false)} />
        </>
      )}
    </>
  )
}
