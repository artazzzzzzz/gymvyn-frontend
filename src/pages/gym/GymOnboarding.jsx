import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../utils/supabase'
import { useAuth } from '../../hooks/useAuth'

const GYM_TYPES = ['Commercial', 'Boutique', 'CrossFit', 'Yoga Studio', 'Boxing', 'Other']

const DEFAULT_HOURS = {
  mon: { open: '06:00', close: '22:00', closed: false },
  tue: { open: '06:00', close: '22:00', closed: false },
  wed: { open: '06:00', close: '22:00', closed: false },
  thu: { open: '06:00', close: '22:00', closed: false },
  fri: { open: '06:00', close: '22:00', closed: false },
  sat: { open: '07:00', close: '20:00', closed: false },
  sun: { open: '08:00', close: '18:00', closed: false },
}

const STARTER_PLANS = [
  {
    id: crypto.randomUUID(),
    name: 'Monthly', duration_days: 30, price: 999,
    features: ['Full access', 'Locker room'], is_active: true,
  },
  {
    id: crypto.randomUUID(),
    name: 'Quarterly', duration_days: 90, price: 2499,
    features: ['Full access', 'Locker room', 'Personal training session'], is_active: true,
  },
]

// ─── Progress bar ─────────────────────────────────────────────────────────────
function ProgressBar({ current }) {
  const total = 5
  const currentNum = current === 'success' ? 5 : current
  return (
    <div>
      <div style={{ display: 'flex', height: 3, backgroundColor: '#E0E0E0' }}>
        {Array.from({ length: total }, (_, i) => (
          <div key={i} style={{ flex: 1, backgroundColor: i < currentNum ? '#111' : '#E0E0E0' }} />
        ))}
      </div>
      <div style={{ fontSize: 12, color: '#999', padding: '6px 0 0 20px' }}>
        {current === 'success' ? 'Complete!' : `Step ${current} of 5`}
      </div>
    </div>
  )
}

const inputStyle = {
  width: '100%', height: 52, border: '0.5px solid rgba(0,0,0,0.15)',
  borderRadius: 12, padding: '0 16px', fontSize: 15,
  boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit',
  backgroundColor: 'white',
}

export default function GymOnboarding() {
  const { user: authUser, setRole, markOnboardingComplete } = useAuth()
  const navigate = useNavigate()
  const API = import.meta.env.VITE_API_URL || ''
  const logoInputRef = useRef(null)

  const [step, setStep] = useState(1)
  const [gymName, setGymName] = useState('')
  const [city, setCity] = useState('')
  const [gymType, setGymType] = useState('')
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [description, setDescription] = useState('')
  const [logoFile, setLogoFile] = useState(null)
  const [logoPreview, setLogoPreview] = useState(null)
  const [plans, setPlans] = useState(STARTER_PLANS)
  const [showPlanForm, setShowPlanForm] = useState(false)
  const [editingPlanId, setEditingPlanId] = useState(null)
  const [planForm, setPlanForm] = useState({ name: '', price: '', duration_days: '', features: '' })
  const [submitting, setSubmitting] = useState(false)
  const [createdGym, setCreatedGym] = useState(null)
  const [error, setError] = useState(null)

  // ─── Re-entry guard ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!authUser) return
    const checkExisting = async () => {
      try {
        const res = await fetch(`${API}/api/gyms/owner/${authUser.id}`)
        const data = await res.json()
        if (data.gym) {
          localStorage.setItem('gymId', data.gym.id)
          navigate('/gym/dashboard')
        }
      } catch (err) {
        console.error('Existing gym check failed:', err)
      }
    }
    checkExisting()
  }, [authUser])

  const canContinueStep1 = gymName.trim() && city.trim() && gymType

  const goNext = () => { if (step < 5) setStep(prev => prev + 1) }
  const goBack = () => { if (step > 1) setStep(prev => prev - 1) }
  const goToStep = (n) => setStep(n)

  // ─── Logo handler ─────────────────────────────────────────────────────────
  const handleLogoSelect = (file) => {
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { setError('Logo must be under 5MB'); return }
    setLogoFile(file)
    const reader = new FileReader()
    reader.onload = (e) => setLogoPreview(e.target.result)
    reader.readAsDataURL(file)
  }

  // ─── Plan handlers ────────────────────────────────────────────────────────
  const openAddPlan = () => {
    setEditingPlanId(null)
    setPlanForm({ name: '', price: '', duration_days: '', features: '' })
    setShowPlanForm(true)
  }

  const openEditPlan = (plan) => {
    setEditingPlanId(plan.id)
    setPlanForm({
      name: plan.name, price: String(plan.price),
      duration_days: String(plan.duration_days),
      features: (plan.features || []).join(', '),
    })
    setShowPlanForm(true)
  }

  const savePlan = () => {
    if (!planForm.name || !planForm.price || !planForm.duration_days) return
    const newPlan = {
      id: editingPlanId || crypto.randomUUID(),
      name: planForm.name, price: Number(planForm.price),
      duration_days: Number(planForm.duration_days),
      features: planForm.features ? planForm.features.split(',').map(f => f.trim()).filter(Boolean) : [],
      is_active: true,
    }
    if (editingPlanId) {
      setPlans(prev => prev.map(p => p.id === editingPlanId ? newPlan : p))
    } else {
      setPlans(prev => [...prev, newPlan])
    }
    setShowPlanForm(false)
    setEditingPlanId(null)
  }

  const deletePlan = (planId) => setPlans(prev => prev.filter(p => p.id !== planId))

  // ─── Submit ───────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setSubmitting(true)
    setError(null)
    try {
      const user = authUser
      if (!user?.id) throw new Error('Session not ready — please wait a moment and try again')

      // Pre-flight: catch empty required fields before hitting the network
      if (!gymName.trim()) throw new Error('Gym name is required')
      if (!city.trim())    throw new Error('City is required')
      if (!gymType)        throw new Error('Please select a gym type')

      const res = await fetch(`${API}/api/gyms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          name: gymName.trim(), city: city.trim(),
          gym_type: gymType,
          address: address.trim() || null,
          phone: phone.trim() || null,
          description: description.trim() || null,
          operating_hours: DEFAULT_HOURS,
          membership_plans: plans,
        }),
      })
      const data = await res.json()
      // Backend returns { message } on errors, not { error }
      if (!res.ok) throw new Error(data.message || data.error || 'Failed to create gym')

      const gymId = data.gym.id
      localStorage.setItem('gymId', gymId)

      if (logoFile) {
        try {
          const formData = new FormData()
          formData.append('logo', logoFile)
          await fetch(`${API}/api/gyms/${gymId}/upload-logo`, { method: 'POST', body: formData })
        } catch (logoErr) {
          console.error('Logo upload failed:', logoErr)
        }
      }

      // Stamp the ref BEFORE refreshSession so the token-refresh event's
      // checkOnboarding call sees checkedForUserId already set and skips,
      // preventing it from overwriting onboardingComplete with false.
      setRole('gym_owner')
      markOnboardingComplete()

      if (data.needs_reauth) await supabase.auth.refreshSession()
      setCreatedGym(data.gym)
      setStep('success')
    } catch (err) {
      setError(err.message || 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  const btnPrimary = (disabled) => ({
    width: '100%', height: 52, backgroundColor: '#111', color: 'white',
    border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 500,
    cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.4 : 1,
  })

  const btnSecondary = {
    flex: 1, height: 52, backgroundColor: 'white', color: '#111',
    border: '0.5px solid #111', borderRadius: 12, fontSize: 15, fontWeight: 500, cursor: 'pointer',
  }

  return (
    <div style={{
      minHeight: '100vh', backgroundColor: '#F7F7F5', display: 'flex', flexDirection: 'column',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>
      {/* HEADER */}
      {step !== 'success' && (
        <div style={{ backgroundColor: 'white', borderBottom: '0.5px solid rgba(0,0,0,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', padding: '14px 20px', justifyContent: 'space-between' }}>
            <button
              onClick={() => navigate('/home')}
              style={{ background: 'none', border: 'none', fontSize: 22, color: '#999', cursor: 'pointer', padding: 0 }}
            >×</button>
            <span style={{ fontSize: 16, fontWeight: 600, color: '#111' }}>Set Up Your Gym</span>
            {step === 3 ? (
              <button
                onClick={goNext}
                style={{ background: 'none', border: 'none', fontSize: 14, fontWeight: 500, color: '#185FA5', cursor: 'pointer' }}
              >Skip →</button>
            ) : (
              <div style={{ width: 40 }} />
            )}
          </div>
          <ProgressBar current={step} />
        </div>
      )}

      <div style={{ flex: 1, padding: step === 'success' ? 0 : '24px 20px 0', overflowY: 'auto' }}>

        {/* ─── STEP 1 ─── */}
        {step === 1 && (
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111', margin: '0 0 8px' }}>Tell us about your gym</h1>
            <p style={{ fontSize: 16, color: '#666', margin: '0 0 24px' }}>
              This is what members will see when they search for your gym.
            </p>

            <div style={{ marginBottom: 12 }}>
              <input type="text" placeholder="Gym Name*" value={gymName} onChange={e => setGymName(e.target.value)} style={inputStyle} />
              <div style={{ fontSize: 13, color: '#999', marginTop: 4 }}>Choose a name members will recognize</div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <input type="text" placeholder="City*" value={city} onChange={e => setCity(e.target.value)} style={inputStyle} />
            </div>

            <div style={{ fontSize: 14, fontWeight: 600, color: '#111', marginBottom: 10 }}>Gym Type*</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 32 }}>
              {GYM_TYPES.map(type => (
                <button
                  key={type} onClick={() => setGymType(type)}
                  style={{
                    height: 48, backgroundColor: gymType === type ? '#111' : 'white',
                    color: gymType === type ? 'white' : '#111',
                    border: gymType === type ? 'none' : '0.5px solid rgba(0,0,0,0.12)',
                    borderRadius: 12, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  }}
                >{type}</button>
              ))}
            </div>

            {error && <div style={{ fontSize: 13, color: '#A32D2D', marginBottom: 12 }}>{error}</div>}

            <button onClick={goNext} disabled={!canContinueStep1} style={{ ...btnPrimary(!canContinueStep1), marginBottom: 20 }}>Continue</button>
          </div>
        )}

        {/* ─── STEP 2 ─── */}
        {step === 2 && (
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111', margin: '0 0 8px' }}>How can members reach you?</h1>
            <p style={{ fontSize: 16, color: '#666', margin: '0 0 24px' }}>Used for your gym's public profile.</p>

            {[
              { val: address, set: setAddress, placeholder: 'Street address, area', type: 'text' },
              { val: phone, set: setPhone, placeholder: '+91 98765 43210', type: 'tel' },
            ].map((field, i) => (
              <div key={i} style={{ marginBottom: 12 }}>
                <input type={field.type} placeholder={field.placeholder} value={field.val}
                  onChange={e => field.set(e.target.value)} style={inputStyle} />
              </div>
            ))}

            <div style={{ marginBottom: 8 }}>
              <textarea
                placeholder="Describe your gym in 1–2 sentences — equipment, vibe, specialties..."
                value={description} maxLength={200}
                onChange={e => setDescription(e.target.value)}
                style={{
                  width: '100%', height: 100, border: '0.5px solid rgba(0,0,0,0.15)',
                  borderRadius: 12, padding: 16, fontSize: 15, boxSizing: 'border-box',
                  outline: 'none', resize: 'none', fontFamily: 'inherit', backgroundColor: 'white',
                }}
              />
              <div style={{ fontSize: 11, color: '#999', textAlign: 'right', marginTop: 4 }}>{description.length}/200</div>
            </div>

            <div style={{ fontSize: 12, color: '#999', textAlign: 'center', marginBottom: 28 }}>
              These fields are optional. You can add them later in Settings.
            </div>

            <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
              <button onClick={goBack} style={btnSecondary}>← Back</button>
              <button onClick={goNext} style={{ ...btnPrimary(false), flex: 1, width: 'auto', marginBottom: 0 }}>Continue</button>
            </div>
          </div>
        )}

        {/* ─── STEP 3: LOGO ─── */}
        {step === 3 && (
          <div style={{ textAlign: 'center' }}>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111', margin: '0 0 8px', textAlign: 'left' }}>Add your gym's logo</h1>
            <p style={{ fontSize: 16, color: '#666', margin: '0 0 12px', textAlign: 'left' }}>
              Optional — you can always add this later from Settings.
            </p>
            <span style={{
              display: 'inline-block', backgroundColor: '#FAEEDA', color: '#854F0B',
              fontSize: 12, fontWeight: 600, padding: '6px 12px', borderRadius: 20, marginBottom: 36,
            }}>Optional</span>

            <div
              onClick={() => logoInputRef.current?.click()}
              style={{
                width: 120, height: 120, borderRadius: '50%', backgroundColor: '#F7F7F5',
                border: '2px dashed rgba(0,0,0,0.2)', margin: '0 auto 12px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', position: 'relative', overflow: 'hidden',
              }}
            >
              {logoPreview ? (
                <>
                  <img src={logoPreview} alt="Logo preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button
                    onClick={e => { e.stopPropagation(); setLogoFile(null); setLogoPreview(null) }}
                    style={{
                      position: 'absolute', top: 4, right: 4,
                      width: 24, height: 24, borderRadius: '50%',
                      backgroundColor: 'white', border: '0.5px solid rgba(0,0,0,0.12)',
                      fontSize: 14, color: '#999', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
                    }}
                  >×</button>
                </>
              ) : (
                <div>
                  <div style={{ fontSize: 32, color: '#999' }}>↑</div>
                  <div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>Tap to upload</div>
                </div>
              )}
            </div>

            <div style={{ fontSize: 12, color: '#999', marginBottom: 32 }}>JPG or PNG, max 5MB</div>

            <input
              ref={logoInputRef} type="file" accept="image/*" style={{ display: 'none' }}
              onChange={e => { if (e.target.files?.[0]) handleLogoSelect(e.target.files[0]) }}
            />

            {error && <div style={{ fontSize: 13, color: '#A32D2D', marginBottom: 12 }}>{error}</div>}

            <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
              <button onClick={goBack} style={btnSecondary}>← Back</button>
              <button onClick={goNext} style={{ ...btnPrimary(false), flex: 1, width: 'auto', marginBottom: 0 }}>
                {logoPreview ? 'Continue' : 'Skip'}
              </button>
            </div>
          </div>
        )}

        {/* ─── STEP 4: PLANS ─── */}
        {step === 4 && (
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111', margin: '0 0 8px' }}>Set up your plans</h1>
            <p style={{ fontSize: 16, color: '#666', margin: '0 0 24px' }}>
              Define what members can purchase. You can edit these anytime.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 10 }}>
              {plans.map(plan => (
                <div key={plan.id} style={{ backgroundColor: 'white', borderRadius: 12, border: '0.5px solid rgba(0,0,0,0.08)', padding: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontSize: 15, fontWeight: 600, color: '#111' }}>{plan.name}</span>
                    <span style={{ fontSize: 14, color: '#555' }}>₹{plan.price?.toLocaleString('en-IN')}</span>
                  </div>
                  <div style={{ fontSize: 13, color: '#999', marginBottom: plan.features?.length ? 8 : 0 }}>{plan.duration_days} days</div>
                  {plan.features?.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                      {plan.features.map((f, i) => (
                        <span key={i} style={{ backgroundColor: '#F7F7F5', borderRadius: 6, padding: '4px 8px', fontSize: 12, color: '#555' }}>{f}</span>
                      ))}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <button onClick={() => openEditPlan(plan)} style={{ background: 'none', border: 'none', fontSize: 13, color: '#185FA5', cursor: 'pointer', padding: 0 }}>✏ Edit</button>
                    <button onClick={() => deletePlan(plan.id)} style={{ background: 'none', border: 'none', fontSize: 13, color: '#A32D2D', cursor: 'pointer', padding: 0 }}>× Delete</button>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={openAddPlan}
              style={{
                width: '100%', height: 52, backgroundColor: 'white',
                border: '0.5px dashed rgba(0,0,0,0.2)', borderRadius: 12,
                fontSize: 14, fontWeight: 500, color: '#111', cursor: 'pointer',
                marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            ><span style={{ fontSize: 18 }}>+</span> Add Plan</button>

            {/* Inline plan form */}
            {showPlanForm && (
              <div style={{ backgroundColor: 'white', borderRadius: 12, border: '0.5px solid rgba(0,0,0,0.08)', padding: 16, marginBottom: 8 }}>
                {[
                  { key: 'name', placeholder: 'Plan Name*', type: 'text' },
                  { key: 'price', placeholder: 'Price (₹)*', type: 'number' },
                  { key: 'duration_days', placeholder: 'Duration (days)*', type: 'number' },
                  { key: 'features', placeholder: 'Features (comma-separated)', type: 'text' },
                ].map(f => (
                  <input
                    key={f.key} type={f.type} placeholder={f.placeholder} value={planForm[f.key]}
                    onChange={e => setPlanForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                    style={{ ...inputStyle, height: 44, borderRadius: 10, padding: '0 14px', fontSize: 14, marginBottom: 8 }}
                  />
                ))}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setShowPlanForm(false)} style={{ ...btnSecondary, flex: 1, height: 40, borderRadius: 10, fontSize: 13 }}>Cancel</button>
                  <button
                    onClick={savePlan}
                    disabled={!planForm.name || !planForm.price || !planForm.duration_days}
                    style={{
                      flex: 1, height: 40, backgroundColor: '#111', color: 'white',
                      border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 500, cursor: 'pointer',
                      opacity: (!planForm.name || !planForm.price || !planForm.duration_days) ? 0.4 : 1,
                    }}
                  >{editingPlanId ? 'Update' : 'Add'}</button>
                </div>
              </div>
            )}

            <div style={{ fontSize: 12, color: '#999', textAlign: 'center', marginBottom: 24 }}>
              Or skip for now — you can add plans in Settings.
            </div>

            <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
              <button onClick={goBack} style={btnSecondary}>← Back</button>
              <button onClick={goNext} style={{ ...btnPrimary(false), flex: 1, width: 'auto', marginBottom: 0 }}>Continue</button>
            </div>
          </div>
        )}

        {/* ─── STEP 5: REVIEW ─── */}
        {step === 5 && (
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111', margin: '0 0 8px' }}>Review your gym</h1>
            <p style={{ fontSize: 16, color: '#666', margin: '0 0 20px' }}>Looks good? Launch your gym on FitForge.</p>

            <div style={{ backgroundColor: 'white', borderRadius: 12, border: '0.5px solid rgba(0,0,0,0.08)', overflow: 'hidden', marginBottom: 16 }}>
              <div style={{ padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 48, height: 48, borderRadius: '50%', backgroundColor: '#F1EFE8',
                      overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {logoPreview
                        ? <img src={logoPreview} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <span style={{ fontSize: 16, fontWeight: 600, color: '#5F5E5A' }}>{gymName.slice(0, 2).toUpperCase()}</span>
                      }
                    </div>
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 600, color: '#111' }}>{gymName}</div>
                      <div style={{ fontSize: 14, color: '#666' }}>{city}</div>
                    </div>
                  </div>
                  <button onClick={() => goToStep(1)} style={{ background: 'none', border: 'none', fontSize: 12, color: '#185FA5', cursor: 'pointer' }}>Edit →</button>
                </div>

                {[
                  { label: 'Type', value: gymType },
                  { label: 'Address', value: address || '—' },
                  { label: 'Phone', value: phone || '—' },
                ].map(row => (
                  <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderTop: '0.5px solid rgba(0,0,0,0.06)' }}>
                    <span style={{ fontSize: 14, color: '#999' }}>{row.label}</span>
                    <span style={{ fontSize: 14, color: '#111', fontWeight: 500 }}>{row.value}</span>
                  </div>
                ))}

                {description && (
                  <div style={{ borderTop: '0.5px solid rgba(0,0,0,0.06)', paddingTop: 10 }}>
                    <div style={{ fontSize: 14, color: '#999', marginBottom: 4 }}>Description</div>
                    <div style={{ fontSize: 14, color: '#111' }}>{description}</div>
                  </div>
                )}
              </div>

              <div style={{ borderTop: '0.5px solid rgba(0,0,0,0.08)', padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#999', textTransform: 'uppercase', letterSpacing: '0.08em' }}>PLANS</div>
                  <button onClick={() => goToStep(4)} style={{ background: 'none', border: 'none', fontSize: 12, color: '#185FA5', cursor: 'pointer' }}>Edit →</button>
                </div>
                {plans.length === 0
                  ? <div style={{ fontSize: 13, color: '#999' }}>No plans added</div>
                  : plans.map(plan => (
                    <div key={plan.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderTop: '0.5px solid rgba(0,0,0,0.04)' }}>
                      <span style={{ fontSize: 13, color: '#555' }}>{plan.name} · {plan.duration_days}d</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#111' }}>₹{plan.price?.toLocaleString('en-IN')}</span>
                    </div>
                  ))
                }
              </div>
            </div>

            {error && (
              <div style={{ backgroundColor: '#FCEBEB', borderRadius: 10, padding: '12px 16px', fontSize: 13, color: '#A32D2D', marginBottom: 16 }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
              <button
                onClick={handleSubmit} disabled={submitting}
                style={{ ...btnPrimary(submitting) }}
              >{submitting ? 'Launching...' : '🚀 Launch My Gym'}</button>
              <button onClick={goBack} style={{ width: '100%', height: 52, backgroundColor: 'white', color: '#111', border: '0.5px solid #111', borderRadius: 12, fontSize: 15, fontWeight: 500, cursor: 'pointer' }}>
                Back
              </button>
            </div>
          </div>
        )}

        {/* ─── SUCCESS ─── */}
        {step === 'success' && (
          <div style={{
            minHeight: '100vh', backgroundColor: 'white',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            padding: '0 24px', textAlign: 'center',
          }}>
            <style>{`@keyframes popIn{0%{transform:scale(0);opacity:0}70%{transform:scale(1.1)}100%{transform:scale(1);opacity:1}}`}</style>
            <div style={{
              width: 80, height: 80, borderRadius: '50%', backgroundColor: '#EAF3DE',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 40, marginBottom: 20,
              animation: 'popIn 0.4s ease forwards',
            }}>✓</div>

            <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111', margin: '0 0 8px' }}>Your gym is live! 🎉</h1>
            <p style={{ fontSize: 16, color: '#666', margin: '0 0 8px' }}>{gymName}</p>
            <p style={{ fontSize: 14, color: '#666', margin: '0 0 32px', lineHeight: 1.5 }}>
              FitForge members in {city} can now discover and join your gym.
            </p>

            <div style={{ display: 'flex', gap: 10, width: '100%', marginBottom: 32 }}>
              {[{ value: '0', label: 'Members' }, { value: '0', label: 'Trainers' }, { value: '0', label: 'Check-ins' }].map((stat, i) => (
                <div key={i} style={{
                  flex: 1, backgroundColor: 'white', border: '0.5px solid rgba(0,0,0,0.08)',
                  borderRadius: 10, padding: 12, textAlign: 'center',
                }}>
                  <div style={{ fontSize: 20, fontWeight: 600, color: '#111' }}>{stat.value}</div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: '#999', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 4 }}>{stat.label}</div>
                </div>
              ))}
            </div>

            <button
              onClick={() => navigate('/gym/dashboard')}
              style={{ width: '100%', height: 52, backgroundColor: '#111', color: 'white', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}
            >Go to Dashboard →</button>
          </div>
        )}
      </div>
    </div>
  )
}
