import { useState, useEffect, useCallback } from 'react'
import {
  Plus, X, ChevronRight, Loader2, Ruler, Trash2, ChevronDown, ChevronUp,
} from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { supabase } from '../../utils/supabase'

const API = import.meta.env.VITE_BACKEND_URL

// ── Constants ─────────────────────────────────────────────────────────────────

const FIELDS = [
  { key: 'chest_cm',       label: 'Chest'       },
  { key: 'waist_cm',       label: 'Waist'       },
  { key: 'hips_cm',        label: 'Hips'        },
  { key: 'neck_cm',        label: 'Neck'        },
  { key: 'left_arm_cm',    label: 'Left Arm'    },
  { key: 'right_arm_cm',   label: 'Right Arm'   },
  { key: 'left_thigh_cm',  label: 'Left Thigh'  },
  { key: 'right_thigh_cm', label: 'Right Thigh' },
]

const SNAPSHOT_FIELDS = [
  { key: 'chest_cm',       label: 'Chest'       },
  { key: 'waist_cm',       label: 'Waist'       },
  { key: 'hips_cm',        label: 'Hips'        },
  { key: 'neck_cm',        label: 'Neck'        },
  { key: 'left_arm_cm',    label: 'L. Arm'      },
  { key: 'right_arm_cm',   label: 'R. Arm'      },
  { key: 'left_thigh_cm',  label: 'L. Thigh'    },
  { key: 'right_thigh_cm', label: 'R. Thigh'    },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days} days ago`
  const weeks = Math.floor(days / 7)
  if (weeks < 5) return `${weeks}w ago`
  return `${Math.floor(days / 30)}mo ago`
}

function fmtDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function entrySummary(entry) {
  const parts = []
  if (entry.chest_cm)       parts.push(`Chest ${entry.chest_cm}`)
  if (entry.waist_cm)       parts.push(`Waist ${entry.waist_cm}`)
  const arm = entry.left_arm_cm ?? entry.right_arm_cm
  if (arm)                  parts.push(`Arms ${arm}`)
  const thigh = entry.left_thigh_cm ?? entry.right_thigh_cm
  if (thigh)                parts.push(`Thighs ${thigh}`)
  return parts.slice(0, 3).join(' · ') || 'No measurements'
}

async function getToken() {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token
}

// ── Custom tooltip ────────────────────────────────────────────────────────────

function MeasureTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'var(--chart-tooltip-bg)',
      border: '1px solid var(--border)',
      borderRadius: 8,
      padding: '6px 10px',
      fontSize: 12,
    }}>
      <p style={{ color: 'var(--text-tertiary)', marginBottom: 2 }}>{label}</p>
      <p style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{payload[0].value} cm</p>
    </div>
  )
}

// ── Add / Edit Sheet ──────────────────────────────────────────────────────────

function MeasurementSheet({ entry, onClose, onSave }) {
  const isEdit = !!entry

  const [date, setDate]           = useState(entry?.measured_at ?? new Date().toISOString().slice(0, 10))
  const [chest, setChest]         = useState(entry?.chest_cm       ?? '')
  const [waist, setWaist]         = useState(entry?.waist_cm       ?? '')
  const [hips, setHips]           = useState(entry?.hips_cm        ?? '')
  const [neck, setNeck]           = useState(entry?.neck_cm        ?? '')
  const [leftArm, setLeftArm]     = useState(entry?.left_arm_cm    ?? '')
  const [rightArm, setRightArm]   = useState(entry?.right_arm_cm   ?? '')
  const [leftThigh, setLeftThigh] = useState(entry?.left_thigh_cm  ?? '')
  const [rightThigh, setRightThigh] = useState(entry?.right_thigh_cm ?? '')
  const [notes, setNotes]         = useState(entry?.notes          ?? '')
  const [sameArms, setSameArms]   = useState(false)
  const [sameThighs, setSameThighs] = useState(false)
  const [saving, setSaving]       = useState(false)
  const [deleting, setDeleting]   = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError]         = useState('')

  function handleArmChange(val) {
    setLeftArm(val)
    if (sameArms) setRightArm(val)
  }

  function handleThighChange(val) {
    setLeftThigh(val)
    if (sameThighs) setRightThigh(val)
  }

  async function handleSave() {
    const payload = {
      measured_at:   date,
      chest_cm:      chest      !== '' ? parseFloat(chest)      : null,
      waist_cm:      waist      !== '' ? parseFloat(waist)      : null,
      hips_cm:       hips       !== '' ? parseFloat(hips)       : null,
      neck_cm:       neck       !== '' ? parseFloat(neck)       : null,
      left_arm_cm:   leftArm    !== '' ? parseFloat(leftArm)    : null,
      right_arm_cm:  (sameArms ? leftArm : rightArm) !== '' ? parseFloat(sameArms ? leftArm : rightArm) : null,
      left_thigh_cm: leftThigh  !== '' ? parseFloat(leftThigh)  : null,
      right_thigh_cm:(sameThighs ? leftThigh : rightThigh) !== '' ? parseFloat(sameThighs ? leftThigh : rightThigh) : null,
      notes:         notes || null,
    }

    // At least one value must be set
    const hasValue = ['chest_cm','waist_cm','hips_cm','neck_cm','left_arm_cm','right_arm_cm','left_thigh_cm','right_thigh_cm']
      .some(k => payload[k] != null)
    if (!hasValue) { setError('Enter at least one measurement'); return }

    setSaving(true)
    setError('')
    try {
      const token = await getToken()
      let res
      if (isEdit) {
        res = await fetch(`${API}/api/measurements/${entry.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload),
        })
      } else {
        res = await fetch(`${API}/api/measurements`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload),
        })
      }
      if (!res.ok) throw new Error(await res.text())
      const saved = await res.json()
      onSave(saved)
    } catch (e) {
      setError('Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!confirmDelete) { setConfirmDelete(true); return }
    setDeleting(true)
    try {
      const token = await getToken()
      const res = await fetch(`${API}/api/measurements/${entry.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error()
      onSave(null) // null signals deletion
    } catch {
      setError('Failed to delete.')
    } finally {
      setDeleting(false)
    }
  }

  const inputCls = 'w-full rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--text-cta)]/30'
  const inputStyle = {
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border-strong)',
    color: 'var(--text-primary)',
  }

  function NumInput({ label, value, onChange, unit = 'cm' }) {
    return (
      <div>
        <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>
          {label}
        </label>
        <div style={{ position: 'relative' }}>
          <input
            type="number"
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder="—"
            min="0"
            step="0.1"
            className={inputCls}
            style={inputStyle}
          />
          <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: 'var(--text-tertiary)' }}>
            {unit}
          </span>
        </div>
      </div>
    )
  }

  function Toggle({ checked, onChange, label }) {
    return (
      <button
        onClick={() => onChange(!checked)}
        style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
      >
        <div style={{
          width: 36, height: 20, borderRadius: 10, position: 'relative', transition: 'background 0.2s',
          background: checked ? 'var(--text-cta)' : 'var(--border-strong)',
        }}>
          <div style={{
            position: 'absolute', top: 2, left: checked ? 18 : 2,
            width: 16, height: 16, borderRadius: '50%', background: 'white', transition: 'left 0.2s',
          }} />
        </div>
        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{label}</span>
      </button>
    )
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)' }} />
      <div style={{
        position: 'relative',
        background: 'var(--bg-elevated)',
        borderRadius: '20px 20px 0 0',
        maxHeight: '92vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '0 20px',
          height: 56,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--border)',
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>
            {isEdit ? 'Edit Measurement' : 'Add Measurement'}
          </span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <X size={20} color="var(--text-tertiary)" />
          </button>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 32px', display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* Date */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>
              Date
            </label>
            <input
              type="date"
              value={date}
              max={new Date().toISOString().slice(0, 10)}
              onChange={e => setDate(e.target.value)}
              className={inputCls}
              style={inputStyle}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <NumInput label="Chest"  value={chest} onChange={setChest} />
            <NumInput label="Waist"  value={waist} onChange={setWaist} />
            <NumInput label="Hips"   value={hips}  onChange={setHips}  />
            <NumInput label="Neck"   value={neck}  onChange={setNeck}  />
          </div>

          {/* Arms */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Arms</span>
              <Toggle checked={sameArms} onChange={setSameArms} label="Same for both" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <NumInput label={sameArms ? 'Both Arms' : 'Left Arm'}  value={leftArm}  onChange={handleArmChange} />
              {!sameArms && <NumInput label="Right Arm" value={rightArm} onChange={setRightArm} />}
            </div>
          </div>

          {/* Thighs */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Thighs</span>
              <Toggle checked={sameThighs} onChange={setSameThighs} label="Same for both" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <NumInput label={sameThighs ? 'Both Thighs' : 'Left Thigh'}  value={leftThigh}  onChange={handleThighChange} />
              {!sameThighs && <NumInput label="Right Thigh" value={rightThigh} onChange={setRightThigh} />}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="Any notes about this measurement…"
              className={inputCls}
              style={{ ...inputStyle, resize: 'none' }}
            />
          </div>

          {error && <p style={{ color: 'var(--error)', fontSize: 13, textAlign: 'center' }}>{error}</p>}

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: 14,
              border: 'none',
              background: 'var(--text-cta)',
              color: 'var(--bg-primary)',
              fontSize: 15,
              fontWeight: 700,
              cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.7 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            {saving && <Loader2 size={16} className="animate-spin" />}
            Save Measurements
          </button>

          {/* Delete button (edit mode only) */}
          {isEdit && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: 14,
                border: '1px solid var(--error)',
                background: confirmDelete ? 'var(--error)' : 'transparent',
                color: confirmDelete ? 'white' : 'var(--error)',
                fontSize: 15,
                fontWeight: 600,
                cursor: deleting ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                transition: 'all 0.2s',
              }}
            >
              {deleting && <Loader2 size={16} className="animate-spin" />}
              <Trash2 size={16} />
              {confirmDelete ? 'Tap again to confirm delete' : 'Delete Entry'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function MeasurementsTab() {
  const [measurements, setMeasurements] = useState([])
  const [loading, setLoading]           = useState(true)
  const [showAdd, setShowAdd]           = useState(false)
  const [editEntry, setEditEntry]       = useState(null)
  const [historyExpanded, setHistoryExpanded] = useState(false)
  const [toast, setToast]               = useState('')

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const token = await getToken()
      const res = await fetch(`${API}/api/measurements`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error()
      setMeasurements(await res.json())
    } catch {
      setMeasurements([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  function handleSaved(result) {
    setShowAdd(false)
    setEditEntry(null)
    fetchAll()
    if (result === null) {
      showToast('Entry deleted')
    } else {
      showToast('Measurements saved')
    }
  }

  // ── Derived data ────────────────────────────────────────────────────────────

  const latest  = measurements[0] ?? null
  const prev    = measurements[1] ?? null

  // For each field: compute delta from latest to prev
  function delta(key) {
    if (!latest || !prev) return null
    const a = latest[key]
    const b = prev[key]
    if (a == null || b == null) return null
    return +(a - b).toFixed(1)
  }

  // Build chart data (oldest first) for each field that has >= 2 data points
  const chartFields = FIELDS.filter(f =>
    measurements.filter(m => m[f.key] != null).length >= 2
  )

  function chartData(key) {
    return [...measurements]
      .filter(m => m[key] != null)
      .reverse()
      .map(m => ({
        date: new Date(m.measured_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        value: parseFloat(m[key]),
      }))
  }

  // History (oldest first reversed so newest on top)
  const HISTORY_LIMIT = 5
  const showHistory = historyExpanded ? measurements : measurements.slice(0, HISTORY_LIMIT)

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
        <Loader2 size={26} className="animate-spin" style={{ color: 'var(--text-tertiary)' }} />
      </div>
    )
  }

  return (
    <div style={{ padding: '0 20px 120px', display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── Latest snapshot card ───────────────────────────────────────────── */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 16,
        padding: '16px 16px',
      }}>
        {latest ? (
          <>
            <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 14 }}>
              Last measured: <span style={{ fontWeight: 600 }}>{timeAgo(latest.measured_at)}</span>
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {SNAPSHOT_FIELDS.map(f => {
                const val = latest[f.key]
                const d   = delta(f.key)
                return (
                  <div key={f.key} style={{
                    background: 'var(--bg-pill)',
                    borderRadius: 12,
                    padding: '10px 12px',
                  }}>
                    <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4 }}>{f.label}</p>
                    <p style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.1 }}>
                      {val != null ? val : <span style={{ color: 'var(--text-tertiary)' }}>—</span>}
                      {val != null && <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-tertiary)', marginLeft: 3 }}>cm</span>}
                    </p>
                    {d !== null ? (
                      <p style={{ fontSize: 12, color: d < 0 ? 'var(--success)' : d > 0 ? 'var(--error)' : 'var(--text-tertiary)', marginTop: 3 }}>
                        {d > 0 ? `+${d}` : d} cm
                      </p>
                    ) : (
                      <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 3 }}>—</p>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 0', gap: 10 }}>
            <Ruler size={28} style={{ color: 'var(--text-tertiary)' }} />
            <p style={{ fontSize: 14, color: 'var(--text-tertiary)', textAlign: 'center' }}>
              No measurements logged yet.<br />Tap + below to start tracking.
            </p>
          </div>
        )}
      </div>

      {/* ── Charts section ─────────────────────────────────────────────────── */}
      {chartFields.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {chartFields.map(f => (
            <div key={f.key} style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 16,
              padding: '14px 16px 10px',
            }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>{f.label}</p>
              <ResponsiveContainer width="100%" height={140}>
                <LineChart data={chartData(f.key)} margin={{ top: 4, right: 8, bottom: 0, left: -24 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: 'var(--chart-axis)', fontSize: 9 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: 'var(--chart-axis)', fontSize: 9 }}
                    axisLine={false}
                    tickLine={false}
                    domain={['auto', 'auto']}
                  />
                  <Tooltip content={<MeasureTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="var(--chart-line)"
                    strokeWidth={2}
                    dot={{ fill: 'var(--chart-line)', r: 3, strokeWidth: 0 }}
                    activeDot={{ r: 5, fill: 'var(--chart-line)' }}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ))}
        </div>
      )}

      {/* ── History list ───────────────────────────────────────────────────── */}
      {measurements.length > 0 && (
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          overflow: 'hidden',
        }}>
          <div style={{ padding: '14px 16px 10px' }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>History</p>
          </div>
          {showHistory.map((m, i) => (
            <button
              key={m.id}
              onClick={() => setEditEntry(m)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 16px',
                background: 'none',
                border: 'none',
                borderTop: i === 0 ? 'none' : '1px solid var(--border)',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>
                  {fmtDate(m.measured_at)}
                </p>
                <p style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{entrySummary(m)}</p>
              </div>
              <ChevronRight size={16} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
            </button>
          ))}
          {measurements.length > HISTORY_LIMIT && (
            <button
              onClick={() => setHistoryExpanded(e => !e)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                padding: '12px 16px',
                background: 'none',
                border: 'none',
                borderTop: '1px solid var(--border)',
                cursor: 'pointer',
                fontSize: 13,
                color: 'var(--text-secondary)',
                fontWeight: 500,
              }}
            >
              {historyExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              {historyExpanded ? 'Show less' : `Show ${measurements.length - HISTORY_LIMIT} more`}
            </button>
          )}
        </div>
      )}

      {/* ── Floating + button ──────────────────────────────────────────────── */}
      <button
        onClick={() => setShowAdd(true)}
        style={{
          position: 'fixed',
          bottom: 90,
          right: 20,
          width: 52,
          height: 52,
          borderRadius: '50%',
          background: 'var(--text-cta)',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
          zIndex: 100,
        }}
      >
        <Plus size={22} color="var(--bg-primary)" />
      </button>

      {/* ── Sheets ─────────────────────────────────────────────────────────── */}
      {showAdd && (
        <MeasurementSheet
          entry={null}
          onClose={() => setShowAdd(false)}
          onSave={handleSaved}
        />
      )}
      {editEntry && (
        <MeasurementSheet
          entry={editEntry}
          onClose={() => setEditEntry(null)}
          onSave={handleSaved}
        />
      )}

      {/* ── Toast ──────────────────────────────────────────────────────────── */}
      {toast && (
        <div style={{
          position: 'fixed',
          bottom: 100,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'var(--text-cta)',
          color: 'var(--bg-primary)',
          borderRadius: 12,
          padding: '10px 18px',
          fontSize: 14,
          fontWeight: 500,
          zIndex: 300,
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
        }}>
          {toast}
        </div>
      )}
    </div>
  )
}
