import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../utils/supabase'
import { KeyRound, Plus, X, ChevronLeft } from 'lucide-react'
import GymBottomNav from '../../components/GymBottomNav'
import MoreSheet from '../../components/MoreSheet'
import PrimaryButton from '../../components/PrimaryButton'
import { useOwnerGymId } from '../../hooks/useOwnerGymId'

const BASE = import.meta.env.VITE_API_URL

// ── API helpers ───────────────────────────────────────────────────────────────

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
  if (!res.ok) throw Object.assign(new Error(data.error || `Request failed (${res.status})`), { status: res.status })
  return data
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function isExpiringSoon(expiresAt) {
  if (!expiresAt) return false
  return (new Date(expiresAt) - Date.now()) <= 3 * 24 * 60 * 60 * 1000
}

const STATUS_META = {
  available:   { label: 'Available',   bg: 'var(--success-bg)', color: 'var(--success)' },
  occupied:    { label: 'Occupied',    bg: 'var(--accent-bg)', color: 'var(--text-cta)' },
  maintenance: { label: 'Maintenance', bg: 'var(--warning-bg)', color: 'var(--warning)' },
}

// ── Shared UI ─────────────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const m = STATUS_META[status] || STATUS_META.available
  return (
    <span style={{
      background: m.bg, color: m.color,
      fontSize: 11, fontWeight: 600,
      padding: '3px 8px', borderRadius: 20,
    }}>{m.label}</span>
  )
}

function Sheet({ onClose, children, title, zIndex = 51 }) {
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: zIndex - 1 }} />
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex,
        backgroundColor: "var(--bg-card)", borderRadius: '20px 20px 0 0',
        maxHeight: '90vh', overflowY: 'auto', paddingBottom: 40,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}>
        <div style={{ width: 40, height: 4, backgroundColor: 'var(--border)', borderRadius: 2, margin: '12px auto 0' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px 12px' }}>
          <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>{title}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <X size={20} color="var(--text-secondary)" />
          </button>
        </div>
        <div style={{ padding: '0 20px' }}>
          {children}
        </div>
      </div>
    </>
  )
}

function Toggle({ value, onChange }) {
  return (
    <div
      onClick={() => onChange(!value)}
      style={{
        width: 44, height: 26, borderRadius: 13,
        backgroundColor: value ? 'var(--text-primary)' : 'var(--border)',
        position: 'relative', cursor: 'pointer',
        transition: 'background-color 0.2s', flexShrink: 0,
      }}
    >
      <div style={{
        position: 'absolute', top: 3,
        left: value ? 21 : 3,
        width: 20, height: 20, borderRadius: '50%',
        backgroundColor: "var(--bg-card)",
        transition: 'left 0.2s',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
      }} />
    </div>
  )
}

function FieldInput({ label, value, onChange, placeholder, type = 'text', error }) {
  return (
    <div style={{ marginBottom: 14 }}>
      {label && <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>{label}</div>}
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          width: '100%', height: 48,
          border: `1px solid ${error ? 'var(--error)' : 'rgba(0,0,0,0.15)'}`,
          borderRadius: 12, padding: '0 14px', fontSize: 15,
          boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit', color: 'var(--text-primary)',
        }}
      />
      {error && <div style={{ fontSize: 12, color: 'var(--error)', marginTop: 4 }}>{error}</div>}
    </div>
  )
}

function Toast({ toast }) {
  if (!toast) return null
  return (
    <div style={{
      position: 'fixed', top: 16, left: 16, right: 16, zIndex: 200,
      backgroundColor: toast.type === 'error' ? 'var(--error-bg)' : 'var(--success-bg)',
      borderRadius: 16, padding: '14px 16px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
    }}>
      <div style={{ fontSize: 15, fontWeight: 600, color: toast.type === 'error' ? 'var(--error)' : 'var(--success)' }}>
        {toast.message}
      </div>
    </div>
  )
}

// ── AddLockerSheet ─────────────────────────────────────────────────────────────

function AddLockerSheet({ onClose, onAdded }) {
  const [label, setLabel] = useState('')
  const [isPaid, setIsPaid] = useState(false)
  const [price, setPrice] = useState('')
  const [error, setError] = useState(null)
  const [labelError, setLabelError] = useState(null)
  const [saving, setSaving] = useState(false)

  const handleSubmit = async () => {
    if (!label.trim()) { setLabelError('Label is required'); return }
    if (isPaid && (!price || Number(price) <= 0)) { setError('Price must be greater than 0'); return }
    setSaving(true)
    setLabelError(null)
    setError(null)
    try {
      const data = await apiFetch('/api/lockers', {
        method: 'POST',
        body: JSON.stringify({ label: label.trim(), is_paid: isPaid, price: isPaid ? Number(price) : undefined }),
      })
      onAdded(data)
      onClose()
    } catch (err) {
      if (err.status === 409) setLabelError(err.message)
      else setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet title="Add Locker" onClose={onClose}>
      <FieldInput label="Label" value={label} onChange={v => { setLabel(v); setLabelError(null) }}
        placeholder="e.g. A1, VIP-1" error={labelError} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, minHeight: 44 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Paid locker?</div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Charge members for this locker</div>
        </div>
        <Toggle value={isPaid} onChange={setIsPaid} />
      </div>
      {isPaid && (
        <FieldInput label="Price (₹)" value={price} onChange={v => { setPrice(v); setError(null) }}
          placeholder="e.g. 500" type="number" error={error} />
      )}
      {error && !isPaid && <div style={{ fontSize: 12, color: 'var(--error)', marginBottom: 10 }}>{error}</div>}
      <PrimaryButton onClick={handleSubmit} disabled={saving || !label.trim()}>
        {saving ? 'Adding…' : 'Add Locker'}
      </PrimaryButton>
    </Sheet>
  )
}

// ── AssignSheet ───────────────────────────────────────────────────────────────

const DURATION_PRESETS = [
  { label: '1 Month', days: 30 },
  { label: '3 Months', days: 90 },
  { label: '6 Months', days: 180 },
  { label: '12 Months', days: 365 },
]

function AssignSheet({ locker, gymId, onClose, onAssigned }) {
  const [members, setMembers] = useState([])
  const [membersLoading, setMembersLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedMember, setSelectedMember] = useState(null)
  const [durationPreset, setDurationPreset] = useState(30)
  const [customDays, setCustomDays] = useState('')
  const [isCustom, setIsCustom] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!gymId) return
    supabase.auth.getSession().then(({ data: { session } }) =>
      fetch(`${BASE}/api/gym-members?gymId=${encodeURIComponent(gymId)}&limit=500&page=1`, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      })
        .then(r => r.json())
        .then(d => setMembers(Array.isArray(d) ? d : (d.members || [])))
        .catch(() => setMembers([]))
        .finally(() => setMembersLoading(false))
    )
  }, [gymId])

  const filtered = members.filter(m =>
    (m.full_name || '').toLowerCase().includes(search.toLowerCase())
  )

  const effectiveDays = isCustom ? parseInt(customDays, 10) : durationPreset
  const canSubmit = selectedMember && (isCustom ? effectiveDays > 0 : true)

  const handleAssign = async () => {
    if (!canSubmit) return
    setSaving(true)
    setError(null)
    try {
      await apiFetch(`/api/lockers/${locker.id}/assign`, {
        method: 'POST',
        body: JSON.stringify({ member_id: selectedMember.user_id, duration_days: effectiveDays }),
      })
      onAssigned()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet title={`Assign ${locker.label}`} onClose={onClose} zIndex={62}>
      {/* Member search */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Member</div>
        {selectedMember ? (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 14px', borderRadius: 12, border: '1px solid var(--text-primary)', background: 'var(--bg-primary)',
          }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{selectedMember.full_name}</span>
            <button onClick={() => setSelectedMember(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
              <X size={16} color="var(--text-secondary)" />
            </button>
          </div>
        ) : (
          <>
            <input
              placeholder="Search by name…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%', height: 44, border: '1px solid rgba(0,0,0,0.15)',
                borderRadius: 12, padding: '0 14px', fontSize: 15,
                boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit', color: 'var(--text-primary)',
              }}
            />
            {search && (
              <div style={{
                marginTop: 6, borderRadius: 12, border: '1px solid rgba(0,0,0,0.1)',
                overflow: 'hidden', maxHeight: 180, overflowY: 'auto',
              }}>
                {membersLoading ? (
                  <div style={{ padding: '12px 14px', fontSize: 13, color: 'var(--text-tertiary)' }}>Loading…</div>
                ) : filtered.length === 0 ? (
                  <div style={{ padding: '12px 14px', fontSize: 13, color: 'var(--text-tertiary)' }}>No members found</div>
                ) : filtered.slice(0, 20).map(m => (
                  <button key={m.user_id || m.id}
                    onClick={() => { setSelectedMember(m); setSearch('') }}
                    style={{
                      width: '100%', textAlign: 'left', padding: '10px 14px',
                      background: 'none', border: 'none', cursor: 'pointer',
                      borderBottom: '0.5px solid rgba(0,0,0,0.06)',
                      fontSize: 14, color: 'var(--text-primary)',
                    }}
                  >
                    {m.full_name}
                    {m.plan_type && <span style={{ color: 'var(--text-tertiary)', marginLeft: 8, fontSize: 12 }}>{m.plan_type}</span>}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Duration presets */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>Duration</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {DURATION_PRESETS.map(p => (
            <button key={p.days}
              onClick={() => { setDurationPreset(p.days); setIsCustom(false) }}
              style={{
                padding: '7px 14px', borderRadius: 20, fontSize: 13, fontWeight: 500,
                border: !isCustom && durationPreset === p.days ? '1.5px solid var(--text-primary)' : '1px solid rgba(0,0,0,0.15)',
                background: !isCustom && durationPreset === p.days ? 'var(--text-primary)' : "var(--bg-card)",
                color: !isCustom && durationPreset === p.days ? 'white' : 'var(--text-primary)',
                cursor: 'pointer',
              }}
            >{p.label}</button>
          ))}
          <button
            onClick={() => setIsCustom(true)}
            style={{
              padding: '7px 14px', borderRadius: 20, fontSize: 13, fontWeight: 500,
              border: isCustom ? '1.5px solid var(--text-primary)' : '1px solid rgba(0,0,0,0.15)',
              background: isCustom ? 'var(--text-primary)' : "var(--bg-card)",
              color: isCustom ? 'white' : 'var(--text-primary)',
              cursor: 'pointer',
            }}
          >Custom</button>
        </div>
        {isCustom && (
          <div style={{ marginTop: 10 }}>
            <FieldInput value={customDays} onChange={setCustomDays} placeholder="Number of days" type="number" />
          </div>
        )}
      </div>

      {/* Price reminder */}
      {locker.is_paid && (
        <div style={{
          padding: '10px 14px', borderRadius: 12, background: 'var(--accent-bg)',
          fontSize: 13, color: 'var(--text-cta)', marginBottom: 16, fontWeight: 500,
        }}>
          ₹{locker.price?.toLocaleString('en-IN')} will be due for this locker
        </div>
      )}

      {error && <div style={{ fontSize: 13, color: 'var(--error)', marginBottom: 12 }}>{error}</div>}

      <PrimaryButton onClick={handleAssign} disabled={saving || !canSubmit}>
        {saving ? 'Assigning…' : 'Assign Locker'}
      </PrimaryButton>
    </Sheet>
  )
}

// ── LockerDetailSheet ─────────────────────────────────────────────────────────

function LockerDetailSheet({ locker, gymId, onClose, onRefresh, onAssign }) {
  const [editLabel, setEditLabel] = useState(locker.label)
  const [editIsPaid, setEditIsPaid] = useState(locker.is_paid)
  const [editPrice, setEditPrice] = useState(locker.price ? String(locker.price) : '')
  const [editStatus, setEditStatus] = useState(locker.status)
  const [editMode, setEditMode] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showEndConfirm, setShowEndConfirm] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showMarkPaid, setShowMarkPaid] = useState(false)
  const [payMethod, setPayMethod] = useState(null)
  const [error, setError] = useState(null)
  const [labelError, setLabelError] = useState(null)
  const [busy, setBusy] = useState(false)

  const a = locker.assignment
  const expSoon = a ? isExpiringSoon(a.expires_at) : false

  // ── Edit/Save ──────────────────────────────────────────────────────────────

  const handleSaveEdit = async () => {
    if (!editLabel.trim()) { setLabelError('Label is required'); return }
    if (editIsPaid && (!editPrice || Number(editPrice) <= 0)) {
      setError('Price must be greater than 0'); return
    }
    setSaving(true)
    setLabelError(null)
    setError(null)
    try {
      await apiFetch(`/api/lockers/${locker.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          label: editLabel.trim(),
          is_paid: editIsPaid,
          price: editIsPaid ? Number(editPrice) : null,
          status: editStatus,
        }),
      })
      onRefresh()
      setEditMode(false)
    } catch (err) {
      if (err.status === 409) setLabelError(err.message)
      else setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  // ── End assignment ─────────────────────────────────────────────────────────

  const handleEndAssignment = async () => {
    setBusy(true)
    try {
      await apiFetch(`/api/lockers/${locker.id}/end-assignment`, { method: 'PATCH' })
      onRefresh()
      onClose()
    } catch (err) {
      setError(err.message)
      setShowEndConfirm(false)
    } finally {
      setBusy(false)
    }
  }

  // ── Mark paid ──────────────────────────────────────────────────────────────

  const handleMarkPaid = async () => {
    if (!payMethod) return
    setBusy(true)
    try {
      await apiFetch(`/api/lockers/${locker.id}/payment`, {
        method: 'PATCH',
        body: JSON.stringify({ payment_method: payMethod }),
      })
      onRefresh()
      onClose()
    } catch (err) {
      setError(err.message)
      setShowMarkPaid(false)
    } finally {
      setBusy(false)
    }
  }

  // ── Delete ─────────────────────────────────────────────────────────────────

  const handleDelete = async () => {
    setBusy(true)
    try {
      await apiFetch(`/api/lockers/${locker.id}`, { method: 'DELETE' })
      onRefresh()
      onClose()
    } catch (err) {
      setError(err.message)
      setShowDeleteConfirm(false)
    } finally {
      setBusy(false)
    }
  }

  // ── Mark available (from maintenance) ─────────────────────────────────────

  const handleMarkAvailable = async () => {
    setBusy(true)
    try {
      await apiFetch(`/api/lockers/${locker.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'available' }),
      })
      onRefresh()
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const rowStyle = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }
  const labelStyle = { fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }
  const valueStyle = { fontSize: 14, color: 'var(--text-primary)', fontWeight: 600, textAlign: 'right' }

  return (
    <Sheet title={`Locker ${locker.label}`} onClose={onClose}>
      {/* Status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <StatusBadge status={locker.status} />
        {locker.is_paid && (
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', background: 'var(--bg-pill)', padding: '3px 8px', borderRadius: 20 }}>
            ₹{locker.price?.toLocaleString('en-IN')}
          </span>
        )}
      </div>

      {/* ── AVAILABLE ─────────────────────────────────────────────────── */}
      {locker.status === 'available' && (
        <>
          {editMode ? (
            <div style={{ marginBottom: 16 }}>
              <FieldInput label="Label" value={editLabel} onChange={v => { setEditLabel(v); setLabelError(null) }}
                placeholder="e.g. A1" error={labelError} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, minHeight: 44 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Paid locker?</div>
                </div>
                <Toggle value={editIsPaid} onChange={setEditIsPaid} />
              </div>
              {editIsPaid && (
                <FieldInput label="Price (₹)" value={editPrice} onChange={v => { setEditPrice(v); setError(null) }}
                  placeholder="e.g. 500" type="number" />
              )}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Status</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {['available', 'maintenance'].map(s => (
                    <button key={s}
                      onClick={() => setEditStatus(s)}
                      style={{
                        padding: '7px 14px', borderRadius: 20, fontSize: 13, fontWeight: 500, cursor: 'pointer',
                        border: editStatus === s ? '1.5px solid var(--text-primary)' : '1px solid rgba(0,0,0,0.15)',
                        background: editStatus === s ? 'var(--text-primary)' : "var(--bg-card)",
                        color: editStatus === s ? 'white' : 'var(--text-primary)',
                      }}
                    >{s === 'available' ? 'Available' : 'Maintenance'}</button>
                  ))}
                </div>
              </div>
              {error && <div style={{ fontSize: 12, color: 'var(--error)', marginBottom: 10 }}>{error}</div>}
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setEditMode(false)} style={{
                  flex: 1, height: 48, borderRadius: 12, border: '1px solid rgba(0,0,0,0.15)',
                  background: "var(--bg-card)", fontSize: 15, fontWeight: 500, cursor: 'pointer', color: 'var(--text-primary)',
                }}>Cancel</button>
                <button onClick={handleSaveEdit} disabled={saving} style={{
                  flex: 1, height: 48, borderRadius: 12, border: 'none',
                  background: 'var(--text-primary)', fontSize: 15, fontWeight: 500, cursor: 'pointer', color: "var(--bg-card)",
                  opacity: saving ? 0.6 : 1,
                }}>{saving ? 'Saving…' : 'Save'}</button>
              </div>
            </div>
          ) : (
            <>
              <button onClick={() => setEditMode(true)} style={{
                background: 'none', border: 'none', fontSize: 13, color: 'var(--text-cta)',
                cursor: 'pointer', padding: 0, marginBottom: 20, fontWeight: 500,
              }}>Edit locker details</button>
              <PrimaryButton onClick={() => onAssign(locker)}>Assign to Member</PrimaryButton>
            </>
          )}

          <button
            onClick={() => setShowDeleteConfirm(true)}
            style={{
              background: 'none', border: 'none', fontSize: 13, color: 'var(--error)',
              cursor: 'pointer', padding: '12px 0 0', width: '100%', textAlign: 'center',
            }}
          >Delete locker</button>
        </>
      )}

      {/* ── OCCUPIED ──────────────────────────────────────────────────── */}
      {locker.status === 'occupied' && a && (
        <>
          <div style={{ background: 'var(--bg-primary)', borderRadius: 12, padding: '12px 14px', marginBottom: 16 }}>
            <div style={rowStyle}>
              <span style={labelStyle}>Member</span>
              <span style={valueStyle}>{a.member_name || '—'}</span>
            </div>
            <div style={rowStyle}>
              <span style={labelStyle}>Assigned</span>
              <span style={valueStyle}>{formatDate(locker.assignment?.assigned_at)}</span>
            </div>
            <div style={rowStyle}>
              <span style={labelStyle}>Duration</span>
              <span style={valueStyle}>{a.duration_days} days</span>
            </div>
            <div style={{ ...rowStyle, marginBottom: 0 }}>
              <span style={labelStyle}>Expires</span>
              <span style={{
                ...valueStyle,
                color: expSoon ? 'var(--error)' : 'var(--text-primary)',
              }}>
                {formatDate(a.expires_at)}
                {expSoon && ' ⚠'}
              </span>
            </div>
          </div>

          {/* Payment status */}
          {locker.is_paid && a.payment && (
            <div style={{ marginBottom: 16 }}>
              {a.payment.payment_status === 'paid' ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    background: 'var(--success-bg)', color: 'var(--success)',
                    fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 20,
                  }}>
                    Paid · {a.payment.payment_method === 'cash' ? 'Cash' : 'UPI'}
                  </span>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{
                    background: 'var(--error-bg)', color: 'var(--error)',
                    fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 20,
                  }}>Unpaid</span>
                  <button
                    onClick={() => setShowMarkPaid(true)}
                    style={{
                      background: 'var(--text-primary)', color: "var(--bg-card)", border: 'none',
                      borderRadius: 10, padding: '6px 14px', fontSize: 13,
                      fontWeight: 500, cursor: 'pointer',
                    }}
                  >Mark Paid</button>
                </div>
              )}
            </div>
          )}

          {error && <div style={{ fontSize: 13, color: 'var(--error)', marginBottom: 12 }}>{error}</div>}

          <button
            onClick={() => setShowEndConfirm(true)}
            style={{
              width: '100%', height: 48, borderRadius: 12,
              border: '1.5px solid var(--error)', background: "var(--bg-card)",
              color: 'var(--error)', fontSize: 15, fontWeight: 600, cursor: 'pointer',
            }}
          >End Assignment</button>
        </>
      )}

      {/* ── MAINTENANCE ───────────────────────────────────────────────── */}
      {locker.status === 'maintenance' && (
        <>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 20 }}>
            This locker is under maintenance and cannot be assigned.
          </p>
          {error && <div style={{ fontSize: 13, color: 'var(--error)', marginBottom: 12 }}>{error}</div>}
          <PrimaryButton onClick={handleMarkAvailable} disabled={busy}>
            {busy ? 'Updating…' : 'Mark Available'}
          </PrimaryButton>
        </>
      )}

      {/* ── End assignment confirm ─────────────────────────────────────── */}
      {showEndConfirm && (
        <>
          <div onClick={() => setShowEndConfirm(false)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 70 }} />
          <div style={{
            position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 71,
            backgroundColor: "var(--bg-card)", borderRadius: '20px 20px 0 0',
            padding: '12px 20px 40px',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          }}>
            <div style={{ width: 40, height: 4, backgroundColor: 'var(--border)', borderRadius: 2, margin: '0 auto 16px' }} />
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10 }}>End Assignment?</div>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 24 }}>
              The locker will become available immediately.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button onClick={handleEndAssignment} disabled={busy} style={{
                height: 52, borderRadius: 12, border: 'none',
                background: 'var(--error)', color: "var(--bg-card)",
                fontSize: 15, fontWeight: 600, cursor: 'pointer', opacity: busy ? 0.6 : 1,
              }}>{busy ? 'Ending…' : 'End Assignment'}</button>
              <button onClick={() => setShowEndConfirm(false)} style={{
                height: 52, borderRadius: 12, border: '1px solid var(--text-primary)',
                background: "var(--bg-card)", color: 'var(--text-primary)', fontSize: 15, fontWeight: 500, cursor: 'pointer',
              }}>Cancel</button>
            </div>
          </div>
        </>
      )}

      {/* ── Delete confirm ─────────────────────────────────────────────── */}
      {showDeleteConfirm && (
        <>
          <div onClick={() => setShowDeleteConfirm(false)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 70 }} />
          <div style={{
            position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 71,
            backgroundColor: "var(--bg-card)", borderRadius: '20px 20px 0 0',
            padding: '12px 20px 40px',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          }}>
            <div style={{ width: 40, height: 4, backgroundColor: 'var(--border)', borderRadius: 2, margin: '0 auto 16px' }} />
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10 }}>Delete Locker?</div>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 4 }}>
              This locker and all its data will be permanently deleted.
            </p>
            <p style={{ fontSize: 13, color: 'var(--text-tertiary)', marginBottom: 24 }}>
              Note: lockers with assignment history cannot be deleted.
            </p>
            {error && <div style={{ fontSize: 13, color: 'var(--error)', marginBottom: 12 }}>{error}</div>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button onClick={handleDelete} disabled={busy} style={{
                height: 52, borderRadius: 12, border: 'none',
                background: 'var(--error)', color: "var(--bg-card)",
                fontSize: 15, fontWeight: 600, cursor: 'pointer', opacity: busy ? 0.6 : 1,
              }}>{busy ? 'Deleting…' : 'Delete'}</button>
              <button onClick={() => setShowDeleteConfirm(false)} style={{
                height: 52, borderRadius: 12, border: '1px solid var(--text-primary)',
                background: "var(--bg-card)", color: 'var(--text-primary)', fontSize: 15, fontWeight: 500, cursor: 'pointer',
              }}>Cancel</button>
            </div>
          </div>
        </>
      )}

      {/* ── Mark Paid sheet ───────────────────────────────────────────── */}
      {showMarkPaid && (
        <>
          <div onClick={() => setShowMarkPaid(false)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 70 }} />
          <div style={{
            position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 71,
            backgroundColor: "var(--bg-card)", borderRadius: '20px 20px 0 0',
            padding: '12px 20px 40px',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          }}>
            <div style={{ width: 40, height: 4, backgroundColor: 'var(--border)', borderRadius: 2, margin: '0 auto 16px' }} />
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>Mark Paid</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 10 }}>Payment method</div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
              {['cash', 'upi'].map(m => (
                <button key={m}
                  onClick={() => setPayMethod(m)}
                  style={{
                    flex: 1, height: 52, borderRadius: 12, fontSize: 15, fontWeight: 600,
                    cursor: 'pointer',
                    border: payMethod === m ? '1.5px solid var(--text-primary)' : '1px solid rgba(0,0,0,0.15)',
                    background: payMethod === m ? 'var(--text-primary)' : "var(--bg-card)",
                    color: payMethod === m ? 'white' : 'var(--text-primary)',
                  }}
                >{m === 'cash' ? 'Cash' : 'UPI'}</button>
              ))}
            </div>
            {error && <div style={{ fontSize: 13, color: 'var(--error)', marginBottom: 12 }}>{error}</div>}
            <button onClick={handleMarkPaid} disabled={!payMethod || busy} style={{
              width: '100%', height: 52, borderRadius: 12, border: 'none',
              background: !payMethod ? 'var(--border)' : 'var(--text-primary)', color: !payMethod ? 'var(--text-tertiary)' : "var(--bg-card)",
              fontSize: 15, fontWeight: 600, cursor: payMethod ? 'pointer' : 'not-allowed',
              opacity: busy ? 0.6 : 1,
            }}>{busy ? 'Saving…' : 'Confirm'}</button>
          </div>
        </>
      )}
    </Sheet>
  )
}

// ── LockerCard ─────────────────────────────────────────────────────────────────

function LockerCard({ locker, onClick }) {
  const a = locker.assignment
  const expSoon = a ? isExpiringSoon(a.expires_at) : false

  return (
    <button
      onClick={onClick}
      style={{
        background: "var(--bg-card)",
        border: '1px solid rgba(0,0,0,0.08)',
        borderRadius: 16,
        padding: '14px 12px',
        textAlign: 'left',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        width: '100%',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)' }}>{locker.label}</span>
        <StatusBadge status={locker.status} />
      </div>
      {locker.is_paid && (
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
          ₹{locker.price?.toLocaleString('en-IN')}
        </span>
      )}
      {a && (
        <div>
          <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)' }}>{a.member_name}</div>
          <div style={{ fontSize: 11, color: expSoon ? 'var(--error)' : 'var(--text-tertiary)', marginTop: 2, fontWeight: expSoon ? 600 : 400 }}>
            Exp {formatDate(a.expires_at)}{expSoon ? ' ⚠' : ''}
          </div>
        </div>
      )}
    </button>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

const FILTERS = ['all', 'available', 'occupied', 'maintenance']

export default function GymLockers() {
  const navigate = useNavigate()
  const gymId = useOwnerGymId()

  const [lockers, setLockers] = useState([])
  const [expiringSoon, setExpiringSoon] = useState([])
  const [loading, setLoading] = useState(true)
  const [featureDisabled, setFeatureDisabled] = useState(false)
  const [filter, setFilter] = useState('all')
  const [showAdd, setShowAdd] = useState(false)
  const [selectedLocker, setSelectedLocker] = useState(null)
  const [assignLocker, setAssignLocker] = useState(null)
  const [toast, setToast] = useState(null)
  const [moreOpen, setMoreOpen] = useState(false)
  const [bannerDismissed, setBannerDismissed] = useState(false)

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 2500)
  }

  const loadData = async () => {
    setLoading(true)
    try {
      const token = await getToken()
      // Use raw fetch so we can detect 403 specifically
      const res = await fetch(`${BASE}/api/lockers`, {
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      })

      if (res.status === 403) {
        const body = await res.json().catch(() => ({}))
        if ((body.error || '').toLowerCase().includes('not enabled')) {
          setFeatureDisabled(true)
          setLoading(false)
          return
        }
      }

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load')
      setLockers(Array.isArray(data) ? data : [])

      // Fetch expiring-soon (non-critical, don't block render)
      try {
        const exp = await apiFetch('/api/lockers/expiring-soon')
        setExpiringSoon(Array.isArray(exp) ? exp : [])
      } catch { /* ignore */ }
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  const filtered = filter === 'all' ? lockers : lockers.filter(l => l.status === filter)

  const totalCount     = lockers.length
  const availableCount = lockers.filter(l => l.status === 'available').length
  const occupiedCount  = lockers.filter(l => l.status === 'occupied').length

  // ── Disabled state ────────────────────────────────────────────────────────

  if (featureDisabled) {
    return (
      <div style={{
        minHeight: '100vh', backgroundColor: 'var(--bg-primary)', paddingBottom: 80,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{
          position: 'sticky', top: 0, zIndex: 10, backgroundColor: "var(--bg-card)",
          padding: '16px 20px 12px', display: 'flex', alignItems: 'center', gap: 12,
          borderBottom: '0.5px solid rgba(0,0,0,0.08)',
        }}>
          <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--text-primary)', padding: 0 }}>←</button>
          <span style={{ flex: 1, fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', textAlign: 'center' }}>Lockers</span>
          <span style={{ width: 24 }} />
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 32px', textAlign: 'center', gap: 16 }}>
          <Lock size={48} color="var(--text-tertiary)" />
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>Locker Management is off</div>
          <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Enable it in Settings to start assigning lockers to your members.
          </p>
          <button
            onClick={() => navigate('/gym/settings')}
            style={{
              marginTop: 8, background: 'var(--text-primary)', color: "var(--bg-card)", border: 'none',
              borderRadius: 12, height: 48, padding: '0 28px',
              fontSize: 15, fontWeight: 600, cursor: 'pointer',
            }}
          >Go to Settings</button>
        </div>

        <GymBottomNav active="more" onMorePress={() => setMoreOpen(true)} />
        <MoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} />
      </div>
    )
  }

  // ── Loading ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', backgroundColor: 'var(--bg-primary)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}>
        <span style={{ fontSize: 14, color: 'var(--text-tertiary)' }}>Loading lockers…</span>
      </div>
    )
  }

  // ── Main screen ───────────────────────────────────────────────────────────

  return (
    <div style={{
      minHeight: '100vh', backgroundColor: 'var(--bg-primary)', paddingBottom: 80,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>
      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10, backgroundColor: "var(--bg-card)",
        padding: '16px 20px 12px', display: 'flex', alignItems: 'center', gap: 12,
        borderBottom: '0.5px solid rgba(0,0,0,0.08)',
      }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--text-primary)', padding: 0, lineHeight: 1 }}>←</button>
        <span style={{ flex: 1, fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', textAlign: 'center' }}>Locker Management</span>
        <button
          onClick={() => setShowAdd(true)}
          style={{ background: 'none', border: 'none', fontSize: 15, fontWeight: 600, color: 'var(--text-cta)', cursor: 'pointer', padding: 0 }}
        >+ Add</button>
      </div>

      <div style={{ padding: '16px 16px 0' }}>
        {/* Stats strip */}
        <div style={{
          display: 'flex', gap: 10, marginBottom: 16,
        }}>
          {[
            { label: `${totalCount} total`, bg: 'var(--bg-pill)', color: 'var(--text-secondary)' },
            { label: `${availableCount} available`, bg: 'var(--success-bg)', color: 'var(--success)' },
            { label: `${occupiedCount} occupied`, bg: 'var(--accent-bg)', color: 'var(--text-cta)' },
          ].map(s => (
            <span key={s.label} style={{
              background: s.bg, color: s.color,
              padding: '5px 12px', borderRadius: 20,
              fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
            }}>{s.label}</span>
          ))}
        </div>

        {/* Expiring-soon banner */}
        {expiringSoon.length > 0 && !bannerDismissed && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: 'var(--warning-bg)', border: '1px solid var(--warning)',
            borderRadius: 12, padding: '10px 14px', marginBottom: 16,
          }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--warning)' }}>
              ⚠ {expiringSoon.length} locker{expiringSoon.length > 1 ? 's' : ''} expiring within 3 days
            </span>
            <button
              onClick={() => { setBannerDismissed(true); setFilter('occupied') }}
              style={{ background: 'none', border: 'none', fontSize: 12, color: 'var(--warning)', cursor: 'pointer', fontWeight: 600, flexShrink: 0, marginLeft: 8 }}
            >View</button>
            <button
              onClick={() => setBannerDismissed(true)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 0 6px' }}
            ><X size={14} color="var(--warning)" /></button>
          </div>
        )}

        {/* Filter pills */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, overflowX: 'auto', paddingBottom: 2 }}>
          {FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 500,
                border: filter === f ? '1.5px solid var(--text-primary)' : '1px solid rgba(0,0,0,0.15)',
                background: filter === f ? 'var(--text-primary)' : "var(--bg-card)",
                color: filter === f ? 'white' : 'var(--text-secondary)',
                cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
              }}
            >{f === 'all' ? 'All' : STATUS_META[f]?.label || f}</button>
          ))}
        </div>
      </div>

      {/* Empty state */}
      {lockers.length === 0 ? (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '60px 32px', textAlign: 'center', gap: 12,
        }}>
          <KeyRound size={48} color="var(--text-tertiary)" />
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>No lockers added yet</div>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Add your gym's lockers to start assigning them to members
          </p>
          <div style={{ marginTop: 8, width: '100%', maxWidth: 280 }}>
            <PrimaryButton onClick={() => setShowAdd(true)}>
              <Plus size={16} /> Add Locker
            </PrimaryButton>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-tertiary)', fontSize: 14 }}>
          No {STATUS_META[filter]?.label.toLowerCase()} lockers
        </div>
      ) : (
        /* Grid */
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr',
          gap: 12, padding: '0 16px 16px',
        }}>
          {filtered.map(locker => (
            <LockerCard
              key={locker.id}
              locker={locker}
              onClick={() => setSelectedLocker(locker)}
            />
          ))}
        </div>
      )}

      <GymBottomNav active="more" onMorePress={() => setMoreOpen(true)} />
      <MoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} />

      <Toast toast={toast} />

      {/* Add Locker sheet */}
      {showAdd && (
        <AddLockerSheet
          onClose={() => setShowAdd(false)}
          onAdded={newLocker => {
            setLockers(prev => [...prev, newLocker])
            showToast(`Locker ${newLocker.label} added`)
          }}
        />
      )}

      {/* Locker Detail sheet */}
      {selectedLocker && !assignLocker && (
        <LockerDetailSheet
          locker={selectedLocker}
          gymId={gymId}
          onClose={() => setSelectedLocker(null)}
          onRefresh={() => {
            loadData()
            setSelectedLocker(null)
          }}
          onAssign={locker => {
            setSelectedLocker(null)
            setAssignLocker(locker)
          }}
        />
      )}

      {/* Assign sheet */}
      {assignLocker && (
        <AssignSheet
          locker={assignLocker}
          gymId={gymId}
          onClose={() => setAssignLocker(null)}
          onAssigned={() => {
            setAssignLocker(null)
            loadData()
            showToast('Locker assigned')
          }}
        />
      )}
    </div>
  )
}
