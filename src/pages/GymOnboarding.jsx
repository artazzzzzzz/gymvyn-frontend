import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Loader2, PartyPopper } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../utils/supabase'
import { createGym } from '../utils/api'

const INDIAN_STATES = [
  // 28 States
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya',
  'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim',
  'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand',
  'West Bengal',
  // 8 Union Territories
  'Andaman and Nicobar Islands', 'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu', 'Delhi',
  'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry',
]

function Spinner() {
  return (
    <div className="min-h-screen bg-[#0c0c0e] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

function ProgressBar({ step, total }) {
  return (
    <div className="mb-10">
      <div className="flex justify-between mb-2.5">
        <span className="text-xs font-semibold text-emerald-400 tracking-wide uppercase">
          Step {step} of {total}
        </span>
        <span className="text-xs text-zinc-500">{Math.round((step / total) * 100)}%</span>
      </div>
      <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${(step / total) * 100}%` }}
        />
      </div>
    </div>
  )
}

const inputCls =
  'w-full bg-[#1c1c1f] border border-white/[0.08] rounded-xl px-4 py-3 text-white placeholder-zinc-600 text-sm focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30 transition-all'

export default function GymOnboarding() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()

  const [checking, setChecking]   = useState(true)
  const [isOwner, setIsOwner]     = useState(false)
  const [step, setStep]           = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg]   = useState('')
  const [joinCode, setJoinCode]   = useState('')

  const [form, setForm] = useState({
    gymName: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
  })

  useEffect(() => {
    let cancelled = false
    async function check() {
      if (!user) {
        setChecking(false)
        return
      }
      const { data } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()
      if (cancelled) return
      if (data?.role === 'gym_owner') setIsOwner(true)
      setChecking(false)
    }
    check()
    return () => { cancelled = true }
  }, [user])

  // Auto-redirect after success
  useEffect(() => {
    if (!joinCode) return
    const t = setTimeout(() => navigate('/gym/dashboard'), 4000)
    return () => clearTimeout(t)
  }, [joinCode, navigate])

  if (loading || checking) return <Spinner />
  if (!user) return <Navigate to="/login" replace />
  if (isOwner) return <Navigate to="/gym/dashboard" replace />

  const update = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  const phoneOk   = /^\d{10}$/.test(form.phone.trim())
  const pincodeOk = !form.pincode || /^\d{6}$/.test(form.pincode.trim())
  const emailOk   = !form.email   || /^\S+@\S+\.\S+$/.test(form.email.trim())

  const step1Valid = form.gymName.trim().length > 0 && phoneOk && emailOk
  const step2Valid = form.city.trim().length > 0 && pincodeOk

  async function handleSubmit() {
    setErrorMsg('')
    setSubmitting(true)
    try {
      const result = await createGym({ userId: user.id, ...form })
      setJoinCode(result.joinCode || result.gym?.join_code || '')
    } catch (err) {
      console.error('Create gym error:', err)
      setErrorMsg(err.message || 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Success screen ─────────────────────────────────────────────────────────
  if (joinCode) {
    return (
      <div className="min-h-screen bg-[#0c0c0e] flex items-center justify-center px-5">
        <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-emerald-500/[0.1] blur-[120px] rounded-full pointer-events-none" />

        <div className="relative z-10 max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 flex items-center justify-center mx-auto mb-6">
            <PartyPopper size={28} className="text-emerald-400" />
          </div>

          <h1 className="text-3xl font-bold text-white tracking-tight mb-3">
            🎉 Welcome to FitForge for Gym Owners!
          </h1>
          <p className="text-zinc-400 text-sm mb-8">
            Your gym is live. Members enter this code in their FitForge app to link to your gym.
          </p>

          <div className="bg-[#141416] border border-emerald-500/30 rounded-2xl p-6 mb-6">
            <p className="text-xs text-zinc-500 uppercase tracking-widest mb-3">Your gym join code</p>
            <p className="text-4xl font-bold text-emerald-400 font-mono tracking-[0.3em]">
              {joinCode.toUpperCase()}
            </p>
          </div>

          <p className="text-xs text-zinc-500 mb-6">Redirecting to your dashboard in a few seconds…</p>

          <button
            onClick={() => navigate('/gym/dashboard')}
            className="inline-flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 transition-colors text-sm font-medium"
          >
            Skip
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    )
  }

  // ── Form ───────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0c0c0e] overflow-x-hidden">
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-emerald-500/[0.07] blur-[120px] rounded-full pointer-events-none" />

      <div className="relative z-10 max-w-xl mx-auto px-5 py-12 sm:py-16">
        <ProgressBar step={step} total={3} />

        {/* ── Step 1 ─────────────────────────────────────────────── */}
        {step === 1 && (
          <div className="bg-[#141416] border border-white/[0.06] rounded-2xl p-6 sm:p-8">
            <h1 className="text-2xl font-bold text-white tracking-tight mb-1.5">
              Tell us about your gym
            </h1>
            <p className="text-zinc-500 text-sm mb-7">Basic details to get you started.</p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">Gym name <span className="text-emerald-400">*</span></label>
                <input
                  type="text"
                  value={form.gymName}
                  onChange={e => update('gymName', e.target.value)}
                  placeholder="e.g. Iron Forge Fitness"
                  className={inputCls}
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">Phone number <span className="text-emerald-400">*</span></label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={e => update('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="10-digit number"
                  className={inputCls}
                  inputMode="numeric"
                />
                {form.phone && !phoneOk && (
                  <p className="text-xs text-red-400 mt-1.5">Phone must be exactly 10 digits.</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">Email <span className="text-zinc-600">(optional)</span></label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => update('email', e.target.value)}
                  placeholder="contact@yourgym.com"
                  className={inputCls}
                />
                {form.email && !emailOk && (
                  <p className="text-xs text-red-400 mt-1.5">Please enter a valid email.</p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between mt-8">
              <button
                onClick={() => navigate('/become-gym-owner')}
                className="inline-flex items-center gap-1.5 text-zinc-500 hover:text-zinc-300 transition-colors text-sm"
              >
                <ArrowLeft size={14} />
                Back
              </button>
              <button
                disabled={!step1Valid}
                onClick={() => setStep(2)}
                className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 disabled:bg-white/[0.06] disabled:text-zinc-600 disabled:cursor-not-allowed text-white font-semibold text-sm px-6 py-2.5 rounded-xl transition-all duration-150"
              >
                Next
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2 ─────────────────────────────────────────────── */}
        {step === 2 && (
          <div className="bg-[#141416] border border-white/[0.06] rounded-2xl p-6 sm:p-8">
            <h1 className="text-2xl font-bold text-white tracking-tight mb-1.5">
              Where’s your gym?
            </h1>
            <p className="text-zinc-500 text-sm mb-7">Help members find you.</p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">Address <span className="text-zinc-600">(optional)</span></label>
                <textarea
                  value={form.address}
                  onChange={e => update('address', e.target.value)}
                  placeholder="Street, building, landmark…"
                  rows={2}
                  className={`${inputCls} resize-none`}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">City <span className="text-emerald-400">*</span></label>
                <input
                  type="text"
                  value={form.city}
                  onChange={e => update('city', e.target.value)}
                  placeholder="e.g. Mumbai"
                  className={inputCls}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">State <span className="text-zinc-600">(optional)</span></label>
                <select
                  value={form.state}
                  onChange={e => update('state', e.target.value)}
                  className={inputCls}
                >
                  <option value="">Select a state…</option>
                  {INDIAN_STATES.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">Pincode <span className="text-zinc-600">(optional)</span></label>
                <input
                  type="text"
                  value={form.pincode}
                  onChange={e => update('pincode', e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="6-digit"
                  className={inputCls}
                  inputMode="numeric"
                />
                {form.pincode && !pincodeOk && (
                  <p className="text-xs text-red-400 mt-1.5">Pincode must be 6 digits.</p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between mt-8">
              <button
                onClick={() => setStep(1)}
                className="inline-flex items-center gap-1.5 text-zinc-500 hover:text-zinc-300 transition-colors text-sm"
              >
                <ArrowLeft size={14} />
                Back
              </button>
              <button
                disabled={!step2Valid}
                onClick={() => setStep(3)}
                className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 disabled:bg-white/[0.06] disabled:text-zinc-600 disabled:cursor-not-allowed text-white font-semibold text-sm px-6 py-2.5 rounded-xl transition-all duration-150"
              >
                Next
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3 ─────────────────────────────────────────────── */}
        {step === 3 && (
          <div className="bg-[#141416] border border-white/[0.06] rounded-2xl p-6 sm:p-8">
            <h1 className="text-2xl font-bold text-white tracking-tight mb-1.5">
              Almost there
            </h1>
            <p className="text-zinc-500 text-sm mb-7">Review your details before we create your gym.</p>

            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5 space-y-3 mb-6">
              <Row label="Gym name" value={form.gymName} />
              <Row label="Phone"    value={form.phone} />
              {form.email && <Row label="Email" value={form.email} />}
              {form.address && <Row label="Address" value={form.address} />}
              <Row label="City" value={form.city} />
              {form.state && <Row label="State" value={form.state} />}
              {form.pincode && <Row label="Pincode" value={form.pincode} />}
            </div>

            <div className="bg-emerald-500/[0.05] border border-emerald-500/20 rounded-xl p-4 mb-6">
              <p className="text-xs text-zinc-300 leading-relaxed">
                By registering, you start a <span className="text-emerald-400 font-semibold">30-day free trial</span>.
                We’ll create your gym and give you a unique join code that members use to link their FitForge accounts to your gym.
              </p>
            </div>

            {errorMsg && (
              <div className="mb-5 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {errorMsg}
              </div>
            )}

            <div className="flex items-center justify-between gap-4">
              <button
                onClick={() => setStep(2)}
                disabled={submitting}
                className="inline-flex items-center gap-1.5 text-zinc-500 hover:text-zinc-300 disabled:opacity-50 transition-colors text-sm"
              >
                <ArrowLeft size={14} />
                Back
              </button>
              <button
                disabled={submitting}
                onClick={handleSubmit}
                className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold text-sm px-6 py-3 rounded-xl transition-all duration-150 shadow-lg shadow-emerald-500/20"
              >
                {submitting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Creating…
                  </>
                ) : (
                  <>Create My Gym <ArrowRight size={14} /></>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-xs text-zinc-500 uppercase tracking-wide pt-0.5">{label}</span>
      <span className="text-sm text-white text-right break-words max-w-[60%]">{value}</span>
    </div>
  )
}
