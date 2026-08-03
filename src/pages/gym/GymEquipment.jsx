import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import GymBottomNav from '../../components/GymBottomNav'
import MoreSheet from '../../components/MoreSheet'
import PrimaryButton from '../../components/PrimaryButton'
import { useActiveGym } from '../../contexts/ActiveGymContext'
import {
  createGymEquipment,
  deleteGymEquipment,
  getGymEquipment,
  updateGymEquipment,
} from '../../utils/api'
import { Dumbbell, Plus, X, Trash2, ChevronLeft, Wrench } from 'lucide-react'

// ── Constants ─────────────────────────────────────────────────────────────────

const CATEGORIES = ['Cardio', 'Strength', 'Free Weights', 'Cables', 'Other']

const CONDITION_META = {
  'Good':         { bg: 'var(--success-bg)', color: 'var(--success)' },
  'Fair':         { bg: 'var(--warning-bg)', color: 'var(--warning)' },
  'Needs Repair': { bg: 'var(--error-bg)',   color: 'var(--error)'   },
}

const CAT_META = {
  'Cardio':       { bg: 'var(--accent-bg)',  color: 'var(--text-cta)' },
  'Strength':     { bg: 'var(--success-bg)', color: 'var(--success)'  },
  'Free Weights': { bg: 'var(--warning-bg)', color: 'var(--warning)'  },
  'Cables':       { bg: 'var(--bg-pill)',    color: 'var(--text-cta)' },
  'Other':        { bg: 'var(--bg-pill)',    color: 'var(--text-secondary)' },
}

const BLANK_FORM = {
  name: '', category: 'Cardio', quantity: 1,
  condition: 'Good', purchase_date: '', last_serviced: '', next_service_due: '',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function serviceDateColor(iso) {
  if (!iso) return 'var(--text-secondary)'
  const diff = new Date(iso) - Date.now()
  if (diff < 0)                   return 'var(--error)'
  if (diff <= 14 * 24 * 3600000)  return 'var(--warning)'
  return 'var(--text-secondary)'
}

function isDueSoon(iso) {
  if (!iso) return false
  const diff = new Date(iso) - Date.now()
  return diff >= 0 && diff <= 14 * 24 * 3600000
}

function isPastDue(iso) {
  if (!iso) return false
  return new Date(iso) < new Date()
}

// ── Shared UI ─────────────────────────────────────────────────────────────────

function Sheet({ onClose, children, title }) {
  return (
    <>
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 50 }}
      />
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 51,
        backgroundColor: 'var(--bg-card)', borderRadius: '20px 20px 0 0',
        maxHeight: '92vh', overflowY: 'auto', paddingBottom: 48,
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

function FieldInput({ label, value, onChange, placeholder, type = 'text', error }) {
  return (
    <div style={{ marginBottom: 14 }}>
      {label && (
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
          {label}
        </div>
      )}
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          width: '100%', boxSizing: 'border-box',
          padding: '12px 14px', fontSize: 15,
          border: `1px solid ${error ? 'var(--error)' : 'var(--border)'}`,
          borderRadius: 10,
          backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)',
          outline: 'none',
        }}
      />
      {error && <div style={{ fontSize: 12, color: 'var(--error)', marginTop: 4 }}>{error}</div>}
    </div>
  )
}

function FieldSelect({ label, value, onChange, options }) {
  return (
    <div style={{ marginBottom: 14 }}>
      {label && (
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
          {label}
        </div>
      )}
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          width: '100%', boxSizing: 'border-box',
          padding: '12px 14px', fontSize: 15,
          border: '1px solid var(--border)', borderRadius: 10,
          backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)',
          outline: 'none', appearance: 'none',
        }}
      >
        {options.map(o => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </div>
  )
}

function SegmentedControl({ label, options, value, onChange }) {
  return (
    <div style={{ marginBottom: 14 }}>
      {label && (
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
          {label}
        </div>
      )}
      <div style={{
        display: 'flex', gap: 6,
        backgroundColor: 'var(--bg-input)', borderRadius: 10, padding: 4,
      }}>
        {options.map(o => (
          <button
            key={o}
            onClick={() => onChange(o)}
            style={{
              flex: 1, padding: '8px 4px', fontSize: 13, fontWeight: 600,
              border: 'none', borderRadius: 8, cursor: 'pointer',
              backgroundColor: value === o ? 'var(--bg-card)' : 'transparent',
              color: value === o ? 'var(--text-primary)' : 'var(--text-secondary)',
              boxShadow: value === o ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.15s',
            }}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  )
}

function Toast({ message, type, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2800)
    return () => clearTimeout(t)
  }, [onDone])
  return (
    <div style={{
      position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)',
      zIndex: 100, backgroundColor: type === 'error' ? 'var(--error-bg)' : 'var(--success-bg)',
      color: type === 'error' ? 'var(--error)' : 'var(--success)',
      padding: '10px 18px', borderRadius: 12, fontSize: 14, fontWeight: 600,
      boxShadow: '0 4px 16px rgba(0,0,0,0.15)', whiteSpace: 'nowrap',
    }}>
      {message}
    </div>
  )
}

// ── EquipmentSheet ─────────────────────────────────────────────────────────────

function EquipmentSheet({ gymId, item, onClose, onSaved, onDeleted }) {
  const isEdit = !!item
  const [form, setForm] = useState(
    isEdit
      ? {
          name:             item.name || '',
          category:         item.category || 'Cardio',
          quantity:         item.quantity ?? 1,
          condition:        item.condition || 'Good',
          purchase_date:    item.purchase_date || '',
          last_serviced:    item.last_serviced || '',
          next_service_due: item.next_service_due || '',
        }
      : { ...BLANK_FORM }
  )
  const [saving, setSaving]   = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)
  const [error, setError]     = useState('')
  const [nameErr, setNameErr] = useState('')

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  async function handleSave() {
    if (!form.name.trim()) { setNameErr('Name is required'); return }
    setSaving(true)
    setError('')
    try {
      let data
      if (isEdit) {
        data = await updateGymEquipment(gymId, item.id, {
          ...form,
          quantity: Number(form.quantity) || 1,
          purchase_date:    form.purchase_date    || null,
          last_serviced:    form.last_serviced    || null,
          next_service_due: form.next_service_due || null,
        })
      } else {
        data = await createGymEquipment(gymId, {
          ...form,
          quantity: Number(form.quantity) || 1,
          purchase_date:    form.purchase_date    || null,
          last_serviced:    form.last_serviced    || null,
          next_service_due: form.next_service_due || null,
        })
      }
      onSaved(data, isEdit)
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      await deleteGymEquipment(gymId, item.id)
      onDeleted(item.id)
      onClose()
    } catch (err) {
      setError(err.message)
      setDeleting(false)
    }
  }

  return (
    <Sheet title={isEdit ? 'Edit Equipment' : 'Add Equipment'} onClose={onClose}>
      <FieldInput
        label="Name"
        value={form.name}
        onChange={v => { set('name', v); setNameErr('') }}
        placeholder="e.g. Treadmill, Barbell"
        error={nameErr}
      />
      <FieldSelect
        label="Category"
        value={form.category}
        onChange={v => set('category', v)}
        options={CATEGORIES}
      />
      <FieldInput
        label="Quantity"
        value={form.quantity}
        onChange={v => set('quantity', v)}
        placeholder="1"
        type="number"
      />
      <SegmentedControl
        label="Condition"
        options={['Good', 'Fair', 'Needs Repair']}
        value={form.condition}
        onChange={v => set('condition', v)}
      />
      <FieldInput
        label="Purchase Date"
        value={form.purchase_date}
        onChange={v => set('purchase_date', v)}
        type="date"
      />
      <FieldInput
        label="Last Serviced"
        value={form.last_serviced}
        onChange={v => set('last_serviced', v)}
        type="date"
      />
      <FieldInput
        label="Next Service Due"
        value={form.next_service_due}
        onChange={v => set('next_service_due', v)}
        type="date"
      />

      {error && (
        <div style={{ fontSize: 13, color: 'var(--error)', marginBottom: 12, fontWeight: 500 }}>
          {error}
        </div>
      )}

      <PrimaryButton onClick={handleSave} disabled={saving}>
        {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Equipment'}
      </PrimaryButton>

      {isEdit && !confirmDel && (
        <button
          onClick={() => setConfirmDel(true)}
          style={{
            display: 'block', width: '100%', marginTop: 14,
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 14, fontWeight: 500, color: 'var(--error)', padding: '8px 0',
          }}
        >
          Delete Equipment
        </button>
      )}

      {isEdit && confirmDel && (
        <div style={{
          marginTop: 14, padding: 14, borderRadius: 12,
          backgroundColor: 'var(--error-bg)', border: '1px solid var(--error)',
        }}>
          <p style={{ fontSize: 13, color: 'var(--error)', margin: '0 0 10px', fontWeight: 500 }}>
            Delete "{item.name}"? This cannot be undone.
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setConfirmDel(false)}
              style={{
                flex: 1, padding: '10px 0', borderRadius: 10, cursor: 'pointer',
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                fontSize: 14, fontWeight: 600, color: 'var(--text-primary)',
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              style={{
                flex: 1, padding: '10px 0', borderRadius: 10, cursor: 'pointer',
                background: 'var(--error)', border: 'none',
                fontSize: 14, fontWeight: 600, color: '#fff',
                opacity: deleting ? 0.6 : 1,
              }}
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </div>
      )}
    </Sheet>
  )
}

// ── EquipmentCard ─────────────────────────────────────────────────────────────

function EquipmentCard({ item, onClick }) {
  const cond  = CONDITION_META[item.condition] || CONDITION_META['Good']
  const cat   = CAT_META[item.category]        || CAT_META['Other']
  const dueTo = serviceDateColor(item.next_service_due)

  return (
    <div
      onClick={onClick}
      style={{
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 14, padding: '14px 16px',
        marginBottom: 10, cursor: 'pointer',
        transition: 'background-color 0.1s',
      }}
    >
      {/* Name + category pill */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, gap: 8 }}>
        <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.name}
        </span>
        <span style={{
          fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 20, flexShrink: 0,
          backgroundColor: cat.bg, color: cat.color,
        }}>
          {item.category}
        </span>
      </div>

      {/* Quantity + condition + purchase date */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
        <span style={{
          fontSize: 12, fontWeight: 600, padding: '3px 8px', borderRadius: 20,
          backgroundColor: 'var(--bg-pill)', color: 'var(--text-secondary)',
        }}>
          Qty {item.quantity ?? '—'}
        </span>
        {item.condition && (
          <span style={{
            fontSize: 12, fontWeight: 600, padding: '3px 8px', borderRadius: 20,
            backgroundColor: cond.bg, color: cond.color,
          }}>
            {item.condition}
          </span>
        )}
        {item.purchase_date && (
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Bought {formatDate(item.purchase_date)}
          </span>
        )}
      </div>

      {/* Service info */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
          Last serviced: <span style={{ fontWeight: 500 }}>{formatDate(item.last_serviced)}</span>
        </span>
        <span style={{ fontSize: 12, color: dueTo, fontWeight: item.next_service_due ? 500 : 400 }}>
          Next due: {formatDate(item.next_service_due)}
        </span>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function GymEquipment() {
  const navigate  = useNavigate()
  const { activeGymId, loading: gymLoading } = useActiveGym()

  const [items,     setItems]     = useState([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState('')
  const [catFilter, setCatFilter] = useState('All')
  const [sheet,     setSheet]     = useState(null) // null | 'add' | item object
  const [moreOpen,  setMoreOpen]  = useState(false)
  const [toast,     setToast]     = useState(null)
  const loadRequest = useRef(0)

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const load = useCallback(async (gymId) => {
    if (!gymId) return
    const requestId = ++loadRequest.current
    setLoading(true)
    setError('')
    try {
      const data = await getGymEquipment(gymId)
      if (requestId === loadRequest.current) setItems(Array.isArray(data) ? data : [])
    } catch (err) {
      if (requestId === loadRequest.current) {
        setItems([])
        setError(err.message)
      }
    } finally {
      if (requestId === loadRequest.current) setLoading(false)
    }
  }, [])

  // Re-fetch whenever the active gym changes (mount, switcher selection,
  // logout/login) — clears the old list first so another gym's equipment
  // never flashes on screen during the transition. State updates are routed
  // through a promise callback (never called synchronously in the effect
  // body) to satisfy react-hooks/set-state-in-effect.
  useEffect(() => {
    loadRequest.current += 1
    const requestId = loadRequest.current

    Promise.resolve().then(() => {
      if (requestId !== loadRequest.current) return
      setItems([])
      setSheet(null)
      setError('')

      if (activeGymId) {
        load(activeGymId)
      } else {
        // Still resolving gyms, or the owner has multiple gyms and hasn't
        // picked one yet — GymSwitcher prompts for that at the route level,
        // so this page just waits instead of fetching with no gym id.
        setLoading(gymLoading)
      }
    })
  }, [activeGymId, gymLoading, load])

  // ── Sheet callbacks ────────────────────────────────────────────────────────

  function handleSaved(data, isEdit) {
    setItems(prev =>
      isEdit
        ? prev.map(i => i.id === data.id ? data : i)
        : [...prev, data]
    )
    setToast({ message: isEdit ? 'Equipment updated' : 'Equipment added', type: 'success' })
  }

  function handleDeleted(id) {
    setItems(prev => prev.filter(i => i.id !== id))
    setToast({ message: 'Equipment deleted', type: 'success' })
  }

  // ── Derived stats ──────────────────────────────────────────────────────────

  const totalQty     = items.reduce((s, i) => s + (Number(i.quantity) || 0), 0)
  const needsRepair  = items.filter(i => i.condition === 'Needs Repair').length
  const dueSoonCount = items.filter(i => isDueSoon(i.next_service_due) || isPastDue(i.next_service_due)).length

  // ── Filtered + grouped list ────────────────────────────────────────────────

  const filtered = catFilter === 'All'
    ? items
    : items.filter(i => i.category === catFilter)

  const grouped = catFilter === 'All'
    ? CATEGORIES.reduce((acc, cat) => {
        const group = filtered.filter(i => i.category === cat)
        if (group.length) acc.push({ cat, items: group })
        return acc
      }, [])
    : null

  // ── Filter chip style ──────────────────────────────────────────────────────

  const filterChip = (active) => ({
    borderRadius: 999, padding: '6px 14px', fontSize: 13, fontWeight: 500,
    cursor: 'pointer', whiteSpace: 'nowrap',
    border: active ? '1.5px solid var(--text-primary)' : '1px solid var(--border)',
    background: 'var(--bg-card)',
    color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
    transition: 'all 0.12s', flexShrink: 0,
  })

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <style>{`
        @keyframes skel { from { opacity: 0.4 } to { opacity: 1 } }
        input[type="date"] { -webkit-appearance: none; color-scheme: dark; }
      `}</style>

      {toast && (
        <Toast message={toast.message} type={toast.type} onDone={() => setToast(null)} />
      )}

      <div style={{
        minHeight: '100vh',
        backgroundColor: 'var(--bg)',
        paddingBottom: 96,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}>

        {/* ── Header ───────────────────────────────────────────────────────── */}
        <div style={{
          backgroundColor: 'var(--bg-card)',
          borderBottom: '1px solid var(--border)',
          padding: '14px 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          position: 'sticky', top: 0, zIndex: 10,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={() => navigate(-1)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}
            >
              <ChevronLeft size={22} color="var(--text-primary)" />
            </button>
            <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>Equipment</span>
          </div>
          <button
            onClick={() => activeGymId && setSheet('add')}
            disabled={!activeGymId}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', borderRadius: 10,
              border: '1.5px solid var(--cta-border)',
              background: 'var(--cta-bg)', color: 'var(--cta-text)',
              fontSize: 14, fontWeight: 600, cursor: activeGymId ? 'pointer' : 'not-allowed',
              opacity: activeGymId ? 1 : 0.6,
            }}
          >
            <Plus size={16} />
            Add
          </button>
        </div>

        <div style={{ padding: '16px 16px 0' }}>

          {/* ── Stat pills ───────────────────────────────────────────────── */}
          {!loading && items.length > 0 && (
            <div style={{ display: 'flex', gap: 10, marginBottom: 16, overflowX: 'auto', paddingBottom: 2 }}>
              {[
                { label: 'Total Items', value: totalQty, bg: 'var(--accent-bg)', color: 'var(--text-cta)' },
                { label: 'Needs Repair', value: needsRepair, bg: needsRepair > 0 ? 'var(--error-bg)' : 'var(--bg-pill)', color: needsRepair > 0 ? 'var(--error)' : 'var(--text-secondary)' },
                { label: 'Due Soon', value: dueSoonCount, bg: dueSoonCount > 0 ? 'var(--warning-bg)' : 'var(--bg-pill)', color: dueSoonCount > 0 ? 'var(--warning)' : 'var(--text-secondary)' },
              ].map(s => (
                <div key={s.label} style={{
                  flexShrink: 0,
                  backgroundColor: s.bg,
                  borderRadius: 12, padding: '10px 16px',
                  display: 'flex', flexDirection: 'column', gap: 2,
                }}>
                  <span style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</span>
                  <span style={{ fontSize: 12, fontWeight: 500, color: s.color, opacity: 0.8 }}>{s.label}</span>
                </div>
              ))}
            </div>
          )}

          {/* ── Category filter tabs ──────────────────────────────────────── */}
          {!loading && items.length > 0 && (
            <div style={{
              display: 'flex', gap: 8, overflowX: 'auto',
              paddingBottom: 12, marginBottom: 4,
            }}>
              {['All', ...CATEGORIES].map(cat => (
                <button key={cat} onClick={() => setCatFilter(cat)} style={filterChip(catFilter === cat)}>
                  {cat}
                </button>
              ))}
            </div>
          )}

          {/* ── Loading skeleton ──────────────────────────────────────────── */}
          {loading && (
            <div>
              {[1, 2, 3].map(n => (
                <div key={n} style={{
                  height: 96, borderRadius: 14, marginBottom: 10,
                  backgroundColor: 'var(--bg-card)',
                  animation: 'skel 1.2s ease infinite alternate',
                }} />
              ))}
            </div>
          )}

          {/* ── Error ────────────────────────────────────────────────────── */}
          {!loading && error && (
            <div style={{
              padding: 16, borderRadius: 12, marginBottom: 16,
              backgroundColor: 'var(--error-bg)', color: 'var(--error)',
              fontSize: 14, fontWeight: 500,
            }}>
              {error}
            </div>
          )}

          {/* ── Empty state ───────────────────────────────────────────────── */}
          {!loading && !error && items.length === 0 && (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', paddingTop: 80, gap: 12, textAlign: 'center',
            }}>
              <div style={{
                width: 72, height: 72, borderRadius: 20,
                backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Dumbbell size={32} color="var(--text-tertiary)" />
              </div>
              <p style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                No equipment added yet
              </p>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0, maxWidth: 260, lineHeight: 1.5 }}>
                Add your gym equipment to track maintenance schedules
              </p>
              <button
                onClick={() => setSheet('add')}
                style={{
                  marginTop: 8, padding: '12px 24px', borderRadius: 12,
                  border: '1.5px solid var(--cta-border)',
                  background: 'var(--cta-bg)', color: 'var(--cta-text)',
                  fontSize: 15, fontWeight: 600, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}
              >
                <Plus size={18} />
                Add Equipment
              </button>
            </div>
          )}

          {/* ── Grouped list (All tab) ────────────────────────────────────── */}
          {!loading && !error && grouped && grouped.map(({ cat, items: group }) => (
            <div key={cat} style={{ marginBottom: 8 }}>
              <div style={{
                fontSize: 12, fontWeight: 700, color: 'var(--text-tertiary)',
                letterSpacing: '0.06em', textTransform: 'uppercase',
                marginBottom: 8, marginTop: 4,
              }}>
                {cat}
              </div>
              {group.map(item => (
                <EquipmentCard key={item.id} item={item} onClick={() => setSheet(item)} />
              ))}
            </div>
          ))}

          {/* ── Flat filtered list ────────────────────────────────────────── */}
          {!loading && !error && !grouped && (
            filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-secondary)', fontSize: 14 }}>
                No {catFilter} equipment found.
              </div>
            ) : (
              filtered.map(item => (
                <EquipmentCard key={item.id} item={item} onClick={() => setSheet(item)} />
              ))
            )
          )}

        </div>
      </div>

      {/* ── Add / edit sheet ──────────────────────────────────────────────── */}
      {sheet && (
        <EquipmentSheet
          gymId={activeGymId}
          item={sheet === 'add' ? null : sheet}
          onClose={() => setSheet(null)}
          onSaved={handleSaved}
          onDeleted={handleDeleted}
        />
      )}

      <GymBottomNav active="more" onMorePress={() => setMoreOpen(true)} />
      <MoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} />
    </>
  )
}
