import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { Check } from 'lucide-react'
import { supabase } from '../utils/supabase'
import { getAvatarColor, getInitials } from '../utils/avatarColor'
import { formatMonthYear } from '../utils/dateHelpers'
import { useTheme } from '../contexts/ThemeContext'
import { EXPERIENCE_OPTIONS, EXPERIENCE_LABELS } from '../components/onboarding/onboardingConfig'

const GOALS = ['Lose Weight', 'Build Muscle', 'Stay Fit', 'Athletic Performance', 'Improve Health']
// Gender/experience are backend enum columns with DB check constraints that only
// accept specific lowercase values (see onboardingConfig.js / ScreenBodyStats.jsx,
// which already write these exact values successfully during onboarding). Using
// {label, value} pairs here — instead of the Title-Case display strings the old
// EXPERIENCE_LEVELS/gender array sent straight to the API — is what onboarding
// already does; mirror it instead of inventing a third casing convention.
const GENDER_OPTIONS = [
  { label: 'Male', value: 'male' },
  { label: 'Female', value: 'female' },
  { label: 'Prefer not to say', value: 'prefer_not_to_say' },
]
const GENDER_LABELS = Object.fromEntries(GENDER_OPTIONS.map(o => [o.value, o.label]))
const EQUIPMENT_OPTIONS = ['Full Gym', 'Home Gym', 'Minimal', 'Bodyweight Only']
const API = import.meta.env.VITE_API_URL || ''

// Maps a `users` table column name to the label shown on its Settings row, so a
// backend "users_<column>_check" constraint violation can be turned into a
// specific, human-readable toast instead of a generic/opaque failure message.
const FIELD_LABELS = {
  full_name: 'Name', age: 'Age', gender: 'gender', phone: 'phone',
  goal: 'goal', experience: 'experience', equipment: 'equipment',
  training_days: 'training days', injuries: 'injuries',
  current_weight: 'weight', height: 'height', target_weight: 'target weight',
}

// ─── ThemeSwatch ─────────────────────────────────────────────────────────────
function ThemeSwatch({ id }) {
  const outer = {
    width: 42, height: 30, borderRadius: 7, overflow: 'hidden', flexShrink: 0,
    border: '1px solid rgba(0,0,0,0.12)', position: 'relative',
    display: 'flex', flexDirection: 'column', gap: 3,
    padding: '5px 6px', boxSizing: 'border-box',
  }
  if (id === 'system') {
    return (
      <div style={{ ...outer, padding: 0 }}>
        <div style={{ position: 'absolute', left: 0, top: 0, width: '50%', height: '100%', background: "var(--bg-card)", display: 'flex', flexDirection: 'column', gap: 3, padding: '5px 4px', boxSizing: 'border-box' }}>
          <div style={{ height: 4, borderRadius: 2, background: "var(--text-primary)", width: '65%' }} />
          <div style={{ height: 3, borderRadius: 2, background: 'var(--text-cta)', width: '45%' }} />
          <div style={{ height: 3, borderRadius: 2, background: 'var(--border)', width: '80%' }} />
        </div>
        <div style={{ position: 'absolute', right: 0, top: 0, width: '50%', height: '100%', background: '#0F0F0F', display: 'flex', flexDirection: 'column', gap: 3, padding: '5px 4px', boxSizing: 'border-box' }}>
          <div style={{ height: 4, borderRadius: 2, background: 'var(--border)', width: '65%' }} />
          <div style={{ height: 3, borderRadius: 2, background: 'var(--text-cta)', width: '45%' }} />
          <div style={{ height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.15)', width: '80%' }} />
        </div>
      </div>
    )
  }
  const light = id === 'light'
  return (
    <div style={{ ...outer, background: light ? "var(--bg-card)" : '#0F0F0F' }}>
      <div style={{ height: 4, borderRadius: 2, background: light ? "var(--text-primary)" : 'var(--border)', width: '65%' }} />
      <div style={{ height: 3, borderRadius: 2, background: light ? 'var(--text-cta)' : 'var(--text-cta)', width: '45%' }} />
      <div style={{ height: 3, borderRadius: 2, background: light ? 'var(--border)' : 'rgba(255,255,255,0.15)', width: '80%' }} />
    </div>
  )
}

// ─── Toggle ───────────────────────────────────────────────────────────────────
const Toggle = ({ value, onChange }) => (
  <div
    onClick={() => onChange(!value)}
    style={{
      width: 44, height: 26, borderRadius: 13,
      backgroundColor: value ? "var(--text-primary)" : 'var(--border)',
      position: 'relative', cursor: 'pointer',
      transition: 'background-color 0.2s', flexShrink: 0,
    }}
  >
    <div style={{
      position: 'absolute', top: 3, left: value ? 21 : 3,
      width: 20, height: 20, borderRadius: '50%',
      backgroundColor: 'var(--bg-card)', transition: 'left 0.2s',
      boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
    }} />
  </div>
)

// ─── Pill Selector ────────────────────────────────────────────────────────────
// `options` accepts either plain strings (value === display label, the legacy
// shape still used by GOALS/EQUIPMENT_OPTIONS) or {label, value} objects (used
// wherever the option's value is a backend enum that must stay lowercase).
const PillSelector = ({ options, value, onChange, multiSelect = false }) => (
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '12px 0' }}>
    {options.map(raw => {
      const opt = typeof raw === 'object' ? raw.value : raw
      const label = typeof raw === 'object' ? raw.label : raw
      const isSelected = multiSelect ? (value || []).includes(opt) : value === opt
      return (
        <button
          key={opt} onClick={() => onChange(opt)}
          style={{
            height: 34, padding: '0 14px', borderRadius: 10,
            backgroundColor: isSelected ? "var(--text-primary)" : 'var(--bg-card)',
            color: isSelected ? 'var(--bg-primary)' : "var(--text-primary)",
            border: isSelected ? 'none' : '0.5px solid var(--border)',
            fontSize: 12, fontWeight: 600, cursor: 'pointer',
          }}
        >{label}</button>
      )
    })}
  </div>
)

// ─── Section label ────────────────────────────────────────────────────────────
const SectionLabel = ({ children, color = "var(--text-tertiary)" }) => (
  <div style={{
    fontSize: 11, fontWeight: 600, color,
    textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10,
  }}>{children}</div>
)

export default function Settings() {
  const navigate = useNavigate()
  const { theme, setThemeMode } = useTheme()
  const { role, effectiveRole, exitMemberMode } = useAuth()

  const [user, setUser] = useState(null)
  const [userId, setUserId] = useState(null)
  const [userEmail, setUserEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(null)

  const [form, setForm] = useState({
    full_name: '', age: '', gender: '', phone: '',
    goal: '', experience: '', equipment: [], training_days: 3,
    injuries: '', current_weight: '', height: '', target_weight: '',
  })

  const [isDirty, setIsDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [activeEditRow, setActiveEditRow] = useState(null)
  const [showBodyEdit, setShowBodyEdit] = useState(false)

  const [showPasswordSheet, setShowPasswordSheet] = useState(false)
  const [showDeleteSheet, setShowDeleteSheet] = useState(false)
  const [passwordForm, setPasswordForm] = useState({ current: '', newPass: '', confirm: '' })
  const [passwordError, setPasswordError] = useState('')
  const [passwordSaving, setPasswordSaving] = useState(false)

  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [toast, setToast] = useState(null)

  const [shareAchievements, setShareAchievements] = useState(false)

  // ─── Load user ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const loadUser = async () => {
      setLoading(true)
      setFetchError(null)
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser()
        if (!authUser) { navigate('/'); return }
        setUserId(authUser.id)
        setUserEmail(authUser.email || '')

        const { data: { session } } = await supabase.auth.getSession()
        const res = await fetch(`${API}/api/users/${authUser.id}`, {
          headers: { Authorization: `Bearer ${session?.access_token}` },
        })
        if (!res.ok) throw new Error('User not found')
        const data = await res.json()
        setUser(data)
        setShareAchievements(data.share_achievements ?? false)
        setForm({
          full_name: data.full_name || '',
          age: data.age ? String(data.age) : '',
          gender: data.gender || '',
          phone: data.phone || '',
          goal: data.goal || '',
          experience: data.experience || '',
          equipment: Array.isArray(data.equipment) ? data.equipment : [],
          training_days: data.training_days || 3,
          injuries: data.injuries || '',
          current_weight: data.current_weight ? String(data.current_weight) : '',
          height: data.height ? String(data.height) : '',
          target_weight: data.target_weight ? String(data.target_weight) : '',
        })
      } catch (err) {
        console.error('Load user failed:', err)
        setFetchError('Failed to load settings')
      } finally {
        setLoading(false)
      }
    }
    loadUser()
  }, [])

  // ─── Form helpers ───────────────────────────────────────────────────────────
  const updateField = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }))
    setIsDirty(true)
  }

  const toggleEquipment = (option) => {
    setForm(prev => {
      const current = prev.equipment || []
      const updated = current.includes(option)
        ? current.filter(e => e !== option)
        : [...current, option]
      return { ...prev, equipment: updated }
    })
    setIsDirty(true)
  }

  const toggleEditRow = (key) => setActiveEditRow(prev => prev === key ? null : key)

  // ─── Save ───────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!isDirty || saving || !userId) return
    setSaving(true)
    try {
      const payload = {
        full_name: form.full_name || undefined,
        age: form.age ? Number(form.age) : undefined,
        gender: form.gender || undefined,
        phone: form.phone || undefined,
        goal: form.goal || undefined,
        experience: form.experience || undefined,
        equipment: form.equipment.length > 0 ? form.equipment : undefined,
        training_days: form.training_days || undefined,
        injuries: form.injuries || undefined,
        current_weight: form.current_weight ? Number(form.current_weight) : undefined,
        height: form.height ? Number(form.height) : undefined,
        target_weight: form.target_weight ? Number(form.target_weight) : undefined,
      }
      Object.keys(payload).forEach(k => { if (payload[k] === undefined) delete payload[k] })

      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${API}/api/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        // Read the server's actual message (e.g. a DB check-constraint violation)
        // instead of discarding it — the catch block below turns it into a
        // field-specific toast so a failed field doesn't just look like it saved.
        let serverMessage = ''
        try { serverMessage = (await res.json())?.message || '' } catch { /* non-JSON error body */ }
        throw new Error(serverMessage || 'Save failed')
      }
      const updated = await res.json()
      setUser(updated)
      setIsDirty(false)
      setActiveEditRow(null)
      showToastMsg('Settings saved', 'success')
    } catch (err) {
      // isDirty is intentionally left true here — the failed edits stay in the
      // form so the user can fix the offending field and retry, instead of the
      // save silently reporting success while quietly dropping their changes.
      const constraintField = /users_(\w+)_check/.exec(err?.message || '')?.[1]
      const friendlyField = constraintField && FIELD_LABELS[constraintField]
      showToastMsg(
        friendlyField
          ? `Couldn't save — check your ${friendlyField} selection and try again.`
          : 'Failed to save settings. Please try again.',
        'error'
      )
    } finally {
      setSaving(false)
    }
  }

  // ─── Share achievements toggle ───────────────────────────────────────────────
  const handleShareAchievementsToggle = async (val) => {
    setShareAchievements(val)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      await fetch(`${API}/api/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ share_achievements: val }),
      })
    } catch {
      setShareAchievements(!val)
    }
  }

  // ─── Password ───────────────────────────────────────────────────────────────
  const handlePasswordChange = async () => {
    setPasswordError('')
    if (passwordForm.newPass.length < 8) { setPasswordError('Min 8 characters'); return }
    if (passwordForm.newPass !== passwordForm.confirm) { setPasswordError("Passwords don't match"); return }
    setPasswordSaving(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${API}/api/users/${userId}/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ new_password: passwordForm.newPass }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed') }
      setShowPasswordSheet(false)
      setPasswordForm({ current: '', newPass: '', confirm: '' })
      showToastMsg('Password updated', 'success')
    } catch (err) {
      setPasswordError(err.message || 'Update failed')
    } finally {
      setPasswordSaving(false)
    }
  }

  // ─── Logout / Delete ────────────────────────────────────────────────────────
  const handleLogout = async () => {
    await supabase.auth.signOut()
    localStorage.clear()
    navigate('/')
  }

  const handleDelete = async () => {
    if (deleteConfirm !== 'DELETE') return
    setDeleting(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${API}/api/users/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session?.access_token}` },
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.message || 'Deletion failed')
      }
      await supabase.auth.signOut()
      localStorage.clear()
      navigate('/')
    } catch (err) {
      showToastMsg(err.message || 'Deletion failed', 'error')
      setDeleting(false)
    }
  }

  // ─── Toast ──────────────────────────────────────────────────────────────────
  const showToastMsg = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 2500)
  }

  // ─── Shared styles ───────────────────────────────────────────────────────────
  const rowStyle = (extra = {}) => ({
    display: 'flex', alignItems: 'center',
    padding: '0 20px', height: 52, cursor: 'pointer',
    borderBottom: '0.5px solid var(--border)',
    ...extra,
  })

  const labelStyle = { fontSize: 14, fontWeight: 500, color: "var(--text-tertiary)", width: 110, flexShrink: 0 }
  const valueStyle = { flex: 1, fontSize: 14, fontWeight: 500, color: "var(--text-primary)", textAlign: 'right' }
  const inlineInputStyle = {
    flex: 1, border: 'none', outline: 'none', fontSize: 14, color: "var(--text-primary)",
    backgroundColor: 'transparent', textAlign: 'right', fontFamily: 'inherit',
  }

  const sheetInputStyle = {
    width: '100%', height: 52, border: '0.5px solid var(--border)',
    borderRadius: 12, padding: '0 16px', fontSize: 15,
    boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit',
  }

  // ─── Loading ─────────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{
      minHeight: '100vh', backgroundColor: 'var(--bg-primary)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>
      <span style={{ fontSize: 14, color: "var(--text-tertiary)" }}>Loading...</span>
    </div>
  )
  if (fetchError) return <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center' }}><div><p style={{ fontSize: 14, color: 'var(--error)', fontWeight: 500, marginBottom: 16 }}>{fetchError}</p><button onClick={() => window.location.reload()} style={{ height: 40, padding: '0 20px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer' }}>Try again</button></div></div>

  return (
    <div style={{
      minHeight: '100vh', backgroundColor: 'var(--bg-primary)', paddingBottom: 80,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>

      {/* STICKY HEADER */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10, backgroundColor: 'var(--bg-card)',
        padding: '16px 20px 12px', display: 'flex', alignItems: 'center', gap: 12,
        borderBottom: '0.5px solid var(--border)',
      }}>
        <button
          onClick={() => navigate(-1)}
          style={{ background: 'none', border: 'none', fontSize: 14, fontWeight: 500, color: 'var(--text-cta)', cursor: 'pointer', padding: 0 }}
        >← Back</button>
        <span style={{ flex: 1, fontSize: 20, fontWeight: 600, color: "var(--text-primary)", textAlign: 'center' }}>Settings</span>
        <button
          onClick={handleSave} disabled={!isDirty || saving}
          style={{
            backgroundColor: "var(--text-primary)", color: 'var(--bg-primary)', border: 'none', borderRadius: 10,
            height: 32, padding: '0 14px', fontSize: 13, fontWeight: 600,
            cursor: isDirty ? 'pointer' : 'default', opacity: isDirty && !saving ? 1 : 0.4,
          }}
        >{saving ? 'Saving...' : 'Save'}</button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

        {/* PROFILE HERO */}
        {user && (() => {
          const { bg, text } = getAvatarColor(form.full_name || 'U')
          const initials = getInitials(form.full_name || 'User')
          return (
            <div style={{
              backgroundColor: 'var(--bg-card)', borderRadius: '0 0 16px 16px',
              border: '0.5px solid var(--border)', borderTop: 'none',
              padding: 20, marginBottom: 16,
              display: 'flex', alignItems: 'center', gap: 16,
            }}>
              <div style={{
                width: 72, height: 72, borderRadius: '50%',
                backgroundColor: bg, color: text,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 24, fontWeight: 600, flexShrink: 0,
              }}>{initials}</div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 600, color: "var(--text-primary)" }}>
                  {form.full_name || 'Your Name'}
                </div>
                <span style={{
                  display: 'inline-block',
                  backgroundColor: 'var(--accent-bg)', color: 'var(--text-cta)',
                  fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 20, marginTop: 4,
                }}>
                  {effectiveRole === 'trainer' ? 'Trainer'
                    : effectiveRole === 'gym_owner' ? 'Owner'
                    : effectiveRole === 'staff' ? 'Staff'
                    : user.gym_id ? 'Member' : 'Solo User'}
                </span>
                <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 4 }}>
                  Joined {formatMonthYear(user.created_at)}
                </div>
              </div>
            </div>
          )
        })()}

        <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* ── SECTION 1: PROFILE ──────────────────────────────────────────────── */}
          <div>
            <SectionLabel>PROFILE</SectionLabel>
            <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: 12, border: '0.5px solid var(--border)', overflow: 'hidden' }}>

              {/* Text input rows */}
              {[
                { key: 'full_name', label: 'Name', type: 'text', placeholder: 'Your full name', display: form.full_name },
                { key: 'age', label: 'Age', type: 'number', placeholder: 'e.g. 24', display: form.age ? `${form.age} yrs` : '—' },
                { key: 'phone', label: 'Phone', type: 'tel', placeholder: '+91 98765 43210', display: form.phone || '—' },
              ].map(row => (
                <div key={row.key}>
                  <div onClick={() => toggleEditRow(row.key)} style={rowStyle()}>
                    <span style={labelStyle}>{row.label}</span>
                    {activeEditRow === row.key ? (
                      <input
                        autoFocus type={row.type} value={form[row.key]}
                        placeholder={row.placeholder}
                        onChange={e => updateField(row.key, e.target.value)}
                        onClick={e => e.stopPropagation()}
                        style={inlineInputStyle}
                      />
                    ) : (
                      <span style={valueStyle}>{row.display || '—'}</span>
                    )}
                  </div>
                </div>
              ))}

              {/* Gender — pill selector */}
              <div>
                <div
                  onClick={() => toggleEditRow('gender')}
                  style={rowStyle({ borderBottom: activeEditRow === 'gender' ? '0.5px solid rgba(0,0,0,0.06)' : 'none' })}
                >
                  <span style={labelStyle}>Gender</span>
                  <span style={valueStyle}>{GENDER_LABELS[form.gender] || form.gender || '—'}</span>
                </div>
                {activeEditRow === 'gender' && (
                  <div style={{ padding: '0 20px 12px' }}>
                    <PillSelector
                      options={GENDER_OPTIONS}
                      value={form.gender}
                      onChange={val => { updateField('gender', val); setActiveEditRow(null) }}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── SECTION 2: FITNESS ──────────────────────────────────────────────── */}
          <div>
            <SectionLabel>FITNESS</SectionLabel>
            <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: 12, border: '0.5px solid var(--border)', overflow: 'hidden' }}>

              {/* Goal */}
              <div>
                <div onClick={() => toggleEditRow('goal')} style={rowStyle()}>
                  <span style={labelStyle}>Goal</span>
                  <span style={{ ...valueStyle, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {form.goal || '—'}
                  </span>
                </div>
                {activeEditRow === 'goal' && (
                  <div style={{ padding: '4px 20px 12px', borderBottom: '0.5px solid var(--border)' }}>
                    <PillSelector
                      options={GOALS} value={form.goal}
                      onChange={val => { updateField('goal', val); setActiveEditRow(null) }}
                    />
                  </div>
                )}
              </div>

              {/* Experience */}
              <div>
                <div onClick={() => toggleEditRow('experience')} style={rowStyle()}>
                  <span style={labelStyle}>Experience</span>
                  <span style={valueStyle}>{EXPERIENCE_LABELS[form.experience] || form.experience || '—'}</span>
                </div>
                {activeEditRow === 'experience' && (
                  <div style={{ padding: '4px 20px 12px', borderBottom: '0.5px solid var(--border)' }}>
                    <PillSelector
                      options={EXPERIENCE_OPTIONS} value={form.experience}
                      onChange={val => { updateField('experience', val); setActiveEditRow(null) }}
                    />
                  </div>
                )}
              </div>

              {/* Equipment — multi-select */}
              <div>
                <div onClick={() => toggleEditRow('equipment')} style={rowStyle()}>
                  <span style={labelStyle}>Equipment</span>
                  <span style={{ ...valueStyle, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {form.equipment?.length > 0 ? form.equipment.join(', ') : '—'}
                  </span>
                </div>
                {activeEditRow === 'equipment' && (
                  <div style={{ padding: '4px 20px 12px', borderBottom: '0.5px solid var(--border)' }}>
                    <PillSelector
                      options={EQUIPMENT_OPTIONS} value={form.equipment}
                      onChange={toggleEquipment} multiSelect={true}
                    />
                  </div>
                )}
              </div>

              {/* Training days — stepper */}
              <div>
                <div onClick={() => toggleEditRow('training_days')} style={rowStyle()}>
                  <span style={labelStyle}>Training Days</span>
                  {activeEditRow === 'training_days' ? (
                    <div
                      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 16 }}
                      onClick={e => e.stopPropagation()}
                    >
                      <button
                        onClick={() => { if (form.training_days > 1) updateField('training_days', form.training_days - 1) }}
                        style={{
                          width: 32, height: 32, borderRadius: '50%',
                          border: '0.5px solid var(--border)', backgroundColor: 'var(--bg-card)',
                          fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: form.training_days <= 1 ? "var(--text-tertiary)" : "var(--text-primary)",
                        }}
                      >−</button>
                      <span style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", minWidth: 20, textAlign: 'center' }}>
                        {form.training_days}
                      </span>
                      <button
                        onClick={() => { if (form.training_days < 7) updateField('training_days', form.training_days + 1) }}
                        style={{
                          width: 32, height: 32, borderRadius: '50%',
                          border: '0.5px solid var(--border)', backgroundColor: 'var(--bg-card)',
                          fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: form.training_days >= 7 ? "var(--text-tertiary)" : "var(--text-primary)",
                        }}
                      >+</button>
                    </div>
                  ) : (
                    <span style={valueStyle}>{form.training_days} days/week</span>
                  )}
                </div>
              </div>

              {/* Injuries */}
              <div>
                <div onClick={() => toggleEditRow('injuries')} style={{ ...rowStyle({ borderBottom: 'none' }), minHeight: 52, height: 'auto' }}>
                  <span style={{ ...labelStyle, alignSelf: 'flex-start', paddingTop: 17 }}>Injuries</span>
                  {activeEditRow === 'injuries' ? (
                    <div style={{ flex: 1, padding: '10px 0' }} onClick={e => e.stopPropagation()}>
                      <input
                        autoFocus type="text" value={form.injuries}
                        placeholder="e.g. Lower back, left knee"
                        onChange={e => updateField('injuries', e.target.value)}
                        style={inlineInputStyle}
                      />
                      <div style={{ fontSize: 12, color: "var(--text-tertiary)", textAlign: 'right', marginTop: 4 }}>
                        Helps AI avoid risky exercises
                      </div>
                    </div>
                  ) : (
                    <span style={valueStyle}>{form.injuries || '—'}</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ── SECTION 3: BODY STATS ───────────────────────────────────────────── */}
          <div>
            <SectionLabel>BODY STATS</SectionLabel>
            <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: 12, border: '0.5px solid var(--border)', overflow: 'hidden' }}>
              {/* 3-tile row */}
              <div style={{ display: 'flex' }}>
                {[
                  { key: 'current_weight', label: 'Weight', unit: 'kg' },
                  { key: 'height', label: 'Height', unit: 'cm' },
                  { key: 'target_weight', label: 'Target', unit: 'kg' },
                ].map((stat, i) => (
                  <div
                    key={stat.key}
                    onClick={() => setShowBodyEdit(prev => !prev)}
                    style={{
                      flex: 1, padding: 12, textAlign: 'center', cursor: 'pointer',
                      borderRight: i < 2 ? '0.5px solid rgba(0,0,0,0.08)' : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 2 }}>
                      <span style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)" }}>{form[stat.key] || '—'}</span>
                      {form[stat.key] && <span style={{ fontSize: 13, color: "var(--text-tertiary)" }}>{stat.unit}</span>}
                    </div>
                    <div style={{
                      fontSize: 10, fontWeight: 600, color: "var(--text-tertiary)",
                      textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 4,
                    }}>{stat.label}</div>
                  </div>
                ))}
              </div>

              {/* Expandable edit rows */}
              {showBodyEdit && (
                <div style={{ borderTop: '0.5px solid rgba(0,0,0,0.08)' }}>
                  {[
                    { key: 'current_weight', label: 'Current Weight', unit: 'kg' },
                    { key: 'height', label: 'Height', unit: 'cm' },
                    { key: 'target_weight', label: 'Target Weight', unit: 'kg' },
                  ].map((field, i) => (
                    <div key={field.key} style={{
                      display: 'flex', alignItems: 'center', padding: '0 20px', height: 52,
                      borderBottom: i < 2 ? '0.5px solid rgba(0,0,0,0.06)' : 'none',
                    }}>
                      <span style={{ fontSize: 14, fontWeight: 500, color: "var(--text-tertiary)", flex: 1 }}>{field.label}</span>
                      <input
                        type="number" value={form[field.key]} placeholder="—"
                        onChange={e => updateField(field.key, e.target.value)}
                        style={{
                          width: 80, border: 'none', outline: 'none', fontSize: 14,
                          fontWeight: 600, color: "var(--text-primary)", backgroundColor: 'transparent',
                          textAlign: 'right', fontFamily: 'inherit',
                        }}
                      />
                      <span style={{ fontSize: 13, color: "var(--text-tertiary)", marginLeft: 4, width: 24 }}>{field.unit}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── GYM FEED PREFERENCES ────────────────────────────────────────────── */}
          {user?.gym_id && (
            <div>
              <SectionLabel>GYM FEED</SectionLabel>
              <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: 12, border: '0.5px solid var(--border)', overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', padding: '14px 20px', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                      Share achievements to gym feed
                    </p>
                    <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '3px 0 0' }}>
                      Auto-post your PRs and level-ups to your gym's feed
                    </p>
                  </div>
                  <Toggle value={shareAchievements} onChange={handleShareAchievementsToggle} />
                </div>
              </div>
            </div>
          )}

          {/* ── SECTION 4: ACCOUNT ──────────────────────────────────────────────── */}
          <div style={{ paddingBottom: 20 }}>
            <SectionLabel>ACCOUNT</SectionLabel>
            <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: 12, border: '0.5px solid var(--border)', overflow: 'hidden' }}>
              {/* Change Password */}
              <div
                onClick={() => setShowPasswordSheet(true)}
                style={rowStyle()}
              >
                <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>Change Password</span>
                <span style={{ fontSize: 16, color: "var(--text-tertiary)" }}>›</span>
              </div>

              {/* Switch back to trainer — only visible to trainer accounts in member mode */}
              {role === 'trainer' && (
                <div
                  onClick={() => { exitMemberMode(); navigate('/trainer/dashboard') }}
                  style={rowStyle()}
                >
                  <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Switch back to Trainer Settings</span>
                  <span style={{ fontSize: 16, color: 'var(--text-tertiary)' }}>›</span>
                </div>
              )}

              {/* Delete Account */}
              <div onClick={() => setShowDeleteSheet(true)} style={{ ...rowStyle({ borderBottom: 'none' }) }}>
                <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: 'var(--error)' }}>Delete Account</span>
                <span style={{ fontSize: 16, color: 'var(--error)' }}>›</span>
              </div>
            </div>
          </div>

          {/* ── APPEARANCE ──────────────────────────────────────────────────────── */}
          <div>
            <SectionLabel color="var(--text-tertiary)">APPEARANCE</SectionLabel>
            <div style={{
              backgroundColor: 'var(--bg-card)',
              borderRadius: 12,
              border: '0.5px solid var(--border)',
              overflow: 'hidden',
            }}>
              {[
                { id: 'light',  label: 'Light',  sub: null },
                { id: 'dark',   label: 'Dark',   sub: null },
                { id: 'system', label: 'System', sub: 'Follows your device setting' },
              ].map((item, i) => (
                <div
                  key={item.id}
                  onClick={() => setThemeMode(item.id)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '14px 16px', cursor: 'pointer',
                    background: theme === item.id ? 'var(--accent-bg)' : 'transparent',
                    borderBottom: i < 2 ? '0.5px solid rgba(0,0,0,0.06)' : 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <ThemeSwatch id={item.id} />
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 500, color: "var(--text-primary)" }}>{item.label}</div>
                      {item.sub && <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 2 }}>{item.sub}</div>}
                    </div>
                  </div>
                  {theme === item.id && <Check size={18} color="var(--text-cta)" />}
                </div>
              ))}
            </div>
          </div>

          {/* ── LOG OUT ─────────────────────────────────────────────────────────── */}
          <div style={{ padding: '8px 16px 40px' }}>
            <div style={{ height: 1, background: 'var(--border)', margin: '8px 0 20px' }} />
            <button
              onClick={handleLogout}
              style={{
                width: '100%', padding: '14px', borderRadius: 12,
                background: 'var(--error-bg)', color: 'var(--error)', fontWeight: 600,
                fontSize: 15, border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              Log Out
            </button>
          </div>
        </div>
      </div>

      {/* ── CHANGE PASSWORD SHEET ──────────────────────────────────────────────── */}
      {showPasswordSheet && (
        <>
          <div
            onClick={() => { setShowPasswordSheet(false); setPasswordError(''); setPasswordForm({ current: '', newPass: '', confirm: '' }) }}
            style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 50 }}
          />
          <div style={{
            position: 'fixed', bottom: 0, left: 0, right: 0,
            backgroundColor: 'var(--bg-card)', borderRadius: '20px 20px 0 0',
            zIndex: 51, padding: '0 0 32px',
          }}>
            <div style={{ width: 40, height: 4, backgroundColor: 'var(--border)', borderRadius: 2, margin: '12px auto 0' }} />
            <div style={{ padding: '16px 20px 0' }}>
              <div style={{ fontSize: 18, fontWeight: 600, color: "var(--text-primary)", marginBottom: 16 }}>Change Password</div>
              {[
                { key: 'current', placeholder: 'Current password' },
                { key: 'newPass', placeholder: 'New password (min 8 chars)' },
                { key: 'confirm', placeholder: 'Confirm new password' },
              ].map(field => (
                <div key={field.key} style={{ marginBottom: 10 }}>
                  <input
                    type="password" placeholder={field.placeholder} value={passwordForm[field.key]}
                    onChange={e => { setPasswordForm(prev => ({ ...prev, [field.key]: e.target.value })); setPasswordError('') }}
                    style={sheetInputStyle}
                  />
                </div>
              ))}
              {passwordError && (
                <div style={{ fontSize: 12, color: 'var(--error)', marginBottom: 12 }}>{passwordError}</div>
              )}
              <button
                onClick={handlePasswordChange}
                disabled={passwordSaving || passwordForm.newPass.length < 8 || passwordForm.newPass !== passwordForm.confirm}
                style={{
                  width: '100%', height: 52, backgroundColor: "var(--text-primary)", color: 'var(--bg-primary)',
                  border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 500,
                  cursor: 'pointer', marginTop: 4,
                  opacity: (passwordSaving || passwordForm.newPass.length < 8 || passwordForm.newPass !== passwordForm.confirm) ? 0.4 : 1,
                }}
              >{passwordSaving ? 'Updating...' : 'Update Password'}</button>
            </div>
          </div>
        </>
      )}

      {/* ── DELETE ACCOUNT SHEET ───────────────────────────────────────────────── */}
      {showDeleteSheet && (
        <>
          <div
            onClick={() => { setShowDeleteSheet(false); setDeleteConfirm('') }}
            style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 50 }}
          />
          <div style={{
            position: 'fixed', bottom: 0, left: 0, right: 0,
            backgroundColor: 'var(--bg-card)', borderRadius: '20px 20px 0 0',
            zIndex: 51, padding: '0 20px 32px',
          }}>
            <div style={{ width: 40, height: 4, backgroundColor: 'var(--border)', borderRadius: 2, margin: '12px auto 16px' }} />
            <div style={{ fontSize: 18, fontWeight: 600, color: "var(--text-primary)" }}>Delete Account?</div>

            <div style={{
              backgroundColor: 'var(--warning-bg)', borderLeft: '3px solid var(--warning)',
              borderRadius: '0 10px 10px 0', padding: 12, marginTop: 14,
            }}>
              <div style={{ fontSize: 13, color: 'var(--warning)' }}>
                ⚠ This will permanently delete your account and all data. Workouts, diet logs, progress — everything. This cannot be undone.
              </div>
            </div>

            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 8 }}>Type DELETE to confirm</div>
              <input
                type="text" placeholder="Type DELETE" value={deleteConfirm}
                onChange={e => setDeleteConfirm(e.target.value)}
                style={sheetInputStyle}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
              <button
                onClick={handleDelete}
                disabled={deleteConfirm !== 'DELETE' || deleting}
                style={{
                  width: '100%', height: 52, backgroundColor: 'var(--error)', color: 'white',
                  border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 500,
                  cursor: 'pointer', opacity: (deleteConfirm !== 'DELETE' || deleting) ? 0.4 : 1,
                }}
              >{deleting ? 'Deleting...' : 'Delete Account'}</button>
              <button
                onClick={() => { setShowDeleteSheet(false); setDeleteConfirm('') }}
                style={{
                  width: '100%', height: 52, backgroundColor: 'var(--bg-card)', color: "var(--text-primary)",
                  border: '0.5px solid var(--text-primary)', borderRadius: 12, fontSize: 15, fontWeight: 500, cursor: 'pointer',
                }}
              >Cancel</button>
            </div>
          </div>
        </>
      )}

      {/* TOAST */}
      {toast && (
        <div style={{
          position: 'fixed', top: 16, left: 16, right: 16, zIndex: 100,
          backgroundColor: toast.type === 'success' ? 'var(--success-bg)' : 'var(--error-bg)',
          borderRadius: 16, padding: '14px 16px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
        }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: toast.type === 'success' ? 'var(--success)' : 'var(--error)' }}>
            {toast.message}
          </div>
        </div>
      )}
    </div>
  )
}
