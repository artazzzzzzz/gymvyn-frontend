import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../utils/supabase'
import { ChevronLeft, ChevronDown, Plus, ChevronRight } from 'lucide-react'

const BASE = import.meta.env.VITE_API_URL

// ── Auth helpers ──────────────────────────────────────────────────────────────

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

// ── Period helpers ────────────────────────────────────────────────────────────

const PERIODS = [
  { key: 'this_month',    label: 'This Month' },
  { key: 'last_month',   label: 'Last Month' },
  { key: 'last_3_months', label: 'Last 3 Months' },
]

function getPeriod(key) {
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
  // last_3_months
  return {
    start: new Date(now.getFullYear(), now.getMonth() - 2, 1).toISOString().slice(0, 10),
    end:   new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10),
  }
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function rupees(n) {
  return `₹${Number(n || 0).toLocaleString('en-IN')}`
}

function formatDate(d) {
  if (!d) return ''
  const dt = new Date(d + 'T00:00:00')
  return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatDateShort(d) {
  if (!d) return ''
  const dt = new Date(d + 'T00:00:00')
  return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

function modelIncludesClient(model) {
  return model === 'per_client' || model === 'hybrid' || model === 'both'
}
function modelIncludesSession(model) {
  return model === 'per_session' || model === 'hybrid' || model === 'both'
}

const MODEL_LABEL = {
  per_client:  'Per Client',
  per_session: 'Per Session',
  hybrid:      'Hybrid',
  both:        'Hybrid',
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
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '4px 20px 40px' }}>
          {children}
        </div>
      </div>
    </>
  )
}

// ── Log Session Sheet ─────────────────────────────────────────────────────────

function LogSessionSheet({ open, onClose, user, onSaved, showToast }) {
  const [clients, setClients] = useState([])
  const [clientId, setClientId] = useState('')
  const [date, setDate] = useState(todayISO())
  const [duration, setDuration] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [loadingClients, setLoadingClients] = useState(false)

  useEffect(() => {
    if (!open || !user?.id) return
    setClientId(''); setDate(todayISO()); setDuration(''); setNotes('')
    setLoadingClients(true)
    apiFetch(`/api/trainer/clients/${user.id}`)
      .then(data => setClients(Array.isArray(data) ? data.filter(r => r.status === 'active') : []))
      .catch(() => setClients([]))
      .finally(() => setLoadingClients(false))
  }, [open, user?.id])

  async function save() {
    if (saving || !date) return
    setSaving(true)
    try {
      await apiFetch('/api/trainer-earnings/session', {
        method: 'POST',
        body: JSON.stringify({
          trainerId: user.id,
          clientId: clientId || null,
          session_date: date,
          duration_minutes: duration ? Number(duration) : null,
          notes: notes.trim() || null,
        }),
      })
      showToast('Session logged')
      onSaved()
      onClose()
    } catch (err) {
      showToast(err.message || 'Failed to log session', 'error')
    } finally {
      setSaving(false)
    }
  }

  const inputStyle = {
    width: '100%', height: 44, background: 'var(--bg-input)',
    border: '1px solid var(--border)', borderRadius: 12, padding: '0 12px',
    fontSize: 15, color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box',
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="Log Session">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
            Client (optional)
          </label>
          {loadingClients ? (
            <div style={{ ...inputStyle, display: 'flex', alignItems: 'center', color: 'var(--text-tertiary)' }}>Loading…</div>
          ) : (
            <select
              value={clientId}
              onChange={e => setClientId(e.target.value)}
              style={{ ...inputStyle, appearance: 'none', backgroundImage: 'none' }}
            >
              <option value="">— No client —</option>
              {clients.map(r => (
                <option key={r.client_id || r.id} value={r.client_id || r.client?.id || ''}>
                  {r.client?.full_name || r.invite_email || 'Client'}
                </option>
              ))}
            </select>
          )}
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
            Date
          </label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inputStyle} />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
            Duration (minutes, optional)
          </label>
          <input
            type="number" inputMode="numeric" value={duration}
            onChange={e => setDuration(e.target.value)} placeholder="60"
            style={inputStyle}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
            Notes (optional)
          </label>
          <textarea
            value={notes} onChange={e => setNotes(e.target.value)}
            rows={3} placeholder="What did you work on?"
            style={{ ...inputStyle, height: 'auto', padding: 12, resize: 'vertical' }}
          />
        </div>

        <button
          onClick={save}
          disabled={saving || !date}
          style={{
            width: '100%', height: 50, border: 'none', borderRadius: 12,
            background: 'var(--text-primary)', color: 'var(--bg-card)',
            fontSize: 15, fontWeight: 600,
            cursor: saving || !date ? 'default' : 'pointer',
            opacity: saving || !date ? 0.5 : 1,
          }}
        >
          {saving ? 'Saving…' : 'Save Session'}
        </button>
      </div>
    </BottomSheet>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skel({ h = 16, w = '100%', r = 8 }) {
  return (
    <div style={{
      height: h, width: w, background: 'var(--bg-elevated)', borderRadius: r,
      animation: 'gv-skel 1.2s ease infinite alternate',
    }} />
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function TrainerEarnings() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const [periodKey, setPeriodKey] = useState('this_month')
  const [dropOpen, setDropOpen] = useState(false)

  const [summary, setSummary] = useState(null)
  const [sessions, setSessions] = useState([])
  const [payouts, setPayouts] = useState([])
  const [loading, setLoading] = useState(true)

  const [expandedSession, setExpandedSession] = useState(null)
  const [logOpen, setLogOpen] = useState(false)
  const [toast, setToast] = useState(null)

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type })
  }, [])

  const period = getPeriod(periodKey)

  const refresh = useCallback(async () => {
    if (!user) return
    const { start, end } = getPeriod(periodKey)
    setLoading(true)
    try {
      const [sum, sess, pays] = await Promise.all([
        apiFetch(`/api/trainer-earnings/me?start=${start}&end=${end}`),
        apiFetch(`/api/trainer-earnings/me/sessions?start=${start}&end=${end}`),
        apiFetch('/api/trainer-earnings/me/payouts'),
      ])
      setSummary(sum)
      setSessions(Array.isArray(sess) ? sess.slice(0, 10) : [])
      setPayouts(Array.isArray(pays) ? pays.slice(0, 10) : [])
    } catch (err) {
      console.error('TrainerEarnings fetch error:', err)
      showToast('Failed to load earnings', 'error')
    } finally {
      setLoading(false)
    }
  }, [user, periodKey, showToast])

  useEffect(() => { refresh() }, [refresh])

  const card = { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16 }
  const sectionTitle = { fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 12px' }

  return (
    <>
      <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', paddingBottom: 100 }}>

        {/* Header */}
        <div style={{
          background: 'var(--bg-card)', borderBottom: '1px solid var(--border)',
          padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 4,
          position: 'sticky', top: 0, zIndex: 30,
        }}>
          <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', padding: '4px 6px 4px 2px', cursor: 'pointer', display: 'flex' }}>
            <ChevronLeft size={22} color="var(--text-primary)" />
          </button>
          <span style={{ flex: 1, fontSize: 20, fontWeight: 600, color: 'var(--text-primary)' }}>Earnings</span>

          {/* Period dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setDropOpen(v => !v)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                borderRadius: 20, padding: '6px 12px', fontSize: 13, fontWeight: 500,
                color: 'var(--text-primary)', cursor: 'pointer',
              }}
            >
              {PERIODS.find(p => p.key === periodKey)?.label}
              <ChevronDown size={14} color="var(--text-secondary)" />
            </button>
            {dropOpen && (
              <div style={{
                position: 'absolute', top: 40, right: 0, zIndex: 50,
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: 14, boxShadow: '0 6px 24px rgba(0,0,0,0.18)',
                minWidth: 180, overflow: 'hidden',
              }}>
                {PERIODS.map(p => (
                  <button
                    key={p.key}
                    onClick={() => { setPeriodKey(p.key); setDropOpen(false) }}
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
              </div>
            )}
          </div>
        </div>

        <div style={{ padding: '16px 16px 0' }}>

          {/* Hero summary card */}
          <div style={{ ...card, padding: 20, marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>
              Earned This Period
            </div>
            {loading ? (
              <Skel h={42} w="55%" r={10} />
            ) : (
              <div style={{ fontSize: 36, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: -1, lineHeight: 1, marginBottom: 12 }}>
                {rupees(summary?.computed_amount || 0)}
              </div>
            )}
            {loading ? (
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}><Skel h={28} w={100} r={20} /><Skel h={28} w={100} r={20} /></div>
            ) : (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <span style={{
                  background: 'var(--success-bg)', color: 'var(--success)',
                  fontSize: 13, fontWeight: 600, padding: '5px 12px', borderRadius: 20,
                }}>
                  {rupees(summary?.paid_amount || 0)} paid
                </span>
                <span style={{
                  background: 'var(--warning-bg)', color: 'var(--warning)',
                  fontSize: 13, fontWeight: 600, padding: '5px 12px', borderRadius: 20,
                }}>
                  {rupees(summary?.pending_amount || 0)} pending
                </span>
              </div>
            )}
          </div>

          {/* Rate card */}
          <div style={{ ...card, padding: 16, marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>Your Rate</span>
              {summary?.rate && (
                <span style={{
                  background: 'var(--bg-elevated)', color: 'var(--text-secondary)',
                  fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 999,
                }}>
                  {MODEL_LABEL[summary.rate.model] || summary.rate.model}
                </span>
              )}
            </div>
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Skel h={16} w="80%" />
                <Skel h={16} w="60%" />
              </div>
            ) : !summary?.rate ? (
              <p style={{ fontSize: 14, color: 'var(--text-tertiary)', margin: 0 }}>
                Your gym owner hasn't set your rate yet.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {modelIncludesClient(summary.rate.model) && (
                  <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
                    Per client:{' '}
                    <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{rupees(summary.rate.per_client_rate)}/client/month</span>
                    {summary.active_clients != null && (
                      <span style={{ color: 'var(--text-tertiary)' }}>
                        {' '}(× {summary.active_clients} clients = {rupees((summary.rate.per_client_rate || 0) * summary.active_clients)})
                      </span>
                    )}
                  </div>
                )}
                {modelIncludesSession(summary.rate.model) && (
                  <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
                    Per session:{' '}
                    <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{rupees(summary.rate.per_session_rate)}/session</span>
                    {summary.sessions_count != null && (
                      <span style={{ color: 'var(--text-tertiary)' }}>
                        {' '}(× {summary.sessions_count} sessions = {rupees((summary.rate.per_session_rate || 0) * summary.sessions_count)})
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sessions section */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <h2 style={{ ...sectionTitle, margin: 0 }}>
                Sessions This Period
                {!loading && summary != null && (
                  <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-tertiary)', marginLeft: 6 }}>
                    {summary.sessions_count ?? sessions.length}
                  </span>
                )}
              </h2>
              <button
                onClick={() => setLogOpen(true)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  background: 'transparent', border: '1px solid var(--border)',
                  borderRadius: 20, padding: '5px 12px', fontSize: 13, fontWeight: 600,
                  color: 'var(--text-cta)', cursor: 'pointer',
                }}
              >
                <Plus size={14} />
                Log Session
              </button>
            </div>

            {loading ? (
              <div style={{ ...card, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[0,1,2].map(i => <Skel key={i} h={20} />)}
              </div>
            ) : sessions.length === 0 ? (
              <div style={{ ...card, padding: '24px 16px', textAlign: 'center' }}>
                <p style={{ fontSize: 14, color: 'var(--text-tertiary)', margin: 0 }}>No sessions logged this period.</p>
              </div>
            ) : (
              <div style={{ ...card, overflow: 'hidden' }}>
                {sessions.map((s, i) => {
                  const expanded = expandedSession === s.id
                  return (
                    <div key={s.id}>
                      <button
                        onClick={() => setExpandedSession(expanded ? null : s.id)}
                        style={{
                          width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                          padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {s.client?.full_name || 'Unassigned'}
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                            {formatDateShort(s.session_date)}{s.duration_minutes ? ` · ${s.duration_minutes} min` : ''}
                          </div>
                        </div>
                        <ChevronRight
                          size={16}
                          color="var(--text-tertiary)"
                          style={{ transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}
                        />
                      </button>
                      {expanded && s.notes && (
                        <div style={{ padding: '0 16px 12px', fontSize: 13, color: 'var(--text-secondary)', borderTop: '1px solid var(--border)' }}>
                          {s.notes}
                        </div>
                      )}
                      {expanded && !s.notes && (
                        <div style={{ padding: '0 16px 12px', fontSize: 13, color: 'var(--text-tertiary)', borderTop: '1px solid var(--border)' }}>
                          No notes.
                        </div>
                      )}
                      {i < sessions.length - 1 && (
                        <div style={{ height: 1, background: 'var(--border)', marginLeft: 16 }} />
                      )}
                    </div>
                  )
                })}
                {(summary?.sessions_count || 0) > 10 && (
                  <button
                    onClick={() => navigate('/trainer/earnings/sessions')}
                    style={{
                      width: '100%', padding: '12px 16px', background: 'none', border: 'none',
                      borderTop: '1px solid var(--border)', cursor: 'pointer', textAlign: 'center',
                      fontSize: 13, fontWeight: 600, color: 'var(--text-cta)',
                    }}
                  >
                    View all
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Payouts section */}
          <div style={{ marginBottom: 14 }}>
            <h2 style={sectionTitle}>Payouts</h2>
            {loading ? (
              <div style={{ ...card, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[0,1].map(i => <Skel key={i} h={20} />)}
              </div>
            ) : payouts.length === 0 ? (
              <div style={{ ...card, padding: '24px 16px', textAlign: 'center' }}>
                <p style={{ fontSize: 14, color: 'var(--text-tertiary)', margin: 0 }}>No payouts yet.</p>
              </div>
            ) : (
              <div style={{ ...card, overflow: 'hidden' }}>
                {payouts.map((p, i) => (
                  <div key={p.id}>
                    <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>
                          {rupees(p.amount)}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                          {p.period_start && p.period_end
                            ? `${formatDateShort(p.period_start)} – ${formatDateShort(p.period_end)}`
                            : '—'}
                        </div>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-tertiary)', textAlign: 'right' }}>
                        {p.paid_at ? formatDate(p.paid_at.slice(0, 10)) : ''}
                      </div>
                    </div>
                    {i < payouts.length - 1 && (
                      <div style={{ height: 1, background: 'var(--border)', marginLeft: 16 }} />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Period dropdown backdrop */}
      {dropOpen && (
        <div onClick={() => setDropOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
      )}

      <LogSessionSheet
        open={logOpen}
        onClose={() => setLogOpen(false)}
        user={user}
        onSaved={refresh}
        showToast={showToast}
      />

      {toast && <Toast message={toast.message} type={toast.type} onDone={() => setToast(null)} />}

      <style>{`@keyframes gv-skel { from { opacity: 0.5; } to { opacity: 0.9; } }`}</style>
    </>
  )
}
