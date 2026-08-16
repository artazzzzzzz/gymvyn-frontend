import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, Copy, RefreshCw, ChevronRight } from 'lucide-react'
import GymBottomNav from '../../components/GymBottomNav'
import MoreSheet from '../../components/MoreSheet'
import { useOwnerGymId } from '../../hooks/useOwnerGymId'
import { supabase } from '../../utils/supabase'
import { getInitials, getAvatarColor } from '../../utils/avatarColor'

const BASE = import.meta.env.VITE_API_URL

const PERMISSION_META = [
  { key: 'checkin',            label: 'Check-in Members',  sub: 'Scan QR or search to check members in' },
  { key: 'view_members',       label: 'View Members',      sub: 'See member list and profiles' },
  { key: 'manage_members',     label: 'Manage Members',    sub: 'Import and update gym memberships' },
  { key: 'view_payments',      label: 'View Payments',     sub: 'See payment records and history' },
  { key: 'collect_payment',    label: 'Collect Payments',  sub: 'Mark payments as received' },
  { key: 'view_schedule',      label: 'View Schedule',     sub: 'See class schedule' },
  { key: 'manage_lockers',     label: 'Manage Lockers',    sub: 'Assign and release lockers' },
  { key: 'view_supplements',   label: 'View Supplements',  sub: 'See supplement orders' },
  { key: 'view_announcements', label: 'Announcements',     sub: 'View and post announcements' },
  { key: 'manage_feed',        label: 'Manage Feed',       sub: 'Post announcements, pin and delete posts' },
  { key: 'chat',                label: 'Chat',              sub: 'Message members, staff, and trainers' },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

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
  if (!res.ok) throw Object.assign(new Error(data.error || data.message || `Request failed (${res.status})`), { status: res.status })
  return data
}

// ── Shared UI ─────────────────────────────────────────────────────────────────

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
        backgroundColor: 'var(--bg-card)',
        transition: 'left 0.2s',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
      }} />
    </div>
  )
}

function Sheet({ onClose, children, title, zIndex = 51 }) {
  return (
    <>
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0,
        backgroundColor: 'rgba(0,0,0,0.4)', zIndex: zIndex - 1,
      }} />
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex,
        backgroundColor: 'var(--bg-card)',
        borderRadius: '20px 20px 0 0',
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

function StaffAvatar({ name, size = 40 }) {
  const { bg, text } = getAvatarColor(name)
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      backgroundColor: bg, color: text,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.35, fontWeight: 700, flexShrink: 0,
    }}>
      {getInitials(name)}
    </div>
  )
}

// ── AddStaffSheet ─────────────────────────────────────────────────────────────

function AddStaffSheet({ gymId, onClose, onAdded }) {
  const [input, setInput] = useState('')
  const [roleLabel, setRoleLabel] = useState('Front Desk')
  const [resolvedUser, setResolvedUser] = useState(null) // { userId, fullName }
  const [lookupError, setLookupError] = useState('')
  const [looking, setLooking] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const lookupTimer = useRef(null)

  const isEmail = v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())

  async function lookupEmail(email) {
    setLooking(true)
    setLookupError('')
    setResolvedUser(null)
    try {
      const data = await apiFetch(`/api/users/lookup-user?email=${encodeURIComponent(email.trim())}`)
      setResolvedUser(data)
    } catch (err) {
      setLookupError(err.status === 404 ? 'No user found with that email' : err.message)
    } finally {
      setLooking(false)
    }
  }

  function handleInputChange(val) {
    setInput(val)
    setResolvedUser(null)
    setLookupError('')
    if (lookupTimer.current) clearTimeout(lookupTimer.current)
    if (isEmail(val)) {
      lookupTimer.current = setTimeout(() => lookupEmail(val), 700)
    }
  }

  async function handleAdd() {
    const userId = resolvedUser?.userId || (!isEmail(input.trim()) ? input.trim() : null)
    if (!userId) {
      setSaveError('Enter a valid user ID or look up by email first')
      return
    }
    setSaving(true)
    setSaveError('')
    try {
      const data = await apiFetch(`/api/staff/gym/${gymId}/invite`, {
        method: 'POST',
        body: JSON.stringify({ userId, roleLabel: roleLabel.trim() || 'Front Desk' }),
      })
      onAdded(data)
      onClose()
    } catch (err) {
      setSaveError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const canAdd = (resolvedUser?.userId || (!isEmail(input.trim()) && input.trim().length > 10)) && !saving

  return (
    <Sheet title="Add Staff Member" onClose={onClose}>
      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
          Email or User ID
        </label>
        <input
          type="text"
          placeholder="staff@email.com or user UUID"
          value={input}
          onChange={e => handleInputChange(e.target.value)}
          style={{
            width: '100%', boxSizing: 'border-box',
            padding: '12px 14px', fontSize: 15,
            border: '1px solid var(--border)', borderRadius: 10,
            backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)',
            outline: 'none',
          }}
        />
        {looking && (
          <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 6 }}>Looking up…</p>
        )}
        {resolvedUser && (
          <p style={{ fontSize: 13, color: 'var(--success)', marginTop: 6, fontWeight: 600 }}>
            Found: {resolvedUser.fullName}
          </p>
        )}
        {lookupError && (
          <p style={{ fontSize: 13, color: 'var(--error)', marginTop: 6 }}>{lookupError}</p>
        )}
      </div>

      <div style={{ marginBottom: 20 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
          Role Label
        </label>
        <input
          type="text"
          placeholder="e.g. Receptionist, Manager, Floor Staff"
          value={roleLabel}
          onChange={e => setRoleLabel(e.target.value)}
          style={{
            width: '100%', boxSizing: 'border-box',
            padding: '12px 14px', fontSize: 15,
            border: '1px solid var(--border)', borderRadius: 10,
            backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)',
            outline: 'none',
          }}
        />
      </div>

      {saveError && (
        <div style={{
          backgroundColor: 'var(--error-bg)', border: '1px solid var(--error)',
          borderRadius: 10, padding: '10px 14px', marginBottom: 14,
          fontSize: 13, color: 'var(--error)', lineHeight: 1.5,
        }}>
          {saveError}
        </div>
      )}

      <button
        onClick={handleAdd}
        disabled={!canAdd}
        style={{
          width: '100%', padding: '14px', borderRadius: 12,
          backgroundColor: 'var(--text-primary)', color: 'var(--bg-card)',
          border: 'none', fontSize: 15, fontWeight: 600,
          cursor: canAdd ? 'pointer' : 'default',
          opacity: canAdd ? 1 : 0.45,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}
      >
        {saving ? (
          <div style={{
            width: 18, height: 18, border: '2px solid var(--bg-card)',
            borderTopColor: 'transparent', borderRadius: '50%',
            animation: 'spin 0.7s linear infinite',
          }} />
        ) : 'Add Staff Member'}
      </button>
    </Sheet>
  )
}

// ── StaffDetailSheet ──────────────────────────────────────────────────────────

function StaffDetailSheet({ staff: initialStaff, onClose, onUpdated }) {
  const [staff, setStaff] = useState(initialStaff)
  const [editingRole, setEditingRole] = useState(false)
  const [roleInput, setRoleInput] = useState(initialStaff.roleLabel)
  const [savingRole, setSavingRole] = useState(false)
  const [toggling, setToggling] = useState(false)
  const [permBusy, setPermBusy] = useState({})
  const [error, setError] = useState('')

  async function saveRoleLabel() {
    if (roleInput.trim() === staff.roleLabel || !roleInput.trim()) {
      setEditingRole(false)
      return
    }
    setSavingRole(true)
    try {
      await apiFetch(`/api/staff/${staff.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ roleLabel: roleInput.trim() }),
      })
      const updated = { ...staff, roleLabel: roleInput.trim() }
      setStaff(updated)
      onUpdated(updated)
    } catch (err) {
      setError(err.message)
    } finally {
      setSavingRole(false)
      setEditingRole(false)
    }
  }

  async function toggleActive() {
    const newActive = !staff.isActive
    const confirmed = window.confirm(
      newActive
        ? `Reactivate ${staff.fullName}? They will regain access.`
        : `Deactivate ${staff.fullName}? They will lose access immediately.`
    )
    if (!confirmed) return
    setToggling(true)
    try {
      await apiFetch(`/api/staff/${staff.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: newActive }),
      })
      const updated = { ...staff, isActive: newActive }
      setStaff(updated)
      onUpdated(updated)
    } catch (err) {
      setError(err.message)
    } finally {
      setToggling(false)
    }
  }

  async function togglePermission(key) {
    if (permBusy[key]) return
    const oldVal = staff.permissions[key]
    const newVal = !oldVal
    // Optimistic update
    setStaff(s => ({ ...s, permissions: { ...s.permissions, [key]: newVal } }))
    setPermBusy(b => ({ ...b, [key]: true }))
    try {
      await apiFetch(`/api/staff/${staff.id}/permissions`, {
        method: 'PATCH',
        body: JSON.stringify({ permissions: { [key]: newVal } }),
      })
      const updated = { ...staff, permissions: { ...staff.permissions, [key]: newVal } }
      onUpdated(updated)
    } catch (err) {
      // Revert on error
      setStaff(s => ({ ...s, permissions: { ...s.permissions, [key]: oldVal } }))
      setError(err.message)
    } finally {
      setPermBusy(b => ({ ...b, [key]: false }))
    }
  }

  return (
    <Sheet title="Staff Member" onClose={onClose}>
      {/* Top: avatar + name + active toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <StaffAvatar name={staff.fullName} size={48} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>
            {staff.fullName}
          </div>
          {editingRole ? (
            <input
              autoFocus
              value={roleInput}
              onChange={e => setRoleInput(e.target.value)}
              onBlur={saveRoleLabel}
              onKeyDown={e => e.key === 'Enter' && saveRoleLabel()}
              style={{
                fontSize: 13, color: 'var(--text-secondary)',
                border: '1px solid var(--border)', borderRadius: 6,
                padding: '3px 8px', backgroundColor: 'var(--bg-primary)',
                outline: 'none', width: '100%',
              }}
            />
          ) : (
            <button
              onClick={() => setEditingRole(true)}
              style={{
                background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                fontSize: 13, color: 'var(--text-secondary)',
                display: 'flex', alignItems: 'center', gap: 4,
              }}
            >
              {savingRole ? '...' : staff.roleLabel}
              <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>✎</span>
            </button>
          )}
        </div>
        <button
          onClick={toggleActive}
          disabled={toggling}
          style={{
            padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
            border: 'none', cursor: 'pointer',
            backgroundColor: staff.isActive ? 'var(--error-bg)' : 'var(--success-bg)',
            color: staff.isActive ? 'var(--error)' : 'var(--success)',
            opacity: toggling ? 0.5 : 1,
          }}
        >
          {staff.isActive ? 'Deactivate' : 'Reactivate'}
        </button>
      </div>

      {error && (
        <div style={{
          backgroundColor: 'var(--error-bg)', borderRadius: 8,
          padding: '8px 12px', marginBottom: 14,
          fontSize: 13, color: 'var(--error)',
        }}>
          {error}
        </div>
      )}

      {/* Permissions */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>Permissions</div>
        <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 14 }}>
          Control what this staff member can access
        </div>
      </div>

      <div style={{
        border: '1px solid var(--border)', borderRadius: 12,
        overflow: 'hidden', backgroundColor: 'var(--bg-primary)',
      }}>
        {PERMISSION_META.map((p, i) => (
          <div key={p.key}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '14px 16px',
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{p.label}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{p.sub}</div>
              </div>
              <Toggle
                value={!!staff.permissions[p.key]}
                onChange={() => togglePermission(p.key)}
              />
            </div>
            {i < PERMISSION_META.length - 1 && (
              <div style={{ marginLeft: 16, borderTop: '0.5px solid var(--border)' }} />
            )}
          </div>
        ))}
      </div>
    </Sheet>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function GymStaff() {
  const navigate = useNavigate()
  const gymId = useOwnerGymId()

  const [staff, setStaff] = useState([])
  const [staffCode, setStaffCode] = useState('')
  const [loading, setLoading] = useState(true)
  const [moreOpen, setMoreOpen] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [selectedStaff, setSelectedStaff] = useState(null)
  const [toast, setToast] = useState(null)
  const [copied, setCopied] = useState(false)

  function showToast(message, type = 'success') {
    setToast({ message, type })
    setTimeout(() => setToast(null), 2500)
  }

  async function loadAll(id) {
    setLoading(true)
    try {
      const [staffData, codeData] = await Promise.all([
        apiFetch(`/api/staff/gym/${id}`),
        apiFetch(`/api/staff/gym/${id}/code`),
      ])
      setStaff(Array.isArray(staffData) ? staffData : [])
      setStaffCode(codeData.staffCode || '')
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (gymId) loadAll(gymId)
  }, [gymId])

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(staffCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      showToast('Copy failed', 'error')
    }
  }

  async function regenerateCode() {
    const confirmed = window.confirm('Generate a new staff code? The old code will stop working.')
    if (!confirmed) return
    try {
      const data = await apiFetch(`/api/staff/gym/${gymId}/regenerate-code`, { method: 'POST' })
      setStaffCode(data.staffCode)
      showToast('Staff code regenerated')
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  function handleStaffAdded(newMember) {
    setStaff(prev => [...prev, newMember])
    showToast('Staff member added')
  }

  function handleStaffUpdated(updated) {
    setStaff(prev => prev.map(s => s.id === updated.id ? updated : s))
    if (selectedStaff?.id === updated.id) setSelectedStaff(updated)
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', backgroundColor: 'var(--bg-primary)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}>
        <span style={{ fontSize: 14, color: 'var(--text-tertiary)' }}>Loading staff…</span>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh', backgroundColor: 'var(--bg-primary)', paddingBottom: 100,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>
      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10, backgroundColor: 'var(--bg-card)',
        borderBottom: '0.5px solid var(--border)', padding: '16px 20px 12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
          <button
            onClick={() => navigate(-1)}
            style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--text-primary)', padding: 0, lineHeight: 1 }}
          >←</button>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>Staff</div>
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Manage who has access to your gym</div>
          </div>
        </div>

        {/* Staff code pill */}
        {staffCode && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border)',
              borderRadius: 20, padding: '6px 12px', flex: 1,
            }}>
              <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Staff Code</span>
              <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: 3, flex: 1 }}>{staffCode}</span>
              <button
                onClick={copyCode}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, display: 'flex', alignItems: 'center' }}
                title="Copy code"
              >
                {copied
                  ? <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--success)' }}>Copied!</span>
                  : <Copy size={15} color="var(--text-secondary)" />
                }
              </button>
            </div>
            <button
              onClick={regenerateCode}
              title="Regenerate staff code"
              style={{
                background: 'none', border: '1px solid var(--border)',
                borderRadius: 20, padding: '6px 10px', cursor: 'pointer',
                display: 'flex', alignItems: 'center',
                backgroundColor: 'var(--bg-primary)',
              }}
            >
              <RefreshCw size={14} color="var(--text-secondary)" />
            </button>
          </div>
        )}
      </div>

      <div style={{ padding: '16px 16px 0' }}>
        {/* Staff list */}
        {staff.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '48px 24px',
            backgroundColor: 'var(--bg-card)', borderRadius: 16,
            border: '1px solid var(--border)',
          }}>
            <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'center', color: 'var(--text-tertiary)' }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M16 10a2 2 0 1 1-4 0 2 2 0 0 1 4 0"/><path d="M8 10h.01M8 14h.01M12 14h.01M16 14h.01"/></svg>
            </div>
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>
              No staff added yet
            </div>
            <div style={{ fontSize: 14, color: 'var(--text-tertiary)', lineHeight: 1.6 }}>
              Share your staff code with team members so they can join.
            </div>
            {staffCode && (
              <div style={{
                marginTop: 20, backgroundColor: 'var(--bg-primary)', borderRadius: 12,
                padding: '12px 20px', display: 'inline-block',
                border: '1px solid var(--border)',
              }}>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Staff Code</div>
                <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--text-primary)', letterSpacing: 5 }}>{staffCode}</div>
              </div>
            )}
          </div>
        ) : (
          <div style={{
            backgroundColor: 'var(--bg-card)', borderRadius: 16,
            border: '1px solid var(--border)', overflow: 'hidden',
          }}>
            {staff.map((member, i) => (
              <div key={member.id}>
                <button
                  onClick={() => setSelectedStaff(member)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center',
                    gap: 12, padding: '14px 16px',
                    background: 'none', border: 'none', cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <StaffAvatar name={member.fullName} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>
                      {member.fullName}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      {member.roleLabel}
                    </div>
                  </div>
                  <span style={{
                    fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 20,
                    backgroundColor: member.isActive ? 'var(--success-bg)' : 'var(--error-bg)',
                    color: member.isActive ? 'var(--success)' : 'var(--error)',
                    flexShrink: 0,
                  }}>
                    {member.isActive ? 'Active' : 'Inactive'}
                  </span>
                  <ChevronRight size={16} color="var(--text-tertiary)" />
                </button>
                {i < staff.length - 1 && (
                  <div style={{ marginLeft: 68, borderTop: '0.5px solid var(--border)' }} />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Add Staff CTA */}
        <button
          onClick={() => setShowAdd(true)}
          style={{
            display: 'block', width: '100%', marginTop: 16,
            padding: '14px', borderRadius: 12,
            border: '1.5px dashed var(--border)',
            backgroundColor: 'transparent', color: 'var(--text-secondary)',
            fontSize: 15, fontWeight: 600, cursor: 'pointer',
          }}
        >
          + Add Staff
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 90, left: '50%', transform: 'translateX(-50%)',
          backgroundColor: toast.type === 'error' ? 'var(--error)' : 'var(--text-primary)',
          color: 'var(--bg-card)', padding: '10px 20px', borderRadius: 20,
          fontSize: 13, fontWeight: 600, zIndex: 200, whiteSpace: 'nowrap',
          boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
        }}>
          {toast.message}
        </div>
      )}

      {/* Sheets */}
      {showAdd && (
        <AddStaffSheet
          gymId={gymId}
          onClose={() => setShowAdd(false)}
          onAdded={handleStaffAdded}
        />
      )}
      {selectedStaff && (
        <StaffDetailSheet
          staff={selectedStaff}
          onClose={() => setSelectedStaff(null)}
          onUpdated={handleStaffUpdated}
        />
      )}

      <GymBottomNav onMorePress={() => setMoreOpen(true)} />
      <MoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} />

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
