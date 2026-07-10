import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check } from 'lucide-react'
import GymBottomNav from '../../components/GymBottomNav'
import MoreSheet from '../../components/MoreSheet'
import { getInitials } from '../../utils/avatarColor'
import { useAuth } from '../../hooks/useAuth'
import { useTheme } from '../../contexts/ThemeContext'
import { supabase } from '../../utils/supabase'
import { useOwnerGymId } from '../../hooks/useOwnerGymId'
import { CitySearchInput } from '../../components/CitySearchInput'

const GYM_TYPES = ['Commercial', 'Boutique', 'CrossFit', 'Yoga Studio', 'Other']

const DAYS = [
  { key: 'mon', label: 'Mon' }, { key: 'tue', label: 'Tue' },
  { key: 'wed', label: 'Wed' }, { key: 'thu', label: 'Thu' },
  { key: 'fri', label: 'Fri' }, { key: 'sat', label: 'Sat' },
  { key: 'sun', label: 'Sun' },
]

const DEFAULT_HOURS = {
  mon: { open: '06:00', close: '22:00', closed: false },
  tue: { open: '06:00', close: '22:00', closed: false },
  wed: { open: '06:00', close: '22:00', closed: false },
  thu: { open: '06:00', close: '22:00', closed: false },
  fri: { open: '06:00', close: '22:00', closed: false },
  sat: { open: '07:00', close: '20:00', closed: false },
  sun: { open: '08:00', close: '18:00', closed: false },
}

const DEFAULT_NOTIFICATIONS = {
  membership_expiry_reminder: true,
  new_member_alert: true,
  payment_received: true,
  low_attendance_alert: false,
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
        <div style={{ position: 'absolute', left: 0, top: 0, width: '50%', height: '100%', background: 'var(--bg-card)', display: 'flex', flexDirection: 'column', gap: 3, padding: '5px 4px', boxSizing: 'border-box' }}>
          <div style={{ height: 4, borderRadius: 2, background: 'var(--text-primary)', width: '65%' }} />
          <div style={{ height: 3, borderRadius: 2, background: 'var(--text-cta)', width: '45%' }} />
          <div style={{ height: 3, borderRadius: 2, background: 'rgba(0,0,0,0.1)', width: '80%' }} />
        </div>
        <div style={{ position: 'absolute', right: 0, top: 0, width: '50%', height: '100%', background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column', gap: 3, padding: '5px 4px', boxSizing: 'border-box' }}>
          <div style={{ height: 4, borderRadius: 2, background: 'var(--border)', width: '65%' }} />
          <div style={{ height: 3, borderRadius: 2, background: 'var(--text-cta)', width: '45%' }} />
          <div style={{ height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.15)', width: '80%' }} />
        </div>
      </div>
    )
  }
  const light = id === 'light'
  return (
    <div style={{ ...outer, background: light ? 'var(--bg-card)' : 'var(--bg-primary)' }}>
      <div style={{ height: 4, borderRadius: 2, background: light ? 'var(--text-primary)' : 'var(--border)', width: '65%' }} />
      <div style={{ height: 3, borderRadius: 2, background: light ? 'var(--text-cta)' : 'var(--text-cta)', width: '45%' }} />
      <div style={{ height: 3, borderRadius: 2, background: light ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.15)', width: '80%' }} />
    </div>
  )
}

// ─── Toggle ───────────────────────────────────────────────────────────────────
const Toggle = ({ value, onChange }) => (
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

export default function GymSettings() {
  const navigate = useNavigate()
  const { signOut } = useAuth()
  const { theme, setThemeMode } = useTheme()

  const handleLogout = async () => {
    await signOut()
    navigate('/login', { replace: true })
  }
  const gymId = useOwnerGymId()
  const API = import.meta.env.VITE_API_URL || ''
  const logoInputRef = useRef(null)

  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState({
    name: '', city: '', address: '', phone: '', gym_type: 'Commercial', description: '',
  })
  const [hours, setHours] = useState(DEFAULT_HOURS)
  const [plans, setPlans] = useState([])
  const [notifications, setNotifications] = useState(DEFAULT_NOTIFICATIONS)
  const [logoUrl, setLogoUrl] = useState(null)
  const [logoUploading, setLogoUploading] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showPlanSheet, setShowPlanSheet] = useState(false)
  const [editingPlan, setEditingPlan] = useState(null)
  const [planForm, setPlanForm] = useState({ name: '', price: '', duration_days: '', features: '' })
  const [showDeactivateSheet, setShowDeactivateSheet] = useState(false)
  const [deactivating, setDeactivating] = useState(false)
  const [toast, setToast] = useState(null)
  const [moreOpen, setMoreOpen] = useState(false)

  // ── Locker toggle ──────────────────────────────────────────────────────────
  const [lockersEnabled, setLockersEnabled] = useState(false)
  const [lockersLoading, setLockersLoading] = useState(true)
  const [showLockersOffConfirm, setShowLockersOffConfirm] = useState(false)

  // ─── Fetch settings ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!gymId) { setLoading(false); return }
    const fetchSettings = async () => {
      setLoading(true)
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const res = await fetch(`${API}/api/gyms/${gymId}/settings`, {
          headers: { Authorization: `Bearer ${session?.access_token}` },
        })
        const data = await res.json()
        setProfile({
          name: data.name || '', city: data.city || '',
          address: data.address || '', phone: data.phone || '',
          gym_type: data.gym_type || 'Commercial', description: data.description || '',
        })
        setHours(data.operating_hours || DEFAULT_HOURS)
        setPlans(data.membership_plans || [])
        setNotifications(data.notifications || DEFAULT_NOTIFICATIONS)
        setLogoUrl(data.logo_url || null)
      } catch (err) {
        console.error('Settings fetch failed:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchSettings()
  }, [gymId])

  useEffect(() => {
    if (!gymId) { setLockersLoading(false); return }
    const fetchLockerSettings = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const token = session?.access_token
        const res = await fetch(`${API}/api/lockers/settings`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.ok) {
          const data = await res.json()
          setLockersEnabled(data.lockers_enabled ?? false)
        }
      } catch { /* non-critical */ } finally {
        setLockersLoading(false)
      }
    }
    fetchLockerSettings()
  }, [gymId])

  // ─── Helpers ───────────────────────────────────────────────────────────────
  const markDirty = (setter) => (...args) => { setter(...args); setIsDirty(true) }

  const showToastMsg = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 2500)
  }

  // ─── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!isDirty || saving) return
    setSaving(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${API}/api/gyms/${gymId}/settings`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ ...profile, operating_hours: hours, notifications }),
      })
      if (!res.ok) throw new Error('Save failed')
      setIsDirty(false)
      showToastMsg('Settings saved')
    } catch {
      showToastMsg('Failed to save settings', 'error')
    } finally {
      setSaving(false)
    }
  }

  // ─── Logo upload ───────────────────────────────────────────────────────────
  const handleLogoUpload = async (file) => {
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { showToastMsg('File too large. Max 5MB.', 'error'); return }
    setLogoUploading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const formData = new FormData()
      formData.append('logo', file)
      const res = await fetch(`${API}/api/gyms/${gymId}/upload-logo`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token}` },
        body: formData,
      })
      const data = await res.json()
      setLogoUrl(data.logo_url)
      showToastMsg('Logo updated')
    } catch {
      showToastMsg('Upload failed', 'error')
    } finally {
      setLogoUploading(false)
    }
  }

  // ─── Plan handlers ─────────────────────────────────────────────────────────
  const openAddPlan = () => {
    setEditingPlan(null)
    setPlanForm({ name: '', price: '', duration_days: '', features: '' })
    setShowPlanSheet(true)
  }

  const openEditPlan = (plan) => {
    setEditingPlan(plan)
    setPlanForm({
      name: plan.name, price: String(plan.price),
      duration_days: String(plan.duration_days),
      features: (plan.features || []).join(', '),
    })
    setShowPlanSheet(true)
  }

  const handleSavePlan = async () => {
    if (!planForm.name || !planForm.price || !planForm.duration_days) return
    const planData = {
      name: planForm.name, price: Number(planForm.price),
      duration_days: Number(planForm.duration_days),
      features: planForm.features ? planForm.features.split(',').map(f => f.trim()).filter(Boolean) : [],
      is_active: true,
    }
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const url = editingPlan
        ? `${API}/api/gyms/${gymId}/membership-plans/${editingPlan.id}`
        : `${API}/api/gyms/${gymId}/membership-plans`
      const res = await fetch(url, {
        method: editingPlan ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify(planData),
      })
      const data = await res.json()
      setPlans(Array.isArray(data) ? data : plans)
      setShowPlanSheet(false)
      showToastMsg('Plan saved')
    } catch {
      showToastMsg('Failed to save plan', 'error')
    }
  }

  const handleDeletePlan = async (planId) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${API}/api/gyms/${gymId}/membership-plans/${planId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session?.access_token}` },
      })
      const data = await res.json()
      setPlans(Array.isArray(data) ? data : plans.filter(p => p.id !== planId))
      showToastMsg('Plan removed')
    } catch {
      showToastMsg('Failed to delete plan', 'error')
    }
  }

  const handleTogglePlan = async (planId, isActive) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${API}/api/gyms/${gymId}/membership-plans/${planId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ is_active: isActive }),
      })
      const data = await res.json()
      if (Array.isArray(data)) setPlans(data)
      else setPlans(prev => prev.map(p => p.id === planId ? { ...p, is_active: isActive } : p))
    } catch (err) {
      console.error('Toggle plan failed:', err)
    }
  }

  // ─── Locker toggle ─────────────────────────────────────────────────────────
  const handleLockerToggle = async (value) => {
    if (!value) { setShowLockersOffConfirm(true); return }
    setLockersEnabled(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      const res = await fetch(`${API}/api/lockers/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ lockers_enabled: true }),
      })
      if (!res.ok) throw new Error('Failed')
      showToastMsg('Locker Management enabled')
    } catch {
      setLockersEnabled(false)
      showToastMsg('Failed to enable Locker Management', 'error')
    }
  }

  const confirmLockersOff = async () => {
    setShowLockersOffConfirm(false)
    setLockersEnabled(false)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      const res = await fetch(`${API}/api/lockers/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ lockers_enabled: false }),
      })
      if (!res.ok) throw new Error('Failed')
      showToastMsg('Locker Management disabled')
    } catch {
      setLockersEnabled(true)
      showToastMsg('Failed to disable Locker Management', 'error')
    }
  }

  // ─── Deactivate ────────────────────────────────────────────────────────────
  const handleDeactivate = async () => {
    setDeactivating(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      await fetch(`${API}/api/gyms/${gymId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session?.access_token}` },
      })
      localStorage.removeItem('gymId')
      navigate('/home')
    } catch {
      showToastMsg('Deactivation failed', 'error')
      setDeactivating(false)
    }
  }

  if (loading) return (
    <div style={{
      minHeight: '100vh', backgroundColor: 'var(--bg-primary)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', paddingBottom: 80,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>
      <span style={{ fontSize: 14, color: 'var(--text-tertiary)' }}>Loading settings...</span>
    </div>
  )

  const sectionLabel = (text, color = 'var(--text-tertiary)') => (
    <div style={{
      fontSize: 11, fontWeight: 600, color,
      textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10,
    }}>{text}</div>
  )

  const inputRowStyle = {
    borderBottom: '0.5px solid rgba(0,0,0,0.06)',
    padding: '0 16px', display: 'flex', alignItems: 'center', height: 52,
  }

  const timeInputStyle = {
    width: 88, height: 36, border: '0.5px solid rgba(0,0,0,0.12)',
    borderRadius: 8, fontSize: 13, fontWeight: 500, color: 'var(--text-primary)',
    textAlign: 'center', outline: 'none', padding: '0 4px', fontFamily: 'inherit',
  }

  return (
    <div style={{
      minHeight: '100vh', backgroundColor: 'var(--bg-primary)', paddingBottom: 80,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>
      {/* STICKY HEADER */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10, backgroundColor: "var(--bg-card)",
        padding: '16px 20px 12px', display: 'flex', alignItems: 'center', gap: 12,
        borderBottom: '0.5px solid rgba(0,0,0,0.08)',
      }}>
        <button
          onClick={() => navigate(-1)}
          style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--text-primary)', padding: 0, lineHeight: 1 }}
        >←</button>
        <span style={{ flex: 1, fontSize: 20, fontWeight: 600, color: 'var(--text-primary)', textAlign: 'center' }}>Settings</span>
        <button
          onClick={handleSave}
          disabled={!isDirty || saving}
          style={{
            backgroundColor: 'var(--text-primary)', color: "var(--bg-card)", border: 'none', borderRadius: 10,
            height: 32, padding: '0 14px', fontSize: 13, fontWeight: 600,
            cursor: isDirty ? 'pointer' : 'default', opacity: isDirty && !saving ? 1 : 0.4,
          }}
        >{saving ? 'Saving...' : 'Save'}</button>
      </div>

      <div style={{ padding: '20px 20px 0', display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* ── SECTION 1: GYM PROFILE ─────────────────────────────────────────── */}
        <div>
          {sectionLabel('GYM PROFILE')}

          {/* Logo card */}
          <div style={{
            backgroundColor: "var(--bg-card)", borderRadius: 12,
            border: '0.5px solid rgba(0,0,0,0.08)',
            padding: 16, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 16,
          }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%', backgroundColor: 'var(--bg-pill)',
              overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {logoUrl
                ? <img src={logoUrl} alt="Gym logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-secondary)' }}>{getInitials(profile.name || 'Gym')}</span>
              }
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>Gym Logo</div>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 10 }}>JPG or PNG, max 5MB</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => logoInputRef.current?.click()}
                  disabled={logoUploading}
                  style={{
                    backgroundColor: 'var(--text-primary)', color: "var(--bg-card)", border: 'none', borderRadius: 10,
                    height: 32, padding: '0 16px', fontSize: 12, fontWeight: 500,
                    cursor: 'pointer', opacity: logoUploading ? 0.6 : 1,
                  }}
                >{logoUploading ? 'Uploading...' : 'Upload Photo'}</button>
                {logoUrl && (
                  <button
                    onClick={() => setLogoUrl(null)}
                    style={{ background: 'none', border: 'none', fontSize: 12, color: 'var(--error)', cursor: 'pointer' }}
                  >Remove</button>
                )}
              </div>
            </div>
            <input
              ref={logoInputRef} type="file" accept="image/*" style={{ display: 'none' }}
              onChange={e => { if (e.target.files?.[0]) handleLogoUpload(e.target.files[0]) }}
            />
          </div>

          {/* Profile form */}
          <div style={{ backgroundColor: "var(--bg-card)", borderRadius: 12, border: '0.5px solid rgba(0,0,0,0.08)', overflow: 'hidden' }}>
            {[
              { key: 'name', label: 'Gym Name', placeholder: 'e.g. FitZone Fitness', type: 'text' },
            ].map(field => (
              <div key={field.key} style={inputRowStyle}>
                <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', width: 100, flexShrink: 0 }}>{field.label}</span>
                <input
                  type={field.type} placeholder={field.placeholder} value={profile[field.key]}
                  onChange={e => markDirty(setProfile)(prev => ({ ...prev, [field.key]: e.target.value }))}
                  style={{ flex: 1, border: 'none', outline: 'none', fontSize: 15, color: 'var(--text-primary)', backgroundColor: 'transparent', textAlign: 'right' }}
                />
              </div>
            ))}

            <div style={inputRowStyle}>
              <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', width: 100, flexShrink: 0 }}>City</span>
              <CitySearchInput
                variant="compact"
                align="right"
                placeholder="e.g. Bhopal"
                value={profile.city}
                onChange={v => markDirty(setProfile)(prev => ({ ...prev, city: v }))}
              />
            </div>

            {[
              { key: 'address', label: 'Address', placeholder: 'Full address', type: 'text' },
              { key: 'phone', label: 'Phone', placeholder: '+91 98765 43210', type: 'tel' },
            ].map(field => (
              <div key={field.key} style={inputRowStyle}>
                <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', width: 100, flexShrink: 0 }}>{field.label}</span>
                <input
                  type={field.type} placeholder={field.placeholder} value={profile[field.key]}
                  onChange={e => markDirty(setProfile)(prev => ({ ...prev, [field.key]: e.target.value }))}
                  style={{ flex: 1, border: 'none', outline: 'none', fontSize: 15, color: 'var(--text-primary)', backgroundColor: 'transparent', textAlign: 'right' }}
                />
              </div>
            ))}

            {/* Type select */}
            <div style={inputRowStyle}>
              <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', width: 100, flexShrink: 0 }}>Type</span>
              <select
                value={profile.gym_type}
                onChange={e => markDirty(setProfile)(prev => ({ ...prev, gym_type: e.target.value }))}
                style={{ flex: 1, border: 'none', outline: 'none', fontSize: 15, color: 'var(--text-primary)', backgroundColor: 'transparent', textAlign: 'right', cursor: 'pointer', appearance: 'none' }}
              >
                {GYM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <span style={{ fontSize: 12, color: 'var(--text-tertiary)', marginLeft: 4 }}>▾</span>
            </div>

            {/* Description */}
            <div style={{ padding: 16 }}>
              <textarea
                placeholder="Tell members about your gym..."
                value={profile.description} maxLength={200}
                onChange={e => markDirty(setProfile)(prev => ({ ...prev, description: e.target.value }))}
                style={{
                  width: '100%', height: 80, border: 'none', outline: 'none',
                  fontSize: 15, color: 'var(--text-primary)', backgroundColor: 'transparent',
                  resize: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
                }}
              />
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', textAlign: 'right' }}>{profile.description.length}/200</div>
            </div>
          </div>
        </div>

        {/* ── SECTION 2: OPERATING HOURS ──────────────────────────────────────── */}
        <div>
          {sectionLabel('OPERATING HOURS')}
          <div style={{ backgroundColor: "var(--bg-card)", borderRadius: 12, border: '0.5px solid rgba(0,0,0,0.08)', overflow: 'hidden' }}>
            {DAYS.map((day, i) => {
              const dh = hours[day.key] || DEFAULT_HOURS[day.key]
              return (
                <div key={day.key} style={{
                  display: 'flex', alignItems: 'center', padding: '0 16px', height: 52, gap: 12,
                  borderBottom: i < 6 ? '0.5px solid rgba(0,0,0,0.06)' : 'none',
                }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', width: 36, flexShrink: 0 }}>{day.label}</span>
                  <Toggle
                    value={!dh.closed}
                    onChange={val => markDirty(setHours)(prev => ({ ...prev, [day.key]: { ...prev[day.key], closed: !val } }))}
                  />
                  {dh.closed
                    ? <span style={{ fontSize: 13, color: 'var(--text-tertiary)', flex: 1 }}>Closed</span>
                    : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, justifyContent: 'flex-end' }}>
                        <input type="time" value={dh.open} style={timeInputStyle}
                          onChange={e => markDirty(setHours)(prev => ({ ...prev, [day.key]: { ...prev[day.key], open: e.target.value } }))} />
                        <span style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>–</span>
                        <input type="time" value={dh.close} style={timeInputStyle}
                          onChange={e => markDirty(setHours)(prev => ({ ...prev, [day.key]: { ...prev[day.key], close: e.target.value } }))} />
                      </div>
                    )
                  }
                </div>
              )
            })}
          </div>
        </div>

        {/* ── SECTION 3: MEMBERSHIP PLANS ─────────────────────────────────────── */}
        <div>
          {sectionLabel('MEMBERSHIP PLANS')}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {plans.map(plan => (
              <div key={plan.id} style={{ backgroundColor: "var(--bg-card)", borderRadius: 12, border: '0.5px solid rgba(0,0,0,0.08)', padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>{plan.name}</span>
                  <Toggle value={plan.is_active} onChange={val => handleTogglePlan(plan.id, val)} />
                </div>
                <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 8 }}>
                  ₹{plan.price?.toLocaleString('en-IN')} · {plan.duration_days} days
                </div>
                {plan.features?.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                    {plan.features.map((f, i) => (
                      <span key={i} style={{ backgroundColor: 'var(--bg-primary)', borderRadius: 6, padding: '5px 9px', fontSize: 12, color: 'var(--text-secondary)' }}>{f}</span>
                    ))}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 16 }}>
                  <button onClick={() => openEditPlan(plan)} style={{ background: 'none', border: 'none', fontSize: 13, color: 'var(--text-cta)', cursor: 'pointer', padding: 0 }}>Edit</button>
                  <button onClick={() => handleDeletePlan(plan.id)} style={{ background: 'none', border: 'none', fontSize: 13, color: 'var(--error)', cursor: 'pointer', padding: 0 }}>Delete</button>
                </div>
              </div>
            ))}
            <button
              onClick={openAddPlan}
              style={{
                width: '100%', height: 52, backgroundColor: "var(--bg-card)",
                border: '0.5px dashed rgba(0,0,0,0.2)', borderRadius: 12,
                fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            ><span style={{ fontSize: 18 }}>+</span> Add Plan</button>
          </div>
        </div>

        {/* ── SECTION 4: NOTIFICATIONS ────────────────────────────────────────── */}
        <div>
          {sectionLabel('NOTIFICATIONS')}
          <div style={{ backgroundColor: "var(--bg-card)", borderRadius: 12, border: '0.5px solid rgba(0,0,0,0.08)', overflow: 'hidden' }}>
            {[
              { key: 'membership_expiry_reminder', label: 'Membership Expiry Reminders', sub: "Alert when member's plan expires in 7 days" },
              { key: 'new_member_alert', label: 'New Member Alerts', sub: 'Notify when a new member joins' },
              { key: 'payment_received', label: 'Payment Received', sub: 'Confirm when a payment is recorded' },
              { key: 'low_attendance_alert', label: 'Low Attendance Alert', sub: 'Alert when daily check-ins drop below average' },
            ].map((item, i) => (
              <div key={item.key} style={{
                display: 'flex', alignItems: 'center', padding: '12px 16px', gap: 12,
                borderBottom: i < 3 ? '0.5px solid rgba(0,0,0,0.06)' : 'none', minHeight: 52,
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{item.label}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>{item.sub}</div>
                </div>
                <Toggle
                  value={notifications[item.key]}
                  onChange={val => markDirty(setNotifications)(prev => ({ ...prev, [item.key]: val }))}
                />
              </div>
            ))}
          </div>
        </div>

        {/* ── SECTION 4b: FEATURE MODULES ────────────────────────────────────── */}
        <div>
          {sectionLabel('FEATURE MODULES')}
          <div style={{ backgroundColor: "var(--bg-card)", borderRadius: 12, border: '0.5px solid rgba(0,0,0,0.08)', overflow: 'hidden' }}>
            <div style={{
              display: 'flex', alignItems: 'center', padding: '12px 16px', gap: 12, minHeight: 64,
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Locker Management</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                  Enable if your gym offers locker rentals to members
                </div>
              </div>
              {lockersLoading
                ? <div style={{ width: 44, height: 26, borderRadius: 13, backgroundColor: 'var(--border)', flexShrink: 0 }} />
                : <Toggle value={lockersEnabled} onChange={handleLockerToggle} />
              }
            </div>
          </div>
        </div>

        {/* ── APPEARANCE ──────────────────────────────────────────────────────── */}
        <div>
          {sectionLabel('APPEARANCE')}
          <div style={{
            backgroundColor: "var(--bg-card)",
            borderRadius: 12,
            border: '0.5px solid rgba(0,0,0,0.08)',
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
                  background: theme === item.id ? 'var(--accent-bg)' : "var(--bg-card)",
                  borderBottom: i < 2 ? '0.5px solid rgba(0,0,0,0.06)' : 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <ThemeSwatch id={item.id} />
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-primary)' }}>{item.label}</div>
                    {item.sub && <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>{item.sub}</div>}
                  </div>
                </div>
                {theme === item.id && <Check size={18} color="var(--text-cta)" />}
              </div>
            ))}
          </div>
        </div>

        {/* ── SECTION 5: DANGER ZONE ──────────────────────────────────────────── */}
        <div style={{ paddingBottom: 20 }}>
          {sectionLabel('DANGER ZONE', 'var(--error)')}
          <div style={{
            backgroundColor: "var(--bg-card)", borderRadius: 12,
            border: '0.5px solid var(--error-bg)', padding: 16,
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--error)' }}>Deactivate Gym</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                Hides your gym and pauses all memberships. Your data is preserved.
              </div>
            </div>
            <button
              onClick={() => setShowDeactivateSheet(true)}
              style={{
                backgroundColor: 'var(--error)', color: "var(--bg-card)", border: 'none',
                borderRadius: 8, height: 32, padding: '0 14px',
                fontSize: 12, fontWeight: 500, cursor: 'pointer', flexShrink: 0,
              }}
            >Deactivate</button>
          </div>
        </div>
      </div>

      <GymBottomNav active="settings" onMorePress={() => setMoreOpen(true)} />
      <MoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} />

      {/* ADD/EDIT PLAN SHEET */}
      {showPlanSheet && (
        <>
          <div onClick={() => setShowPlanSheet(false)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 50 }} />
          <div style={{
            position: 'fixed', bottom: 0, left: 0, right: 0,
            backgroundColor: "var(--bg-card)", borderRadius: '20px 20px 0 0',
            zIndex: 51, padding: '0 0 32px',
            maxHeight: '85vh', overflowY: 'auto',
          }}>
            <div style={{ width: 40, height: 4, backgroundColor: 'var(--border)', borderRadius: 2, margin: '12px auto 0' }} />
            <div style={{ padding: '16px 20px 0' }}>
              <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 16 }}>
                {editingPlan ? 'Edit Plan' : 'Add Plan'}
              </div>
              {[
                { key: 'name', placeholder: 'Plan Name*', type: 'text' },
                { key: 'price', placeholder: 'Price (₹)*', type: 'number' },
                { key: 'duration_days', placeholder: 'Duration (days)*', type: 'number' },
                { key: 'features', placeholder: 'Features (comma-separated)', type: 'text' },
              ].map(field => (
                <div key={field.key} style={{ marginBottom: 12 }}>
                  <input
                    type={field.type} placeholder={field.placeholder} value={planForm[field.key]}
                    onChange={e => setPlanForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                    style={{
                      width: '100%', height: 52, border: '0.5px solid rgba(0,0,0,0.15)',
                      borderRadius: 12, padding: '0 16px', fontSize: 15,
                      boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit',
                    }}
                  />
                </div>
              ))}
              <button
                onClick={handleSavePlan}
                disabled={!planForm.name || !planForm.price || !planForm.duration_days}
                style={{
                  width: '100%', height: 52, backgroundColor: 'var(--text-primary)', color: "var(--bg-card)",
                  border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 500,
                  cursor: 'pointer', marginTop: 4,
                  opacity: (!planForm.name || !planForm.price || !planForm.duration_days) ? 0.4 : 1,
                }}
              >Save Plan</button>
            </div>
          </div>
        </>
      )}

      {/* LOCKERS OFF CONFIRM */}
      {showLockersOffConfirm && (
        <>
          <div onClick={() => setShowLockersOffConfirm(false)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 50 }} />
          <div style={{
            position: 'fixed', bottom: 0, left: 0, right: 0,
            backgroundColor: "var(--bg-card)", borderRadius: '20px 20px 0 0',
            zIndex: 51, padding: '0 20px 32px',
          }}>
            <div style={{ width: 40, height: 4, backgroundColor: 'var(--border)', borderRadius: 2, margin: '12px auto 16px' }} />
            <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)' }}>Turn off Locker Management?</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 10 }}>
              Your locker data will be saved but hidden until you re-enable this.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 24 }}>
              <button
                onClick={confirmLockersOff}
                style={{
                  width: '100%', height: 52, backgroundColor: 'var(--text-primary)', color: "var(--bg-card)",
                  border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 500, cursor: 'pointer',
                }}
              >Turn Off</button>
              <button
                onClick={() => setShowLockersOffConfirm(false)}
                style={{
                  width: '100%', height: 52, backgroundColor: "var(--bg-card)", color: 'var(--text-primary)',
                  border: '0.5px solid var(--text-primary)', borderRadius: 12, fontSize: 15, fontWeight: 500, cursor: 'pointer',
                }}
              >Cancel</button>
            </div>
          </div>
        </>
      )}

      {/* DEACTIVATE SHEET */}
      {showDeactivateSheet && (
        <>
          <div onClick={() => setShowDeactivateSheet(false)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 50 }} />
          <div style={{
            position: 'fixed', bottom: 0, left: 0, right: 0,
            backgroundColor: "var(--bg-card)", borderRadius: '20px 20px 0 0',
            zIndex: 51, padding: '0 20px 32px',
          }}>
            <div style={{ width: 40, height: 4, backgroundColor: 'var(--border)', borderRadius: 2, margin: '12px auto 16px' }} />
            <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)' }}>Deactivate Gym?</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 10 }}>
              This will hide your gym from members and pause all active memberships.
              Your data stays safe and you can reactivate anytime by contacting support.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 24 }}>
              <button
                onClick={handleDeactivate} disabled={deactivating}
                style={{
                  width: '100%', height: 52, backgroundColor: 'var(--error)', color: "var(--bg-card)",
                  border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 500,
                  cursor: 'pointer', opacity: deactivating ? 0.6 : 1,
                }}
              >{deactivating ? 'Deactivating...' : 'Yes, Deactivate'}</button>
              <button
                onClick={() => setShowDeactivateSheet(false)}
                style={{
                  width: '100%', height: 52, backgroundColor: "var(--bg-card)", color: 'var(--text-primary)',
                  border: '0.5px solid var(--text-primary)', borderRadius: 12, fontSize: 15, fontWeight: 500, cursor: 'pointer',
                }}
              >Cancel</button>
            </div>
          </div>
        </>
      )}

      {/* ── Log Out ── */}
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

      {/* TOAST */}
      {toast && (
        <div style={{
          position: 'fixed', top: 16, left: 16, right: 16, zIndex: 100,
          backgroundColor: toast.type === 'success' ? 'var(--success-bg)' : 'var(--error-bg)',
          borderRadius: 16, padding: '14px 16px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
        }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: toast.type === 'success' ? 'var(--success)' : 'var(--error)' }}>
            {toast.message}
          </div>
        </div>
      )}
    </div>
  )
}
