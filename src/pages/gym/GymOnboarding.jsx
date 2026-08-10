import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../../utils/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useActiveGym } from '../../contexts/ActiveGymContext'
import { usePhotoPicker } from '../../hooks/usePhotoPicker'
import { CitySearchInput } from '../../components/CitySearchInput'

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
      <div style={{ display: 'flex', height: 3, backgroundColor: 'var(--border)' }}>
        {Array.from({ length: total }, (_, i) => (
          <div key={i} style={{ flex: 1, backgroundColor: i < currentNum ? 'var(--text-primary)' : 'var(--border)' }} />
        ))}
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-tertiary)', padding: '6px 0 0 20px' }}>
        {current === 'success' ? 'Complete!' : `Step ${current} of 5`}
      </div>
    </div>
  )
}

const inputStyle = {
  width: '100%', height: 52, border: '0.5px solid var(--border)',
  borderRadius: 12, padding: '0 16px', fontSize: 15,
  boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit',
  backgroundColor: "var(--bg-card)",
}

export default function GymOnboarding() {
  const { user: authUser, setRole, markOnboardingComplete } = useAuth()
  // ActiveGymProvider is only mounted inside GymOwnerRoute; GymOnboarding can
  // also render under AuthRoute (first-time, no provider). Read the context
  // safely — refreshGyms is called only when available (add-mode path).
  const activeGymCtx = useActiveGym()
  const refreshGyms = activeGymCtx?.refreshGyms ?? null
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const isAddMode = searchParams.get('mode') === 'add'
  const API = import.meta.env.VITE_API_URL || ''
  const { photo: logoPick, pickPhoto: pickLogo, clearPhoto: clearLogo } = usePhotoPicker()
  const plansSectionRef = useRef(null) // add-mode only: scroll target for Screen 2's plans "Edit →" link

  const [step, setStep] = useState(1)
  // Add-mode uses its own screen state (1 | 2 | 'success') — kept fully separate
  // from `step` because the full 5-step flow's goNext/goBack guards (`step < 5`,
  // `step > 1`) don't translate to a 2-screen model. `step` itself is never
  // mutated in add-mode, so the untouched full-mode step blocks below simply
  // never match.
  const [addModeScreen, setAddModeScreen] = useState(1)
  const [gymName, setGymName] = useState('')
  const [city, setCity] = useState('')
  const [gymType, setGymType] = useState('')
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [description, setDescription] = useState('')
  const [plans, setPlans] = useState(STARTER_PLANS)
  const [showPlanForm, setShowPlanForm] = useState(false)
  const [editingPlanId, setEditingPlanId] = useState(null)
  const [planForm, setPlanForm] = useState({ name: '', price: '', duration_days: '', features: '' })
  const [submitting, setSubmitting] = useState(false)
  const [createdGym, setCreatedGym] = useState(null)
  const [error, setError] = useState(null)

  // ─── Re-entry guard ───────────────────────────────────────────────────────
  // Skipped in add-mode (?mode=add) so existing owners can create a second gym.
  useEffect(() => {
    if (!authUser || isAddMode) return
    const checkExisting = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const res = await fetch(`${API}/api/gyms/owner/${authUser.id}`, {
          headers: { Authorization: `Bearer ${session?.access_token}` },
        })
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
  }, [authUser, isAddMode])

  const canContinueStep1 = gymName.trim() && city.trim() && gymType

  const goNext = () => { if (step < 5) setStep(prev => prev + 1) }
  const goBack = () => { if (step > 1) setStep(prev => prev - 1) }
  const goToStep = (n) => setStep(n)

  // Add-mode screen transitions — independent of goNext/goBack/goToStep above.
  const goNextAddMode = () => { setError(null); setAddModeScreen(2) }
  const goBackAddMode = () => { setError(null); setAddModeScreen(1) }

  // ─── Logo 5MB guard ───────────────────────────────────────────────────────
  useEffect(() => {
    if (logoPick && logoPick.file.size > 5 * 1024 * 1024) {
      setError('Logo must be under 5MB')
      clearLogo()
    }
  }, [logoPick, clearLogo])

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

      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${API}/api/gyms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
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

      if (logoPick) {
        try {
          const formData = new FormData()
          formData.append('logo', logoPick.blob, 'logo.jpg')
          await fetch(`${API}/api/gyms/${gymId}/upload-logo`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${session?.access_token}` },
            body: formData,
          })
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

      // Refresh the ActiveGymContext gym list so GymSwitcher shows the new
      // gym immediately when the user clicks through to the dashboard —
      // no page reload needed. Only available in add-mode (provider in scope).
      if (refreshGyms) await refreshGyms()

      setCreatedGym(data.gym)
      if (isAddMode) setAddModeScreen('success')
      else setStep('success')
    } catch (err) {
      setError(err.message || 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  const btnPrimary = (disabled) => ({
    width: '100%', height: 52, backgroundColor: 'var(--text-primary)', color: "var(--bg-card)",
    border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 500,
    cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.4 : 1,
  })

  const btnSecondary = {
    flex: 1, height: 52, backgroundColor: "var(--bg-card)", color: 'var(--text-primary)',
    border: '0.5px solid var(--text-primary)', borderRadius: 12, fontSize: 15, fontWeight: 500, cursor: 'pointer',
  }

  // Which screen model is "done" depends on mode — `step` never changes in
  // add-mode (see addModeScreen above), so this stays correct for both
  // without branching every call site.
  const isSuccess = isAddMode ? addModeScreen === 'success' : step === 'success'

  return (
    <div style={{
      minHeight: '100vh', backgroundColor: 'var(--bg-primary)', display: 'flex', flexDirection: 'column',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>
      {/* HEADER */}
      {!isSuccess && (
        <div style={{ backgroundColor: "var(--bg-card)", borderBottom: '0.5px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', padding: '14px 20px', justifyContent: 'space-between' }}>
            <button
              onClick={() => navigate(isAddMode ? '/gym/dashboard' : '/home')}
              style={{ background: 'none', border: 'none', fontSize: 22, color: 'var(--text-tertiary)', cursor: 'pointer', padding: 0 }}
            >×</button>
            <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>Set Up Your Gym</span>
            {step === 3 ? (
              <button
                onClick={goNext}
                style={{ background: 'none', border: 'none', fontSize: 14, fontWeight: 500, color: 'var(--text-cta)', cursor: 'pointer' }}
              >Skip →</button>
            ) : (
              <div style={{ width: 40 }} />
            )}
          </div>
          {isAddMode ? (
            <div>
              <div style={{ display: 'flex', height: 3, backgroundColor: 'var(--border)' }}>
                {[1, 2].map(i => (
                  <div key={i} style={{ flex: 1, backgroundColor: i <= addModeScreen ? 'var(--text-primary)' : 'var(--border)' }} />
                ))}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)', padding: '6px 0 0 20px' }}>
                {addModeScreen === 1 ? 'Gym details' : 'Plans & review'}
              </div>
            </div>
          ) : (
            <ProgressBar current={step} />
          )}
        </div>
      )}

      <div style={{ flex: 1, padding: isSuccess ? 0 : '24px 20px 0', overflowY: 'auto' }}>

        {/* ─── STEP 1 (full-mode only) ─── */}
        {!isAddMode && step === 1 && (
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 8px' }}>Tell us about your gym</h1>
            <p style={{ fontSize: 16, color: 'var(--text-secondary)', margin: '0 0 24px' }}>
              This is what members will see when they search for your gym.
            </p>

            <div style={{ marginBottom: 12 }}>
              <input type="text" placeholder="Gym Name*" value={gymName} onChange={e => setGymName(e.target.value)} style={inputStyle} />
              <div style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 4 }}>Choose a name members will recognize</div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <CitySearchInput value={city} onChange={setCity} placeholder="Search city…" />
            </div>

            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 10 }}>Gym Type*</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 32 }}>
              {GYM_TYPES.map(type => (
                <button
                  key={type} onClick={() => setGymType(type)}
                  style={{
                    height: 48, backgroundColor: gymType === type ? 'var(--text-primary)' : "var(--bg-card)",
                    color: gymType === type ? 'var(--bg-primary)' : 'var(--text-primary)',
                    border: gymType === type ? 'none' : '0.5px solid var(--border)',
                    borderRadius: 12, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  }}
                >{type}</button>
              ))}
            </div>

            {error && <div style={{ fontSize: 13, color: 'var(--error)', marginBottom: 12 }}>{error}</div>}

            <button onClick={goNext} disabled={!canContinueStep1} style={{ ...btnPrimary(!canContinueStep1), marginBottom: 20 }}>Continue</button>
          </div>
        )}

        {/* ─── STEP 2 (full-mode only) ─── */}
        {!isAddMode && step === 2 && (
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 8px' }}>How can members reach you?</h1>
            <p style={{ fontSize: 16, color: 'var(--text-secondary)', margin: '0 0 24px' }}>Used for your gym's public profile.</p>

            <div style={{ marginBottom: 12 }}>
              <input type="text" placeholder="Street address, area" value={address}
                onChange={e => setAddress(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', ...inputStyle, padding: 0 }}>
              <span style={{ padding: '0 10px 0 16px', color: 'var(--text-tertiary)', fontSize: 15, whiteSpace: 'nowrap', userSelect: 'none' }}>+91</span>
              <input
                type="tel"
                placeholder="98765 43210"
                value={phone}
                maxLength={10}
                onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                style={{ ...inputStyle, border: 'none', padding: '0 16px 0 0', flex: 1, height: '100%' }}
              />
            </div>

            <div style={{ marginBottom: 8 }}>
              <textarea
                placeholder="Describe your gym in 1–2 sentences — equipment, vibe, specialties..."
                value={description} maxLength={200}
                onChange={e => setDescription(e.target.value)}
                style={{
                  width: '100%', height: 100, border: '0.5px solid var(--border)',
                  borderRadius: 12, padding: 16, fontSize: 15, boxSizing: 'border-box',
                  outline: 'none', resize: 'none', fontFamily: 'inherit', backgroundColor: "var(--bg-card)",
                }}
              />
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', textAlign: 'right', marginTop: 4 }}>{description.length}/200</div>
            </div>

            <div style={{ fontSize: 12, color: 'var(--text-tertiary)', textAlign: 'center', marginBottom: 28 }}>
              These fields are optional. You can add them later in Settings.
            </div>

            <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
              <button onClick={goBack} style={btnSecondary}>← Back</button>
              <button onClick={goNext} style={{ ...btnPrimary(false), flex: 1, width: 'auto', marginBottom: 0 }}>Continue</button>
            </div>
          </div>
        )}

        {/* ─── STEP 3: LOGO (full-mode only) ─── */}
        {!isAddMode && step === 3 && (
          <div style={{ textAlign: 'center' }}>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 8px', textAlign: 'left' }}>Add your gym's logo</h1>
            <p style={{ fontSize: 16, color: 'var(--text-secondary)', margin: '0 0 12px', textAlign: 'left' }}>
              Optional — you can always add this later from Settings.
            </p>
            <span style={{
              display: 'inline-block', backgroundColor: 'var(--warning-bg)', color: 'var(--warning)',
              fontSize: 12, fontWeight: 600, padding: '6px 12px', borderRadius: 20, marginBottom: 36,
            }}>Optional</span>

            <div
              onClick={pickLogo}
              style={{
                width: 120, height: 120, borderRadius: '50%', backgroundColor: 'var(--bg-primary)',
                border: '2px dashed var(--border-strong)', margin: '0 auto 12px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', position: 'relative', overflow: 'hidden',
              }}
            >
              {logoPick ? (
                <>
                  <img src={logoPick.preview} alt="Logo preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button
                    onClick={e => { e.stopPropagation(); clearLogo() }}
                    style={{
                      position: 'absolute', top: 4, right: 4,
                      width: 24, height: 24, borderRadius: '50%',
                      backgroundColor: "var(--bg-card)", border: '0.5px solid var(--border)',
                      fontSize: 14, color: 'var(--text-tertiary)', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
                    }}
                  >×</button>
                </>
              ) : (
                <div>
                  <div style={{ fontSize: 32, color: 'var(--text-tertiary)' }}>↑</div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>Tap to upload</div>
                </div>
              )}
            </div>

            <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 32 }}>JPG or PNG, max 5MB</div>

            {error && <div style={{ fontSize: 13, color: 'var(--error)', marginBottom: 12 }}>{error}</div>}

            <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
              <button onClick={goBack} style={btnSecondary}>← Back</button>
              <button onClick={goNext} style={{ ...btnPrimary(false), flex: 1, width: 'auto', marginBottom: 0 }}>
                {logoPick ? 'Continue' : 'Skip'}
              </button>
            </div>
          </div>
        )}

        {/* ─── STEP 4: PLANS (full-mode only) ─── */}
        {!isAddMode && step === 4 && (
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 8px' }}>Set up your plans</h1>
            <p style={{ fontSize: 16, color: 'var(--text-secondary)', margin: '0 0 24px' }}>
              Define what members can purchase. You can edit these anytime.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 10 }}>
              {plans.map(plan => (
                <div key={plan.id} style={{ backgroundColor: "var(--bg-card)", borderRadius: 12, border: '0.5px solid var(--border)', padding: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>{plan.name}</span>
                    <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>₹{plan.price?.toLocaleString('en-IN')}</span>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-tertiary)', marginBottom: plan.features?.length ? 8 : 0 }}>{plan.duration_days} days</div>
                  {plan.features?.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                      {plan.features.map((f, i) => (
                        <span key={i} style={{ backgroundColor: 'var(--bg-primary)', borderRadius: 6, padding: '4px 8px', fontSize: 12, color: 'var(--text-secondary)' }}>{f}</span>
                      ))}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <button onClick={() => openEditPlan(plan)} style={{ background: 'none', border: 'none', fontSize: 13, color: 'var(--text-cta)', cursor: 'pointer', padding: 0 }}>✏ Edit</button>
                    <button onClick={() => deletePlan(plan.id)} style={{ background: 'none', border: 'none', fontSize: 13, color: 'var(--error)', cursor: 'pointer', padding: 0 }}>× Delete</button>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={openAddPlan}
              style={{
                width: '100%', height: 52, backgroundColor: "var(--bg-card)",
                border: '1px dashed var(--border-strong)', borderRadius: 12,
                fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', cursor: 'pointer',
                marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            ><span style={{ fontSize: 18 }}>+</span> Add Plan</button>

            {/* Inline plan form */}
            {showPlanForm && (
              <div style={{ backgroundColor: "var(--bg-card)", borderRadius: 12, border: '0.5px solid var(--border)', padding: 16, marginBottom: 8 }}>
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
                      flex: 1, height: 40, backgroundColor: 'var(--text-primary)', color: "var(--bg-card)",
                      border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 500, cursor: 'pointer',
                      opacity: (!planForm.name || !planForm.price || !planForm.duration_days) ? 0.4 : 1,
                    }}
                  >{editingPlanId ? 'Update' : 'Add'}</button>
                </div>
              </div>
            )}

            <div style={{ fontSize: 12, color: 'var(--text-tertiary)', textAlign: 'center', marginBottom: 24 }}>
              Or skip for now — you can add plans in Settings.
            </div>

            <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
              <button onClick={goBack} style={btnSecondary}>← Back</button>
              <button onClick={goNext} style={{ ...btnPrimary(false), flex: 1, width: 'auto', marginBottom: 0 }}>Continue</button>
            </div>
          </div>
        )}

        {/* ─── STEP 5: REVIEW (full-mode only) ─── */}
        {!isAddMode && step === 5 && (
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 8px' }}>Review your gym</h1>
            <p style={{ fontSize: 16, color: 'var(--text-secondary)', margin: '0 0 20px' }}>Looks good? Launch your gym on Gymvyn.</p>

            <div style={{ backgroundColor: "var(--bg-card)", borderRadius: 12, border: '0.5px solid var(--border)', overflow: 'hidden', marginBottom: 16 }}>
              <div style={{ padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 48, height: 48, borderRadius: '50%', backgroundColor: 'var(--bg-pill)',
                      overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {logoPick?.preview
                        ? <img src={logoPick.preview} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-secondary)' }}>{gymName.slice(0, 2).toUpperCase()}</span>
                      }
                    </div>
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)' }}>{gymName}</div>
                      <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{city}</div>
                    </div>
                  </div>
                  <button onClick={() => goToStep(1)} style={{ background: 'none', border: 'none', fontSize: 12, color: 'var(--text-cta)', cursor: 'pointer' }}>Edit →</button>
                </div>

                {[
                  { label: 'Type', value: gymType },
                  { label: 'Address', value: address || '—' },
                  { label: 'Phone', value: phone || '—' },
                ].map(row => (
                  <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderTop: '0.5px solid var(--border)' }}>
                    <span style={{ fontSize: 14, color: 'var(--text-tertiary)' }}>{row.label}</span>
                    <span style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 500 }}>{row.value}</span>
                  </div>
                ))}

                {description && (
                  <div style={{ borderTop: '0.5px solid var(--border)', paddingTop: 10 }}>
                    <div style={{ fontSize: 14, color: 'var(--text-tertiary)', marginBottom: 4 }}>Description</div>
                    <div style={{ fontSize: 14, color: 'var(--text-primary)' }}>{description}</div>
                  </div>
                )}
              </div>

              <div style={{ borderTop: '0.5px solid var(--border)', padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>PLANS</div>
                  <button onClick={() => goToStep(4)} style={{ background: 'none', border: 'none', fontSize: 12, color: 'var(--text-cta)', cursor: 'pointer' }}>Edit →</button>
                </div>
                {plans.length === 0
                  ? <div style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>No plans added</div>
                  : plans.map(plan => (
                    <div key={plan.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderTop: '0.5px solid var(--border)' }}>
                      <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{plan.name} · {plan.duration_days}d</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>₹{plan.price?.toLocaleString('en-IN')}</span>
                    </div>
                  ))
                }
              </div>
            </div>

            {error && (
              <div style={{ backgroundColor: 'var(--error-bg)', borderRadius: 10, padding: '12px 16px', fontSize: 13, color: 'var(--error)', marginBottom: 16 }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
              <button
                onClick={handleSubmit} disabled={submitting}
                style={{ ...btnPrimary(submitting) }}
              >{submitting ? 'Launching...' : 'Launch My Gym'}</button>
              <button onClick={goBack} style={{ width: '100%', height: 52, backgroundColor: "var(--bg-card)", color: 'var(--text-primary)', border: '0.5px solid var(--text-primary)', borderRadius: 12, fontSize: 15, fontWeight: 500, cursor: 'pointer' }}>
                Back
              </button>
            </div>
          </div>
        )}

        {/* ─── ADD-MODE SCREEN 1: GYM DETAILS (Steps 1+2+3 combined) ─── */}
        {isAddMode && addModeScreen === 1 && (
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 8px' }}>Gym details</h1>
            <p style={{ fontSize: 16, color: 'var(--text-secondary)', margin: '0 0 24px' }}>
              This is what members will see when they search for your gym.
            </p>

            <div style={{ marginBottom: 12 }}>
              <input type="text" placeholder="Gym Name*" value={gymName} onChange={e => setGymName(e.target.value)} style={inputStyle} />
              <div style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 4 }}>Choose a name members will recognize</div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <CitySearchInput value={city} onChange={setCity} placeholder="Search city…" />
            </div>

            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 10 }}>Gym Type*</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 28 }}>
              {GYM_TYPES.map(type => (
                <button
                  key={type} onClick={() => setGymType(type)}
                  style={{
                    height: 48, backgroundColor: gymType === type ? 'var(--text-primary)' : "var(--bg-card)",
                    color: gymType === type ? 'var(--bg-primary)' : 'var(--text-primary)',
                    border: gymType === type ? 'none' : '0.5px solid var(--border)',
                    borderRadius: 12, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  }}
                >{type}</button>
              ))}
            </div>

            <div style={{ height: 1, backgroundColor: 'var(--border)', margin: '0 0 24px' }} />

            <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 4px' }}>Contact & description</h2>
            <p style={{ fontSize: 13, color: 'var(--text-tertiary)', margin: '0 0 16px' }}>Optional — used for your gym's public profile.</p>

            <div style={{ marginBottom: 12 }}>
              <input type="text" placeholder="Street address, area" value={address}
                onChange={e => setAddress(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', ...inputStyle, padding: 0 }}>
              <span style={{ padding: '0 10px 0 16px', color: 'var(--text-tertiary)', fontSize: 15, whiteSpace: 'nowrap', userSelect: 'none' }}>+91</span>
              <input
                type="tel"
                placeholder="98765 43210"
                value={phone}
                maxLength={10}
                onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                style={{ ...inputStyle, border: 'none', padding: '0 16px 0 0', flex: 1, height: '100%' }}
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <textarea
                placeholder="Describe your gym in 1–2 sentences — equipment, vibe, specialties..."
                value={description} maxLength={200}
                onChange={e => setDescription(e.target.value)}
                style={{
                  width: '100%', height: 100, border: '0.5px solid var(--border)',
                  borderRadius: 12, padding: 16, fontSize: 15, boxSizing: 'border-box',
                  outline: 'none', resize: 'none', fontFamily: 'inherit', backgroundColor: "var(--bg-card)",
                }}
              />
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', textAlign: 'right', marginTop: 4 }}>{description.length}/200</div>
            </div>

            <div style={{ height: 1, backgroundColor: 'var(--border)', margin: '0 0 24px' }} />

            <div style={{ textAlign: 'center' }}>
              <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 8px', textAlign: 'left' }}>Gym logo</h2>
              <p style={{ fontSize: 13, color: 'var(--text-tertiary)', margin: '0 0 12px', textAlign: 'left' }}>
                Optional — you can always add this later from Settings.
              </p>
              <span style={{
                display: 'inline-block', backgroundColor: 'var(--warning-bg)', color: 'var(--warning)',
                fontSize: 12, fontWeight: 600, padding: '6px 12px', borderRadius: 20, marginBottom: 20,
              }}>Optional</span>

              <div
                onClick={pickLogo}
                style={{
                  width: 120, height: 120, borderRadius: '50%', backgroundColor: 'var(--bg-primary)',
                  border: '2px dashed var(--border-strong)', margin: '0 auto 12px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', position: 'relative', overflow: 'hidden',
                }}
              >
                {logoPick ? (
                  <>
                    <img src={logoPick.preview} alt="Logo preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button
                      onClick={e => { e.stopPropagation(); clearLogo() }}
                      style={{
                        position: 'absolute', top: 4, right: 4,
                        width: 24, height: 24, borderRadius: '50%',
                        backgroundColor: "var(--bg-card)", border: '0.5px solid var(--border)',
                        fontSize: 14, color: 'var(--text-tertiary)', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
                      }}
                    >×</button>
                  </>
                ) : (
                  <div>
                    <div style={{ fontSize: 32, color: 'var(--text-tertiary)' }}>↑</div>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>Tap to upload</div>
                  </div>
                )}
              </div>

              <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 24 }}>JPG or PNG, max 5MB</div>
            </div>

            {error && <div style={{ fontSize: 13, color: 'var(--error)', marginBottom: 12 }}>{error}</div>}

            <button onClick={goNextAddMode} disabled={!canContinueStep1} style={{ ...btnPrimary(!canContinueStep1), marginBottom: 20 }}>Continue</button>
          </div>
        )}

        {/* ─── ADD-MODE SCREEN 2: PLANS & REVIEW (Steps 4+5 combined) ─── */}
        {isAddMode && addModeScreen === 2 && (
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 8px' }}>Plans & review</h1>
            <p style={{ fontSize: 16, color: 'var(--text-secondary)', margin: '0 0 24px' }}>
              Define what members can purchase, then launch your gym.
            </p>

            <h2 ref={plansSectionRef} style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 12px' }}>Plans</h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 10 }}>
              {plans.map(plan => (
                <div key={plan.id} style={{ backgroundColor: "var(--bg-card)", borderRadius: 12, border: '0.5px solid var(--border)', padding: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>{plan.name}</span>
                    <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>₹{plan.price?.toLocaleString('en-IN')}</span>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-tertiary)', marginBottom: plan.features?.length ? 8 : 0 }}>{plan.duration_days} days</div>
                  {plan.features?.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                      {plan.features.map((f, i) => (
                        <span key={i} style={{ backgroundColor: 'var(--bg-primary)', borderRadius: 6, padding: '4px 8px', fontSize: 12, color: 'var(--text-secondary)' }}>{f}</span>
                      ))}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <button onClick={() => openEditPlan(plan)} style={{ background: 'none', border: 'none', fontSize: 13, color: 'var(--text-cta)', cursor: 'pointer', padding: 0 }}>✏ Edit</button>
                    <button onClick={() => deletePlan(plan.id)} style={{ background: 'none', border: 'none', fontSize: 13, color: 'var(--error)', cursor: 'pointer', padding: 0 }}>× Delete</button>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={openAddPlan}
              style={{
                width: '100%', height: 52, backgroundColor: "var(--bg-card)",
                border: '1px dashed var(--border-strong)', borderRadius: 12,
                fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', cursor: 'pointer',
                marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            ><span style={{ fontSize: 18 }}>+</span> Add Plan</button>

            {showPlanForm && (
              <div style={{ backgroundColor: "var(--bg-card)", borderRadius: 12, border: '0.5px solid var(--border)', padding: 16, marginBottom: 8 }}>
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
                      flex: 1, height: 40, backgroundColor: 'var(--text-primary)', color: "var(--bg-card)",
                      border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 500, cursor: 'pointer',
                      opacity: (!planForm.name || !planForm.price || !planForm.duration_days) ? 0.4 : 1,
                    }}
                  >{editingPlanId ? 'Update' : 'Add'}</button>
                </div>
              </div>
            )}

            <div style={{ fontSize: 12, color: 'var(--text-tertiary)', textAlign: 'center', marginBottom: 24 }}>
              Or skip for now — you can add plans later in Settings.
            </div>

            <div style={{ height: 1, backgroundColor: 'var(--border)', margin: '0 0 24px' }} />

            <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 4px' }}>Review</h2>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: '0 0 16px' }}>Looks good? Launch your gym on Gymvyn.</p>

            <div style={{ backgroundColor: "var(--bg-card)", borderRadius: 12, border: '0.5px solid var(--border)', overflow: 'hidden', marginBottom: 16 }}>
              <div style={{ padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 48, height: 48, borderRadius: '50%', backgroundColor: 'var(--bg-pill)',
                      overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {logoPick?.preview
                        ? <img src={logoPick.preview} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-secondary)' }}>{gymName.slice(0, 2).toUpperCase()}</span>
                      }
                    </div>
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)' }}>{gymName}</div>
                      <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{city}</div>
                    </div>
                  </div>
                  <button onClick={goBackAddMode} style={{ background: 'none', border: 'none', fontSize: 12, color: 'var(--text-cta)', cursor: 'pointer' }}>Edit →</button>
                </div>

                {[
                  { label: 'Type', value: gymType },
                  { label: 'Address', value: address || '—' },
                  { label: 'Phone', value: phone || '—' },
                ].map(row => (
                  <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderTop: '0.5px solid var(--border)' }}>
                    <span style={{ fontSize: 14, color: 'var(--text-tertiary)' }}>{row.label}</span>
                    <span style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 500 }}>{row.value}</span>
                  </div>
                ))}

                {description && (
                  <div style={{ borderTop: '0.5px solid var(--border)', paddingTop: 10 }}>
                    <div style={{ fontSize: 14, color: 'var(--text-tertiary)', marginBottom: 4 }}>Description</div>
                    <div style={{ fontSize: 14, color: 'var(--text-primary)' }}>{description}</div>
                  </div>
                )}
              </div>

              <div style={{ borderTop: '0.5px solid var(--border)', padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>PLANS</div>
                  <button
                    onClick={() => plansSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                    style={{ background: 'none', border: 'none', fontSize: 12, color: 'var(--text-cta)', cursor: 'pointer' }}
                  >Edit →</button>
                </div>
                {plans.length === 0
                  ? <div style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>No plans added</div>
                  : plans.map(plan => (
                    <div key={plan.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderTop: '0.5px solid var(--border)' }}>
                      <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{plan.name} · {plan.duration_days}d</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>₹{plan.price?.toLocaleString('en-IN')}</span>
                    </div>
                  ))
                }
              </div>
            </div>

            {error && (
              <div style={{ backgroundColor: 'var(--error-bg)', borderRadius: 10, padding: '12px 16px', fontSize: 13, color: 'var(--error)', marginBottom: 16 }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
              <button
                onClick={handleSubmit} disabled={submitting}
                style={{ ...btnPrimary(submitting) }}
              >{submitting ? 'Launching...' : 'Launch My Gym'}</button>
              <button onClick={goBackAddMode} style={{ width: '100%', height: 52, backgroundColor: "var(--bg-card)", color: 'var(--text-primary)', border: '0.5px solid var(--text-primary)', borderRadius: 12, fontSize: 15, fontWeight: 500, cursor: 'pointer' }}>
                Back
              </button>
            </div>
          </div>
        )}

        {/* ─── SUCCESS (shared by both modes) ─── */}
        {isSuccess && (
          <div style={{
            minHeight: '100vh', backgroundColor: "var(--bg-card)",
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            padding: '0 24px', textAlign: 'center',
          }}>
            <style>{`@keyframes popIn{0%{transform:scale(0);opacity:0}70%{transform:scale(1.1)}100%{transform:scale(1);opacity:1}}`}</style>
            <div style={{
              width: 80, height: 80, borderRadius: '50%', backgroundColor: 'var(--success-bg)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 20,
              animation: 'popIn 0.4s ease forwards',
            }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            </div>

            <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 8px' }}>Your gym is live!</h1>
            <p style={{ fontSize: 16, color: 'var(--text-secondary)', margin: '0 0 8px' }}>{gymName}</p>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: '0 0 32px', lineHeight: 1.5 }}>
              Gymvyn members in {city} can now discover and join your gym.
            </p>

            <div style={{ display: 'flex', gap: 10, width: '100%', marginBottom: 32 }}>
              {[{ value: '0', label: 'Members' }, { value: '0', label: 'Trainers' }, { value: '0', label: 'Check-ins' }].map((stat, i) => (
                <div key={i} style={{
                  flex: 1, backgroundColor: "var(--bg-card)", border: '0.5px solid var(--border)',
                  borderRadius: 10, padding: 12, textAlign: 'center',
                }}>
                  <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-primary)' }}>{stat.value}</div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 4 }}>{stat.label}</div>
                </div>
              ))}
            </div>

            <button
              onClick={() => navigate('/gym/dashboard')}
              style={{ width: '100%', height: 52, backgroundColor: 'var(--text-primary)', color: "var(--bg-card)", border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}
            >Go to Dashboard →</button>
          </div>
        )}
      </div>
    </div>
  )
}
