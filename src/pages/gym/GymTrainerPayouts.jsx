import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../utils/supabase'
import { useOwnerGymId } from '../../hooks/useOwnerGymId'
import GymBottomNav from '../../components/GymBottomNav'
import MoreSheet from '../../components/MoreSheet'
import { ChevronLeft, ChevronDown, X, Wallet } from 'lucide-react'

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

const PERIODS = [
  { key: 'this_month', label: 'This Month' },
  { key: 'last_month', label: 'Last Month' },
  { key: 'custom',     label: 'Custom' },
]

const MODEL_LABEL = {
  per_client:  'Per Client',
  per_session: 'Per Session',
  hybrid:      'Hybrid',
  both:        'Hybrid',
}

const card = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: 16,
}

const inputStyle = {
  width: '100%', height: 44, background: 'var(--bg-input)',
  border: '1px solid var(--border)', borderRadius: 12, padding: '0 12px',
  fontSize: 15, color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box',
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function getPeriod(key, customStart, customEnd) {
  const now = new Date()
  if (key === 'this_month') {
    return {
      start: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10),
      end:   new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10),
    }
  }
  if (key === 'last_month') {
    return {
      start: new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 10),
      end:   new Date(now.getFullYear(), now.getMonth(), 0).toISOString().slice(0, 10),
    }
  }
  return { start: customStart || todayISO(), end: customEnd || todayISO() }
}

function rupees(n) {
  return `₹${Number(n || 0).toLocaleString('en-IN')}`
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

function modelIncludesClient(model) {
  return model === 'per_client' || model === 'hybrid' || model === 'both'
}
function modelIncludesSession(model) {
  return model === 'per_session' || model === 'hybrid' || model === 'both'
}

// ── Toast ─────────────────────────────────────────────────────────────────────

function Toast({ message, type, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2600)
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

// ── BottomSheet ───────────────────────────────────────────────────────────────

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
          background: 'rgba(0,0,0,0.5)',
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

// ── Model pill ──────────────────────────────────────────────────────────────────

function ModelPill({ model }) {
  if (!model) return null
  return (
    <span style={{
      display: 'inline-block', background: 'var(--bg-elevated)', color: 'var(--text-secondary)',
      fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 999,
    }}>
      {MODEL_LABEL[model] || model}
    </span>
  )
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, accent }) {
  return (
    <div style={{ ...card, padding: 14, flex: 1, minWidth: 0 }}>
      <p style={{
        fontSize: 20, fontWeight: 700, margin: '0 0 2px',
        color: accent || 'var(--text-primary)', letterSpacing: -0.5,
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      }}>
        {value}
      </p>
      <p style={{ fontSize: 11, color: 'var(--text-tertiary)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {label}
      </p>
    </div>
  )
}

// ── Rate Sheet ────────────────────────────────────────────────────────────────

function RateSheet({ open, onClose, trainer, gymId, onSaved, showToast }) {
  const [model, setModel] = useState('per_client')
  const [perClient, setPerClient] = useState('')
  const [perSession, setPerSession] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open && trainer) {
      setModel(trainer.model === 'both' ? 'hybrid' : (trainer.model || 'per_client'))
      setPerClient(trainer.per_client_rate ? String(trainer.per_client_rate) : '')
      setPerSession(trainer.per_session_rate ? String(trainer.per_session_rate) : '')
    }
  }, [open, trainer])

  async function save() {
    if (saving || !trainer) return
    setSaving(true)
    try {
      await apiFetch(`/api/trainer-earnings/rate/${trainer.trainer_id}`, {
        method: 'PUT',
        body: JSON.stringify({
          gymId,
          model,
          per_client_rate: modelIncludesClient(model) ? Number(perClient) || 0 : null,
          per_session_rate: modelIncludesSession(model) ? Number(perSession) || 0 : null,
        }),
      })
      showToast('Rate updated')
      onSaved()
      onClose()
    } catch (err) {
      showToast(err.message || 'Failed to save rate', 'error')
    } finally {
      setSaving(false)
    }
  }

  const segOptions = [
    { key: 'per_client', label: 'Per Client' },
    { key: 'per_session', label: 'Per Session' },
    { key: 'hybrid', label: 'Both' },
  ]

  return (
    <BottomSheet open={open} onClose={onClose} title={`Set Rate — ${trainer?.full_name || 'Trainer'}`}>
      {/* Segmented control */}
      <div style={{
        display: 'flex', background: 'var(--bg-elevated)', borderRadius: 12,
        padding: 4, gap: 4, marginBottom: 18,
      }}>
        {segOptions.map(opt => {
          const active = model === opt.key
          return (
            <button
              key={opt.key}
              onClick={() => setModel(opt.key)}
              style={{
                flex: 1, height: 38, border: 'none', borderRadius: 9, cursor: 'pointer',
                fontSize: 13, fontWeight: 600,
                background: active ? 'var(--bg-card)' : 'transparent',
                color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                boxShadow: active ? '0 1px 3px rgba(0,0,0,0.12)' : 'none',
                transition: 'all 0.15s',
              }}
            >
              {opt.label}
            </button>
          )
        })}
      </div>

      {modelIncludesClient(model) && (
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
            Per Client Rate (₹/client/month)
          </label>
          <input
            type="number" inputMode="numeric" value={perClient}
            onChange={e => setPerClient(e.target.value)}
            placeholder="0" style={inputStyle}
          />
        </div>
      )}

      {modelIncludesSession(model) && (
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
            Per Session Rate (₹/session)
          </label>
          <input
            type="number" inputMode="numeric" value={perSession}
            onChange={e => setPerSession(e.target.value)}
            placeholder="0" style={inputStyle}
          />
        </div>
      )}

      <button
        onClick={save}
        disabled={saving}
        style={{
          width: '100%', height: 50, marginTop: 8, border: 'none', borderRadius: 12,
          background: 'var(--text-primary)', color: 'var(--bg-card)',
          fontSize: 15, fontWeight: 600, cursor: saving ? 'default' : 'pointer',
          opacity: saving ? 0.6 : 1,
        }}
      >
        {saving ? 'Saving…' : 'Save'}
      </button>
    </BottomSheet>
  )
}

// ── Payout Sheet ──────────────────────────────────────────────────────────────

function PayoutSheet({ open, onClose, trainer, gymId, period, onSaved, showToast }) {
  const [amount, setAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open && trainer) {
      setAmount(String(trainer.outstanding || 0))
      setNotes('')
    }
  }, [open, trainer])

  if (!trainer) return <BottomSheet open={open} onClose={onClose} title="Record Payout" />

  const clientEarnings = modelIncludesClient(trainer.model)
    ? trainer.active_clients * (trainer.per_client_rate || 0) : 0
  const sessionEarnings = modelIncludesSession(trainer.model)
    ? trainer.sessions_count * (trainer.per_session_rate || 0) : 0

  async function confirm() {
    if (saving) return
    const amt = Number(amount)
    if (!Number.isFinite(amt) || amt <= 0) {
      showToast('Enter a valid amount', 'error')
      return
    }
    setSaving(true)
    try {
      await apiFetch('/api/trainer-earnings/payout', {
        method: 'POST',
        body: JSON.stringify({
          gymId,
          trainerId: trainer.trainer_id,
          period_start: period.start,
          period_end: period.end,
          amount: amt,
          breakdown: {
            model: trainer.model,
            active_clients: trainer.active_clients,
            sessions_count: trainer.sessions_count,
            per_client_rate: trainer.per_client_rate,
            per_session_rate: trainer.per_session_rate,
            client_earnings: clientEarnings,
            session_earnings: sessionEarnings,
            computed_amount: trainer.computed_amount,
          },
          notes: notes.trim() || null,
        }),
      })
      showToast('Payout recorded')
      onSaved()
      onClose()
    } catch (err) {
      showToast(err.message || 'Failed to record payout', 'error')
    } finally {
      setSaving(false)
    }
  }

  const rowStyle = { display: 'flex', justifyContent: 'space-between', fontSize: 14, color: 'var(--text-secondary)', marginBottom: 6 }

  return (
    <BottomSheet open={open} onClose={onClose} title={`Record Payout — ${trainer.full_name || 'Trainer'}`}>
      <div style={{ ...card, padding: 14, marginBottom: 16, background: 'var(--bg-elevated)' }}>
        <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Period</div>
        <div style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 600 }}>
          {formatDate(period.start)} – {formatDate(period.end)}
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
          Amount (₹)
        </label>
        <input
          type="number" inputMode="numeric" value={amount}
          onChange={e => setAmount(e.target.value)}
          style={inputStyle}
        />
      </div>

      {/* Breakdown (read-only) */}
      <div style={{ ...card, padding: 14, marginBottom: 16 }}>
        {modelIncludesClient(trainer.model) && (
          <div style={rowStyle}>
            <span>Client earnings ({trainer.active_clients} × {rupees(trainer.per_client_rate)})</span>
            <span>{rupees(clientEarnings)}</span>
          </div>
        )}
        {modelIncludesSession(trainer.model) && (
          <div style={rowStyle}>
            <span>Session earnings ({trainer.sessions_count} × {rupees(trainer.per_session_rate)})</span>
            <span>{rupees(sessionEarnings)}</span>
          </div>
        )}
        <div style={{ ...rowStyle, marginBottom: 0, paddingTop: 6, borderTop: '1px solid var(--border)', color: 'var(--text-primary)', fontWeight: 600 }}>
          <span>Computed</span>
          <span>{rupees(trainer.computed_amount)}</span>
        </div>
        <div style={{ ...rowStyle, marginTop: 6, marginBottom: 0 }}>
          <span>Already paid</span>
          <span>{rupees(trainer.paid_amount)}</span>
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
          Notes (optional)
        </label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={3}
          placeholder="e.g. paid via UPI"
          style={{ ...inputStyle, height: 'auto', padding: 12, resize: 'vertical' }}
        />
      </div>

      <button
        onClick={confirm}
        disabled={saving}
        style={{
          width: '100%', height: 50, border: 'none', borderRadius: 12,
          background: 'var(--text-primary)', color: 'var(--bg-card)',
          fontSize: 15, fontWeight: 600, cursor: saving ? 'default' : 'pointer',
          opacity: saving ? 0.6 : 1,
        }}
      >
        {saving ? 'Recording…' : 'Confirm Payout'}
      </button>
    </BottomSheet>
  )
}

// ── Trainer card ──────────────────────────────────────────────────────────────

function TrainerCard({ trainer, onSetRate, onMarkPaid }) {
  const clientEarnings = modelIncludesClient(trainer.model)
    ? trainer.active_clients * (trainer.per_client_rate || 0) : 0
  const sessionEarnings = modelIncludesSession(trainer.model)
    ? trainer.sessions_count * (trainer.per_session_rate || 0) : 0
  const hasOutstanding = trainer.outstanding > 0
  const rowStyle = { display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 5 }

  return (
    <div style={{ ...card, padding: 16, marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>
          {trainer.full_name || 'Trainer'}
        </span>
        <ModelPill model={trainer.model} />
      </div>

      <div style={{ fontSize: 13, color: 'var(--text-tertiary)', marginBottom: 12 }}>
        {trainer.active_clients} active clients · {trainer.sessions_count} sessions
      </div>

      {/* Breakdown */}
      <div style={{ marginBottom: 12 }}>
        {modelIncludesClient(trainer.model) && (
          <div style={rowStyle}>
            <span>Client earnings ({trainer.active_clients} × {rupees(trainer.per_client_rate)})</span>
            <span>{rupees(clientEarnings)}</span>
          </div>
        )}
        {modelIncludesSession(trainer.model) && (
          <div style={rowStyle}>
            <span>Session earnings ({trainer.sessions_count} × {rupees(trainer.per_session_rate)})</span>
            <span>{rupees(sessionEarnings)}</span>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 8, marginBottom: 5 }}>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Total</span>
          <span style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)' }}>{rupees(trainer.computed_amount)}</span>
        </div>
        <div style={rowStyle}>
          <span>Paid</span>
          <span style={{ color: 'var(--text-secondary)' }}>{rupees(trainer.paid_amount)}</span>
        </div>
        <div style={{ ...rowStyle, marginBottom: 0 }}>
          <span>Outstanding</span>
          <span style={{ fontWeight: 600, color: hasOutstanding ? 'var(--warning)' : 'var(--success)' }}>
            {rupees(trainer.outstanding)}
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <button
          onClick={() => onSetRate(trainer)}
          style={{
            flex: 1, height: 42, borderRadius: 12, cursor: 'pointer',
            background: 'transparent', border: '1px solid var(--border)',
            color: 'var(--text-primary)', fontSize: 14, fontWeight: 600,
          }}
        >
          Set Rate
        </button>
        <button
          onClick={() => onMarkPaid(trainer)}
          disabled={!hasOutstanding}
          style={{
            flex: 1, height: 42, borderRadius: 12, border: 'none',
            cursor: hasOutstanding ? 'pointer' : 'default',
            background: 'var(--text-primary)', color: 'var(--bg-card)',
            fontSize: 14, fontWeight: 600, opacity: hasOutstanding ? 1 : 0.4,
          }}
        >
          Mark Paid
        </button>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function GymTrainerPayouts() {
  const navigate = useNavigate()
  const gymId = useOwnerGymId()

  const [moreOpen, setMoreOpen] = useState(false)
  const [toast, setToast] = useState(null)
  const [trainers, setTrainers] = useState([])
  const [loading, setLoading] = useState(true)

  // Period
  const [periodKey, setPeriodKey] = useState('this_month')
  const [customStart, setCustomStart] = useState(todayISO())
  const [customEnd, setCustomEnd] = useState(todayISO())
  const [periodDropOpen, setPeriodDropOpen] = useState(false)

  // Sheets
  const [rateTarget, setRateTarget] = useState(null)
  const [payoutTarget, setPayoutTarget] = useState(null)

  const period = getPeriod(periodKey, customStart, customEnd)
  const periodLabel = PERIODS.find(p => p.key === periodKey)?.label || 'This Month'

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type })
  }, [])

  const refresh = useCallback(async () => {
    if (!gymId) return
    const { start, end } = getPeriod(periodKey, customStart, customEnd)
    setLoading(true)
    try {
      const data = await apiFetch(`/api/trainer-earnings/owner/${gymId}/summary?start=${start}&end=${end}`)
      setTrainers(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('GymTrainerPayouts fetch error:', err)
      showToast('Failed to load earnings', 'error')
    } finally {
      setLoading(false)
    }
  }, [gymId, periodKey, customStart, customEnd, showToast])

  useEffect(() => {
    refresh()
  }, [refresh])

  function applyPeriod(key) {
    setPeriodKey(key)
    if (key !== 'custom') setPeriodDropOpen(false)
  }

  function applyCustom() {
    setPeriodDropOpen(false)
    refresh()
  }

  const totalOutstanding = trainers.reduce((s, t) => s + (t.outstanding || 0), 0)
  const totalSessions = trainers.reduce((s, t) => s + (t.sessions_count || 0), 0)

  return (
    <>
      <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', paddingBottom: 96 }}>

        {/* Header */}
        <div style={{
          background: 'var(--bg-card)', borderBottom: '1px solid var(--border)',
          padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 4,
          position: 'sticky', top: 0, zIndex: 30,
        }}>
          <button onClick={() => navigate('/gym/dashboard')} style={{ background: 'none', border: 'none', padding: '4px 6px 4px 2px', cursor: 'pointer', display: 'flex' }}>
            <ChevronLeft size={22} color="var(--text-primary)" />
          </button>
          <span style={{ flex: 1, fontSize: 20, fontWeight: 600, color: 'var(--text-primary)' }}>Trainer Payouts</span>

          {/* Period selector */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setPeriodDropOpen(v => !v)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                borderRadius: 20, padding: '6px 12px', fontSize: 13, fontWeight: 500,
                color: 'var(--text-primary)', cursor: 'pointer',
              }}
            >
              {periodLabel}
              <ChevronDown size={14} color="var(--text-secondary)" />
            </button>

            {periodDropOpen && (
              <div style={{
                position: 'absolute', top: 40, right: 0, zIndex: 50,
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: 14, boxShadow: '0 6px 24px rgba(0,0,0,0.18)',
                minWidth: 200, overflow: 'hidden',
              }}>
                {PERIODS.map(p => (
                  <button
                    key={p.key}
                    onClick={() => applyPeriod(p.key)}
                    style={{
                      width: '100%', padding: '12px 16px', textAlign: 'left',
                      fontSize: 14, fontWeight: periodKey === p.key ? 600 : 400,
                      color: periodKey === p.key ? 'var(--text-cta)' : 'var(--text-primary)',
                      background: 'none', border: 'none', cursor: 'pointer',
                      borderBottom: '1px solid var(--border)',
                    }}
                  >
                    {p.label}
                  </button>
                ))}
                {periodKey === 'custom' && (
                  <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)}
                      style={{ ...inputStyle, height: 38, fontSize: 13 }} />
                    <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)}
                      style={{ ...inputStyle, height: 38, fontSize: 13 }} />
                    <button
                      onClick={applyCustom}
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
        </div>

        <div style={{ padding: '16px 16px 0' }}>
          {/* Stat cards */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
            <StatCard label="Outstanding" value={rupees(totalOutstanding)} accent={totalOutstanding > 0 ? 'var(--warning)' : 'var(--success)'} />
            <StatCard label="Trainers" value={trainers.length} />
            <StatCard label="Sessions" value={totalSessions} />
          </div>

          {/* Trainer list */}
          {loading ? (
            [0, 1, 2].map(i => (
              <div key={i} style={{ ...card, height: 200, marginBottom: 12, animation: 'gv-skel 1.2s ease infinite alternate' }} />
            ))
          ) : trainers.length === 0 ? (
            <div style={{ ...card, padding: '40px 20px', textAlign: 'center' }}>
              <Wallet size={32} color="var(--text-tertiary)" style={{ marginBottom: 10 }} />
              <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 4px' }}>No trainers yet</p>
              <p style={{ fontSize: 13, color: 'var(--text-tertiary)', margin: 0 }}>Trainers affiliated with your gym will appear here.</p>
            </div>
          ) : (
            trainers.map(t => (
              <TrainerCard
                key={t.trainer_id}
                trainer={t}
                onSetRate={setRateTarget}
                onMarkPaid={setPayoutTarget}
              />
            ))
          )}
        </div>
      </div>

      {/* Period dropdown backdrop */}
      {periodDropOpen && (
        <div onClick={() => setPeriodDropOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
      )}

      <RateSheet
        open={!!rateTarget}
        onClose={() => setRateTarget(null)}
        trainer={rateTarget}
        gymId={gymId}
        onSaved={refresh}
        showToast={showToast}
      />
      <PayoutSheet
        open={!!payoutTarget}
        onClose={() => setPayoutTarget(null)}
        trainer={payoutTarget}
        gymId={gymId}
        period={period}
        onSaved={refresh}
        showToast={showToast}
      />

      {toast && <Toast message={toast.message} type={toast.type} onDone={() => setToast(null)} />}

      <GymBottomNav onMorePress={() => setMoreOpen(true)} />
      <MoreSheet isOpen={moreOpen} onClose={() => setMoreOpen(false)} />

      <style>{`@keyframes gv-skel { from { opacity: 0.5; } to { opacity: 0.9; } }`}</style>
    </>
  )
}
