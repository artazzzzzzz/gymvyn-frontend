import { useCallback, useEffect, useRef, useState } from 'react'
import Papa from 'papaparse'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../utils/supabase'
import { useActiveGym } from '../../contexts/ActiveGymContext'
import { getAvatarColor } from '../../utils/avatarColor'
import GymBottomNav from '../../components/GymBottomNav'
import MoreSheet from '../../components/MoreSheet'
import { ListSkeleton } from '../../components/loading/Loading'
import { getEffectiveMembership, getStatusPillProps } from '../../utils/membershipStatus'
import { inviteGymMemberByEmail, inviteGymMemberByPhone } from '../../utils/api'
import { GymCodeCard } from '../../components/GymCodeCard'

const FILTERS = ['all', 'active', 'expiring', 'at_risk', 'inactive']
const LIMIT = 20

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatExpiry(dateString) {
  if (!dateString) return '—'
  return new Date(dateString).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short',
  })
}

function getInitials(name) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function filterLabel(f) {
  if (f === 'at_risk')  return 'At Risk'
  if (f === 'expiring') return 'Expiring Soon'
  return f.charAt(0).toUpperCase() + f.slice(1)
}

// ── StatusPill ────────────────────────────────────────────────────────────────

function StatusPill({ member }) {
  const { label, bg, color } = getStatusPillProps(member)
  return (
    <span style={{
      background: bg, color,
      padding: '6px 10px', borderRadius: 20,
      fontSize: 11, fontWeight: 500, flexShrink: 0,
    }}>
      {label}
    </span>
  )
}

// ── MemberRow ─────────────────────────────────────────────────────────────────

function MemberRow({ member, onClick }) {
  const { bg, text } = getAvatarColor(member.full_name || '')
  const initials = getInitials(member.full_name || '')
  const expiry = member.expiry_date || member.end_date || member.membership_end_date

  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '0 16px', height: 68,
        width: '100%', background: 'none', border: 'none',
        cursor: 'pointer', textAlign: 'left',
        borderBottom: '0.5px solid rgba(0,0,0,0.06)',
      }}
    >
      <div style={{
        width: 40, height: 40, borderRadius: '50%',
        background: bg, color: text, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 14, fontWeight: 600,
      }}>
        {initials}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {member.full_name}
        </p>
        <p style={{ fontSize: 13, color: 'var(--text-tertiary)', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {member.plan_type || member.membership_type || 'Member'} · Exp {formatExpiry(expiry)}
        </p>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
        <StatusPill member={member} />
        <svg width="16" height="16" fill="none" stroke="var(--text-tertiary)" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </div>
    </button>
  )
}

// ── SummaryPill ───────────────────────────────────────────────────────────────

function SummaryPill({ label, bg, text }) {
  return (
    <span style={{
      background: bg, color: text,
      padding: '6px 12px', borderRadius: 20,
      fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  )
}

// ── AddMemberSheet ────────────────────────────────────────────────────────────

function AddMemberSheet({ isOpen, onClose, gymId, onAdded, onImportMembers }) {
  // view: 'options' | 'form' | 'csv' | 'phone' | 'email' | 'qr'
  const [view, setView]               = useState('options')
  const [plans, setPlans]             = useState([])

  // Manual-add state
  const [manualName, setManualName]   = useState('')
  const [manualPhone, setManualPhone] = useState('')
  const [manualPlan, setManualPlan]   = useState('')

  // Phone-invite state
  const [invitePhone, setInvitePhone] = useState('')
  const [phoneDupWarning, setPhoneDupWarning] = useState('')
  const [phoneDupChecking, setPhoneDupChecking] = useState(false)
  const [joinCode, setJoinCode]       = useState('')
  const [gymName, setGymName]         = useState('')
  const [smsCopied, setSmsCopied]     = useState(false)
  const [phoneInviteSent, setPhoneInviteSent] = useState(false)
  // A real <a href="sms:..."> click, not a location.href assignment — assigning
  // location.href to an unregistered scheme can make some browser contexts
  // treat it as a failed top-level navigation and reload the SPA, wiping
  // in-memory state (members list, active gym). An anchor click doesn't.
  const smsAnchorRef                  = useRef(null)

  // Email-invite state
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName]   = useState('')

  // CSV state
  const [csvRows, setCsvRows]         = useState([])   // all valid parsed rows
  const [csvFile, setCsvFile]         = useState(null) // File object
  const [dragOver, setDragOver]       = useState(false)
  const [importResult, setImportResult] = useState(null) // { imported, skipped }
  const fileInputRef                  = useRef(null)

  // Shared
  const [submitting, setSubmitting]   = useState(false)
  const [error, setError]             = useState('')
  const [success, setSuccess]         = useState(false)

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setView('options')
        setManualName(''); setManualPhone(''); setManualPlan('')
        setCsvRows([]); setCsvFile(null); setImportResult(null)
        setInvitePhone(''); setPhoneDupWarning(''); setSmsCopied(false); setPhoneInviteSent(false)
        setInviteEmail(''); setInviteName('')
        setSubmitting(false); setError(''); setSuccess(false)
      }, 300)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen || !gymId) return
    const base = import.meta.env.VITE_API_URL || ''
    fetch(`${base}/api/gyms/${gymId}`)
      .then(r => r.json())
      .then(data => setPlans((data?.membership_plans || []).filter(p => p.is_active !== false)))
      .catch(() => setPlans([]))
  }, [isOpen, gymId])

  // Join code is needed by both the QR view and the Phone-invite SMS text.
  useEffect(() => {
    if (!isOpen || !gymId || (view !== 'qr' && view !== 'phone')) return
    let cancelled = false
    ;(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const base = import.meta.env.VITE_API_URL || ''
        const res = await fetch(`${base}/api/gym/my-gym-code?gym_id=${gymId}`, {
          headers: { ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}) },
        })
        if (!res.ok) return
        const d = await res.json()
        if (cancelled) return
        setJoinCode(d.join_code || '')
        setGymName(d.gym_name || '')
      } catch { /* non-critical — SMS/QR view shows an empty-code state */ }
    })()
    return () => { cancelled = true }
  }, [isOpen, gymId, view])

  // Light, non-blocking duplicate check — an SMS invite doesn't write to the
  // DB, so this is a heads-up, not a hard gate against sending it anyway.
  useEffect(() => {
    if (!/^\d{10}$/.test(invitePhone) || !gymId) { setPhoneDupWarning(''); return }
    let cancelled = false
    setPhoneDupChecking(true)
    const timer = setTimeout(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const base = import.meta.env.VITE_API_URL || ''
        const res = await fetch(`${base}/api/gym-members-search/${gymId}?q=${encodeURIComponent(invitePhone)}`, {
          headers: { Authorization: `Bearer ${session?.access_token}` },
        })
        if (!res.ok) return
        const results = await res.json()
        if (cancelled) return
        const match = Array.isArray(results) && results.find(r => (r.phone || '').replace(/\D/g, '') === invitePhone)
        setPhoneDupWarning(match ? `${match.full_name} already has an active membership with this number.` : '')
      } catch { /* non-critical */ } finally {
        if (!cancelled) setPhoneDupChecking(false)
      }
    }, 400)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [invitePhone, gymId])

  const smsMessage = joinCode
    ? `You're invited to join ${gymName || 'the gym'} on Gymvyn! Use code ${joinCode} to link your account, or download the app and enter it under "Join a gym".`
    : ''

  function copySmsMessage() {
    navigator.clipboard.writeText(smsMessage).catch(() => {})
    setSmsCopied(true)
    setTimeout(() => setSmsCopied(false), 2000)
  }

  // ── Phone invite submit ──────────────────────────────────────────────────
  // Records a real DB row for the invite (see POST /api/gym-members/invite-phone)
  // before opening the SMS deep link, so the owner has visibility that an
  // invite was sent instead of the old pure-client sms: link with no trace.
  async function handlePhoneInviteSubmit() {
    if (!joinCode || invitePhone.length !== 10) return
    setError(''); setSubmitting(true)
    try {
      await inviteGymMemberByPhone({ gymId, phone: invitePhone })
      setPhoneInviteSent(true)
      try { onAdded?.() } catch {}
      smsAnchorRef.current?.click()
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  // ── Email invite submit ──────────────────────────────────────────────────
  async function handleEmailInviteSubmit(e) {
    e.preventDefault()
    if (!inviteEmail.trim()) return
    setError(''); setSubmitting(true)
    try {
      await inviteGymMemberByEmail({
        gymId, email: inviteEmail.trim(), fullName: inviteName.trim() || undefined,
      })
      setSuccess(true)
      try { onAdded?.() } catch {}
    } catch (err) {
      setError(err.message)
      setSubmitting(false)
    }
  }

  // ── Manual submit ────────────────────────────────────────────────────────
  async function handleManualSubmit(e) {
    e.preventDefault()
    if (!manualName.trim()) return
    setError(''); setSubmitting(true)
    try {
      const base = import.meta.env.VITE_API_URL || ''
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${base}/api/gym-members/manual`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          gym_id: gymId,
          full_name: manualName.trim(),
          phone: manualPhone || undefined,
          membership_type: manualPlan || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to add member')
      setSuccess(true)
      try { onAdded?.() } catch {}
      setTimeout(() => { onClose?.() }, 1500)
    } catch (err) {
      setError(err.message)
      setSubmitting(false)
    }
  }

  // ── CSV helpers ──────────────────────────────────────────────────────────
  function parseFile(file) {
    if (!file) return
    setCsvFile(file)
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: h => h.trim().toLowerCase(),
      complete: ({ data }) => {
        const valid = data
          .map(row => ({
            full_name: (row.name || row.full_name || '').trim(),
            phone:     (row.phone || '').replace(/\D/g, '').slice(0, 10),
            email:     (row.email || '').trim(),
            plan_name: (row.plan || row.plan_name || '').trim(),
          }))
          .filter(r => r.full_name || r.phone)
        setCsvRows(valid)
      },
    })
  }

  function handleFileChange(e) {
    parseFile(e.target.files?.[0])
  }

  function handleDrop(e) {
    e.preventDefault(); setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) parseFile(file)
  }

  function downloadSample() {
    const csv = 'name,phone,email,plan\nAman Sharma,9876543210,aman@example.com,Monthly\nPriya Patel,9123456789,,Annual\n'
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'gymvyn_members_sample.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  async function handleCsvImport() {
    if (!csvRows.length || submitting) return
    setError(''); setSubmitting(true)
    try {
      const base = import.meta.env.VITE_API_URL || ''
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${base}/api/gym-members/import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ gym_id: gymId, members: csvRows }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Import failed')
      setImportResult(data)
      setSuccess(true)
      try { onAdded?.() } catch {}
    } catch (err) {
      setError(err.message)
      setSubmitting(false)
    }
  }

  // ── Options list ─────────────────────────────────────────────────────────
  const options = [
    { label: 'Invite via Phone', icon: <PhoneIcon />,    onPress: () => setView('phone') },
    { label: 'Invite via Email', icon: <MailIcon />,     onPress: () => setView('email') },
    { label: 'Show Join QR/Code', icon: <QrIcon />,      onPress: () => setView('qr') },
    { label: 'Add Manually',     icon: <UserPlusIcon />, onPress: () => setView('form') },
    { label: 'Import Members',   icon: <UploadIcon />,   onPress: () => { onClose?.(); setTimeout(() => onImportMembers?.(), 180) } },
  ]

  const phoneOk = manualPhone === '' || /^\d{10}$/.test(manualPhone)
  const invitePhoneOk = invitePhone === '' || /^\d{10}$/.test(invitePhone)
  const inviteEmailOk = inviteEmail === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteEmail)

  const viewTitle = {
    options: 'Add Member', form: 'Add Manually', csv: 'Import CSV',
    phone: 'Invite via Phone', email: 'Invite via Email', qr: 'Join QR / Code',
  }
  const isSubView = view !== 'options'

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 60,
          background: 'rgba(0,0,0,0.4)',
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
          transition: 'opacity 0.25s',
        }}
      />
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 70,
        background: 'var(--bg-card)', borderRadius: '24px 24px 0 0',
        transform: isOpen ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 0.3s ease-out',
        maxHeight: '90vh', display: 'flex', flexDirection: 'column',
      }}>
        {/* Drag handle */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12, flexShrink: 0 }}>
          <div style={{ width: 36, height: 4, background: 'var(--border)', borderRadius: 2 }} />
        </div>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px 4px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {isSubView && (
              <button
                onClick={() => {
                  setView('options'); setError(''); setCsvRows([]); setCsvFile(null); setSuccess(false); setImportResult(null)
                  setInvitePhone(''); setPhoneDupWarning(''); setSmsCopied(false)
                  setInviteEmail(''); setInviteName('')
                }}
                style={{ background: 'none', border: 'none', padding: '4px 2px', cursor: 'pointer', display: 'flex' }}
              >
                <svg width="20" height="20" fill="none" stroke="var(--text-primary)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
            )}
            <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' }}>{viewTitle[view]}</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', padding: 4, cursor: 'pointer', display: 'flex' }}>
            <svg width="20" height="20" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div style={{ overflowY: 'auto', flex: 1 }}>

          {/* ── Options list ── */}
          {view === 'options' && (
            <div style={{ padding: '4px 0 32px' }}>
              {options.map((opt, i) => (
                <div key={opt.label}>
                  <button
                    onClick={opt.onPress ?? (() => {})}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 16,
                      width: '100%', height: 64, padding: '0 20px',
                      background: 'none', border: 'none', cursor: 'pointer',
                    }}
                  >
                    <div style={{
                      width: 40, height: 40, borderRadius: 12, background: 'var(--accent-bg)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {opt.icon}
                    </div>
                    <span style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-cta)' }}>{opt.label}</span>
                  </button>
                  {i < options.length - 1 && (
                    <div style={{ marginLeft: 76, height: '0.5px', background: 'var(--border)' }} />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ── Manual form ── */}
          {view === 'form' && (
            success ? (
              <SuccessSplash message={`${manualName} is now part of your gym.`} />
            ) : (
              <form onSubmit={handleManualSubmit} style={{ padding: '12px 20px 32px' }}>
                {error && <ErrorBanner msg={error} />}

                <div style={{ marginBottom: 14 }}>
                  <label style={labelStyle}>Full Name <span style={{ color: 'var(--error)' }}>*</span></label>
                  <input type="text" value={manualName} onChange={e => setManualName(e.target.value)}
                    placeholder="e.g. Aman Sharma" autoFocus disabled={submitting} style={inputStyle} />
                </div>

                <div style={{ marginBottom: 14 }}>
                  <label style={labelStyle}>Phone Number <span style={optStyle}>(optional)</span></label>
                  <div style={{ display: 'flex', alignItems: 'center', height: 48, border: '0.5px solid rgba(0,0,0,0.18)', borderRadius: 12, overflow: 'hidden' }}>
                    <span style={{ padding: '0 10px 0 14px', color: 'var(--text-tertiary)', fontSize: 15, whiteSpace: 'nowrap', userSelect: 'none', flexShrink: 0 }}>+91</span>
                    <input type="tel" value={manualPhone} maxLength={10}
                      onChange={e => setManualPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      placeholder="98765 43210" disabled={submitting}
                      style={{ flex: 1, height: '100%', border: 'none', padding: '0 14px 0 0', fontSize: 15, outline: 'none', fontFamily: 'inherit' }} />
                  </div>
                  {manualPhone.length > 0 && !phoneOk && (
                    <p style={{ fontSize: 11, color: 'var(--warning)', margin: '4px 0 0' }}>Phone must be 10 digits</p>
                  )}
                </div>

                <div style={{ marginBottom: 24 }}>
                  <label style={labelStyle}>Membership Plan <span style={optStyle}>(optional)</span></label>
                  <select value={manualPlan} onChange={e => setManualPlan(e.target.value)}
                    disabled={submitting} style={{ ...inputStyle, color: manualPlan ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
                    <option value="">No plan selected</option>
                    {plans.map(p => <option key={p.id} value={p.name}>{p.name}{p.price ? ` — ₹${p.price}` : ''}</option>)}
                  </select>
                </div>

                <button type="submit" disabled={!manualName.trim() || !phoneOk || submitting}
                  style={submitBtnStyle(!manualName.trim() || !phoneOk || submitting)}>
                  {submitting ? 'Adding…' : 'Add Member'}
                </button>
              </form>
            )
          )}

          {/* ── CSV import ── */}
          {view === 'csv' && (
            success ? (
              <SuccessSplash
                message={
                  importResult
                    ? `${importResult.imported} member${importResult.imported !== 1 ? 's' : ''} added${importResult.skipped ? `, ${importResult.skipped} skipped (already exist)` : ''}.`
                    : 'Import complete.'
                }
              />
            ) : (
              <div style={{ padding: '12px 20px 32px' }}>
                {error && <ErrorBanner msg={error} />}

                {/* Drop zone */}
                <div
                  onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: `2px dashed ${dragOver ? 'var(--text-cta)' : 'rgba(0,0,0,0.15)'}`,
                    borderRadius: 16,
                    padding: '28px 20px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    background: dragOver ? 'var(--accent-bg)' : 'var(--bg-pill)',
                    transition: 'all 0.15s',
                    marginBottom: 12,
                  }}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                  />
                  <div style={{ marginBottom: 10 }}>
                    <svg width="32" height="32" fill="none" stroke="var(--text-cta)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" style={{ margin: '0 auto' }}>
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                  </div>
                  {csvFile ? (
                    <>
                      <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 2px' }}>{csvFile.name}</p>
                      <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: 0 }}>{csvRows.length} valid row{csvRows.length !== 1 ? 's' : ''} found — click to change</p>
                    </>
                  ) : (
                    <>
                      <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-cta)', margin: '0 0 4px' }}>Tap to upload or drag a CSV here</p>
                      <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: 0 }}>Columns: name, phone, email, plan</p>
                    </>
                  )}
                </div>

                {/* Sample download */}
                <button
                  onClick={downloadSample}
                  style={{ background: 'none', border: 'none', color: 'var(--text-cta)', fontSize: 13, fontWeight: 500, cursor: 'pointer', padding: '0 0 16px', display: 'flex', alignItems: 'center', gap: 5 }}
                >
                  <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Download sample CSV
                </button>

                {/* Preview table */}
                {csvRows.length > 0 && (
                  <div style={{ marginBottom: 20, borderRadius: 12, border: '0.5px solid rgba(0,0,0,0.1)', overflow: 'hidden' }}>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                        <thead>
                          <tr style={{ background: 'var(--bg-primary)' }}>
                            {['Name', 'Phone', 'Email', 'Plan'].map(h => (
                              <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {csvRows.slice(0, 5).map((r, i) => (
                            <tr key={i} style={{ borderTop: '0.5px solid rgba(0,0,0,0.06)' }}>
                              <td style={{ padding: '8px 12px', color: 'var(--text-primary)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.full_name || '—'}</td>
                              <td style={{ padding: '8px 12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{r.phone || '—'}</td>
                              <td style={{ padding: '8px 12px', color: 'var(--text-secondary)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.email || '—'}</td>
                              <td style={{ padding: '8px 12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{r.plan_name || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {csvRows.length > 5 && (
                      <p style={{ margin: 0, padding: '6px 12px', fontSize: 11, color: 'var(--text-tertiary)', background: 'var(--bg-primary)', borderTop: '0.5px solid rgba(0,0,0,0.06)' }}>
                        + {csvRows.length - 5} more row{csvRows.length - 5 !== 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                )}

                <button
                  onClick={handleCsvImport}
                  disabled={!csvRows.length || submitting}
                  style={submitBtnStyle(!csvRows.length || submitting)}
                >
                  {submitting ? 'Importing…' : csvRows.length ? `Import ${csvRows.length} member${csvRows.length !== 1 ? 's' : ''}` : 'Import members'}
                </button>
              </div>
            )
          )}

          {/* ── QR / join code ── */}
          {view === 'qr' && (
            <div style={{ padding: '4px 20px 32px' }}>
              <p style={{ fontSize: 13, color: 'var(--text-tertiary)', margin: '0 0 14px' }}>
                Members scan this QR or enter the code themselves under "Join a gym" — no separate signup needed.
              </p>
              <GymCodeCard />
            </div>
          )}

          {/* ── Phone invite ── */}
          {view === 'phone' && (
            phoneInviteSent ? (
              <SuccessSplash message={`An invite was recorded and the SMS composer opened for ${invitePhone}.`} />
            ) : (
            <div style={{ padding: '12px 20px 32px' }}>
              <p style={{ fontSize: 13, color: 'var(--text-tertiary)', margin: '0 0 16px' }}>
                Text them your gym's join code — they enter it themselves under "Join a gym" in the app.
              </p>
              {error && <ErrorBanner msg={error} />}

              <div style={{ marginBottom: 6 }}>
                <label style={labelStyle}>Phone Number</label>
                <div style={{ display: 'flex', alignItems: 'center', height: 48, border: '0.5px solid rgba(0,0,0,0.18)', borderRadius: 12, overflow: 'hidden' }}>
                  <span style={{ padding: '0 10px 0 14px', color: 'var(--text-tertiary)', fontSize: 15, whiteSpace: 'nowrap', userSelect: 'none', flexShrink: 0 }}>+91</span>
                  <input type="tel" value={invitePhone} maxLength={10}
                    onChange={e => setInvitePhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="98765 43210" autoFocus
                    style={{ flex: 1, height: '100%', border: 'none', padding: '0 14px 0 0', fontSize: 15, outline: 'none', fontFamily: 'inherit' }} />
                </div>
                {invitePhone.length > 0 && !invitePhoneOk && (
                  <p style={{ fontSize: 11, color: 'var(--warning)', margin: '4px 0 0' }}>Phone must be 10 digits</p>
                )}
                {phoneDupChecking && (
                  <p style={{ fontSize: 11, color: 'var(--text-tertiary)', margin: '4px 0 0' }}>Checking…</p>
                )}
                {!phoneDupChecking && phoneDupWarning && (
                  <p style={{ fontSize: 11, color: 'var(--warning)', margin: '4px 0 0' }}>{phoneDupWarning}</p>
                )}
              </div>

              {invitePhoneOk && invitePhone.length === 10 && (
                <>
                  <div style={{ marginTop: 16, marginBottom: 16, padding: '12px 14px', background: 'var(--bg-primary)', borderRadius: 10, fontSize: 13, color: 'var(--text-secondary)' }}>
                    {joinCode ? smsMessage : 'Loading your gym code…'}
                  </div>

                  {/* Hidden — clicked programmatically after the invite API call
                      succeeds. Kept as a real <a href="sms:"> so the browser
                      handles the unregistered scheme the same way it always
                      did for the plain SMS-link version of this button. */}
                  <a
                    ref={smsAnchorRef}
                    href={joinCode ? `sms:+91${invitePhone}?&body=${encodeURIComponent(smsMessage)}` : undefined}
                    style={{ display: 'none' }}
                    aria-hidden="true"
                    tabIndex={-1}
                  >sms</a>
                  <button
                    onClick={handlePhoneInviteSubmit}
                    disabled={!joinCode || submitting}
                    style={{
                      ...submitBtnStyle(!joinCode || submitting),
                      marginBottom: 10,
                    }}
                  >
                    {submitting ? 'Sending…' : `Open SMS to ${invitePhone}`}
                  </button>
                  <button
                    onClick={copySmsMessage}
                    disabled={!joinCode}
                    style={{
                      width: '100%', height: 44, borderRadius: 12,
                      background: 'var(--bg-pill)', color: 'var(--text-primary)', border: 'none',
                      fontSize: 14, fontWeight: 600, cursor: joinCode ? 'pointer' : 'default', opacity: joinCode ? 1 : 0.6,
                    }}
                  >
                    {smsCopied ? 'Copied!' : 'Copy message instead'}
                  </button>
                </>
              )}
            </div>
            )
          )}

          {/* ── Email invite ── */}
          {view === 'email' && (
            success ? (
              <SuccessSplash message={`An invite email was sent to ${inviteEmail}.`} />
            ) : (
              <form onSubmit={handleEmailInviteSubmit} style={{ padding: '12px 20px 32px' }}>
                {error && <ErrorBanner msg={error} />}
                <p style={{ fontSize: 13, color: 'var(--text-tertiary)', margin: '0 0 16px' }}>
                  They'll get an email to set up their own Gymvyn login, already linked to your gym.
                </p>

                <div style={{ marginBottom: 14 }}>
                  <label style={labelStyle}>Email Address <span style={{ color: 'var(--error)' }}>*</span></label>
                  <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                    placeholder="member@example.com" autoFocus disabled={submitting} style={inputStyle} />
                  {inviteEmail.length > 0 && !inviteEmailOk && (
                    <p style={{ fontSize: 11, color: 'var(--warning)', margin: '4px 0 0' }}>Enter a valid email address</p>
                  )}
                </div>

                <div style={{ marginBottom: 24 }}>
                  <label style={labelStyle}>Full Name <span style={optStyle}>(optional)</span></label>
                  <input type="text" value={inviteName} onChange={e => setInviteName(e.target.value)}
                    placeholder="e.g. Aman Sharma" disabled={submitting} style={inputStyle} />
                </div>

                <button type="submit" disabled={!inviteEmail.trim() || !inviteEmailOk || submitting}
                  style={submitBtnStyle(!inviteEmail.trim() || !inviteEmailOk || submitting)}>
                  {submitting ? 'Sending…' : 'Send Email Invite'}
                </button>
              </form>
            )
          )}

        </div>
      </div>
    </>
  )
}

// ── Shared mini-components ────────────────────────────────────────────────────

const labelStyle = { display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }
const optStyle   = { color: 'var(--text-tertiary)', fontWeight: 400 }
const inputStyle = {
  width: '100%', height: 48, border: '0.5px solid rgba(0,0,0,0.18)',
  borderRadius: 12, padding: '0 14px', fontSize: 15,
  boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit', background: 'var(--bg-card)',
}
const submitBtnStyle = (disabled) => ({
  width: '100%', height: 50, borderRadius: 14,
  background: disabled ? 'var(--border)' : 'var(--text-primary)',
  color: disabled ? 'var(--text-tertiary)' : 'var(--bg-card)',
  border: 'none', fontSize: 15, fontWeight: 600, cursor: disabled ? 'default' : 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
})

function ErrorBanner({ msg }) {
  return (
    <div style={{ marginBottom: 12, padding: '10px 14px', borderRadius: 10, background: 'var(--error-bg)', border: '0.5px solid var(--error-bg)', color: 'var(--error)', fontSize: 13 }}>
      {msg}
    </div>
  )
}

function SuccessSplash({ message }) {
  return (
    <div style={{ padding: '48px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
      <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--success-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
        <svg width="28" height="28" fill="none" stroke="var(--success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
      <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 6px' }}>Done!</p>
      <p style={{ fontSize: 14, color: 'var(--text-tertiary)', margin: 0, maxWidth: 260 }}>{message}</p>
    </div>
  )
}

function UploadIcon() {
  return (
    <svg width="20" height="20" fill="none" stroke="var(--text-cta)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  )
}

function UserPlusIcon() {
  return (
    <svg width="20" height="20" fill="none" stroke="var(--text-cta)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <line x1="19" y1="8" x2="19" y2="14" />
      <line x1="22" y1="11" x2="16" y2="11" />
    </svg>
  )
}

function PhoneIcon() {
  return (
    <svg width="20" height="20" fill="none" stroke="var(--text-cta)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.4 2 2 0 0 1 3.6 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.78a16 16 0 0 0 6 6l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  )
}

function MailIcon() {
  return (
    <svg width="20" height="20" fill="none" stroke="var(--text-cta)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  )
}

function QrIcon() {
  return (
    <svg width="20" height="20" fill="none" stroke="var(--text-cta)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <path d="M14 14h3v3h-3z" fill="var(--text-cta)" stroke="none" />
      <path d="M17 17h4" /><path d="M21 14v3" /><path d="M14 21h3" />
    </svg>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function GymMembers() {
  const { user } = useAuth()
  const navigate  = useNavigate()
  const { activeGymId: gymId } = useActiveGym()

  const [members,      setMembers]      = useState([])
  const [filtered,     setFiltered]     = useState([])
  const [search,       setSearch]       = useState('')
  const [activeFilter, setActiveFilter] = useState('all')
  const [loading,      setLoading]      = useState(true)
  const [loadError,    setLoadError]    = useState(null)
  const [page,         setPage]         = useState(1)
  const [hasMore,      setHasMore]      = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [moreOpen,     setMoreOpen]     = useState(false)

  // ── Reset list when active gym switches ───────────────────────────────────
  useEffect(() => { setPage(1); setMembers([]) }, [gymId])

  // ── Fetch members (re-runs when gymId or page changes) ────────────────────
  const loadMembers = useCallback(async () => {
    if (!gymId) return
    if (page === 1) setLoading(true)
    setLoadError(null)
    try {
      const base = import.meta.env.VITE_API_URL
      const url  = `${base}/api/gym-members?gymId=${encodeURIComponent(gymId)}&page=${page}&limit=${LIMIT}`
      const { data: { session } } = await supabase.auth.getSession()
      const res  = await fetch(url, { headers: { Authorization: `Bearer ${session?.access_token}` } })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.message || `Failed to load members (${res.status})`)
      const list = Array.isArray(data) ? data : (data?.members ?? [])
      setMembers(prev => page === 1 ? list : [...prev, ...list])
      setHasMore(list.length === LIMIT)
    } catch (err) {
      console.error('GymMembers load error:', err)
      setLoadError(err)
    } finally { setLoading(false) }
  }, [gymId, page])
  useEffect(() => { loadMembers() }, [loadMembers])

  // ── Filter + search ───────────────────────────────────────────────────────
  useEffect(() => {
    let result = members

    if (activeFilter !== 'all') {
      result = result.filter(m => {
        const { effectiveStatus, daysRemaining } = getEffectiveMembership(m)
        if (activeFilter === 'active')   return effectiveStatus === 'active'
        if (activeFilter === 'expiring') return effectiveStatus === 'active' && daysRemaining != null && daysRemaining <= 7 && daysRemaining > 0
        if (activeFilter === 'at_risk')  return m.churn_risk === 'high'
        if (activeFilter === 'inactive') return effectiveStatus !== 'active'
        return true
      })
    }

    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(m => (m.full_name || '').toLowerCase().includes(q))
    }

    setFiltered(result)
  }, [search, activeFilter, members])

  // ── Derived counts ────────────────────────────────────────────────────────
  const totalCount  = members.length
  const activeCount = members.filter(m => getEffectiveMembership(m).effectiveStatus === 'active').length
  const atRiskCount = members.filter(m => m.churn_risk === 'high').length
  if (loadError) return <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}><p style={{ color: 'var(--error)' }}>Failed to load members.</p><button onClick={loadMembers}>Try again</button></div>

  // ── Chip styles ───────────────────────────────────────────────────────────
  const chipBase = { borderRadius: 20, padding: '8px 14px', fontSize: 12, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap', border: 'none' }
  const activeChip   = { ...chipBase, background: 'var(--text-primary)', color: 'var(--bg-card)' }
  const inactiveChip = { ...chipBase, background: 'var(--bg-card)', border: '0.5px solid var(--border)', color: 'var(--text-secondary)' }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', paddingBottom: 80 }}>

        {/* 1 — Top bar */}
        <div style={{
          background: 'var(--bg-card)', borderBottom: '0.5px solid rgba(0,0,0,0.08)',
          padding: '14px 20px',
          display: 'flex', alignItems: 'center', gap: 12,
          position: 'sticky', top: 0, zIndex: 30,
        }}>
          <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', padding: '4px 2px', cursor: 'pointer', display: 'flex' }}>
            <svg width="22" height="22" fill="none" stroke="var(--text-primary)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <span style={{ flex: 1, fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' }}>Members</span>
          <button style={{ background: 'none', border: 'none', padding: 4, cursor: 'pointer', display: 'flex' }}>
            <svg width="20" height="20" fill="none" stroke="var(--text-secondary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
            </svg>
          </button>
          <button
            onClick={() => navigate('/gym/import')}
            style={{
              background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border)',
              borderRadius: 20, padding: '8px 12px',
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 5,
            }}
          >
            <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            Import
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            style={{
              background: 'var(--text-primary)', color: 'var(--bg-card)', border: 'none',
              borderRadius: 20, padding: '8px 14px',
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 4,
            }}
          >
            <span style={{ fontSize: 18, lineHeight: 1, marginTop: -1 }}>+</span> Add
          </button>
        </div>

        <div style={{ padding: '16px 20px 0' }}>

          {/* 2 — Summary strip */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <SummaryPill label={`${totalCount} Total`}    bg="var(--bg-pill)" text="var(--text-secondary)" />
            <SummaryPill label={`${activeCount} Active`}  bg="var(--success-bg)" text="var(--success)" />
            <SummaryPill label={`${atRiskCount} At Risk`} bg="var(--error-bg)" text="var(--error)" />
          </div>

          {/* 3 — Search */}
          <div style={{ position: 'relative', marginBottom: 12 }}>
            <svg style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
              width="16" height="16" fill="none" stroke="var(--text-tertiary)" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search members..."
              style={{
                width: '100%', height: 44, background: 'var(--bg-pill)', border: 'none',
                borderRadius: 12, padding: '0 36px',
                fontSize: 15, color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box',
              }}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 2, display: 'flex' }}
              >
                <svg width="14" height="14" fill="none" stroke="var(--text-tertiary)" strokeWidth="2.5" strokeLinecap="round" viewBox="0 0 24 24">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>

          {/* 4 — Filter chips */}
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, marginBottom: 14, scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {FILTERS.map(f => (
              <button key={f} onClick={() => setActiveFilter(f)} style={activeFilter === f ? activeChip : inactiveChip}>
                {filterLabel(f)}
              </button>
            ))}
          </div>

        </div>

        {/* 5 — Members list */}
        <div style={{
          margin: '0 20px 16px',
          background: 'var(--bg-card)', border: '0.5px solid var(--border)',
          borderRadius: 12, overflow: 'hidden',
        }}>
          {loading ? (
            <ListSkeleton rows={6} />
          ) : filtered.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 20px' }}>
              <svg width="48" height="48" fill="none" stroke="var(--text-tertiary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              <p style={{ fontSize: 16, fontWeight: 500, color: 'var(--text-primary)', margin: '12px 0 4px' }}>No members found</p>
              <p style={{ fontSize: 13, color: 'var(--text-tertiary)', margin: 0, textAlign: 'center' }}>
                Try changing your search or filter
              </p>
            </div>
          ) : (
            filtered.map((member, i) => (
              <MemberRow
                key={member.id || i}
                member={member}
                onClick={() => navigate(`/gym/members/${member.id}`)}
              />
            ))
          )}
        </div>

        {/* 6 — Load more */}
        {!loading && hasMore && (
          <div style={{ textAlign: 'center', paddingBottom: 16 }}>
            <button
              onClick={() => setPage(p => p + 1)}
              style={{ background: 'none', border: 'none', fontSize: 13, color: 'var(--text-cta)', fontWeight: 500, cursor: 'pointer' }}
            >
              Load {LIMIT} more members
            </button>
          </div>
        )}

        {/* 7 — FAB */}
        <button
          onClick={() => setShowAddModal(true)}
          style={{
            position: 'fixed', bottom: 84, right: 20, zIndex: 10,
            width: 52, height: 52, borderRadius: '50%',
            background: 'var(--text-primary)', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
          }}
        >
          <svg width="24" height="24" fill="none" stroke="var(--bg-card)" strokeWidth="2.5" strokeLinecap="round" viewBox="0 0 24 24">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>

        {/* 8 — Bottom nav */}
        <GymBottomNav onMorePress={() => setMoreOpen(true)} />
        <MoreSheet isOpen={moreOpen} onClose={() => setMoreOpen(false)} />
        <AddMemberSheet
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          gymId={gymId}
          onAdded={() => { setPage(1); setMembers([]) }}
          onImportMembers={() => navigate('/gym/import')}
        />
      </div>
    </>
  )
}
